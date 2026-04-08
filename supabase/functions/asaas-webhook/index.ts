import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Webhook only accepts POST
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

    // Find the base_plan_payment by asaas_payment_id
    const { data: basePlanPayment, error: findError } = await supabase
      .from("base_plan_payments")
      .select("*")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();

    if (findError) {
      console.error("DB find error:", findError);
      return new Response("ok", { status: 200 });
    }

    if (!basePlanPayment) {
      console.log(`No base_plan_payment found for asaas_payment_id: ${asaasPaymentId}`);
      return new Response("ok", { status: 200 });
    }

    // Already processed?
    if (basePlanPayment.status === "approved" && event === "PAYMENT_RECEIVED") {
      console.log("Payment already approved, skipping duplicate");
      return new Response("ok", { status: 200 });
    }

    const now = new Date().toISOString();

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
          // Upsert user_modules
          const { data: existing } = await supabase
            .from("user_modules")
            .select("id")
            .eq("user_id", basePlanPayment.user_id)
            .eq("module_name", sel.module_name)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("user_modules")
              .update({ active: true })
              .eq("id", existing.id);
          } else {
            await supabase.from("user_modules").insert({
              user_id: basePlanPayment.user_id,
              module_name: sel.module_name,
              active: true,
            });
          }
        }

        // Clean up trial selections
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
          const { data: existing } = await supabase
            .from("user_modules")
            .select("id")
            .eq("user_id", basePlanPayment.user_id)
            .eq("module_name", req.module_name)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("user_modules")
              .update({ active: true })
              .eq("id", existing.id);
          } else {
            await supabase.from("user_modules").insert({
              user_id: basePlanPayment.user_id,
              module_name: req.module_name,
              active: true,
            });
          }

          await supabase
            .from("module_requests")
            .update({ status: "approved", reviewed_at: now })
            .eq("user_id", basePlanPayment.user_id)
            .eq("module_name", req.module_name)
            .eq("status", "pending");
        }
      }

      console.log(`Payment ${asaasPaymentId} approved for user ${basePlanPayment.user_id}`);
    } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      // Mark as rejected/expired
      await supabase
        .from("base_plan_payments")
        .update({
          status: "rejected",
          gateway_status: payment.status || event,
          reviewed_at: now,
        })
        .eq("id", basePlanPayment.id);

      console.log(`Payment ${asaasPaymentId} rejected/expired: ${event}`);
    } else {
      // Update gateway_status for other events
      await supabase
        .from("base_plan_payments")
        .update({ gateway_status: payment.status || event })
        .eq("id", basePlanPayment.id);

      console.log(`Payment ${asaasPaymentId} status updated: ${event}`);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("ok", { status: 200 }); // Always return 200 to Asaas
  }
});
