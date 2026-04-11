import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push helpers
function base64UrlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const pubBytes = base64UrlToUint8Array(publicKeyB64);
  const privBytes = base64UrlToUint8Array(privateKeyB64);

  const publicKey = await crypto.subtle.importKey(
    "raw", pubBytes, { name: "ECDH", namedCurve: "P-256" }, true, []
  );
  const privateKey = await crypto.subtle.importKey(
    "pkcs8", privBytes, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );

  return { publicKey, privateKey, publicKeyBytes: pubBytes };
}

async function createVapidJWT(aud: string, sub: string, privateKey: CryptoKey): Promise<string> {
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ aud, exp: now + 43200, sub }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    await crypto.subtle.exportKey("pkcs8", privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, data);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${header}.${payload}.${sigB64}`;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: object,
  vapidPublic: string,
  vapidPrivate: string,
) {
  const url = new URL(subscription.endpoint);
  const aud = `${url.protocol}//${url.host}`;

  const keys = await importVapidKeys(vapidPublic, vapidPrivate);
  const jwt = await createVapidJWT(aud, "mailto:noreply@guidestride.app", keys.privateKey);

  const pubB64 = btoa(String.fromCharCode(...keys.publicKeyBytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // For simplicity, send unencrypted payload via fetch
  // Real production should use RFC 8291 encryption
  const body = JSON.stringify(payload);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${pubB64}`,
      "Content-Type": "application/json",
      TTL: "3600",
    },
    body,
  });

  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get current UTC time
    const now = new Date();
    const currentMinute = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

    // Day name map (UTC)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const utcDay = dayNames[now.getUTCDay()];

    // Get schedules where reminders are enabled
    const { data: schedules, error } = await supabase
      .from("workout_schedules")
      .select("user_id, preferred_time, workout_days, timezone, early_reminder_minutes")
      .eq("reminders_enabled", true);

    if (error) throw error;

    let sent = 0;

    for (const sched of schedules || []) {
      // Convert preferred_time in user's timezone to UTC
      const [h, m] = (sched.preferred_time as string).split(":").map(Number);
      
      // Create a date in the user's timezone and check if now matches
      const userNow = new Date(now.toLocaleString("en-US", { timeZone: sched.timezone }));
      const userDay = dayNames[userNow.getDay()];
      const userHour = userNow.getHours();
      const userMin = userNow.getMinutes();

      // Check main reminder
      const isMainTime = userHour === h && userMin === m;
      // Check early reminder
      const earlyMin = sched.early_reminder_minutes || 0;
      let isEarlyTime = false;
      if (earlyMin > 0) {
        const earlyTarget = new Date(userNow);
        earlyTarget.setMinutes(earlyTarget.getMinutes() + earlyMin);
        isEarlyTime = earlyTarget.getHours() === h && earlyTarget.getMinutes() === m;
      }

      if (!isMainTime && !isEarlyTime) continue;
      if (!(sched.workout_days as string[]).includes(userDay)) continue;

      // Get push subscriptions for this user
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth_key")
        .eq("user_id", sched.user_id);

      if (!subs || subs.length === 0) continue;

      const message = isEarlyTime
        ? { title: "GuideStride", body: `⏰ ${earlyMin} min until your workout! Get ready.`, url: "/workout" }
        : { title: "GuideStride", body: "⏰ Time for your workout! Stay consistent and hit your goals.", url: "/workout" };

      for (const sub of subs) {
        try {
          await sendPushNotification(sub, message, vapidPublic, vapidPrivate);
          sent++;
        } catch (e) {
          console.error("Push failed for", sub.endpoint, e);
        }
      }
    }

    return new Response(JSON.stringify({ sent, checked: schedules?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
