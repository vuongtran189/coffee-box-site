import { CMS_SCHEMA } from "./schema.js";

const DEFAULT_API_BASE = "https://cms.vibecoffee.vn";
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
  const storedApiBase = localStorage.getItem(LS_API_BASE) || "";
  const migratedApiBase = storedApiBase.includes("onrender.com") ? "" : storedApiBase;
  return {
    apiBase: migratedApiBase || DEFAULT_API_BASE,
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
        throw new Error(
          "Failed to fetch (CORS). API vẫn sống (/health OK) nhưng trình duyệt chặn do thiếu CORS header. Kiểm tra CORS_ORIGINS trên Cloudflare Pages có include đúng origin của trang /admin/ (vd https://vibecoffee.vn)."
        );
      }
      throw new Error(
        "Failed to fetch (network). Không kết nối được API (có thể đang deploy). Mở /health để kiểm tra và thử lại sau 30–60 giây."
      );
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

function safeParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(String(text || "")) };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

function isNumericSegment(seg) {
  return /^[0-9]+$/.test(String(seg));
}

function getAtPath(root, path) {
  const parts = String(path || "").split(".").filter(Boolean);
  let cur = root;
  for (const part of parts) {
    if (cur == null) return undefined;
    const key = isNumericSegment(part) ? Number(part) : part;
    cur = cur?.[key];
  }
  return cur;
}

function ensureContainerForNext(cur, nextPart) {
  const wantsArray = isNumericSegment(nextPart);
  if (cur == null || typeof cur !== "object") return wantsArray ? [] : {};
  if (wantsArray && !Array.isArray(cur)) return [];
  if (!wantsArray && Array.isArray(cur)) return {};
  return cur;
}

function setAtPath(root, path, value) {
  const parts = String(path || "").split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    const key = isNumericSegment(part) ? Number(part) : part;
    const next = cur[key];
    const ensured = ensureContainerForNext(next, nextPart);
    cur[key] = ensured;
    cur = ensured;
  }
  const last = parts[parts.length - 1];
  const lastKey = isNumericSegment(last) ? Number(last) : last;
  cur[lastKey] = value;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null) continue;
    if (k === "class") node.className = String(v);
    else if (k === "text") node.textContent = String(v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = String(v);
    else node.setAttribute(k, String(v));
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function normalizeString(v) {
  return String(v ?? "");
}

function normalizeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function renderField({ data, onChange, fullPath, field }) {
  const value = getAtPath(data, fullPath);
  const label = el("span", { text: field.label });

  if (field.type === "text") {
    const input = el("textarea", { rows: "3" });
    input.value = normalizeString(value);
    input.addEventListener("input", () => onChange(fullPath, input.value));
    return el("label", { class: "field" }, [label, input]);
  }

  if (field.type === "number") {
    const input = el("input", { type: "number", step: "1" });
    input.value = value === undefined || value === null ? "" : String(value);
    input.addEventListener("input", () => {
      const v = input.value === "" ? "" : Number(input.value);
      onChange(fullPath, Number.isFinite(v) ? v : "");
    });
    return el("label", { class: "field" }, [label, input]);
  }

  if (field.type === "select") {
    const select = el("select");
    for (const opt of field.options || []) {
      const o = el("option", { value: opt, text: opt });
      select.appendChild(o);
    }
    select.value = String(value ?? "");
    select.addEventListener("change", () => onChange(fullPath, select.value));
    return el("label", { class: "field" }, [label, select]);
  }

  if (field.type === "image") {
    const input = el("input", { type: "url", placeholder: "https://..." });
    input.value = normalizeString(value);
    const img = el("img", { class: "img-preview", alt: field.label });
    img.hidden = !input.value;
    if (input.value) img.src = input.value;
    input.addEventListener("input", () => {
      const v = input.value.trim();
      onChange(fullPath, v);
      img.hidden = !v;
      if (v) img.src = v;
    });
    return el("div", { class: "field" }, [label, input, img]);
  }

  // default: string
  const input = el("input", { type: "text" });
  input.value = normalizeString(value);
  input.addEventListener("input", () => onChange(fullPath, input.value));
  return el("label", { class: "field" }, [label, input]);
}

function renderListString({ data, onChange, fullPath, field, rerender }) {
  const arr = Array.isArray(getAtPath(data, fullPath)) ? getAtPath(data, fullPath) : [];
  const wrap = el("div", { class: "field" }, [el("span", { text: field.label })]);
  const list = el("div", { class: "list" });

  arr.forEach((val, idx) => {
    const input = el("input", { type: "text" });
    input.value = normalizeString(val);
    input.addEventListener("input", () => {
      const next = arr.slice();
      next[idx] = input.value;
      onChange(fullPath, next);
    });
    const btnRemove = el("button", {
      class: "btn btn-ghost",
      type: "button",
      text: "Xóa",
      onclick: () => {
        const next = arr.slice();
        next.splice(idx, 1);
        onChange(fullPath, next);
        rerender();
      }
    });
    list.appendChild(el("div", { class: "list-item" }, [el("div", { class: "list-item__head" }, [
      el("div", { class: "list-item__title", text: `#${idx + 1}` }),
      el("div", { class: "list-item__actions" }, [btnRemove])
    ]), input]));
  });

  const btnAdd = el("button", {
    class: "btn",
    type: "button",
    text: "Thêm",
    onclick: () => {
      const next = arr.slice();
      next.push("");
      onChange(fullPath, next);
      rerender();
    }
  });

  wrap.appendChild(list);
  wrap.appendChild(el("div", { class: "row row-end" }, [btnAdd]));
  return wrap;
}

function renderListObject({ data, onChange, fullPath, field, rerender }) {
  const arr = Array.isArray(getAtPath(data, fullPath)) ? getAtPath(data, fullPath) : [];
  const wrap = el("div", { class: "field" }, [el("span", { text: field.label })]);
  const list = el("div", { class: "list" });

  const itemTitle = (item) => {
    const t = field.itemTitlePath ? getAtPath(item, field.itemTitlePath) : "";
    return String(t || "").trim() || "(chưa đặt tên)";
  };

  arr.forEach((item, idx) => {
    const head = el("div", { class: "list-item__head" });
    head.appendChild(el("div", { class: "list-item__title", text: `${idx + 1}. ${itemTitle(item)}` }));

    const actions = el("div", { class: "list-item__actions" });
    const btnUp = el("button", {
      class: "btn btn-ghost",
      type: "button",
      text: "↑",
      onclick: () => {
        if (idx === 0) return;
        const next = arr.slice();
        const tmp = next[idx - 1];
        next[idx - 1] = next[idx];
        next[idx] = tmp;
        onChange(fullPath, next);
        rerender();
      }
    });
    const btnDown = el("button", {
      class: "btn btn-ghost",
      type: "button",
      text: "↓",
      onclick: () => {
        if (idx === arr.length - 1) return;
        const next = arr.slice();
        const tmp = next[idx + 1];
        next[idx + 1] = next[idx];
        next[idx] = tmp;
        onChange(fullPath, next);
        rerender();
      }
    });
    const btnRemove = el("button", {
      class: "btn btn-ghost",
      type: "button",
      text: "Xóa",
      onclick: () => {
        const next = arr.slice();
        next.splice(idx, 1);
        onChange(fullPath, next);
        rerender();
      }
    });
    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnRemove);
    head.appendChild(actions);

    const body = el("div");
    const base = `${fullPath}.${idx}`;
    for (const sub of field.fields || []) {
      const subPath = `${base}.${sub.path}`;
      if (sub.type === "list_string") {
        body.appendChild(renderListString({ data, onChange, fullPath: subPath, field: sub, rerender }));
      } else {
        body.appendChild(renderField({ data, onChange, fullPath: subPath, field: sub }));
      }
    }

    list.appendChild(el("div", { class: "list-item" }, [head, body]));
  });

  const btnAdd = el("button", {
    class: "btn",
    type: "button",
    text: "Thêm mục",
    onclick: () => {
      const next = arr.slice();
      next.push({});
      onChange(fullPath, next);
      rerender();
    }
  });

  wrap.appendChild(list);
  wrap.appendChild(el("div", { class: "row row-end" }, [btnAdd]));
  return wrap;
}

function renderGroup({ container, data, onChange, fields, rerender, title }) {
  if (title) container.appendChild(el("div", { class: "section-title", text: title }));
  for (const field of fields || []) {
    if (field.fields && !field.type) {
      const groupPanel = el("div", { class: "panel" });
      renderGroup({ container: groupPanel, data, onChange, fields: field.fields, rerender, title: field.title });
      container.appendChild(groupPanel);
      continue;
    }

    if (field.type === "list_string") {
      container.appendChild(renderListString({ data, onChange, fullPath: field.path, field, rerender }));
      continue;
    }

    if (field.type === "list_object") {
      container.appendChild(renderListObject({ data, onChange, fullPath: field.path, field, rerender }));
      continue;
    }

    container.appendChild(renderField({ data, onChange, fullPath: field.path, field }));
  }
}

async function bootstrap() {
  const loginStatus = $("login-status");
  const editorStatus = $("editor-status");
  const apiBaseInput = $("api-base");
  const widgetKeyInput = $("widget-key");
  const adminPasswordInput = $("admin-password");
  const jsonField = $("json-field");
  const jsonTextarea = $("json");
  const formWrap = $("form-wrap");
  const tabForm = $("tab-form");
  const tabJson = $("tab-json");
  const settingsModal = $("settings-modal");

  let state = readState();
  apiBaseInput.value = state.apiBase || DEFAULT_API_BASE;
  widgetKeyInput.value = state.widgetKey || "";

  let mode = "form";
  let data = {};
  let jsonDirty = false;

  function setToken(token) {
    state = writeState({ token: String(token || "") });
  }

  function setMode(nextMode) {
    mode = nextMode === "json" ? "json" : "form";
    const isJson = mode === "json";
    tabForm?.setAttribute("aria-selected", String(!isJson));
    tabJson?.setAttribute("aria-selected", String(isJson));
    if (jsonField) jsonField.hidden = !isJson;
    if (formWrap) formWrap.hidden = isJson;
    if (isJson) {
      jsonDirty = false;
      jsonTextarea.value = prettyJson(data);
      jsonTextarea.focus();
    }
  }

  function rerenderForm() {
    if (!formWrap) return;
    formWrap.innerHTML = "";

    const onChange = (path, value) => {
      setAtPath(data, path, value);
      if (!jsonDirty && mode !== "json") jsonTextarea.value = prettyJson(data);
    };

    const rerender = () => {
      rerenderForm();
      if (!jsonDirty && mode !== "json") jsonTextarea.value = prettyJson(data);
    };

    for (const section of CMS_SCHEMA) {
      formWrap.appendChild(el("div", { class: "section-title", text: section.title }));
      const panel = el("div", { class: "panel" });
      renderGroup({ container: panel, data, onChange, fields: section.fields, rerender });
      formWrap.appendChild(panel);
    }
  }

  function setEditorData(nextData) {
    const obj = nextData && typeof nextData === "object" && !Array.isArray(nextData) ? nextData : {};
    data = obj;
    jsonDirty = false;
    jsonTextarea.value = prettyJson(data);
    rerenderForm();
  }

  jsonTextarea.addEventListener("input", () => {
    if (mode === "json") jsonDirty = true;
  });

  tabForm?.addEventListener("click", () => setMode("form"));
  tabJson?.addEventListener("click", () => setMode("json"));

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
    const el0 = event.target instanceof Element ? event.target : null;
    if (!el0) return;
    if (el0.closest("[data-close=\"1\"]")) closeSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSettings();
  });

  async function ensureWidgetKey() {
    if (!state.widgetKey) {
      setStatus(editorStatus, "Thiếu widget key. Bấm “Cài đặt” để nhập.", "error");
      openSettings();
      return false;
    }
    return true;
  }

  async function tryLoadCurrent() {
    setStatus(editorStatus, "Đang tải...");
    const res = await withRetries(
      () => apiFetch(state, "/v1/admin/site/content", { method: "GET" }),
      {
        retries: 3,
        onRetry: ({ attempt, waitMs }) => {
          setStatus(editorStatus, `API đang khởi động/chập chờn. Thử lại lần ${attempt} sau ${Math.ceil(waitMs / 1000)}s...`);
        }
      }
    );
    setEditorData(res?.data || {});
    setStatus(editorStatus, res?.updatedAt ? `Lần cập nhật gần nhất: ${res.updatedAt}` : "Chưa có nội dung trong CMS.");
  }

  async function login(password) {
    if (!(await ensureWidgetKey())) return false;
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

  $("btn-load")?.addEventListener("click", async () => {
    try {
      if (!(await ensureWidgetKey())) return;
      await tryLoadCurrent();
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
      if (String(err?.message || err).toLowerCase().includes("token")) openSettings();
    }
  });

  $("btn-import")?.addEventListener("click", async () => {
    try {
      const url = new URL("../assets/cms-data.json", window.location.href).toString();
      setStatus(editorStatus, `Đang nhập từ ${url} ...`);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Không tải được cms-data.json (HTTP ${res.status})`);
      const text = await res.text();
      const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
      const parsed = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("File cms-data.json không hợp lệ");
      setEditorData(parsed);
      setStatus(editorStatus, "Đã nhập từ file đang chạy. Bấm “Lưu (CMS)” để áp dụng.");
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
    }
  });

  $("btn-format")?.addEventListener("click", () => {
    const parsed = safeParseJson(jsonTextarea.value || "");
    if (!parsed.ok) {
      setStatus(editorStatus, parsed.error || "JSON không hợp lệ", "error");
      return;
    }
    if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
      setStatus(editorStatus, "JSON phải là object", "error");
      return;
    }
    setEditorData(parsed.value);
    setStatus(editorStatus, "Đã format & áp dụng JSON.");
    if (mode !== "json") return;
    jsonTextarea.value = prettyJson(data);
    jsonDirty = false;
  });

  $("btn-save")?.addEventListener("click", async () => {
    try {
      if (!(await ensureWidgetKey())) return;
      if (mode === "json" && jsonDirty) {
        const parsed = safeParseJson(jsonTextarea.value || "");
        if (!parsed.ok) throw new Error(parsed.error || "JSON không hợp lệ");
        if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
          throw new Error("JSON phải là object");
        }
        setEditorData(parsed.value);
      }

      setStatus(editorStatus, "Đang lưu...");
      const res = await withRetries(
        () =>
          apiFetch(state, "/v1/admin/site/content", {
            method: "PUT",
            body: JSON.stringify({ data })
          }),
        {
          retries: 3,
          onRetry: ({ attempt, waitMs }) => {
            setStatus(editorStatus, `API đang khởi động/chập chờn. Thử lại lần ${attempt} sau ${Math.ceil(waitMs / 1000)}s...`);
          }
        }
      );
      setStatus(editorStatus, `Đã lưu. updatedAt: ${res.updatedAt || "OK"}`);
    } catch (err) {
      setStatus(editorStatus, String(err?.message || err), "error");
      if (String(err?.message || err).toLowerCase().includes("token")) openSettings();
    }
  });

  // Init
  setMode("form");
  setEditorData({});
  if (await ensureWidgetKey()) {
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

