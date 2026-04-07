import { el } from "../lib/dom.js";

export function mediaScreen() {
  return el("section", { class: "wp-card" }, [
    el("h2", { text: "Media (Cloudinary)" }),
    el("p", { text: "Bạn quản lý ảnh trên Cloudinary. Trong các form (Sản phẩm/Bài viết/Trang), chỉ cần dán URL Cloudinary vào trường ảnh để preview." }),
    el("div", { class: "wp-help", text: "Nếu bạn muốn Media Library giống WordPress (lưu danh sách ảnh, copy link nhanh), mình sẽ build thêm." })
  ]);
}

