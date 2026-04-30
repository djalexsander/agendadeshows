import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================================
// Helpers
// ============================================================

async function upsertUserModule(supabase: any, userId: string, moduleName: string) {
  const { data: existing } = await supabase
    .from("user_modules")
    .select("id")
    .eq("user_id", userId)
    .eq("module_name", moduleName)
    .maybeSingle();

  if (existing) {
    await supabase.from("user_modules").update({ active: true }).eq("id", existing.id);
  } else {
    await supabase.from("user_modules").insert({
      user_id: userId,
      module_name: moduleName,
      active: true,
    });
  }
}

/**
 * Parse externalReference and decide which app should handle the event.
 *
 * Supported formats:
 *   - "agenda|<userId>"                (new multi-app format)
 *   - "gestaopro|<empresaId>"          (new multi-app format)
 *   - "base_plan:<userId>"             (legacy Agenda — base plan)
 *   - "module:<userId>:<moduleName>"   (legacy Agenda — module purchase)
 */
function parseExternalReference(ref: string): {
  app: "agenda" | "gestaopro" | null;
  empresaId: string | null;
  legacyKind?: "base_plan" | "module";
  moduleName?: string;
} {
  if (!ref) return { app: null, empresaId: null };

  // New format: app|empresaId
  if (ref.includes("|")) {
    const [appRaw, empresaId, ...rest] = ref.split("|");
    const app = appRaw?.toLowerCase();
    if ((app === "agenda" || app === "gestaopro") && empresaId) {
      // For agenda we may still receive an optional 3rd segment "module:<name>"
      let moduleName: string | undefined;
      let legacyKind: "base_plan" | "module" | undefined;
      if (app === "agenda" && rest.length > 0) {
        const extra = rest.join("|");
        if (extra.startsWith("module:")) {
          legacyKind = "module";
          moduleName = extra.replace("module:", "");
        } else if (extra === "base_plan") {
          legacyKind = "base_plan";
        }
      }
      return { app: app as "agenda" | "gestaopro", empresaId, legacyKind, moduleName };
    }
    return { app: null, empresaId: null };
  }

  // Legacy Agenda formats
  if (ref.startsWith("base_plan:")) {
    return {
      app: "agenda",
      empresaId: ref.replace("base_plan:", ""),
      legacyKind: "base_plan",
    };
  }
  if (ref.startsWith("module:")) {
    const parts = ref.split(":");
    if (parts.length >= 3) {
      return {
        app: "agenda",
        empresaId: parts[1],
        legacyKind: "module",
        moduleName: parts.slice(2).join(":"),
      };
    }
  }

  return { app: null, empresaId: null };
}

// ============================================================
// AGENDA handler (current behavior preserved)
// ============================================================

async function handleAgenda(
  supabase: any,
  event: string,
  payment: any,
  userId: string,
  log: (msg: string) => void,
) {
  const asaasPaymentId = payment.id;
  const externalReference = payment.externalReference || "";
  const now = new Date().toISOString();

  // --- Try base_plan_payments first (by asaas_payment_id) ---
  let { data: basePlanPayment } = await supabase
    .from("base_plan_payments")
    .select("*")
    .eq("asaas_payment_id", asaasPaymentId)
    .maybeSingle();

  // Fallback: search by user_id (legacy/new format both supply userId as empresaId)
  if (!basePlanPayment && userId) {
    const { data: fallback } = await supabase
      .from("base_plan_payments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallback) {
      basePlanPayment = fallback;
      await supabase
        .from("base_plan_payments")
        .update({ asaas_payment_id: asaasPaymentId })
        .eq("id", fallback.id);
      log(`Linked asaas_payment_id ${asaasPaymentId} to base_plan_payment ${fallback.id}`);
    }
  }

  // --- Try module_payments ---
  let { data: modulePayment } = await supabase
    .from("module_payments")
    .select("*")
    .eq("asaas_payment_id", asaasPaymentId)
    .maybeSingle();

  if (!modulePayment && externalReference.startsWith("module:")) {
    const parts = externalReference.split(":");
    if (parts.length >= 3) {
      const moduleName = parts.slice(2).join(":");
      const { data: fallback } = await supabase
        .from("module_payments")
        .select("*")
        .eq("user_id", userId)
        .eq("module_name", moduleName)
        .eq("status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallback) {
        modulePayment = fallback;
        await supabase
          .from("module_payments")
          .update({ asaas_payment_id: asaasPaymentId })
          .eq("id", fallback.id);
        log(`Linked asaas_payment_id ${asaasPaymentId} to module_payment ${fallback.id}`);
      }
    }
  }

  if (!basePlanPayment && !modulePayment) {
    log(`No payment found for asaas_payment_id: ${asaasPaymentId}, externalRef: ${externalReference}`);
    return;
  }

  // BASE PLAN
  if (basePlanPayment) {
    if (basePlanPayment.status === "approved" && (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")) {
      log("Base plan payment already approved, skipping duplicate");
      return;
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await supabase
        .from("base_plan_payments")
        .update({
          status: "approved",
          gateway_status: payment.status || event,
          reviewed_at: now,
        })
        .eq("id", basePlanPayment.id);

      const periodStart = new Date();
      const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      await supabase
        .from("profiles")
        .update({
          status_plano: "ativo",
          plan_type: "monthly",
          is_paid: true,
          paid_at: now,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          valor_plano: basePlanPayment.amount,
          trial_started_at: null,
          trial_ends_at: null,
          grace_ends_at: null,
        })
        .eq("user_id", basePlanPayment.user_id);

      const { data: trialSelections } = await supabase
        .from("trial_module_selections")
        .select("module_name")
        .eq("user_id", basePlanPayment.user_id);

      if (trialSelections && trialSelections.length > 0) {
        for (const sel of trialSelections) {
          await upsertUserModule(supabase, basePlanPayment.user_id, sel.module_name);
        }
        await supabase
          .from("trial_module_selections")
          .delete()
          .eq("user_id", basePlanPayment.user_id);
      }

      const { data: pendingRequests } = await supabase
        .from("module_requests")
        .select("module_name")
        .eq("user_id", basePlanPayment.user_id)
        .eq("status", "pending");

      if (pendingRequests && pendingRequests.length > 0) {
        for (const req of pendingRequests) {
          await upsertUserModule(supabase, basePlanPayment.user_id, req.module_name);
          await supabase
            .from("module_requests")
            .update({ status: "approved", reviewed_at: now })
            .eq("user_id", basePlanPayment.user_id)
            .eq("module_name", req.module_name)
            .eq("status", "pending");
        }
      }

      log(`Base plan approved for user ${basePlanPayment.user_id}`);
    } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      await supabase
        .from("base_plan_payments")
        .update({ status: "rejected", gateway_status: payment.status || event, reviewed_at: now })
        .eq("id", basePlanPayment.id);
      log(`Base plan rejected: ${event}`);
    } else {
      await supabase
        .from("base_plan_payments")
        .update({ gateway_status: payment.status || event })
        .eq("id", basePlanPayment.id);
      log(`Base plan status updated: ${event}`);
    }
  }

  // MODULE
  if (modulePayment) {
    if (modulePayment.status === "approved" && (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")) {
      log("Module payment already approved, skipping duplicate");
      return;
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await supabase
        .from("module_payments")
        .update({ status: "approved", gateway_status: payment.status || event, reviewed_at: now })
        .eq("id", modulePayment.id);

      await supabase
        .from("module_requests")
        .update({ status: "approved", reviewed_at: now })
        .eq("user_id", modulePayment.user_id)
        .eq("module_name", modulePayment.module_name)
        .eq("status", "pending");

      await upsertUserModule(supabase, modulePayment.user_id, modulePayment.module_name);

      log(`Module approved: ${modulePayment.module_name} for user ${modulePayment.user_id}`);
    } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      await supabase
        .from("module_payments")
        .update({ status: "rejected", gateway_status: payment.status || event, reviewed_at: now })
        .eq("id", modulePayment.id);
      log(`Module rejected: ${event}`);
    } else {
      await supabase
        .from("module_payments")
        .update({ gateway_status: payment.status || event })
        .eq("id", modulePayment.id);
      log(`Module status updated: ${event}`);
    }
  }
}

// ============================================================
// GESTÃO PRO handler
// ============================================================
//
// Tabelas esperadas (do app Gestão Pro):
//   - empresa_assinaturas (empresa_id, status, plano, periodo_inicio, periodo_fim,
//                          asaas_payment_id, gateway_status, valor, updated_at)
//   - empresa_modulos     (empresa_id, modulo, ativo)
//
// Como NÃO podemos misturar dados entre apps, esta função opera estritamente
// nessas tabelas. Se elas não existirem ainda no schema do Gestão Pro, os
// updates simplesmente retornarão erro silencioso e logaremos — o webhook
// continua respondendo 200.

async function handleGestaoPro(
  supabase: any,
  event: string,
  payment: any,
  empresaId: string,
  log: (msg: string) => void,
) {
  const asaasPaymentId = payment.id;
  const now = new Date().toISOString();
  const valor = payment.value ?? payment.netValue ?? null;

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Ativa/atualiza assinatura da empresa
    const { data: existing, error: findErr } = await supabase
      .from("empresa_assinaturas")
      .select("id, status")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (findErr) {
      log(`empresa_assinaturas lookup error (tabela existe?): ${findErr.message}`);
    }

    const payload = {
      empresa_id: empresaId,
      status: "ativo",
      plano: "mensal",
      periodo_inicio: periodStart.toISOString(),
      periodo_fim: periodEnd.toISOString(),
      asaas_payment_id: asaasPaymentId,
      gateway_status: payment.status || event,
      valor,
      updated_at: now,
    };

    if (existing) {
      const { error } = await supabase
        .from("empresa_assinaturas")
        .update(payload)
        .eq("id", existing.id);
      if (error) log(`empresa_assinaturas update error: ${error.message}`);
      else log(`Assinatura atualizada para empresa ${empresaId}`);
    } else {
      const { error } = await supabase
        .from("empresa_assinaturas")
        .insert(payload);
      if (error) log(`empresa_assinaturas insert error: ${error.message}`);
      else log(`Assinatura criada para empresa ${empresaId}`);
    }

    // Ativa módulos pendentes da empresa, se houver
    const { data: pendingMods, error: modErr } = await supabase
      .from("empresa_modulos")
      .select("id, modulo, ativo")
      .eq("empresa_id", empresaId);

    if (modErr) {
      log(`empresa_modulos lookup error: ${modErr.message}`);
    } else if (pendingMods && pendingMods.length > 0) {
      for (const m of pendingMods) {
        if (!m.ativo) {
          await supabase
            .from("empresa_modulos")
            .update({ ativo: true, updated_at: now })
            .eq("id", m.id);
        }
      }
      log(`Módulos ativados para empresa ${empresaId}: ${pendingMods.length}`);
    }
  } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
    const { error } = await supabase
      .from("empresa_assinaturas")
      .update({
        status: "inadimplente",
        gateway_status: payment.status || event,
        updated_at: now,
      })
      .eq("empresa_id", empresaId);
    if (error) log(`empresa_assinaturas overdue error: ${error.message}`);
    else log(`Assinatura marcada como inadimplente para empresa ${empresaId}`);
  } else {
    const { error } = await supabase
      .from("empresa_assinaturas")
      .update({ gateway_status: payment.status || event, updated_at: now })
      .eq("empresa_id", empresaId);
    if (error) log(`empresa_assinaturas status update error: ${error.message}`);
    else log(`Status atualizado para empresa ${empresaId}: ${event}`);
  }
}

// ============================================================
// Entrypoint
// ============================================================

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("ok", { status: 200 });
  }

  try {
    const body = await req.json();
    const event = body?.event;
    const payment = body?.payment;
    const externalReference: string = payment?.externalReference || "";
    const asaasPaymentId: string | undefined = payment?.id;

    const parsed = parseExternalReference(externalReference);
    const app = parsed.app;
    const empresaId = parsed.empresaId;

    const log = (msg: string) =>
      console.log(
        `[asaas-webhook] app=${app ?? "unknown"} empresaId=${empresaId ?? "-"} paymentId=${asaasPaymentId ?? "-"} evento=${event ?? "-"} :: ${msg}`,
      );

    log(`Recebido. externalReference="${externalReference}"`);

    if (!event || !payment || !asaasPaymentId) {
      log("Payload sem event/payment/id — ignorado");
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!app || !empresaId) {
      log("externalReference inválido ou ausente — ignorado");
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (app === "agenda") {
      await handleAgenda(supabase, event, payment, empresaId, log);
    } else if (app === "gestaopro") {
      await handleGestaoPro(supabase, event, payment, empresaId, log);
    } else {
      log(`App não suportado: ${app}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[asaas-webhook] error:", error);
    // Sempre 200 para evitar retries desnecessários do Asaas
    return new Response(JSON.stringify({ ok: true, error: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
