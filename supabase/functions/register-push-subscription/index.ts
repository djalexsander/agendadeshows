import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function shortenEndpoint(endpoint: string) {
  return endpoint.length <= 24 ? endpoint : `${endpoint.slice(0, 12)}...${endpoint.slice(-12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: "Missing backend configuration" }, 500);
    }

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();

    if (authError || !authData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    const p256dh = typeof body?.p256dh === "string" ? body.p256dh.trim() : "";
    const auth = typeof body?.auth === "string" ? body.auth.trim() : "";
    const platform = typeof body?.platform === "string" ? body.platform.trim() : "web";

    if (!endpoint || !p256dh || !auth) {
      return jsonResponse({ error: "endpoint, p256dh and auth are required" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: movedRows, error: movedRowsError } = await adminClient
      .from("push_subscriptions")
      .select("id, user_id")
      .eq("endpoint", endpoint)
      .neq("user_id", authData.user.id);

    if (movedRowsError) {
      throw movedRowsError;
    }

    if ((movedRows || []).length > 0) {
      console.log("[register-push-subscription] reassigning endpoint", {
        endpoint: shortenEndpoint(endpoint),
        fromUserIds: movedRows?.map((row) => row.user_id),
        toUserId: authData.user.id,
      });

      const { error: deleteMovedRowsError } = await adminClient
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)
        .neq("user_id", authData.user.id);

      if (deleteMovedRowsError) {
        throw deleteMovedRowsError;
      }
    }

    const { error: deleteCurrentError } = await adminClient
      .from("push_subscriptions")
      .delete()
      .eq("user_id", authData.user.id)
      .eq("endpoint", endpoint);

    if (deleteCurrentError) {
      throw deleteCurrentError;
    }

    const { error: insertError } = await adminClient.from("push_subscriptions").insert({
      user_id: authData.user.id,
      endpoint,
      p256dh,
      auth,
    });

    if (insertError) {
      throw insertError;
    }

    const { count, error: countError } = await adminClient
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authData.user.id);

    if (countError) {
      throw countError;
    }

    console.log("[register-push-subscription] saved subscription", {
      userId: authData.user.id,
      platform,
      endpoint: shortenEndpoint(endpoint),
      subscriptionsForUser: count ?? 0,
    });

    return jsonResponse({
      success: true,
      user_id: authData.user.id,
      subscriptions_for_user: count ?? 0,
      platform,
    });
  } catch (error) {
    console.error("register-push-subscription error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});