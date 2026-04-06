import { json, readJson } from "../../../lib/http.js";
import { getSiteContent, putSiteContent } from "../../../lib/siteContent.js";
import { verifyAdminToken } from "../../../lib/jwt.js";

function isAdminOpen(env) {
  return ["1", "true", "yes", "on"].includes(String(env.ADMIN_OPEN || "").trim().toLowerCase());
}

function isAdminConfigured(env) {
  return Boolean(String(env.ADMIN_PASSWORD || "").trim() && String(env.ADMIN_JWT_SECRET || "").trim());
}

async function requireAdmin(env, request) {
  if (isAdminOpen(env)) return { ok: true };
  if (!isAdminConfigured(env)) return { ok: false, status: 501, error: "Admin not configured" };

  const auth = String(request.headers.get("Authorization") || "");
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Missing token" };

  const verified = await verifyAdminToken(env, token);
  if (!verified.ok) return { ok: false, status: 401, error: verified.error || "Unauthorized" };
  return { ok: true, payload: verified.payload };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const admin = await requireAdmin(env, request);
  if (!admin.ok) return json({ ok: false, error: admin.error }, { status: admin.status });
  const hit = await getSiteContent(env);
  return json({ ok: true, data: hit?.data || null, updatedAt: hit?.updatedAt || null }, { status: 200 });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const admin = await requireAdmin(env, request);
  if (!admin.ok) return json({ ok: false, error: admin.error }, { status: admin.status });

  const body = await readJson(request);
  const payload = body?.data ?? body;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ ok: false, error: "Body must be a JSON object (or { data: object })" }, { status: 400 });
  }

  const approxBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (approxBytes > 220_000) return json({ ok: false, error: "Content too large" }, { status: 413 });

  const saved = await putSiteContent(env, payload);
  return json({ ok: true, updatedAt: saved.updatedAt }, { status: 200 });
}

