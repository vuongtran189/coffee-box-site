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
  if (!parts.length) return;
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = isNumericSegment(parts[i]) ? Number(parts[i]) : parts[i];
    const nextPart = parts[i + 1];
    cur[key] = ensureContainerForNext(cur[key], nextPart);
    cur = cur[key];
  }
  const last = parts[parts.length - 1];
  const lastKey = isNumericSegment(last) ? Number(last) : last;
  cur[lastKey] = value;
}

function createDefaultValue(field) {
  if (field.type === "number") return "";
  if (field.type === "list_string") return [];
  if (field.type === "list_object") return [];
  if (field.fields && !field.type) {
    const obj = {};
    for (const sub of field.fields) {
      const key = String(sub.path || "").split(".").pop();
      if (!key) continue;
      obj[key] = createDefaultValue(sub);
    }
    return obj;
  }
  return "";
}

function createDefaultObject(fields = []) {
  const obj = {};
  for (const field of fields) {
    const key = String(field.path || "").split(".").pop();
    if (!key) continue;
    obj[key] = createDefaultValue(field);
  }
  return obj;
}

function withAbsolutePath(field, absolutePath) {
  return { ...field, path: absolutePath };
}

export function pagesScreen({ data, setData }) {
  const wrap = el("div");
  const allowedSections = new Set(["site", "home", "about", "contact"]);
  const sections = CMS_SCHEMA.filter((s) => allowedSections.has(s.id));

  const markDirty = () => {
    setData(data);
    setSaveState("Chua luu");
  };

  const renderField = (field) => {
    if (field.fields && !field.type) {
      const box = el("div", { class: "wp-box" });
      box.appendChild(el("h3", { text: field.title || "Nhom" }));
      for (const sub of field.fields || []) box.appendChild(renderField(sub));
      return box;
    }

    const wrapField = el("div", { class: "wp-field" });
    wrapField.appendChild(el("label", { text: field.label || field.path }));
    const path = field.path;
    const cur = getAtPath(data, path);

    if (field.type === "text") {
      const ta = el("textarea");
      ta.value = String(cur ?? "");
      ta.addEventListener("input", () => {
        setAtPath(data, path, ta.value);
        markDirty();
      });
      wrapField.appendChild(ta);
      return wrapField;
    }

    if (field.type === "image") {
      const inp = el("input", { type: "url", placeholder: "https://..." });
      inp.value = String(cur ?? "");
      const img = el("img", { class: "wp-img", alt: field.label || "Preview" });
      img.hidden = !inp.value;
      if (inp.value) img.src = inp.value;
      inp.addEventListener("input", () => {
        const v = inp.value.trim();
        img.hidden = !v;
        if (v) img.src = v;
        setAtPath(data, path, v);
        markDirty();
      });
      wrapField.appendChild(inp);
      wrapField.appendChild(img);
      return wrapField;
    }

    if (field.type === "number") {
      const inp = el("input", { type: "number", step: "1" });
      inp.value = cur === "" || cur == null ? "" : String(cur);
      inp.addEventListener("input", () => {
        setAtPath(data, path, inp.value === "" ? "" : Number(inp.value));
        markDirty();
      });
      wrapField.appendChild(inp);
      return wrapField;
    }

    if (field.type === "select") {
      const sel = el("select");
      for (const opt of field.options || []) {
        sel.appendChild(el("option", { value: opt, text: String(opt) }));
      }
      sel.value = String(cur ?? "");
      sel.addEventListener("change", () => {
        setAtPath(data, path, sel.value);
        markDirty();
      });
      wrapField.appendChild(sel);
      return wrapField;
    }

    if (field.type === "list_string") {
      const ta = el("textarea", { placeholder: "Moi dong la 1 gia tri" });
      ta.value = Array.isArray(cur) ? cur.join("\n") : "";
      ta.addEventListener("input", () => {
        const next = String(ta.value || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        setAtPath(data, path, next);
        markDirty();
      });
      wrapField.appendChild(ta);
      wrapField.appendChild(el("div", { class: "wp-help", text: "Moi dong se duoc luu thanh 1 phan tu." }));
      return wrapField;
    }

    if (field.type === "list_object") {
      const container = el("div", { class: "wp-form" });
      const items = Array.isArray(cur) ? cur : [];

      const renderList = () => {
        container.innerHTML = "";
        items.forEach((item, idx) => {
          const itemBox = el("div", { class: "wp-box" });
          const titlePath = field.itemTitlePath || "";
          const titleValue = titlePath ? getAtPath(item, titlePath) : "";
          const itemTitle = titleValue ? String(titleValue) : `${field.label || "Item"} #${idx + 1}`;

          itemBox.appendChild(
            el("div", { class: "wp-toolbar" }, [
              el("strong", { text: itemTitle }),
              el("button", {
                class: "wp-btn wp-btn-danger",
                type: "button",
                text: "Xoa",
                onclick: () => {
                  items.splice(idx, 1);
                  setAtPath(data, path, items);
                  markDirty();
                  renderList();
                }
              })
            ])
          );

          const subWrap = el("div", { class: "wp-form" });
          for (const sub of field.fields || []) {
            const absPath = `${path}.${idx}.${sub.path}`;
            subWrap.appendChild(renderField(withAbsolutePath(sub, absPath)));
          }
          itemBox.appendChild(subWrap);
          container.appendChild(itemBox);
        });
      };

      const addBtn = el("button", {
        class: "wp-btn",
        type: "button",
        text: "Them muc",
        onclick: () => {
          items.push(createDefaultObject(field.fields || []));
          setAtPath(data, path, items);
          markDirty();
          renderList();
        }
      });

      wrapField.appendChild(addBtn);
      wrapField.appendChild(container);
      renderList();
      return wrapField;
    }

    const inp = el("input", { type: "text" });
    inp.value = String(cur ?? "");
    inp.addEventListener("input", () => {
      setAtPath(data, path, inp.value);
      markDirty();
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
      el("h2", { text: "Noi dung danh sach" }),
      el("p", { text: "San pham va Bai viet quan ly o menu rieng de chinh sua nhanh." }),
      el("div", { class: "wp-toolbar" }, [
        el("a", { class: "wp-btn", href: "#/products", text: "San pham" }),
        el("a", { class: "wp-btn", href: "#/posts", text: "Bai viet" })
      ])
    ])
  );

  return wrap;
}
