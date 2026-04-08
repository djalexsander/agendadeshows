import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const RAW_ASAAS_URL = Deno.env.get("ASAAS_BASE_URL") || "";
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
  if (!res.ok) throw new Error(`Asaas API error ${res.status}: ${body}`);
  return JSON.parse(body);
}

async function findOrCreateCustomer(email: string, name: string, cpfCnpj?: string): Promise<string> {
  const search = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  if (search.data && search.data.length > 0) {
    const existing = search.data[0];
    if (cpfCnpj && !existing.cpfCnpj) {
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

async function createPixPayment(customerId: string, amount: number, description: string) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);
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

async function getPixQrCode(paymentId: string) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      return await asaasFetch(`/payments/${paymentId}/pixQrCode`);
    } catch {
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
    if (!ASAAS_API_KEY || !ASAAS_BASE_URL) {
      return new Response(JSON.stringify({ error: "Gateway não configurado" }), {
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

    // Parse body
    const body = await req.json();
    const moduleName = body.moduleName;
    const cpfCnpj = body.cpfCnpj;

    if (!moduleName) {
      return new Response(JSON.stringify({ error: "moduleName é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check module catalog
    const { data: catalogModule } = await supabaseAdmin
      .from("module_catalog")
      .select("*")
      .eq("module_name", moduleName)
      .eq("active", true)
      .single();

    if (!catalogModule) {
      return new Response(JSON.stringify({ error: "Módulo não encontrado ou inativo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing valid pending payment
    const { data: existingPayment } = await supabaseAdmin
      .from("module_payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("module_name", moduleName)
      .eq("status", "pending_review")
      .eq("gateway_provider", "asaas")
      .not("pix_payload", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment && existingPayment.pix_expiration_date) {
      const expiration = new Date(existingPayment.pix_expiration_date);
      if (expiration > new Date()) {
        console.log("Reusing existing module payment:", existingPayment.id);
        return new Response(JSON.stringify({
          paymentId: existingPayment.id,
          asaasPaymentId: existingPayment.asaas_payment_id,
          payload: existingPayment.pix_payload,
          qrCodeImage: existingPayment.pix_qr_code_image,
          expirationDate: existingPayment.pix_expiration_date,
          amount: existingPayment.amount,
          moduleName,
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

    const amount = catalogModule.price;
    console.log(`Creating Asaas module payment for user ${user.id}, module: ${moduleName}, amount: ${amount}`);

    // Create/find customer
    const customerId = await findOrCreateCustomer(
      profile.email || user.email || "",
      profile.nome || "",
      cpfCnpj
    );

    // Create PIX payment
    const payment = await createPixPayment(customerId, amount, `Módulo: ${catalogModule.display_name}`);

    // Get QR code
    const pixData = await getPixQrCode(payment.id);

    // Ensure module_request exists
    const { data: existingRequest } = await supabaseAdmin
      .from("module_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("module_name", moduleName)
      .eq("status", "pending")
      .maybeSingle();

    if (!existingRequest) {
      await supabaseAdmin.from("module_requests").insert({
        user_id: user.id,
        module_name: moduleName,
        status: "pending",
      });
    }

    // Save to module_payments
    const { data: savedPayment, error: insertError } = await supabaseAdmin
      .from("module_payments")
      .insert({
        user_id: user.id,
        module_name: moduleName,
        amount,
        status: "pending_review",
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

    console.log("Module payment created successfully:", savedPayment.id);

    return new Response(JSON.stringify({
      paymentId: savedPayment.id,
      asaasPaymentId: payment.id,
      payload: pixData.payload,
      qrCodeImage: pixData.encodedImage,
      expirationDate: pixData.expirationDate,
      amount,
      moduleName,
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
