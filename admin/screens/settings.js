import { el } from "../lib/dom.js";

export function settingsScreen({ openSettings }) {
  return el("section", { class: "wp-card" }, [
    el("h2", { text: "Cài đặt" }),
    el("p", { text: "Cấu hình API base, widget key và đăng nhập admin." }),
    el("button", { class: "wp-btn", type: "button", text: "Mở Cài đặt kết nối", onclick: openSettings })
  ]);
}

