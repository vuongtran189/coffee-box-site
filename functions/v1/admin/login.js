import { json, readJson } from "../../lib/http.js";
import { createAdminToken } from "../../lib/jwt.js";

function isAdminOpen(env) {
  return ["1", "true", "yes", "on"].includes(String(env.ADMIN_OPEN || "").trim().toLowerCase());
}

function isAdminConfigured(env) {
  return Boolean(String(env.ADMIN_PASSWORD || "").trim() && String(env.ADMIN_JWT_SECRET || "").trim());
}

function timingSafeEqualString(a, b) {
  const aa = new TextEncoder().encode(String(a ?? ""));
  const bb = new TextEncoder().encode(String(b ?? ""));
  const len = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    const av = i < aa.length ? aa[i] : 0;
    const bv = i < bb.length ? bb[i] : 0;
    diff |= av ^ bv;
  }
  return diff === 0;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!isAdminConfigured(env)) {
    if (isAdminOpen(env)) return json({ ok: true, token: "" }, { status: 200 });
    return json({ ok: false, error: "Admin not configured" }, { status: 501 });
  }

  const body = await readJson(request);
  const password = String(body?.password || "");
  const expected = String(env.ADMIN_PASSWORD || "");
  if (!expected || !timingSafeEqualString(expected, password)) {
    return json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createAdminToken(env);
  return json({ ok: true, token }, { status: 200 });
}

