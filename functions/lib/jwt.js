function b64urlEncodeBytes(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecodeToBytes(input) {
  const s = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const binary = atob(`${s}${pad}`);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function timingSafeEqualBytes(a, b) {
  const aa = a instanceof Uint8Array ? a : new Uint8Array(a);
  const bb = b instanceof Uint8Array ? b : new Uint8Array(b);
  const len = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    const av = i < aa.length ? aa[i] : 0;
    const bv = i < bb.length ? bb[i] : 0;
    diff |= av ^ bv;
  }
  return diff === 0;
}

async function hmacSha256(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify"
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

export async function createAdminToken(env) {
  const secret = String(env.ADMIN_JWT_SECRET || "").trim();
  if (!secret) throw new Error("Missing ADMIN_JWT_SECRET");

  const header = b64urlEncodeBytes(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Number(env.ADMIN_TOKEN_TTL_SECONDS || 7 * 24 * 3600);
  const payload = b64urlEncodeBytes(new TextEncoder().encode(JSON.stringify({ sub: "admin", iat: now, exp })));
  const data = `${header}.${payload}`;
  const sig = await hmacSha256(secret, data);
  return `${data}.${b64urlEncodeBytes(sig)}`;
}

export async function verifyAdminToken(env, token) {
  const secret = String(env.ADMIN_JWT_SECRET || "").trim();
  if (!secret) return { ok: false, error: "Server misconfigured" };

  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { ok: false, error: "Invalid token" };
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = await hmacSha256(secret, data);
  let got;
  try {
    got = b64urlDecodeToBytes(s);
  } catch {
    return { ok: false, error: "Invalid token" };
  }
  if (!timingSafeEqualBytes(got, expected)) return { ok: false, error: "Invalid token" };

  let payload = null;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecodeToBytes(p)));
  } catch {
    return { ok: false, error: "Invalid token" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || now >= payload.exp) return { ok: false, error: "Token expired" };
  if (payload?.sub !== "admin") return { ok: false, error: "Invalid token" };
  return { ok: true, payload };
}

