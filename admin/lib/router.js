export function parseHash() {
  const raw = String(location.hash || "#/").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  const root = parts[0] || "";
  if (!root) return { route: "dashboard", params: {} };
  if (root === "posts" && parts[1] === "edit" && parts[2]) return { route: "posts_edit", params: { id: decodeURIComponent(parts[2]) } };
  if (root === "products" && parts[1] === "edit" && parts[2]) return { route: "products_edit", params: { id: decodeURIComponent(parts[2]) } };
  return { route: root, params: {} };
}

