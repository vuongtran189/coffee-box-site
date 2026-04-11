import { el } from "../lib/dom.js";

export function settingsScreen({ openSettings }) {
  return el("section", { class: "wp-card" }, [
    el("h2", { text: "Cai dat" }),
    el("p", { text: "Quan tri CMS Cloudflare: cau hinh widget key va dang nhap admin." }),
    el("button", { class: "wp-btn", type: "button", text: "Mo cai dat ket noi", onclick: openSettings })
  ]);
}
