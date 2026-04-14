import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const RAW_ASAAS_URL = Deno.env.get("ASAAS_BASE_URL") || Deno.env.get("URL_BASE_ASAAS") || "";
// Normalize: strip trailing /api/v3 or /v3 and re-add /v3
const ASAAS_BASE_URL = RAW_ASAAS_URL.replace(/\/(api\/)?v3\/?$/, "") + "/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function asaasFetch(path: string, options: RequestInit = {}) {
  const base = ASAAS_BASE_URL.replace(/\/$/, "");
  const url = `${base}${path}`;
  console.log(`Asaas request: ${options.method || "GET"} ${url}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...(options.headers || {}),
    },
  });
  const body = await res.text();
  console.log(`Asaas response ${res.status}: ${body.substring(0, 500)}`);
  if (!res.ok) {
    throw new Error(`Asaas API error ${res.status}: ${body}`);
  }
  return JSON.parse(body);
}

async function findOrCreateCustomer(email: string, name: string, cpfCnpj?: string): Promise<string> {
  const search = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  if (search.data && search.data.length > 0) {
    const existing = search.data[0];
    // Update customer with cpfCnpj if missing
    if (cpfCnpj && !existing.cpfCnpj) {
      console.log(`Updating customer ${existing.id} with cpfCnpj`);
      await asaasFetch(`/customers/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify({ cpfCnpj }),
      });
    }
    return existing.id;
  }
  const customer = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: name || email,
      email,
      cpfCnpj: cpfCnpj || undefined,
      notificationDisabled: false,
    }),
  });
  return customer.id;
}

async function createPixPayment(customerId: string, amount: number, description: string, externalReference?: string) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  return await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: amount,
      dueDate: dueDate.toISOString().split("T")[0],
      description,
      externalReference: externalReference || undefined,
    }),
  });
}

async function getPixQrCode(paymentId: string) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      return await asaasFetch(`/payments/${paymentId}/pixQrCode`);
    } catch (err) {
      attempts++;
      console.log(`QR code attempt ${attempts} failed, retrying...`);
      if (attempts >= 5) throw new Error("Failed to get PIX QR code after retries");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Failed to get PIX QR code");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Debug: log config (masked)
    console.log(`ASAAS config: URL="${ASAAS_BASE_URL}", KEY starts with "${ASAAS_API_KEY?.substring(0, 10)}...", KEY length=${ASAAS_API_KEY?.length}`);
    
    // Validate config
    if (!ASAAS_API_KEY || !ASAAS_BASE_URL) {
      console.error("Missing ASAAS_API_KEY or ASAAS_BASE_URL");
      return new Response(JSON.stringify({ error: "Gateway de pagamento não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing valid pending Asaas payment
    const { data: existingPayment } = await supabaseAdmin
      .from("base_plan_payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending_review")
      .eq("gateway_provider", "asaas")
      .not("pix_payload", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment && existingPayment.pix_expiration_date) {
      const expiration = new Date(existingPayment.pix_expiration_date);
      if (expiration > new Date()) {
        console.log("Reusing existing payment:", existingPayment.id);
        return new Response(JSON.stringify({
          paymentId: existingPayment.id,
          asaasPaymentId: existingPayment.asaas_payment_id,
          payload: existingPayment.pix_payload,
          qrCodeImage: existingPayment.pix_qr_code_image,
          expirationDate: existingPayment.pix_expiration_date,
          amount: existingPayment.amount,
          reused: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("nome, email")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan config
    const { data: planConfig } = await supabaseAdmin
      .from("base_plan_config")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!planConfig) {
      return new Response(JSON.stringify({ error: "Plano base não configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate total (base + modules)
    let totalAmount = planConfig.price;

    const { data: trialModules } = await supabaseAdmin
      .from("trial_module_selections")
      .select("module_name")
      .eq("user_id", user.id);

    const { data: pendingRequests } = await supabaseAdmin
      .from("module_requests")
      .select("module_name")
      .eq("user_id", user.id)
      .eq("status", "pending");

    const moduleNames = new Set<string>();
    (trialModules || []).forEach((m: any) => moduleNames.add(m.module_name));
    (pendingRequests || []).forEach((m: any) => moduleNames.add(m.module_name));

    if (moduleNames.size > 0) {
      const { data: catalog } = await supabaseAdmin
        .from("module_catalog")
        .select("module_name, price")
        .eq("active", true)
        .in("module_name", [...moduleNames]);

      if (catalog) {
        for (const mod of catalog) {
          totalAmount += mod.price;
        }
      }
    }

    // Parse body for cpfCnpj
    let cpfCnpj: string | undefined;
    try {
      const body = await req.json();
      cpfCnpj = body.cpfCnpj;
    } catch {
      // no body
    }

    console.log(`Creating Asaas payment for user ${user.id}, amount: ${totalAmount}`);

    // Create/find customer
    const customerId = await findOrCreateCustomer(
      profile.email || user.email || "",
      profile.nome || "",
      cpfCnpj
    );

    // Create PIX payment with external reference for webhook lookup
    const externalRef = `base_plan:${user.id}`;
    const payment = await createPixPayment(customerId, totalAmount, `Plano Base - ${planConfig.name}`, externalRef);

    // Get QR code
    const pixData = await getPixQrCode(payment.id);

    // Save to DB
    const { data: savedPayment, error: insertError } = await supabaseAdmin
      .from("base_plan_payments")
      .insert({
        user_id: user.id,
        amount: totalAmount,
        status: "pending_review",
        billing_period: planConfig.billing_period,
        asaas_customer_id: customerId,
        asaas_payment_id: payment.id,
        pix_payload: pixData.payload,
        pix_qr_code_image: pixData.encodedImage,
        pix_expiration_date: pixData.expirationDate,
        gateway_provider: "asaas",
        gateway_status: payment.status,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar pagamento" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile status
    await supabaseAdmin
      .from("profiles")
      .update({ status_plano: "pagamento_em_analise" })
      .eq("user_id", user.id);

    console.log("Payment created successfully:", savedPayment.id);

    return new Response(JSON.stringify({
      paymentId: savedPayment.id,
      asaasPaymentId: payment.id,
      payload: pixData.payload,
      qrCodeImage: pixData.encodedImage,
      expirationDate: pixData.expirationDate,
      amount: totalAmount,
      reused: false,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
