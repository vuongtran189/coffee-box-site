import { el, setNotice, setSaveState } from "../lib/dom.js";
import { uid } from "./common.js";

function looksLikeImageUrl(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return false;
  if (v.includes("res.cloudinary.com") && v.includes("/image/upload/")) return true;
  if (v.startsWith("assets/") && /\.(png|jpe?g|webp|gif|svg|avif)([?#].*)?$/.test(v)) return true;
  if (/\.(png|jpe?g|webp|gif|svg|avif)([?#].*)?$/.test(v)) return true;
  return false;
}

function scanImageUrls(root, out = new Set()) {
  if (root == null) return out;
  if (typeof root === "string") {
    if (looksLikeImageUrl(root)) out.add(root.trim());
    return out;
  }
  if (Array.isArray(root)) {
    for (const item of root) scanImageUrls(item, out);
    return out;
  }
  if (typeof root === "object") {
    for (const value of Object.values(root)) scanImageUrls(value, out);
  }
  return out;
}

function ensureLibrary(data) {
  if (!Array.isArray(data.media_library)) data.media_library = [];
  return data.media_library;
}

async function copyText(text) {
  const val = String(text || "");
  if (!val) return false;
  try {
    await navigator.clipboard.writeText(val);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = val;
    ta.setAttribute("readonly", "1");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return !!ok;
  }
}

export function mediaScreen({ data, setData }) {
  const wrap = el("div", { class: "wp-grid" });
  const library = ensureLibrary(data);

  const markDirty = () => {
    setData(data);
    setSaveState("Chua luu");
  };

  const card = el("section", { class: "wp-card" });
  card.appendChild(el("h2", { text: "Media Library" }));
  card.appendChild(el("p", { text: "Quan ly URL anh de su dung nhanh cho san pham, bai viet va cac trang noi dung." }));

  const search = el("input", { type: "search", placeholder: "Tim theo URL, title, tags..." });
  const addInput = el("input", { type: "url", placeholder: "https://... (URL anh)" });
  addInput.style.minWidth = "300px";

  const btnAdd = el("button", {
    class: "wp-btn wp-btn-primary",
    type: "button",
    text: "Them URL",
    onclick: () => {
      const url = String(addInput.value || "").trim();
      if (!url) {
        setNotice("Nhap URL anh truoc khi them.", "error");
        return;
      }
      const exists = library.some((it) => String(it?.url || "").trim() === url);
      if (exists) {
        setNotice("URL nay da ton tai trong thu vien.", "info");
        return;
      }
      library.unshift({ id: uid(), url, title: "", alt: "", tags: "" });
      addInput.value = "";
      markDirty();
      renderList();
      setNotice("Da them media moi.", "ok");
    }
  });

  const btnScan = el("button", {
    class: "wp-btn",
    type: "button",
    text: "Quet anh dang dung",
    onclick: () => {
      const used = Array.from(scanImageUrls(data));
      if (!used.length) {
        setNotice("Khong tim thay URL anh nao trong CMS.", "info");
        return;
      }
      const existing = new Set(library.map((it) => String(it?.url || "").trim()).filter(Boolean));
      let added = 0;
      for (const url of used) {
        if (existing.has(url)) continue;
        library.push({ id: uid(), url, title: "", alt: "", tags: "used" });
        existing.add(url);
        added += 1;
      }
      if (!added) {
        setNotice("Thu vien da dong bo day du anh dang dung.", "info");
        return;
      }
      markDirty();
      renderList();
      setNotice(`Da bo sung ${added} anh vao thu vien.`, "ok");
    }
  });

  card.appendChild(el("div", { class: "wp-toolbar" }, [search, addInput, btnAdd, btnScan]));

  const meta = el("div", { class: "wp-help", text: "" });
  card.appendChild(meta);
  const list = el("div", { class: "wp-media-grid" });
  card.appendChild(list);
  wrap.appendChild(card);

  function renderList() {
    const q = String(search.value || "").trim().toLowerCase();
    const rows = library.filter((it) => {
      if (!q) return true;
      const blob = `${it?.url || ""} ${it?.title || ""} ${it?.alt || ""} ${it?.tags || ""}`.toLowerCase();
      return blob.includes(q);
    });

    meta.textContent = `Tong: ${library.length} media | Hien thi: ${rows.length}`;
    list.innerHTML = "";
    if (!rows.length) {
      list.appendChild(el("div", { class: "wp-media-empty", text: "Chua co media phu hop bo loc." }));
      return;
    }

    for (const item of rows) {
      const cardItem = el("article", { class: "wp-media-card" });
      const img = el("img", { class: "wp-media-thumb", alt: item.alt || item.title || "media", src: item.url || "" });
      cardItem.appendChild(img);

      const url = el("input", { type: "url", value: item.url || "" });
      const title = el("input", { type: "text", value: item.title || "", placeholder: "Title" });
      const alt = el("input", { type: "text", value: item.alt || "", placeholder: "Alt text" });
      const tags = el("input", { type: "text", value: item.tags || "", placeholder: "Tags: banner, product, news..." });

      const onChange = () => {
        item.url = String(url.value || "").trim();
        item.title = String(title.value || "").trim();
        item.alt = String(alt.value || "").trim();
        item.tags = String(tags.value || "").trim();
        if (img instanceof HTMLImageElement) {
          img.src = item.url || "";
          img.alt = item.alt || item.title || "media";
        }
        markDirty();
      };

      url.addEventListener("input", onChange);
      title.addEventListener("input", onChange);
      alt.addEventListener("input", onChange);
      tags.addEventListener("input", onChange);

      const btnCopy = el("button", {
        class: "wp-btn",
        type: "button",
        text: "Copy URL",
        onclick: async () => {
          const ok = await copyText(item.url || "");
          setNotice(ok ? "Da copy URL." : "Khong the copy URL.", ok ? "ok" : "error");
        }
      });

      const btnRemove = el("button", {
        class: "wp-btn wp-btn-danger",
        type: "button",
        text: "Xoa",
        onclick: () => {
          const idx = library.findIndex((x) => x === item);
          if (idx < 0) return;
          library.splice(idx, 1);
          markDirty();
          renderList();
        }
      });

      const fields = el("div", { class: "wp-media-fields" }, [url, title, alt, tags]);
      const actions = el("div", { class: "wp-toolbar" }, [btnCopy, btnRemove]);
      cardItem.appendChild(fields);
      cardItem.appendChild(actions);
      list.appendChild(cardItem);
    }
  }

  search.addEventListener("input", renderList);
  renderList();
  return wrap;
}
