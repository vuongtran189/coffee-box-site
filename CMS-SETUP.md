# Quản trị nội dung (Cloudflare Pages + KV)

Website có trang quản trị tại:
- `/admin/` (dashboard chỉnh JSON và lưu vào Cloudflare KV thông qua Pages Functions)

## Cách hoạt động
- Nội dung site mặc định nằm trong `assets/cms-data.json`.
- Khi website có cấu hình `window.VIBE_CMS_API_BASE` + `window.VIBE_CHATBOT_WIDGET_KEY`, các trang sẽ ưu tiên lấy nội dung từ API:
  - `GET {CMS_API_BASE}/v1/site/content` (yêu cầu header `x-widget-key`)
- Trang `/admin/` cho phép:
  - `GET {CMS_API_BASE}/v1/admin/site/content`
  - `PUT {CMS_API_BASE}/v1/admin/site/content`
  - `POST {CMS_API_BASE}/v1/admin/login` để lấy token (nếu có bật admin auth)

## Cloudflare Pages env + bindings (khuyến nghị)
- `WIDGET_PUBLIC_KEY`: public key (dùng cho widget + site content)
- `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`: bật đăng nhập admin (token bearer)
- `CORS_ORIGINS`: include đúng **origin** của nơi mở `/admin/` (không có path), ví dụ: `https://vibecoffee.vn,https://www.vibecoffee.vn`
- KV binding: `VIBE_CONTENT_KV` (KV Namespace) để lưu JSON nội dung

## Ghi chú
- Nút “Nhập từ file đang chạy” trong admin sẽ đọc `../assets/cms-data.json` để tương thích cả khi deploy ở subpath (GitHub Pages) lẫn root domain.

