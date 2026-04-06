import { corsHeaders } from "./lib/cors.js";
import { json } from "./lib/http.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "";
  return json({ ok: true }, { status: 200, headers: corsHeaders(env, origin) });
}

