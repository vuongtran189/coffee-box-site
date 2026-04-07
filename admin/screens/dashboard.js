import { el } from "../lib/dom.js";
import { cardGrid, getNewsPosts, getProducts } from "./common.js";

export function dashboardScreen({ data, updatedAt }) {
  const posts = getNewsPosts(data);
  const products = getProducts(data);
  const quick = el("div", { class: "wp-toolbar" }, [
    el("a", { class: "wp-btn", href: "#/pages", text: "Chỉnh sửa Trang" }),
    el("a", { class: "wp-btn", href: "#/posts", text: `Bài viết (${posts.length})` }),
    el("a", { class: "wp-btn", href: "#/products", text: `Sản phẩm (${products.length})` })
  ]);

  return cardGrid([
    {
      title: "Tổng quan",
      text: "Quản trị giống WordPress (UI), lưu nội dung vào Cloudflare KV.",
      node: el("div", {}, [
        el("div", { class: "wp-muted", text: `Cập nhật gần nhất: ${updatedAt || "Chưa có"}` }),
        el("div", { class: "wp-muted", text: `Posts: ${posts.length} • Products: ${products.length}` }),
        quick
      ])
    },
    {
      title: "Lưu ý",
      text: "Các mục như Bình luận / Plugin / Người dùng chỉ mô phỏng giao diện WP. Website hiện tại không cần dùng."
    }
  ]);
}

