function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

function clamp(value, maxLen) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function normalizePhone(raw) {
  const s = String(raw ?? "").trim();
  const digits = s.replace(/[^\d+]/g, "");
  return digits.slice(0, 32);
}

async function parseRequestBody(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    return body && typeof body === "object" ? body : null;
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    const obj = {};
    for (const [k, v] of form.entries()) {
      obj[k] = typeof v === "string" ? v : "";
    }
    return obj;
  }

  return null;
}

async function forwardToWebhook(env, payload) {
  if (!env.LEAD_WEBHOOK_URL) return { ok: false, skipped: true };
  const headers = new Headers({ "Content-Type": "application/json" });
  if (env.LEAD_WEBHOOK_TOKEN) headers.set("Authorization", `Bearer ${env.LEAD_WEBHOOK_TOKEN}`);
  const res = await fetch(env.LEAD_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}

async function sendViaMailchannels(env, payload) {
  if (!env.LEAD_EMAIL_TO || !env.LEAD_EMAIL_FROM) return { ok: false, skipped: true };

  const lines = [
    `Họ tên: ${payload.name}`,
    `SĐT: ${payload.phone}`,
    payload.email ? `Email: ${payload.email}` : null,
    payload.need ? `Nhu cầu: ${payload.need}` : null,
    payload.message ? `Nội dung: ${payload.message}` : null,
    "",
    `Trang: ${payload.page || ""}`,
    `Thời gian: ${payload.created_at || ""}`,
    payload.ip ? `IP: ${payload.ip}` : null,
    payload.ua ? `UA: ${payload.ua}` : null,
  ].filter(Boolean);

  const subject = `[Vibe Coffee] Liên hệ mới: ${payload.name} (${payload.phone})`;
  const body = {
    personalizations: [{ to: [{ email: env.LEAD_EMAIL_TO }] }],
    from: { email: env.LEAD_EMAIL_FROM, name: env.LEAD_EMAIL_FROM_NAME || "Vibe Coffee Website" },
    subject,
    content: [{ type: "text/plain", value: lines.join("\n") }],
  };

  const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { ok: res.ok, status: res.status };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const body = await parseRequestBody(request);
  if (!body) {
    return json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const honeypot = clamp(body.company, 120);
  if (honeypot) {
    return json({ ok: true, spam: true }, { status: 200 });
  }

  const ts = Number(body.form_ts || 0);
  const now = Date.now();
  if (Number.isFinite(ts) && ts > 0 && now - ts < 1500) {
    return json({ ok: true, spam: true }, { status: 200 });
  }

  const payload = {
    name: clamp(body.name, 80),
    phone: normalizePhone(body.phone),
    email: clamp(body.email, 160),
    need: clamp(body.need, 160),
    message: clamp(body.message, 2000),
    page: clamp(body.page, 240),
    created_at: new Date().toISOString(),
    ip: context.request.headers.get("CF-Connecting-IP") || "",
    ua: context.request.headers.get("User-Agent") || "",
  };

  if (!payload.name || !payload.phone) {
    return json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  try {
    const webhook = await forwardToWebhook(env, payload);
    if (webhook.ok) return json({ ok: true, delivered: "webhook" }, { status: 200 });

    const mail = await sendViaMailchannels(env, payload);
    if (mail.ok) return json({ ok: true, delivered: "email" }, { status: 200 });

    return json(
      {
        ok: true,
        delivered: null,
        configured: false,
        message:
          "Lead received but delivery is not configured. Set LEAD_WEBHOOK_URL or LEAD_EMAIL_TO/LEAD_EMAIL_FROM.",
      },
      { status: 202 }
    );
  } catch (err) {
    return json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

