const DEFAULT_API_BASE = "https://vibe-chatbot-api.onrender.com";

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
    apiBase: localStorage.getItem("vibe_admin_api_base") || DEFAULT_API_BASE,
    widgetKey: localStorage.getItem("vibe_admin_widget_key") || "",
    token: ""
  };
}

function writeState(patch) {
  const next = { ...readState(), ...patch };
  localStorage.setItem("vibe_admin_api_base", next.apiBase);
  localStorage.setItem("vibe_admin_widget_key", next.widgetKey);
  return next;
}

function apiUrl(apiBase, path) {
  let base = String(apiBase || "").trim();
  while (base.endsWith("/")) base = base.slice(0, -1);
  return `${base}${path}`;
}

async function apiFetch(state, path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  headers.set("content-type", "application/json");
  if (state.widgetKey) headers.set("x-widget-key", state.widgetKey);

  const res = await fetch(apiUrl(state.apiBase, path), { ...opts, headers });
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
    const data = await apiFetch(state, "/v1/admin/site/content", { method: "GET" });
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

  $("btn-save-settings")?.addEventListener("click", () => {
    state = writeState({
      apiBase: apiBaseInput.value.trim() || DEFAULT_API_BASE,
      widgetKey: widgetKeyInput.value.trim()
    });
    setStatus(loginStatus, "Đã lưu.");
    closeSettings();
  });

  $("btn-load").addEventListener("click", async () => {
    try {
      if (!(await ensureAuth())) return;
      await tryLoadCurrent();
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
    }
  });

  $("btn-import").addEventListener("click", async () => {
    try {
      setStatus(editorStatus, "Đang nhập từ /assets/cms-data.json ...");
      const res = await fetch("/assets/cms-data.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Không tải được /assets/cms-data.json (HTTP ${res.status})`);
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
