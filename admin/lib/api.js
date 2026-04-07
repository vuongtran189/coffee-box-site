import { setConnPill } from "./dom.js";

function apiUrl(apiBase, path) {
  let base = String(apiBase || "").trim();
  while (base.endsWith("/")) base = base.slice(0, -1);
  return `${base}${path}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientApiError(err) {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("HTTP 502") ||
    msg.includes("HTTP 503") ||
    msg.includes("HTTP 504") ||
    msg.toLowerCase().includes("bad gateway") ||
    msg.toLowerCase().includes("service unavailable")
  );
}

async function withRetries(fn, { retries = 2, baseDelayMs = 650, onRetry } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !isTransientApiError(err)) throw err;
      const wait = baseDelayMs * Math.pow(1.7, attempt);
      onRetry?.({ attempt: attempt + 1, waitMs: Math.round(wait), err });
      await sleep(wait);
    }
  }
  throw lastErr;
}

export async function probeHealth(apiBase) {
  const res = await fetch(apiUrl(apiBase, "/health"), { method: "GET", cache: "no-store" });
  return res.ok;
}

export async function apiFetch(state, path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  const method = String(opts.method || "GET").toUpperCase();
  const hasBody = opts.body != null && String(opts.body).length > 0;
  if (hasBody || method === "POST" || method === "PUT" || method === "PATCH") headers.set("content-type", "application/json");
  if (state.widgetKey) headers.set("x-widget-key", state.widgetKey);
  if (state.token && path.startsWith("/v1/admin/") && path !== "/v1/admin/login") {
    headers.set("authorization", `Bearer ${state.token}`);
  }

  let res;
  try {
    res = await fetch(apiUrl(state.apiBase, path), { ...opts, headers });
  } catch (err) {
    const ok = await probeHealth(state.apiBase).catch(() => false);
    if (ok) throw new Error("CORS blocked. Kiểm tra CORS_ORIGINS trên Cloudflare Pages.");
    throw new Error("Không kết nối được API. Kiểm tra /health hoặc chờ deploy xong.");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function loadCms(state) {
  setConnPill("warn", "Đang tải…");
  const res = await withRetries(() => apiFetch(state, "/v1/admin/site/content", { method: "GET" }), {
    onRetry: ({ attempt }) => setConnPill("warn", `Thử lại… (${attempt})`)
  });
  setConnPill("ok", "Đã kết nối");
  return { data: res?.data || {}, updatedAt: res?.updatedAt || null };
}

export async function saveCms(state, data) {
  const res = await withRetries(() => apiFetch(state, "/v1/admin/site/content", { method: "PUT", body: JSON.stringify({ data }) }));
  return { updatedAt: res?.updatedAt || null };
}

export async function login(state, password) {
  const pwd = String(password || "");
  if (!pwd) throw new Error("Thiếu admin password");
  const res = await apiFetch(state, "/v1/admin/login", { method: "POST", body: JSON.stringify({ password: pwd }) });
  if (!res?.ok) throw new Error(res?.error || "Login failed");
  return String(res?.token || "");
}

