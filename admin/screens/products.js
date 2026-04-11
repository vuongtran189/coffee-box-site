import { el, setSaveState } from "../lib/dom.js";
import { getProducts, uid, slugify } from "./common.js";
import { listTable } from "./table.js";

function makeRowKey(item, idx) {
  return item?.id ? `id:${item.id}` : `idx:${idx}`;
}

function resolveIndexByKey(items, key) {
  const raw = String(key || "");
  if (raw.startsWith("id:")) {
    const id = raw.slice(3);
    return items.findIndex((p) => String(p?.id || "") === id);
  }
  if (raw.startsWith("idx:")) {
    const idx = Number(raw.slice(4));
    return Number.isInteger(idx) && idx >= 0 && idx < items.length ? idx : -1;
  }
  const byId = items.findIndex((p) => String(p?.id || "") === raw);
  if (byId >= 0) return byId;
  const idx = Number(raw);
  return Number.isInteger(idx) && idx >= 0 && idx < items.length ? idx : -1;
}

export function productsListScreen({ data, setData, setRoute }) {
  const wrap = el("div");
  const items = getProducts(data);

  const q = el("input", { type: "search", placeholder: "Tim theo ten san pham..." });
  const btnAdd = el("button", {
    class: "wp-btn wp-btn-primary",
    type: "button",
    text: "Them san pham",
    onclick: () => {
      const id = uid();
      const next = items.slice();
      next.unshift({
        id,
        title: "",
        subtitle: "",
        slug: "",
        category: "all",
        image: "",
        price_vnd: "",
        discount_percent: "",
        description: "",
        highlights: [],
        link: ""
      });
      data.products = data.products || {};
      data.products.items = next;
      setData(data);
      setRoute(`#/products/edit/${encodeURIComponent(`id:${id}`)}`);
    }
  });
  wrap.appendChild(el("div", { class: "wp-toolbar" }, [q, btnAdd]));

  function renderTable() {
    const term = String(q.value || "").trim().toLowerCase();
    const filtered = items
      .map((p, idx) => ({ ...p, __idx: idx }))
      .filter((p) => !term || String(p.title || "").toLowerCase().includes(term));
    const columns = [
      {
        label: "San pham",
        render: (p) =>
          el("a", {
            href: `#/products/edit/${encodeURIComponent(makeRowKey(p, p.__idx))}`,
            text: p.title || "(chua co ten)"
          })
      },
      { label: "Danh muc", render: (p) => p.category || "" },
      { label: "Gia", render: (p) => (p.price_vnd ? `${Number(p.price_vnd).toLocaleString("vi-VN")}d` : "") }
    ];
    const table = listTable({ columns, rows: filtered });
    const old = wrap.querySelector("table");
    if (old) old.remove();
    wrap.appendChild(table);
  }

  q.addEventListener("input", renderTable);
  renderTable();
  return wrap;
}

export function productEditScreen({ data, productId, setData, setRoute }) {
  const items = getProducts(data);
  const idx = resolveIndexByKey(items, productId);
  const item = idx >= 0 ? items[idx] : null;

  const left = el("div", { class: "wp-box" });
  const right = el("div", { class: "wp-box" });
  if (!item) {
    left.appendChild(el("h3", { text: "Khong tim thay san pham" }));
    left.appendChild(el("a", { class: "wp-btn", href: "#/products", text: "<- San pham" }));
    return el("div", { class: "wp-grid" }, [left]);
  }

  const f = (label, node, help) =>
    el("div", { class: "wp-field" }, [el("label", { text: label }), node, help ? el("div", { class: "wp-help", text: help }) : null]);

  const inTitle = el("input", { type: "text", value: item.title || "" });
  const inSubtitle = el("input", { type: "text", value: item.subtitle || "" });
  const inSlug = el("input", { type: "text", value: item.slug || "", placeholder: "tu-dong-neu-bo-trong" });
  const selCat = el("select");
  ["all", "bestseller", "combo"].forEach((c) => selCat.appendChild(el("option", { value: c, text: c })));
  selCat.value = item.category || "all";
  const inImage = el("input", { type: "url", value: item.image || "", placeholder: "Cloudinary URL..." });
  const img = el("img", { class: "wp-img", alt: "Preview" });
  img.hidden = !inImage.value;
  if (inImage.value) img.src = inImage.value;
  const inPrice = el("input", { type: "number", value: item.price_vnd ?? "", step: "1000", min: "0" });
  const inDiscount = el("input", { type: "number", value: item.discount_percent ?? "", step: "1", min: "0", max: "90" });
  const inDesc = el("textarea");
  inDesc.value = item.description || "";
  const inHighlights = el("textarea", { placeholder: "Moi dong la 1 highlight" });
  inHighlights.value = Array.isArray(item.highlights) ? item.highlights.join("\n") : "";
  const inLink = el("input", { type: "text", value: item.link || "" });

  const apply = () => {
    const next = { ...item };
    next.id = next.id || uid();
    next.title = inTitle.value.trim();
    next.subtitle = inSubtitle.value.trim();
    next.slug = inSlug.value.trim() || slugify(next.title);
    next.category = selCat.value;
    next.image = inImage.value.trim();
    next.price_vnd = inPrice.value === "" ? "" : Number(inPrice.value);
    next.discount_percent = inDiscount.value === "" ? "" : Number(inDiscount.value);
    next.description = inDesc.value.trim();
    next.highlights = String(inHighlights.value || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    next.link = inLink.value.trim();
    const nextItems = items.slice();
    nextItems[idx] = next;
    data.products = data.products || {};
    data.products.items = nextItems;
    setData(data);
    setSaveState("Chua luu");
  };

  [inTitle, inSubtitle, inSlug, selCat, inImage, inPrice, inDiscount, inDesc, inHighlights, inLink].forEach((n) =>
    n.addEventListener("input", () => {
      if (n === inImage) {
        img.hidden = !inImage.value.trim();
        if (!img.hidden) img.src = inImage.value.trim();
      }
      apply();
    })
  );
  selCat.addEventListener("change", apply);

  left.appendChild(el("h3", { text: "Sua san pham" }));
  left.appendChild(
    el("div", { class: "wp-form" }, [
      f("Ten san pham", inTitle),
      f("Phu de", inSubtitle),
      f("Slug", inSlug, "Dung cho product.html?slug=..."),
      f("Danh muc", selCat),
      f("Anh (Cloudinary URL)", el("div", {}, [inImage, img])),
      f("Gia (VND)", inPrice),
      f("Giam gia (%)", inDiscount),
      f("Mo ta chi tiet", inDesc),
      f("Diem noi bat", inHighlights),
      f("Link", inLink)
    ])
  );

  right.appendChild(el("h3", { text: "Thao tac" }));
  right.appendChild(
    el("div", { class: "wp-toolbar" }, [
      el("a", { class: "wp-btn", href: "#/products", text: "<- Danh sach" }),
      el("button", {
        class: "wp-btn wp-btn-danger",
        type: "button",
        text: "Xoa san pham",
        onclick: () => {
          if (!confirm("Xoa san pham nay?")) return;
          const nextItems = items.slice();
          nextItems.splice(idx, 1);
          data.products = data.products || {};
          data.products.items = nextItems;
          setData(data);
          setRoute("#/products");
        }
      })
    ])
  );
  right.appendChild(el("div", { class: "wp-help", text: "Nho bam nut Luu (goc phai) de cap nhat len CMS." }));
  return el("div", { class: "wp-split" }, [left, right]);
}
