const DEFAULT_API_BASE = "https://vibe-chatbot-api.onrender.com";
const LS_API_BASE = "vibe_admin_api_base";
const LS_WIDGET_KEY = "vibe_admin_widget_key";
const LS_TOKEN = "vibe_admin_token";

function $(id) {
  return document.getElementById(id);
}

function setStatus(el, msg, type = "info") {
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = type === "error" ? "var(--danger)" : "";
}

function readState() {
  return {
    apiBase: localStorage.getItem(LS_API_BASE) || DEFAULT_API_BASE,
    widgetKey: localStorage.getItem(LS_WIDGET_KEY) || "",
    token: localStorage.getItem(LS_TOKEN) || ""
  };
}

function writeState(patch) {
  const next = { ...readState(), ...patch };
  localStorage.setItem(LS_API_BASE, next.apiBase);
  localStorage.setItem(LS_WIDGET_KEY, next.widgetKey);
  if (patch.token !== undefined) localStorage.setItem(LS_TOKEN, next.token || "");
  return next;
}

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
    msg.includes("Failed to fetch (network)") ||
    msg.includes("Failed to fetch (CORS)") ||
    msg.includes("HTTP 502") ||
    msg.includes("HTTP 503") ||
    msg.includes("HTTP 504") ||
    msg.toLowerCase().includes("bad gateway") ||
    msg.toLowerCase().includes("service unavailable")
  );
}

async function withRetries(fn, { retries = 3, baseDelayMs = 900, onRetry } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !isTransientApiError(err)) throw err;
      const wait = baseDelayMs * Math.pow(1.6, attempt);
      onRetry?.({ attempt: attempt + 1, waitMs: Math.round(wait), err });
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function probeHealth(apiBase) {
  try {
    const res = await fetch(apiUrl(apiBase, "/health"), { method: "GET", cache: "no-store" });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function apiFetch(state, path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  const method = String(opts.method || "GET").toUpperCase();
  const hasBody = opts.body != null && String(opts.body).length > 0;
  if (hasBody || method === "POST" || method === "PUT" || method === "PATCH") {
    headers.set("content-type", "application/json");
  }
  if (state.widgetKey) headers.set("x-widget-key", state.widgetKey);
  if (state.token && path.startsWith("/v1/admin/") && path !== "/v1/admin/login") {
    headers.set("authorization", `Bearer ${state.token}`);
  }

  let res;
  try {
    res = await fetch(apiUrl(state.apiBase, path), { ...opts, headers });
  } catch (err) {
    const msg = String(err?.message || err);
    if (/failed to fetch/i.test(msg)) {
      const health = await probeHealth(state.apiBase);
      if (health.ok) {
        throw new Error("Failed to fetch (CORS). API vẫn sống (/health OK) nhưng trình duyệt chặn do thiếu CORS header. Kiểm tra CORS_ORIGINS trên Render có include đúng origin của trang /admin/ (vd https://vibecoffee.vn) và restart service.");
      }
      throw new Error("Failed to fetch (network). Không kết nối được API (Render có thể đang sleep/khởi động). Mở /health để kiểm tra và thử lại sau 30–60 giây.");
    }
    throw err;
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

async function bootstrap() {
  const loginStatus = $("login-status");
  const editorStatus = $("editor-status");
  const apiBaseInput = $("api-base");
  const widgetKeyInput = $("widget-key");
  const adminPasswordInput = $("admin-password");
  const jsonTextarea = $("json");
  const settingsModal = $("settings-modal");

  let state = readState();
  apiBaseInput.value = state.apiBase || DEFAULT_API_BASE;
  widgetKeyInput.value = state.widgetKey || "";

  apiBaseInput.addEventListener("change", () => {
    state = writeState({ apiBase: apiBaseInput.value.trim() || DEFAULT_API_BASE });
  });
  widgetKeyInput.addEventListener("change", () => {
    state = writeState({ widgetKey: widgetKeyInput.value.trim() });
  });

  function setToken(token) {
    state = writeState({ token: String(token || "") });
  }

  function openSettings() {
    if (!settingsModal) return;
    settingsModal.hidden = false;
    settingsModal.setAttribute("aria-hidden", "false");
    setStatus(loginStatus, "");
    setTimeout(() => apiBaseInput?.focus?.(), 0);
  }

  function closeSettings() {
    if (!settingsModal) return;
    settingsModal.hidden = true;
    settingsModal.setAttribute("aria-hidden", "true");
  }

  $("btn-settings")?.addEventListener("click", openSettings);
  settingsModal?.addEventListener("click", (event) => {
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    if (el.closest("[data-close=\"1\"]")) closeSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSettings();
  });

  async function tryLoadCurrent() {
    setStatus(editorStatus, "Đang tải...");
    const data = await withRetries(
      () => apiFetch(state, "/v1/admin/site/content", { method: "GET" }),
      {
        retries: 3,
        onRetry: ({ attempt, waitMs }) => {
          setStatus(editorStatus, `API đang khởi động/chập chờn. Thử lại lần ${attempt} sau ${Math.ceil(waitMs / 1000)}s...`);
        }
      }
    );
    jsonTextarea.value = data?.data ? prettyJson(data.data) : "";
    setStatus(editorStatus, data?.updatedAt ? `Lần cập nhật gần nhất: ${data.updatedAt}` : "Chưa có nội dung trong MongoDB.");
  }

  async function ensureAuth() {
    if (!state.widgetKey) {
      setStatus(editorStatus, "Thiếu widget key. Bấm “Cài đặt” để nhập.", "error");
      openSettings();
      return false;
    }
    return true;
  }

  async function login(password) {
    if (!(await ensureAuth())) return false;
    const pwd = String(password || "");
    if (!pwd) {
      setStatus(loginStatus, "Nhập admin password để đăng nhập.", "error");
      return false;
    }
    setStatus(loginStatus, "Đang đăng nhập...");
    const res = await withRetries(
      () =>
        apiFetch(state, "/v1/admin/login", {
          method: "POST",
          body: JSON.stringify({ password: pwd })
        }),
      {
        retries: 3,
        onRetry: ({ attempt, waitMs }) => {
          setStatus(loginStatus, `API đang khởi động/chập chờn. Thử lại lần ${attempt} sau ${Math.ceil(waitMs / 1000)}s...`);
        }
      }
    );
    if (!res?.ok) throw new Error(res?.error || "Login failed");
    setToken(res?.token || "");
    setStatus(loginStatus, state.token ? "Đã đăng nhập." : "Đã đăng nhập (admin open).");
    if (adminPasswordInput) adminPasswordInput.value = "";
    return true;
  }

  function logout() {
    setToken("");
    setStatus(loginStatus, "Đã đăng xuất.");
  }

  $("btn-save-settings")?.addEventListener("click", () => {
    state = writeState({
      apiBase: apiBaseInput.value.trim() || DEFAULT_API_BASE,
      widgetKey: widgetKeyInput.value.trim()
    });
    setStatus(loginStatus, "Đã lưu.");
    closeSettings();
  });

  $("btn-login")?.addEventListener("click", async () => {
    try {
      state = writeState({
        apiBase: apiBaseInput.value.trim() || DEFAULT_API_BASE,
        widgetKey: widgetKeyInput.value.trim()
      });
      const ok = await login(adminPasswordInput?.value || "");
      if (!ok) return;
      closeSettings();
      await tryLoadCurrent();
    } catch (err) {
      setStatus(loginStatus, String(err?.message || err), "error");
    }
  });

  $("btn-logout")?.addEventListener("click", () => {
    logout();
  });

  $("btn-load").addEventListener("click", async () => {
    try {
      if (!(await ensureAuth())) return;
      await tryLoadCurrent();
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
      if (String(err?.message || err).toLowerCase().includes("token")) openSettings();
    }
  });

  $("btn-import").addEventListener("click", async () => {
    try {
      const url = new URL("../assets/cms-data.json", window.location.href).toString();
      setStatus(editorStatus, `Đang nhập từ ${url} ...`);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Không tải được cms-data.json (HTTP ${res.status})`);
      const text = await res.text();
      const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
      const parsed = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("File cms-data.json không hợp lệ");
      jsonTextarea.value = prettyJson(parsed);
      setStatus(editorStatus, "Đã nhập từ file đang chạy. Bấm “Lưu (MongoDB)” để áp dụng.");
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
    }
  });

  $("btn-format").addEventListener("click", () => {
    try {
      const parsed = JSON.parse(jsonTextarea.value || "null");
      if (!parsed || typeof parsed !== "object") throw new Error("JSON phải là object");
      jsonTextarea.value = prettyJson(parsed);
      setStatus(editorStatus, "Đã format.");
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
    }
  });

  $("btn-save").addEventListener("click", async () => {
    try {
      if (!(await ensureAuth())) return;
      setStatus(editorStatus, "Đang lưu...");
      const parsed = JSON.parse(jsonTextarea.value || "null");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("JSON phải là object");
      }
      const res = await apiFetch(state, "/v1/admin/site/content", {
        method: "PUT",
        body: JSON.stringify({ data: parsed })
      });
      setStatus(editorStatus, `Đã lưu. updatedAt: ${res.updatedAt || "OK"}`);
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
      if (String(err?.message || err).toLowerCase().includes("token")) openSettings();
    }
  });

  // Always show editor; prompt for settings if needed.
  if (await ensureAuth()) {
    try {
      await tryLoadCurrent();
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
      openSettings();
    }
  }
}

bootstrap().catch((err) => {
  console.error(err);
});
