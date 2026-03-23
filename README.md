# Vibe Coffee — Website + Chatbot (coffee-box-site)

Repo này gồm 2 phần:
- **Website tĩnh** (GitHub Pages): các trang `index.html`, `products.html`, `news.html`, `about.html`, `contact.html`.
- **Chatbot backend + widget** (Render + MongoDB): thư mục `vibe-chatbot/` và widget nhúng vào website.

## Link production (tham khảo)
- Website (GitHub Pages): `https://vuongtran189.github.io/coffee-box-site/`
- API (Render): `https://vibe-chatbot-api.onrender.com/`
  - Health check: `GET /health`

## Cấu trúc thư mục
- `index.html`, `about.html`, `products.html`, `news.html`, `contact.html`: trang website.
- `styles.css`, `script.js`: CSS/JS dùng chung.
- `assets/`: ảnh + static assets
  - `assets/chatbot/widget.js`, `assets/chatbot/widget.css`: **bản widget dùng trên GitHub Pages** (ưu tiên load local).
  - `assets/chatbot/agent.png`: avatar “tư vấn viên” cho nút launcher.
- `admin/`: cấu hình CMS (Decap/Netlify CMS style).
- `cms-render.js`: render nội dung (phụ thuộc cấu hình CMS/nội dung).
- `functions/`: serverless functions (dùng cho Cloudflare Pages nếu deploy theo hướng đó).
- `vibe-chatbot/`: monorepo cho chatbot
  - `apps/api`: API Express + MongoDB + OpenAI integration
  - `packages/widget`: source widget + build ra `dist/`
  - `render.yaml`, `Dockerfile`: cấu hình deploy Render

## Chatbot hoạt động như thế nào
### Nhúng widget trên website
Các trang HTML đều set biến global trước khi load `script.js`:
- `window.VIBE_CHATBOT_API_BASE` = base URL của API Render (vd `https://vibe-chatbot-api.onrender.com`)
- `window.VIBE_CHATBOT_WIDGET_KEY` = public key (để API cho phép gọi)
- `window.VIBE_CHATBOT_LAUNCHER_ICON_URL` = icon/ảnh avatar (hiện tại trỏ tới `assets/chatbot/agent.png`)

`script.js` sẽ:
- **Ưu tiên load widget local**: `assets/chatbot/widget.js` + `assets/chatbot/widget.css` (ổn định, không phụ thuộc Render trả `widget.js/css`).
- Widget sẽ gọi API:
  - `POST /v1/widget/init` (khởi tạo session)
  - `POST /v1/chat` (gửi tin nhắn)

### AI trả lời (OpenAI)
API route `/v1/chat` sẽ cố gắng gọi OpenAI Responses API nếu có `OPENAI_API_KEY`.
- Nếu OpenAI lỗi/timeout → fallback câu trả lời mặc định.
- Nếu MongoDB lỗi tạm thời → API chạy chế độ **degraded/stateless** để tránh 502.

## Render — Environment Variables (quan trọng)
Trong Render service `vibe-chatbot-api`, cần set (không commit secrets vào git):
- `CORS_ORIGINS`: ví dụ `https://vuongtran189.github.io`
- `MONGODB_URI`: MongoDB connection string (Atlas)
- `WIDGET_PUBLIC_KEY`: phải trùng với `window.VIBE_CHATBOT_WIDGET_KEY` trên website
- `OPENAI_API_KEY`: OpenAI API key

Tuỳ chọn:
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_MAX_OUTPUT_TOKENS` (default: 350)
- `OPENAI_INSTRUCTIONS`: “system prompt” cho tư vấn viên (khuyến nghị set để giọng điệu chuyên nghiệp + quy trình chốt lead)

## Local dev (tối thiểu)
### Website
- Mở trực tiếp file HTML vẫn chạy được, nhưng tốt nhất dùng server tĩnh để tránh vấn đề đường dẫn:
  - Ví dụ: `python -m http.server` (nếu có Python), hoặc dùng extension “Live Server”.

### Chatbot API + widget
Xem hướng dẫn chi tiết: `vibe-chatbot/README.md`.

## Checklist khi deploy / debug
### 1) API sống?
- Mở: `https://vibe-chatbot-api.onrender.com/health` → phải thấy `{"ok":true}`

### 2) CORS đúng?
- `CORS_ORIGINS` phải đúng **origin** của website (không có path):
  - Đúng: `https://vuongtran189.github.io`
  - Sai: `https://vuongtran189.github.io/coffee-box-site`

### 3) Widget load local?
- Trên website, kiểm tra Network:
  - `assets/chatbot/widget.js` và `assets/chatbot/widget.css` load 200 OK

### 4) OpenAI chạy?
- Render Logs khi gửi tin nhắn:
  - Nếu `openai_error_401` → sai key/thiếu quyền
  - Nếu `openai_error_429` → bị rate limit

### 5) “Bể tiếng Việt” trong widget?
- Source-of-truth để sửa text: `vibe-chatbot/packages/widget/src/widget.js`
- Sau khi sửa, cần rebuild widget và copy sang `assets/chatbot/widget.js` để GitHub Pages dùng bản mới.

## Tiến độ (cập nhật: 2026-03-23)
### Đã hoàn thành
- [x] Website tĩnh (GitHub Pages) + các trang chính (`index.html`, `products.html`, `news.html`, `about.html`, `contact.html`).
- [x] Widget nhúng hiển thị tiếng Việt + có avatar launcher (`assets/chatbot/agent.png`).
- [x] Website ưu tiên load widget local: `assets/chatbot/widget.js` + `assets/chatbot/widget.css`.
- [x] API chatbot (Render) có health check `GET /health`.
- [x] API xử lý CORS preflight (`OPTIONS`) ổn định.
- [x] API có timeout + chế độ **degraded/stateless** khi MongoDB lỗi để giảm 502.
- [x] Đã thêm favicon link để tránh 404 `/favicon.ico`.

### Việc cần làm tiếp (khuyến nghị)
- [x] Soạn nội dung `OPENAI_INSTRUCTIONS` (giọng điệu + quy trình hỏi nhu cầu + chốt lead SĐT/Zalo).
- [ ] Rà soát cấu hình Render env vars (đặc biệt: `CORS_ORIGINS`, `WIDGET_PUBLIC_KEY`, `MONGODB_URI`, `OPENAI_API_KEY`).
- [x] Tạo knowledge base (Markdown) và nạp vào prompt để AI trả lời đúng sản phẩm/FAQ.
- [ ] (Tuỳ chọn) Nâng cấp RAG (truy xuất theo ngữ cảnh) nếu knowledge lớn.
