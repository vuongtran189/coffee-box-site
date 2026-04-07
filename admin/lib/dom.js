export function $(id) {
  return document.getElementById(id);
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null) continue;
    if (k === "class") node.className = String(v);
    else if (k === "text") node.textContent = String(v);
    else if (k === "html") node.innerHTML = String(v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function setNotice(msg, type = "info") {
  const box = $("notice");
  if (!box) return;
  if (!msg) {
    box.hidden = true;
    box.className = "wp-notice";
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.className = `wp-notice${type === "error" ? " error" : type === "ok" ? " ok" : ""}`;
  box.textContent = String(msg);
}

export function setTitle(title) {
  const el0 = $("page-title");
  if (el0) el0.textContent = title || "";
}

export function setSaveState(text) {
  const el0 = $("save-state");
  if (el0) el0.textContent = text || "";
}

export function setConnPill(kind, text) {
  const pill = $("conn-pill");
  if (!pill) return;
  pill.innerHTML = "";
  const dot = el("span", { class: `wp-dot${kind === "ok" ? " ok" : kind === "bad" ? " bad" : ""}` });
  pill.appendChild(dot);
  pill.appendChild(el("span", { text: text || "" }));
}

