const DEFAULT_API_BASE = "https://cms.vibecoffee.vn";
const LS_API_BASE = "vibe_admin_api_base";
const LS_WIDGET_KEY = "vibe_admin_widget_key";
const LS_TOKEN = "vibe_admin_token";

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export function readState() {
  const storedApiBase = localStorage.getItem(LS_API_BASE) || "";
  const migratedApiBase = storedApiBase.includes("onrender.com") ? "" : storedApiBase;
  return {
    apiBase: migratedApiBase || DEFAULT_API_BASE,
    widgetKey: localStorage.getItem(LS_WIDGET_KEY) || "",
    token: localStorage.getItem(LS_TOKEN) || ""
  };
}

export function writeState(patch) {
  const next = { ...readState(), ...patch };
  localStorage.setItem(LS_API_BASE, normalizeOrigin(next.apiBase) || DEFAULT_API_BASE);
  localStorage.setItem(LS_WIDGET_KEY, String(next.widgetKey || ""));
  if (patch.token !== undefined) localStorage.setItem(LS_TOKEN, String(next.token || ""));
  return readState();
}

