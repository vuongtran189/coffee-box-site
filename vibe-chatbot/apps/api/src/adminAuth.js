import crypto from "node:crypto";

function b64urlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecodeToBuffer(input) {
  const s = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(`${s}${pad}`, "base64");
}

function timingSafeEqualString(a, b) {
  const aa = Buffer.from(String(a ?? ""), "utf8");
  const bb = Buffer.from(String(b ?? ""), "utf8");
  const len = Math.max(aa.length, bb.length);
  const pa = Buffer.concat([aa, Buffer.alloc(len - aa.length)]);
  const pb = Buffer.concat([bb, Buffer.alloc(len - bb.length)]);
  return crypto.timingSafeEqual(pa, pb) && aa.length === bb.length;
}

export function isAdminConfigured(env) {
  return Boolean(String(env.ADMIN_PASSWORD || "").trim() && String(env.ADMIN_JWT_SECRET || "").trim());
}

export function verifyAdminPassword(env, password) {
  const expected = String(env.ADMIN_PASSWORD || "");
  if (!expected) return false;
  return timingSafeEqualString(expected, String(password || ""));
}

export function createAdminToken(env) {
  const secret = String(env.ADMIN_JWT_SECRET || "");
  if (!secret) throw new Error("Missing ADMIN_JWT_SECRET");

  const header = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Number(env.ADMIN_TOKEN_TTL_SECONDS || 7 * 24 * 3600);
  const payload = b64urlEncode(JSON.stringify({ sub: "admin", iat: now, exp }));
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64urlEncode(sig)}`;
}

export function verifyAdminToken(env, token) {
  const secret = String(env.ADMIN_JWT_SECRET || "");
  if (!secret) return { ok: false, error: "Server misconfigured" };

  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { ok: false, error: "Invalid token" };
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest();
  const got = b64urlDecodeToBuffer(s);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
    return { ok: false, error: "Invalid token" };
  }

  let payload = null;
  try {
    payload = JSON.parse(b64urlDecodeToBuffer(p).toString("utf8"));
  } catch {
    return { ok: false, error: "Invalid token" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || now >= payload.exp) return { ok: false, error: "Token expired" };
  if (payload?.sub !== "admin") return { ok: false, error: "Invalid token" };
  return { ok: true, payload };
}

export function requireAdmin(env) {
  return function requireAdminMiddleware(req, res, next) {
    if (!isAdminConfigured(env)) {
      return res.status(501).json({ ok: false, error: "Admin not configured" });
    }
    const auth = String(req.headers.authorization || "");
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

    const verified = verifyAdminToken(env, token);
    if (!verified.ok) return res.status(401).json({ ok: false, error: verified.error || "Unauthorized" });
    req.admin = verified.payload;
    next();
  };
}

