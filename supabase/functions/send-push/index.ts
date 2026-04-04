import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

// Web Push utilities using Web Crypto API (no npm dependency needed in Deno)
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  const { endpoint, p256dh, auth } = subscription;

  // Import VAPID private key
  const vapidPrivateKeyBytes = base64urlToUint8Array(vapidPrivateKey);
  const vapidPublicKeyBytes = base64urlToUint8Array(vapidPublicKey);

  // Create JWT for VAPID
  const jwt = await createVapidJwt(endpoint, vapidPrivateKeyBytes, vapidSubject);

  // Encrypt payload
  const encrypted = await encryptPayload(
    payload,
    base64urlToUint8Array(p256dh),
    base64urlToUint8Array(auth)
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(encrypted.byteLength),
      Authorization: `vapid t=${jwt}, k=${uint8ArrayToBase64url(vapidPublicKeyBytes)}`,
      TTL: "86400",
      Urgency: "high",
    },
    body: encrypted,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push failed ${response.status}: ${text}`);
  }

  return response;
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidJwt(
  endpoint: string,
  privateKeyBytes: Uint8Array,
  subject: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    ecPrivateKeyToPkcs8(privateKeyBytes),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const rawSig = derToRaw(new Uint8Array(signature));
  const sigB64 = uint8ArrayToBase64url(rawSig);

  return `${unsignedToken}.${sigB64}`;
}

function ecPrivateKeyToPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // Wrap raw 32-byte EC private key in PKCS8 DER structure
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // We skip the public key portion since we don't need it for signing
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  return result.buffer;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw format
  if (der.length === 64) return der;

  // Parse DER SEQUENCE
  const raw = new Uint8Array(64);
  let offset = 2; // skip SEQUENCE tag + length

  // Read R
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // Read S
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);

  return raw;
}

async function encryptPayload(
  payload: string,
  clientPublicKey: Uint8Array,
  clientAuth: Uint8Array
): Promise<ArrayBuffer> {
  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    )
  );

  // HKDF for auth_info
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await hkdfExtract(clientAuth, sharedSecret);
  const ikm = await hkdfExpand(prk, authInfo, 32);

  // Build key_info and nonce_info
  const keyInfoBuf = buildInfo("aesgcm128", clientPublicKey, localPublicKeyRaw);
  const nonceInfoBuf = buildInfo("nonce", clientPublicKey, localPublicKeyRaw);

  const prkForKey = await hkdfExtract(
    generateSalt(),
    ikm
  );

  // For aes128gcm encoding, use a simpler approach
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk2 = await hkdfExtract(salt, ikm);

  const cekInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
  ]);
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: nonce\0"),
  ]);

  const cek = await hkdfExpand(prk2, cekInfo, 16);
  const nonce = await hkdfExpand(prk2, nonceInfo, 12);

  // Encrypt with AES-GCM
  const key = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const paddedPayload = new Uint8Array([
    ...new TextEncoder().encode(payload),
    2, // delimiter
  ]);

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  const header = new Uint8Array(
    16 + 4 + 1 + localPublicKeyRaw.length + encrypted.length
  );
  let pos = 0;
  header.set(salt, pos);
  pos += 16;
  header.set(rs, pos);
  pos += 4;
  header[pos] = localPublicKeyRaw.length;
  pos += 1;
  header.set(localPublicKeyRaw, pos);
  pos += localPublicKeyRaw.length;
  header.set(encrypted, pos);

  return header.buffer;
}

function buildInfo(
  type: string,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array
): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(`Content-Encoding: ${type}\0`);
  const p256dhBytes = encoder.encode("P-256\0");

  const info = new Uint8Array(
    typeBytes.length +
      p256dhBytes.length +
      2 +
      clientPublicKey.length +
      2 +
      serverPublicKey.length
  );

  let offset = 0;
  info.set(typeBytes, offset);
  offset += typeBytes.length;
  info.set(p256dhBytes, offset);
  offset += p256dhBytes.length;
  new DataView(info.buffer).setUint16(offset, clientPublicKey.length);
  offset += 2;
  info.set(clientPublicKey, offset);
  offset += clientPublicKey.length;
  new DataView(info.buffer).setUint16(offset, serverPublicKey.length);
  offset += 2;
  info.set(serverPublicKey, offset);

  return info;
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function hkdfExtract(
  salt: Uint8Array,
  ikm: Uint8Array
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    salt.length > 0 ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
}

async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const input = new Uint8Array(info.length + 1);
  input.set(info);
  input[info.length] = 1;
  const output = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
  return output.slice(0, length);
}

// ---- Main handler ----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidPublicKey = "BK7AUlCrJsddB2-FfvIxt8WzeQu56g7D_lZFWO7TPKgqo0FGKLfEuHSBV6LKrh7bq29nJj19cL6y06ASQCPomPM";
    const vapidSubject = "mailto:admin@agendadeshows.lovable.app";

    if (!anonKey) {
      return jsonResponse({ error: "Missing auth configuration" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);

    const isAdmin = (callerRoles || []).some((role: any) => role.role === "admin");

    const requestBody = await req.json().catch(() => null);
    const title = typeof requestBody?.title === "string" ? requestBody.title.trim() : "";
    const body = typeof requestBody?.body === "string" ? requestBody.body.trim() : "";
    const url = typeof requestBody?.url === "string" && requestBody.url.trim() ? requestBody.url.trim() : "/";
    const targetRole = typeof requestBody?.target_role === "string" ? requestBody.target_role.trim() : null;
    const targetUserIds = Array.isArray(requestBody?.target_user_ids)
      ? [...new Set(requestBody.target_user_ids.filter((id: unknown) => typeof id === "string" && id.trim().length > 0))]
      : [];

    if (!title || !body) {
      return jsonResponse({ error: "title and body are required" }, 400);
    }

    if (targetRole && targetRole !== "admin") {
      return jsonResponse({ error: "Unsupported target_role" }, 400);
    }

    if (targetUserIds.length === 0 && !targetRole) {
      return jsonResponse({ error: "target_user_ids or target_role is required" }, 400);
    }

    if (!isAdmin && targetUserIds.some((targetUserId) => targetUserId !== authData.user.id)) {
      return jsonResponse({ error: "You can only send user-targeted notifications to your own account" }, 403);
    }

    console.log("[send-push] request", {
      callerUserId: authData.user.id,
      isAdmin,
      targetRole,
      targetUserIds,
      title,
    });

    // Get subscriptions based on target
    let query = supabase.from("push_subscriptions").select("*");
    
    if (targetUserIds.length > 0) {
      query = query.in("user_id", targetUserIds);
    } else if (targetRole === "admin") {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = (adminRoles || []).map((r: any) => r.user_id);
      if (adminIds.length === 0) {
        return jsonResponse({ sent: 0, failed: 0, cleaned: 0 });
      }
      query = query.in("user_id", adminIds);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      throw error;
    }

    const uniqueSubscriptions = Array.from(
      new Map((subscriptions || []).map((subscription: any) => [subscription.endpoint, subscription])).values()
    );

    console.log("[send-push] recipients", uniqueSubscriptions.map((subscription: any) => ({
      userId: subscription.user_id,
      endpoint: shortenEndpoint(subscription.endpoint),
    })));

    const payload = JSON.stringify({
      title,
      body,
      url,
    });

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    for (const sub of uniqueSubscriptions) {
      try {
        await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );
        sent++;
      } catch (err: any) {
        console.error(`Push failed for ${sub.endpoint}:`, err.message);
        failed++;
        // If 404 or 410, subscription is stale
        if (err.message.includes("404") || err.message.includes("410")) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return jsonResponse({ sent, failed, cleaned: staleEndpoints.length });
  } catch (err: any) {
    console.error("send-push error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
