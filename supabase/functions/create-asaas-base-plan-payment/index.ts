import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL")!; // e.g. https://sandbox.asaas.com/api/v3
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AsaasCustomerResponse {
  id: string;
  name: string;
  email: string;
}

interface AsaasPaymentResponse {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl: string;
}

interface AsaasPixResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

async function asaasFetch(path: string, options: RequestInit = {}) {
  const url = `${ASAAS_BASE_URL.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...(options.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`Asaas error ${res.status}: ${body}`);
    throw new Error(`Asaas API error: ${res.status}`);
  }
  return JSON.parse(body);
}

async function findOrCreateCustomer(
  email: string,
  name: string,
  cpfCnpj?: string
): Promise<string> {
  // Try to find existing customer by email
  const search = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  if (search.data && search.data.length > 0) {
    return search.data[0].id;
  }

  // Create new customer
  const customer: AsaasCustomerResponse = await asaasFetch("/customers", {
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

async function createPixPayment(
  customerId: string,
  amount: number,
  description: string
): Promise<AsaasPaymentResponse> {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

  return await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: amount,
      dueDate: dueDate.toISOString().split("T")[0],
      description,
    }),
  });
}

async function getPixQrCode(paymentId: string): Promise<AsaasPixResponse> {
  // Asaas may take a moment to generate the PIX QR code
  let attempts = 0;
  while (attempts < 5) {
    try {
      return await asaasFetch(`/payments/${paymentId}/pixQrCode`);
    } catch {
      attempts++;
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
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending Asaas payment (avoid duplicates)
    const { data: existingPayment } = await supabase
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
        // Return existing valid payment
        return new Response(
          JSON.stringify({
            paymentId: existingPayment.id,
            asaasPaymentId: existingPayment.asaas_payment_id,
            payload: existingPayment.pix_payload,
            qrCodeImage: existingPayment.pix_qr_code_image,
            expirationDate: existingPayment.pix_expiration_date,
            amount: existingPayment.amount,
            reused: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get profile
    const { data: profile } = await supabase
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

    // Get base plan config
    const { data: planConfig } = await supabase
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

    // Calculate total (base plan + pending/trial modules)
    let totalAmount = planConfig.price;

    // Get trial module selections
    const { data: trialModules } = await supabase
      .from("trial_module_selections")
      .select("module_name")
      .eq("user_id", user.id);

    // Get pending module requests
    const { data: pendingRequests } = await supabase
      .from("module_requests")
      .select("module_name")
      .eq("user_id", user.id)
      .eq("status", "pending");

    const moduleNames = new Set<string>();
    (trialModules || []).forEach((m: any) => moduleNames.add(m.module_name));
    (pendingRequests || []).forEach((m: any) => moduleNames.add(m.module_name));

    if (moduleNames.size > 0) {
      const { data: catalog } = await supabase
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

    // Parse optional body
    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      // No body is fine
    }

    // Find or create Asaas customer
    const customerId = await findOrCreateCustomer(
      profile.email || user.email || "",
      profile.nome || "",
      bodyData.cpfCnpj
    );

    // Create PIX payment
    const payment = await createPixPayment(
      customerId,
      totalAmount,
      `Plano Base - ${planConfig.name}`
    );

    // Get QR code
    const pixData = await getPixQrCode(payment.id);

    // Save to database
    const { data: savedPayment, error: insertError } = await supabase
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
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar pagamento" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile status
    await supabase
      .from("profiles")
      .update({ status_plano: "pagamento_em_analise" })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        paymentId: savedPayment.id,
        asaasPaymentId: payment.id,
        payload: pixData.payload,
        qrCodeImage: pixData.encodedImage,
        expirationDate: pixData.expirationDate,
        amount: totalAmount,
        reused: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
