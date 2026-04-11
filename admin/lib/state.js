const DEFAULT_API_BASE = "https://cms.vibecoffee.vn";
const LS_WIDGET_KEY = "vibe_admin_widget_key";
const LS_TOKEN = "vibe_admin_token";

export function readState() {
  return {
    apiBase: DEFAULT_API_BASE,
    widgetKey: localStorage.getItem(LS_WIDGET_KEY) || "",
    token: localStorage.getItem(LS_TOKEN) || ""
  };
}

export function writeState(patch) {
  const next = { ...readState(), ...patch };
  localStorage.setItem(LS_WIDGET_KEY, String(next.widgetKey || ""));
  if (patch.token !== undefined) localStorage.setItem(LS_TOKEN, String(next.token || ""));
  return readState();
}
