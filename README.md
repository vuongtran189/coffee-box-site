# Vibe Coffee — Website + Chatbot (coffee-box-site)

Repo này gồm 2 phần:
- **Website tĩnh** (GitHub Pages): các trang `index.html`, `products.html`, `news.html`, `about.html`, `contact.html`.
- **Chatbot backend + widget** (Render + MongoDB): thư mục `vibe-chatbot/` và widget nhúng vào website.

## Link production (tham khảo)
- Website (GitHub Pages): `https://vuongtran189.github.io/coffee-box-site/`
- Website (Domain/Hosting): `https://vibecoffee.vn/` (cần DNS + SSL + upload lên hosting)
- API (Render): `https://vibe-chatbot-api.onrender.com/`
  - Health check: `GET /health`

## Cấu trúc thư mục
- `index.html`, `about.html`, `products.html`, `news.html`, `contact.html`: trang website.
- `styles.css`, `script.js`: CSS/JS dùng chung.
- `assets/`: ảnh + static assets
  - `assets/chatbot/widget.js`, `assets/chatbot/widget.css`: **bản widget dùng trên GitHub Pages** (ưu tiên load local).
  - `assets/chatbot/agent.png`: avatar “tư vấn viên” cho nút launcher.
- `assets/logo-vibe-coffee-web.png`: logo header (đã crop để cân đối topbar).
- `admin/`: cấu hình CMS (Decap/Netlify CMS style).
- `cms-render.js`: render nội dung (phụ thuộc cấu hình CMS/nội dung).
- `functions/`: serverless functions (dùng cho Cloudflare Pages nếu deploy theo hướng đó).
- `vibe-chatbot/`: monorepo cho chatbot
  - `apps/api`: API Express + MongoDB + OpenAI integration
  - `packages/widget`: source widget + build ra `dist/`
  - `render.yaml`, `Dockerfile`: cấu hình deploy Render
- `san-pham/`, `ve-chung-toi/`: trang redirect thân thiện (SEO) về `products.html` và `about.html` (đã tối ưu cho deploy ở root domain).

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
- `CORS_ORIGINS`: ví dụ `https://vuongtran189.github.io,https://vibecoffee.vn,https://www.vibecoffee.vn`
- `MONGODB_URI`: MongoDB connection string (Atlas)
- `WIDGET_PUBLIC_KEY`: phải trùng với `window.VIBE_CHATBOT_WIDGET_KEY` trên website
- `OPENAI_API_KEY`: OpenAI API key

Tuỳ chọn:
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_MAX_OUTPUT_TOKENS` (default: 350)
- `OPENAI_INSTRUCTIONS`: “system prompt” cho tư vấn viên
  - Hỗ trợ placeholder: `{{knowledge_chunks}}`, `{{user_message}}` (API sẽ tự render trước khi gọi OpenAI)
- `VIBE_KNOWLEDGE_TEXT`: dán trực tiếp knowledge base (Markdown/text) để AI bám theo nội dung sản phẩm/FAQ
- `VIBE_KNOWLEDGE_MAX_CHARS` (default: 8000): giới hạn độ dài knowledge đưa vào prompt
- `VIBE_KNOWLEDGE_PATH`: đường dẫn file knowledge trên server/repo (nếu không dùng `VIBE_KNOWLEDGE_TEXT`)

## Bán hàng online (Giỏ hàng + Checkout)
### Giỏ hàng
- Nút “Thêm vào giỏ” nằm ở trang `products.html` và `product.html`.
- Giỏ hàng lưu ở `localStorage` (key: `vibe_cart_v1`) và mở dạng drawer ở góc phải.

### Checkout (COD / Chuyển khoản / MoMo)
- Trang checkout: `checkout.html` (từ giỏ hàng bấm “Gửi đơn đặt hàng”).
- Hiện tại form **tự chọn endpoint**:
  - Nếu có `window.VIBE_CHATBOT_API_BASE` + `window.VIBE_CHATBOT_WIDGET_KEY` → gửi về `POST {API_BASE}/v1/leads` (khuyến nghị cho GitHub Pages / Linux hosting tĩnh).
  - Nếu không có cấu hình chatbot → fallback `POST /lead` (dành cho Cloudflare Pages Functions / backend cùng origin).
- Cấu hình thông tin thanh toán nằm trong `assets/cms-data.json`:
  - `site.payments.bank_name`
  - `site.payments.bank_account_number`
  - `site.payments.bank_account_name`
  - `site.payments.momo_phone`

## Deploy lên Linux hosting (cPanel) — vibecoffee.vn
### 1) DNS
- Tạo bản ghi:
  - `A` cho `@` → IP hosting (vd `103.28.36.205`)
  - `A` cho `www` → IP hosting

### 2) Upload website
- Upload và Extract file zip build sẵn: `vibecoffee.vn-site.zip` vào `public_html/`.

### 3) SSL
- cPanel → `SSL/TLS Status` → `Run AutoSSL` cho `vibecoffee.vn` và `www.vibecoffee.vn` (yêu cầu DNS đã hoạt động).

### 4) Chatbot + form đặt hàng
- Cập nhật `CORS_ORIGINS` trên Render để include domain mới:
  - `https://vibecoffee.vn,https://www.vibecoffee.vn`

## Quy chuẩn ảnh (gợi ý)
- Ảnh đại diện bài viết (card tin tức + trang bài viết) đang hiển thị theo khung ngang và crop bằng `object-fit: cover`.
- Tỷ lệ khung khuyến nghị ~ **2.7:1** (ví dụ `1600x600` hoặc `1920x720`). Chuẩn social `1200x630` vẫn dùng được nhưng sẽ bị crop trên/dưới.

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
  - Nếu thấy `openai_generateAssistantReply_failed` → OpenAI đang lỗi/timeout, API sẽ dùng fallback

### 5) “Bể tiếng Việt” trong widget?
- Source-of-truth để sửa text: `vibe-chatbot/packages/widget/src/widget.js`
- Sau khi sửa, cần rebuild widget và copy sang `assets/chatbot/widget.js` để GitHub Pages dùng bản mới.

### 6) Form gửi lead/đơn hàng chạy?
- Nếu deploy tĩnh (GitHub Pages / cPanel): đảm bảo `window.VIBE_CHATBOT_API_BASE` + `window.VIBE_CHATBOT_WIDGET_KEY` được set để form gửi về `POST /v1/leads`.
- Nếu Render báo CORS: kiểm tra `CORS_ORIGINS` đã include đúng origin (`https://vibecoffee.vn`, không có path).

## Tiến độ (cập nhật: 2026-04-03)
### Đã hoàn thành
- [x] Website tĩnh (GitHub Pages) + các trang chính (`index.html`, `products.html`, `news.html`, `about.html`, `contact.html`).
- [x] Widget nhúng hiển thị tiếng Việt + có avatar launcher (`assets/chatbot/agent.png`).
- [x] Website ưu tiên load widget local: `assets/chatbot/widget.js` + `assets/chatbot/widget.css`.
- [x] API chatbot (Render) có health check `GET /health`.
- [x] API xử lý CORS preflight (`OPTIONS`) ổn định.
- [x] API có timeout + chế độ **degraded/stateless** khi MongoDB lỗi để giảm 502.
- [x] Đã thêm favicon link để tránh 404 `/favicon.ico`.
- [x] Đã bỏ nút “Nhận báo giá” trên trang chi tiết sản phẩm (`product.html`).
- [x] Đã fix trang `products.html` không còn kẹt “0 sản phẩm” khi fetch JSON lỗi (có fallback message + parse JSON robust).
- [x] Đã cập nhật logo header cân đối (`assets/logo-vibe-coffee-web.png`) + chỉnh CSS topbar.
- [x] Đã đổi flow submit form (liên hệ + checkout) để chạy được trên hosting tĩnh: ưu tiên `POST /v1/leads` (Render API) thay vì phụ thuộc `POST /lead`.
- [x] Đã sửa redirect `san-pham/` và `ve-chung-toi/` để chạy đúng khi deploy ở root domain (không còn `/coffee-box-site/...`).

### Việc cần làm tiếp (khuyến nghị)
- [x] Soạn nội dung `OPENAI_INSTRUCTIONS` (giọng điệu + quy trình hỏi nhu cầu + chốt lead SĐT/Zalo).
- [ ] Rà soát cấu hình Render env vars (đặc biệt: `CORS_ORIGINS` cho `vibecoffee.vn`, `WIDGET_PUBLIC_KEY`, `MONGODB_URI`, `OPENAI_API_KEY`).
- [x] Tạo knowledge base (Markdown) và nạp vào prompt để AI trả lời đúng sản phẩm/FAQ.
- [ ] (Tuỳ chọn) nâng cấp RAG (truy xuất theo ngữ cảnh) nếu knowledge lớn.

## Nhật ký thay đổi (để quay lại nhanh)
### 2026-03-23
- Thêm prompt template + file tham chiếu:
  - `vibe-chatbot/OPENAI_INSTRUCTIONS.txt` (dùng placeholder `{{knowledge_chunks}}`, `{{user_message}}`)
  - `vibe-chatbot/knowledge/vibe-coffee.md` (knowledge base)
- API:
  - Nạp knowledge vào prompt + hỗ trợ render placeholder: `vibe-chatbot/apps/api/src/openai.js`
  - Fallback trả lời theo flow (không lặp Bước 1) khi OpenAI lỗi/không cấu hình: `vibe-chatbot/apps/api/src/fallback.js`
  - Log chẩn đoán lỗi OpenAI: prefix `openai_generateAssistantReply_failed` trong Render Logs
- Env vars liên quan knowledge: `VIBE_KNOWLEDGE_TEXT`, `VIBE_KNOWLEDGE_PATH`, `VIBE_KNOWLEDGE_MAX_CHARS`
- Git commits đã push lên `main`: `725f535`, `2a18970` (Render cần redeploy để nhận thay đổi)

### 2026-03-24
- Thêm trang chi tiết sản phẩm: `product.html` (link từ `products.html` qua `?slug=...`).
- Thêm giỏ hàng (localStorage) + icon nút giỏ hàng trên header.
- Thêm trang thanh toán: `checkout.html` (COD / chuyển khoản / MoMo) và gửi đơn qua `POST /lead`.
- Thêm config thanh toán trong `assets/cms-data.json` (`site.payments.*`).

### 2026-04-02
- Fix `cms-data.json` hiển thị tiếng Việt chuẩn (UTF-8) + cập nhật nội dung sản phẩm (giá/giảm giá).
- Fix `cms-render.js` load CMS data ổn định hơn (fallback + parse JSON) và không để UI kẹt “0 sản phẩm”.
- Cập nhật logo header + chỉnh lại kích thước logo/topbar cho cân đối.

### 2026-04-03
- Bỏ toàn bộ CTA “Nhận báo giá” trên `product.html` (header + CTA + note).
- Cập nhật `script.js` để submit lead/đơn hàng ưu tiên `POST {API_BASE}/v1/leads` (Render) khi deploy tĩnh (GitHub Pages / cPanel).
- Sửa redirect `san-pham/` và `ve-chung-toi/` cho deploy ở root domain.
