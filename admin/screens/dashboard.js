import { el } from "../lib/dom.js";
import { getNewsPosts, getProducts } from "./common.js";

function stat(label, value) {
  return el("div", { class: "wp-kpi__item" }, [
    el("span", { class: "wp-kpi__label", text: label }),
    el("span", { class: "wp-kpi__value", text: value })
  ]);
}

export function dashboardScreen({ data, updatedAt }) {
  const posts = getNewsPosts(data);
  const products = getProducts(data);
  const pages = ["site", "home", "about", "contact"].filter((k) => data?.[k]).length;

  const layout = el("div", { class: "wp-grid" });

  const atGlance = el("section", { class: "wp-card" }, [
    el("h2", { text: "At a Glance" }),
    el("p", { text: "Tong quan noi dung hien co trong CMS." }),
    el("div", { class: "wp-kpi" }, [
      stat("Bai viet", String(posts.length)),
      stat("San pham", String(products.length)),
      stat("Trang noi dung", String(pages))
    ])
  ]);

  const quickActions = el("section", { class: "wp-card" }, [
    el("h2", { text: "Quick Actions" }),
    el("p", { text: "Truy cap nhanh cac khu vuc quan tri chinh." }),
    el("div", { class: "wp-toolbar" }, [
      el("a", { class: "wp-btn wp-btn-primary", href: "#/pages", text: "Chinh sua Trang" }),
      el("a", { class: "wp-btn", href: "#/posts", text: "Quan ly Bai viet" }),
      el("a", { class: "wp-btn", href: "#/products", text: "Quan ly San pham" }),
      el("a", { class: "wp-btn", href: "#/tools", text: "Import/Export" })
    ])
  ]);

  const activity = el("section", { class: "wp-card" }, [
    el("h2", { text: "Activity" }),
    el("p", { text: `Lan cap nhat gan nhat: ${updatedAt || "chua co du lieu"}` }),
    el("div", { class: "wp-toolbar" }, [
      el("a", { class: "wp-btn", href: "#/posts", text: `Bai viet (${posts.length})` }),
      el("a", { class: "wp-btn", href: "#/products", text: `San pham (${products.length})` })
    ])
  ]);

  const status = el("section", { class: "wp-card" }, [
    el("h2", { text: "System Status" }),
    el("p", { text: "CMS su dung Cloudflare Pages + KV. Noi dung duoc cap nhat sau khi bam nut Luu o thanh tren." }),
    el("div", { class: "wp-help", text: "Luu y: cac menu Binh luan, Plugin, Nguoi dung chi mo phong giao dien WordPress." })
  ]);

  layout.appendChild(atGlance);
  layout.appendChild(quickActions);
  layout.appendChild(activity);
  layout.appendChild(status);
  return layout;
}
