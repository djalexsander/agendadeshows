import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log("Asaas webhook received:", JSON.stringify(body));

    const event = body.event;
    const payment = body.payment;

    if (!event || !payment) {
      console.log("Missing event or payment data");
      return new Response("ok", { status: 200 });
    }

    const asaasPaymentId = payment.id;
    if (!asaasPaymentId) {
      console.log("Missing payment id");
      return new Response("ok", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    // --- Try base_plan_payments first ---
    const { data: basePlanPayment, error: findBaseError } = await supabase
      .from("base_plan_payments")
      .select("*")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();

    if (findBaseError) {
      console.error("DB find base error:", findBaseError);
    }

    // --- Try module_payments ---
    const { data: modulePayment, error: findModError } = await supabase
      .from("module_payments")
      .select("*")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();

    if (findModError) {
      console.error("DB find module error:", findModError);
    }

    if (!basePlanPayment && !modulePayment) {
      console.log(`No payment found for asaas_payment_id: ${asaasPaymentId}`);
      return new Response("ok", { status: 200 });
    }

    // ==========================================
    // HANDLE BASE PLAN PAYMENT
    // ==========================================
    if (basePlanPayment) {
      // Already processed?
      if (basePlanPayment.status === "approved" && (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")) {
        console.log("Base plan payment already approved, skipping duplicate");
        return new Response("ok", { status: 200 });
      }

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        // Approve payment
        await supabase
          .from("base_plan_payments")
          .update({
            status: "approved",
            gateway_status: payment.status || event,
            reviewed_at: now,
          })
          .eq("id", basePlanPayment.id);

        // Activate user plan
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
          })
          .eq("user_id", basePlanPayment.user_id);

        // Activate trial module selections
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

        // Also activate pending module_requests
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

        console.log(`Base plan payment ${asaasPaymentId} approved for user ${basePlanPayment.user_id}`);
      } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
        await supabase
          .from("base_plan_payments")
          .update({
            status: "rejected",
            gateway_status: payment.status || event,
            reviewed_at: now,
          })
          .eq("id", basePlanPayment.id);
        console.log(`Base plan payment ${asaasPaymentId} rejected: ${event}`);
      } else {
        await supabase
          .from("base_plan_payments")
          .update({ gateway_status: payment.status || event })
          .eq("id", basePlanPayment.id);
        console.log(`Base plan payment ${asaasPaymentId} status updated: ${event}`);
      }
    }

    // ==========================================
    // HANDLE MODULE PAYMENT
    // ==========================================
    if (modulePayment) {
      // Already processed?
      if (modulePayment.status === "approved" && (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")) {
        console.log("Module payment already approved, skipping duplicate");
        return new Response("ok", { status: 200 });
      }

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        // Approve module payment
        await supabase
          .from("module_payments")
          .update({
            status: "approved",
            gateway_status: payment.status || event,
            reviewed_at: now,
          })
          .eq("id", modulePayment.id);

        // Approve module request
        await supabase
          .from("module_requests")
          .update({ status: "approved", reviewed_at: now })
          .eq("user_id", modulePayment.user_id)
          .eq("module_name", modulePayment.module_name)
          .eq("status", "pending");

        // Activate module
        await upsertUserModule(supabase, modulePayment.user_id, modulePayment.module_name);

        console.log(`Module payment ${asaasPaymentId} approved: ${modulePayment.module_name} for user ${modulePayment.user_id}`);
      } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
        await supabase
          .from("module_payments")
          .update({
            status: "rejected",
            gateway_status: payment.status || event,
            reviewed_at: now,
          })
          .eq("id", modulePayment.id);
        console.log(`Module payment ${asaasPaymentId} rejected: ${event}`);
      } else {
        await supabase
          .from("module_payments")
          .update({ gateway_status: payment.status || event })
          .eq("id", modulePayment.id);
        console.log(`Module payment ${asaasPaymentId} status updated: ${event}`);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("ok", { status: 200 });
  }
});
