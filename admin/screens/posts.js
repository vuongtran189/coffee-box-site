import { el, setSaveState } from "../lib/dom.js";
import { getNewsPosts, uid } from "./common.js";
import { listTable } from "./table.js";

function toPreviewSrc(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `../${raw.replace(/^\.?\//, "")}`;
}

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

export function postsListScreen({ data, setData, setRoute }) {
  const wrap = el("div");
  const posts = getNewsPosts(data);

  const q = el("input", { type: "search", placeholder: "Tim theo tieu de..." });
  const btnAdd = el("button", {
    class: "wp-btn wp-btn-primary",
    type: "button",
    text: "Them bai viet",
    onclick: () => {
      const id = uid();
      const next = posts.slice();
      next.unshift({ id, date: "", title: "", excerpt: "", content: "", image: "", link: "" });
      data.news = data.news || {};
      data.news.posts = next;
      setData(data);
      setRoute(`#/posts/edit/${encodeURIComponent(`id:${id}`)}`);
    }
  });
  wrap.appendChild(el("div", { class: "wp-toolbar" }, [q, btnAdd]));

  function renderTable() {
    const term = String(q.value || "").trim().toLowerCase();
    const filtered = posts
      .map((p, idx) => ({ ...p, __idx: idx }))
      .filter((p) => !term || String(p.title || "").toLowerCase().includes(term));

    const columns = [
      {
        label: "Tieu de",
        render: (p) =>
          el("a", {
            href: `#/posts/edit/${encodeURIComponent(makeRowKey(p, p.__idx))}`,
            text: p.title || "(chua co tieu de)"
          })
      },
      { label: "Ngay", render: (p) => p.date || "" },
      { label: "Link", render: (p) => p.link || "" }
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

export function postEditScreen({ data, postId, setData, setRoute }) {
  const posts = getNewsPosts(data);
  const idx = resolveIndexByKey(posts, postId);
  const post = idx >= 0 ? posts[idx] : null;

  const left = el("div", { class: "wp-box" });
  const right = el("div", { class: "wp-box" });

  if (!post) {
    left.appendChild(el("h3", { text: "Khong tim thay bai viet" }));
    left.appendChild(el("a", { class: "wp-btn", href: "#/posts", text: "<- Bai viet" }));
    return el("div", { class: "wp-grid" }, [left]);
  }

  const f = (label, node, help) =>
    el("div", { class: "wp-field" }, [el("label", { text: label }), node, help ? el("div", { class: "wp-help", text: help }) : null]);

  const inTitle = el("input", { type: "text", value: post.title || "" });
  const inDate = el("input", { type: "text", value: post.date || "", placeholder: "dd/mm/yyyy" });
  const inExcerpt = el("textarea");
  inExcerpt.value = post.excerpt || "";
  const inContent = el("textarea");
  inContent.value = post.content || "";
  const inImage = el("input", { type: "url", value: post.image || "", placeholder: "Cloudinary URL..." });
  const img = el("img", { class: "wp-img", alt: "Preview" });
  img.hidden = !inImage.value;
  if (inImage.value) img.src = toPreviewSrc(inImage.value);
  const inLink = el("input", { type: "text", value: post.link || "", placeholder: "news/slug.html hoac contact.html" });

  const apply = () => {
    const next = { ...post };
    next.id = next.id || uid();
    next.title = inTitle.value.trim();
    next.date = inDate.value.trim();
    next.excerpt = inExcerpt.value.trim();
    next.content = inContent.value.trim();
    next.image = inImage.value.trim();
    next.link = inLink.value.trim();
    const nextPosts = posts.slice();
    nextPosts[idx] = next;
    data.news = data.news || {};
    data.news.posts = nextPosts;
    setData(data);
    setSaveState("Chua luu");
  };

  [inTitle, inDate, inExcerpt, inContent, inImage, inLink].forEach((n) =>
    n.addEventListener("input", () => {
      if (n === inImage) {
        img.hidden = !inImage.value.trim();
        if (!img.hidden) img.src = toPreviewSrc(inImage.value.trim());
      }
      apply();
    })
  );

  left.appendChild(el("h3", { text: "Sua bai viet" }));
  left.appendChild(
    el("div", { class: "wp-form" }, [
      f("Tieu de", inTitle),
      f("Ngay", inDate),
      f("Tom tat (hien o trang news)", inExcerpt),
      f("Noi dung chi tiet", inContent, "Noi dung nay luu trong CMS de quan tri tap trung."),
      f("Anh dai dien (Cloudinary URL)", el("div", {}, [inImage, img])),
      f("Link", inLink)
    ])
  );

  right.appendChild(el("h3", { text: "Thao tac" }));
  right.appendChild(
    el("div", { class: "wp-toolbar" }, [
      el("a", { class: "wp-btn", href: "#/posts", text: "<- Danh sach" }),
      el("button", {
        class: "wp-btn wp-btn-danger",
        type: "button",
        text: "Xoa bai",
        onclick: () => {
          if (!confirm("Xoa bai viet nay?")) return;
          const nextPosts = posts.slice();
          nextPosts.splice(idx, 1);
          data.news = data.news || {};
          data.news.posts = nextPosts;
          setData(data);
          setRoute("#/posts");
        }
      })
    ])
  );
  right.appendChild(el("div", { class: "wp-help", text: "Nho bam nut Luu (goc phai) de cap nhat len CMS." }));
  return el("div", { class: "wp-split" }, [left, right]);
}
