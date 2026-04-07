import { el } from "../lib/dom.js";

export function cardGrid(cards) {
  const grid = el("div", { class: "wp-grid" });
  for (const c of cards) {
    const card = el("section", { class: "wp-card" });
    card.appendChild(el("h2", { text: c.title }));
    card.appendChild(el("p", { text: c.text || "" }));
    if (c.node) card.appendChild(c.node);
    grid.appendChild(card);
  }
  return grid;
}

export function placeholder(title, text) {
  return cardGrid([{ title, text: text || "Mục này đang mô phỏng giao diện WordPress. Khi bạn cần, mình sẽ build thêm backend và chức năng." }]);
}

export function getNewsPosts(data) {
  const posts = data?.news?.posts;
  return Array.isArray(posts) ? posts : [];
}

export function getProducts(data) {
  const items = data?.products?.items;
  return Array.isArray(items) ? items : [];
}

export function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(input) {
  const raw = String(input || "").trim();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

