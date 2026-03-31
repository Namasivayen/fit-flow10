import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push helpers
async function importVapidKey(privateKeyBase64url: string): Promise<CryptoKey> {
  const rawKey = base64urlToUint8Array(privateKeyBase64url);
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJWT(
  audience: string,
  subject: string,
  privateKey: CryptoKey
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 43200, sub: subject };

  const headerB64 = uint8ArrayToBase64url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const payloadB64 = uint8ArrayToBase64url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    signingInput
  );

  // Convert DER signature to raw r||s
  const sig = new Uint8Array(signatureBuffer);
  let r: Uint8Array, s: Uint8Array;
  if (sig[0] === 0x30) {
    // DER encoded
    const rLen = sig[3];
    const rStart = 4;
    r = sig.slice(rStart, rStart + rLen);
    const sLen = sig[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    s = sig.slice(sStart, sStart + sLen);
    // Pad/trim to 32 bytes
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) { const p = new Uint8Array(32); p.set(r, 32 - r.length); r = p; }
    if (s.length < 32) { const p = new Uint8Array(32); p.set(s, 32 - s.length); s = p; }
  } else {
    r = sig.slice(0, 32);
    s = sig.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const signatureB64 = uint8ArrayToBase64url(rawSig);
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

async function sendPushNotification(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string,
  payload: string
): Promise<boolean> {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const privateKey = await importVapidKey(vapidPrivateKey);
    const jwt = await createJWT(audience, subject, privateKey);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: payload,
    });

    return response.ok || response.status === 201;
  } catch (err) {
    console.error("Push send failed:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all schedules with reminders enabled
    const { data: schedules, error: schedErr } = await supabase
      .from("workout_schedules")
      .select("*")
      .eq("reminders_enabled", true);

    if (schedErr) throw schedErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let sentCount = 0;

    for (const schedule of schedules) {
      // Convert current UTC time to user's timezone
      const userNow = new Date(
        now.toLocaleString("en-US", { timeZone: schedule.timezone || "UTC" })
      );
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const currentDay = dayNames[userNow.getDay()];

      if (!schedule.workout_days?.includes(currentDay)) continue;

      const currentHour = userNow.getHours();
      const currentMinute = userNow.getMinutes();
      const [schedHour, schedMin] = (schedule.preferred_time as string)
        .split(":")
        .map(Number);

      // Check main reminder (within 1-minute window)
      const isMainTime = currentHour === schedHour && currentMinute === schedMin;

      // Check early reminder
      const earlyMin = schedule.early_reminder_minutes || 0;
      let isEarlyTime = false;
      if (earlyMin > 0) {
        const earlyTotalMin = schedHour * 60 + schedMin - earlyMin;
        const earlyH = Math.floor(earlyTotalMin / 60);
        const earlyM = earlyTotalMin % 60;
        isEarlyTime = currentHour === earlyH && currentMinute === earlyM;
      }

      if (!isMainTime && !isEarlyTime) continue;

      // Get push subscriptions for this user
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", schedule.user_id);

      if (!subs || subs.length === 0) continue;

      const message = isEarlyTime
        ? `⏰ Your workout starts in ${earlyMin} minutes! Get ready.`
        : "⏰ Time for your workout! Stay consistent and hit your goals.";

      const payload = JSON.stringify({
        title: "Workout Reminder",
        body: message,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        data: { url: "/workout" },
      });

      for (const sub of subs) {
        const ok = await sendPushNotification(
          sub.endpoint,
          vapidPublicKey,
          vapidPrivateKey,
          `mailto:noreply@guidestride.app`,
          payload
        );
        if (ok) sentCount++;
        else {
          // Remove invalid subscription
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
