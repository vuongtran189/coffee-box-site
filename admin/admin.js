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
    token: localStorage.getItem("vibe_admin_token") || ""
  };
}

function writeState(patch) {
  const next = { ...readState(), ...patch };
  localStorage.setItem("vibe_admin_api_base", next.apiBase);
  localStorage.setItem("vibe_admin_widget_key", next.widgetKey);
  if (next.token) localStorage.setItem("vibe_admin_token", next.token);
  else localStorage.removeItem("vibe_admin_token");
  return next;
}

function apiUrl(apiBase, path) {
  const base = String(apiBase || "").replace(/\/$/, "");
  return `${base}${path}`;
}

async function apiFetch(state, path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  headers.set("content-type", "application/json");
  if (state.widgetKey) headers.set("x-widget-key", state.widgetKey);
  if (state.token) headers.set("authorization", `Bearer ${state.token}`);

  const res = await fetch(apiUrl(state.apiBase, path), { ...opts, headers });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function showEditor(visible) {
  $("login").hidden = visible;
  $("editor").hidden = !visible;
  $("btn-logout").hidden = !visible;
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

async function bootstrap() {
  const loginStatus = $("login-status");
  const editorStatus = $("editor-status");
  const apiBaseInput = $("api-base");
  const widgetKeyInput = $("widget-key");
  const passwordInput = $("password");
  const jsonTextarea = $("json");

  let state = readState();
  apiBaseInput.value = state.apiBase || DEFAULT_API_BASE;
  widgetKeyInput.value = state.widgetKey || "";

  apiBaseInput.addEventListener("change", () => {
    state = writeState({ apiBase: apiBaseInput.value.trim() || DEFAULT_API_BASE });
  });
  widgetKeyInput.addEventListener("change", () => {
    state = writeState({ widgetKey: widgetKeyInput.value.trim() });
  });

  async function tryLoadCurrent() {
    setStatus(editorStatus, "Đang tải...");
    const data = await apiFetch(state, "/v1/admin/site/content", { method: "GET" });
    jsonTextarea.value = data?.data ? prettyJson(data.data) : "";
    setStatus(editorStatus, data?.updatedAt ? `Lần cập nhật gần nhất: ${data.updatedAt}` : "Chưa có nội dung trong MongoDB.");
  }

  $("btn-login").addEventListener("click", async () => {
    try {
      setStatus(loginStatus, "Đang đăng nhập...");
      state = writeState({ apiBase: apiBaseInput.value.trim() || DEFAULT_API_BASE, widgetKey: widgetKeyInput.value.trim() });

      const password = passwordInput.value;
      const res = await apiFetch(
        { ...state, token: "" },
        "/v1/admin/login",
        { method: "POST", body: JSON.stringify({ password }) }
      );
      state = writeState({ token: String(res.token || "") });
      passwordInput.value = "";
      showEditor(true);
      await tryLoadCurrent();
      setStatus(loginStatus, "");
    } catch (err) {
      setStatus(loginStatus, String(err?.message || err), "error");
    }
  });

  $("btn-logout").addEventListener("click", () => {
    state = writeState({ token: "" });
    showEditor(false);
    setStatus(editorStatus, "");
    setStatus(loginStatus, "");
  });

  $("btn-load").addEventListener("click", async () => {
    try {
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

  // Auto-login if token exists
  if (state.token) {
    showEditor(true);
    try {
      await tryLoadCurrent();
    } catch (err) {
      // Token might be expired; force logout.
      state = writeState({ token: "" });
      showEditor(false);
      setStatus(loginStatus, "Phiên đăng nhập đã hết hạn. Đăng nhập lại.", "error");
    }
  } else {
    showEditor(false);
  }
}

bootstrap().catch((err) => {
  console.error(err);
});
