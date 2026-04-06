import { corsHeaders, isOriginAllowed } from "../lib/cors.js";
import { json } from "../lib/http.js";

function requireWidgetKey(env, request) {
  const requiredKey = String(env.WIDGET_PUBLIC_KEY || "").trim();
  if (!requiredKey) return { ok: false, status: 500, error: "Server misconfigured" };
  if (request.method === "OPTIONS") return { ok: true };
  const provided = String(request.headers.get("x-widget-key") || "").trim();
  if (!provided || provided !== requiredKey) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "";

  if (origin && !isOriginAllowed(env, origin)) {
    return json({ ok: false, error: "CORS blocked" }, { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
  }

  const widget = requireWidgetKey(env, request);
  if (!widget.ok) {
    return json({ ok: false, error: widget.error }, { status: widget.status, headers: corsHeaders(env, origin) });
  }

  const res = await context.next();
  const headers = new Headers(res.headers);
  const add = corsHeaders(env, origin);
  for (const [k, v] of add.entries()) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

