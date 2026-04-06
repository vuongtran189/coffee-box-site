function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export function parseAllowedOrigins(env) {
  return String(env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);
}

export function isOriginAllowed(env, origin) {
  if (!origin) return true;
  const allowed = parseAllowedOrigins(env);
  if (allowed.length === 0) return true;
  const req = normalizeOrigin(origin);
  return allowed.some((o) => o === req);
}

export function corsHeaders(env, origin) {
  const headers = new Headers();
  if (origin && isOriginAllowed(env, origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-widget-key");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

