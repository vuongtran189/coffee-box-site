import { el, setSaveState } from "../lib/dom.js";
import { getNewsPosts, uid } from "./common.js";
import { listTable } from "./table.js";

export function postsListScreen({ data, setData, setRoute }) {
  const wrap = el("div");
  const posts = getNewsPosts(data);

  const q = el("input", { type: "search", placeholder: "Tìm theo tiêu đề..." });
  const btnAdd = el("button", {
    class: "wp-btn wp-btn-primary",
    type: "button",
    text: "Thêm bài viết",
    onclick: () => {
      const id = uid();
      const next = posts.slice();
      next.unshift({ id, date: "", title: "", excerpt: "", image: "", link: "" });
      data.news = data.news || {};
      data.news.posts = next;
      setData(data);
      setRoute(`#/posts/edit/${encodeURIComponent(id)}`);
    }
  });
  wrap.appendChild(el("div", { class: "wp-toolbar" }, [q, btnAdd]));

  function renderTable() {
    const term = String(q.value || "").trim().toLowerCase();
    const filtered = posts
      .map((p, idx) => ({ ...p, __idx: idx }))
      .filter((p) => !term || String(p.title || "").toLowerCase().includes(term));

    const columns = [
      { label: "Tiêu đề", render: (p) => el("a", { href: `#/posts/edit/${encodeURIComponent(p.id || p.__idx)}`, text: p.title || "(chưa có tiêu đề)" }) },
      { label: "Ngày", render: (p) => p.date || "" },
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
  const idx = posts.findIndex((p) => String(p.id || "") === String(postId));
  const post = idx >= 0 ? posts[idx] : null;

  const left = el("div", { class: "wp-box" });
  const right = el("div", { class: "wp-box" });

  if (!post) {
    left.appendChild(el("h3", { text: "Không tìm thấy bài viết" }));
    left.appendChild(el("a", { class: "wp-btn", href: "#/posts", text: "← Bài viết" }));
    return el("div", { class: "wp-grid" }, [left]);
  }

  const f = (label, node, help) =>
    el("div", { class: "wp-field" }, [el("label", { text: label }), node, help ? el("div", { class: "wp-help", text: help }) : null]);

  const inTitle = el("input", { type: "text", value: post.title || "" });
  const inDate = el("input", { type: "text", value: post.date || "", placeholder: "dd/mm/yyyy" });
  const inExcerpt = el("textarea");
  inExcerpt.value = post.excerpt || "";
  const inImage = el("input", { type: "url", value: post.image || "", placeholder: "Cloudinary URL..." });
  const img = el("img", { class: "wp-img", alt: "Preview" });
  img.hidden = !inImage.value;
  if (inImage.value) img.src = inImage.value;
  const inLink = el("input", { type: "text", value: post.link || "", placeholder: "news/slug.html hoặc contact.html" });

  const apply = () => {
    const next = { ...post };
    next.title = inTitle.value.trim();
    next.date = inDate.value.trim();
    next.excerpt = inExcerpt.value.trim();
    next.image = inImage.value.trim();
    next.link = inLink.value.trim();
    const nextPosts = posts.slice();
    nextPosts[idx] = next;
    data.news = data.news || {};
    data.news.posts = nextPosts;
    setData(data);
    setSaveState("Chưa lưu");
  };

  [inTitle, inDate, inExcerpt, inImage, inLink].forEach((n) =>
    n.addEventListener("input", () => {
      if (n === inImage) {
        img.hidden = !inImage.value.trim();
        if (!img.hidden) img.src = inImage.value.trim();
      }
      apply();
    })
  );

  left.appendChild(el("h3", { text: "Sửa bài viết" }));
  left.appendChild(el("div", { class: "wp-form" }, [
    f("Tiêu đề", inTitle),
    f("Ngày", inDate),
    f("Tóm tắt", inExcerpt),
    f("Ảnh đại diện (Cloudinary URL)", el("div", {}, [inImage, img])),
    f("Link", inLink)
  ]));

  right.appendChild(el("h3", { text: "Thao tác" }));
  right.appendChild(el("div", { class: "wp-toolbar" }, [
    el("a", { class: "wp-btn", href: "#/posts", text: "← Danh sách" }),
    el("button", {
      class: "wp-btn wp-btn-danger",
      type: "button",
      text: "Xóa bài",
      onclick: () => {
        if (!confirm("Xóa bài viết này?")) return;
        const nextPosts = posts.slice();
        nextPosts.splice(idx, 1);
        data.news = data.news || {};
        data.news.posts = nextPosts;
        setData(data);
        setRoute("#/posts");
      }
    })
  ]));
  right.appendChild(el("div", { class: "wp-help", text: "Nhớ bấm nút Lưu (góc phải) để cập nhật lên CMS." }));
  return el("div", { class: "wp-split" }, [left, right]);
}

