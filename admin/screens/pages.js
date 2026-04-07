import { CMS_SCHEMA } from "../schema.js";
import { el, setSaveState } from "../lib/dom.js";

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

export function pagesScreen({ data, setData }) {
  const wrap = el("div");
  const allowedSections = new Set(["site", "home", "about", "contact"]);
  const sections = CMS_SCHEMA.filter((s) => allowedSections.has(s.id));

  const renderField = (field) => {
    if (field.fields && !field.type) {
      const box = el("div", { class: "wp-box" });
      box.appendChild(el("h3", { text: field.title || "Nhóm" }));
      for (const sub of field.fields || []) box.appendChild(renderField(sub));
      return box;
    }

    const wrapField = el("div", { class: "wp-field" });
    wrapField.appendChild(el("label", { text: field.label }));
    const path = field.path;
    const cur = getAtPath(data, path);

    if (field.type === "text") {
      const ta = el("textarea");
      ta.value = String(cur ?? "");
      ta.addEventListener("input", () => {
        setAtPath(data, path, ta.value);
        setData(data);
        setSaveState("Chưa lưu");
      });
      wrapField.appendChild(ta);
      return wrapField;
    }

    if (field.type === "image") {
      const inp = el("input", { type: "url", placeholder: "Cloudinary URL..." });
      inp.value = String(cur ?? "");
      const img = el("img", { class: "wp-img", alt: field.label });
      img.hidden = !inp.value;
      if (inp.value) img.src = inp.value;
      inp.addEventListener("input", () => {
        const v = inp.value.trim();
        img.hidden = !v;
        if (v) img.src = v;
        setAtPath(data, path, v);
        setData(data);
        setSaveState("Chưa lưu");
      });
      wrapField.appendChild(inp);
      wrapField.appendChild(img);
      return wrapField;
    }

    const inp = el("input", { type: "text" });
    inp.value = String(cur ?? "");
    inp.addEventListener("input", () => {
      setAtPath(data, path, inp.value);
      setData(data);
      setSaveState("Chưa lưu");
    });
    wrapField.appendChild(inp);
    return wrapField;
  };

  for (const section of sections) {
    const card = el("section", { class: "wp-card" });
    card.appendChild(el("h2", { text: section.title }));
    const form = el("div", { class: "wp-form" });
    for (const field of section.fields || []) form.appendChild(renderField(field));
    card.appendChild(form);
    wrap.appendChild(card);
  }

  wrap.appendChild(
    el("section", { class: "wp-card" }, [
      el("h2", { text: "Danh sách" }),
      el("p", { text: "Sản phẩm và Bài viết quản lý ở menu riêng (giống WordPress)." }),
      el("div", { class: "wp-toolbar" }, [el("a", { class: "wp-btn", href: "#/products", text: "Sản phẩm" }), el("a", { class: "wp-btn", href: "#/posts", text: "Bài viết" })])
    ])
  );

  return wrap;
}

