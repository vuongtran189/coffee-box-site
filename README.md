# Vibe Coffee — Website + Chatbot + CMS (coffee-box-site)

Repo này gồm 3 phần:
- **Website tĩnh** (GitHub Pages / cPanel): `index.html`, `products.html`, `news.html`, `about.html`, `contact.html`, `product.html`, `checkout.html`.
- **Chatbot backend + widget** (Render + MongoDB): thư mục `vibe-chatbot/` và widget nhúng vào website.
- **CMS nội dung + Admin (UI kiểu WordPress)** (Cloudflare Pages + KV): nội dung website lưu ở KV, quản trị qua `/admin/`.

## Link production (tham khảo)
- Website (GitHub Pages): `https://vuongtran189.github.io/coffee-box-site/`
- Website (Domain/Hosting): `https://vibecoffee.vn/`
- Chatbot API (Render): `https://vibe-chatbot-api.onrender.com/`
  - Health check: `GET /health`
- CMS API (Cloudflare Pages): `https://cms.vibecoffee.vn/`
  - Health check: `GET /health`
  - Public content (widget-key protected): `GET /v1/site/content`

## Cấu trúc thư mục
- `index.html`, `about.html`, `products.html`, `news.html`, `contact.html`: trang website.
- `product.html`: trang chi tiết sản phẩm (`?slug=...`).
- `checkout.html`: checkout (COD / chuyển khoản / MoMo).
- `styles.css`, `script.js`: CSS/JS dùng chung.
- `cms-render.js`: render nội dung từ CMS (ưu tiên Cloudflare KV → fallback `assets/cms-data.json`).
- `assets/`: ảnh + static assets
  - `assets/chatbot/widget.js`, `assets/chatbot/widget.css`: **bản widget dùng trên GitHub Pages/cPanel** (ưu tiên load local).
  - `assets/chatbot/agent.png`: avatar “tư vấn viên” cho nút launcher.
  - `assets/cms-data.json`: nội dung fallback cho website tĩnh.
- `admin/`: **trang quản trị nội dung UI kiểu WordPress** (chạy tĩnh, gọi CMS API Cloudflare).
- `functions/`: Cloudflare Pages Functions (CMS API + lead endpoint)
  - `GET /health`
  - `GET /v1/site/content`
  - `POST /v1/admin/login`
  - `GET/PUT /v1/admin/site/content`
  - `POST /lead` (nhận lead khi deploy Cloudflare Pages)
- `vibe-chatbot/`: monorepo cho chatbot
  - `apps/api`: API Express + MongoDB + OpenAI integration
  - `packages/widget`: source widget + build ra `dist/`
  - `render.yaml`, `Dockerfile`: cấu hình deploy Render
- `san-pham/`, `ve-chung-toi/`: trang redirect thân thiện (SEO) về `products.html` và `about.html`.

## Chatbot hoạt động như thế nào
### Nhúng widget trên website
Các trang HTML set biến global trước khi load `script.js`:
- `window.VIBE_CHATBOT_API_BASE` = base URL của API Render (vd `https://vibe-chatbot-api.onrender.com`)
- `window.VIBE_CHATBOT_WIDGET_KEY` = public key (để API cho phép gọi)
- `window.VIBE_CHATBOT_LAUNCHER_ICON_URL` = icon/ảnh avatar (hiện tại trỏ tới `assets/chatbot/agent.png`)

`script.js` sẽ:
- **Ưu tiên load widget local**: `assets/chatbot/widget.js` + `assets/chatbot/widget.css`.
- Widget gọi API:
  - `POST /v1/widget/init` (khởi tạo session)
  - `POST /v1/chat` (gửi tin nhắn)

### AI trả lời (OpenAI)
API route `/v1/chat` sẽ cố gắng gọi OpenAI Responses API nếu có `OPENAI_API_KEY`.
- Nếu OpenAI lỗi/timeout → fallback câu trả lời mặc định.
- Nếu MongoDB lỗi tạm thời → API chạy chế độ **degraded/stateless** để tránh 502.

## CMS nội dung (Cloudflare KV) hoạt động như thế nào
### Website đọc nội dung
`cms-render.js` sẽ cố gắng load theo thứ tự:
- Nếu có `window.VIBE_CMS_API_BASE` → `GET {CMS_API_BASE}/v1/site/content` (yêu cầu header `x-widget-key`)
- Nếu không có → fallback `assets/cms-data.json`

Biến cần set trên website:
- `window.VIBE_CMS_API_BASE` = `https://cms.vibecoffee.vn` (khuyến nghị)
- `window.VIBE_CHATBOT_WIDGET_KEY` = widget key (trùng `WIDGET_PUBLIC_KEY` bên Cloudflare)

### Trang quản trị `/admin/` (UI kiểu WordPress)
`/admin/` là trang tĩnh (host ở cPanel: `https://vibecoffee.vn/admin/`) và gọi CMS API:
- `POST {CMS_API_BASE}/v1/admin/login` (lấy token bearer)
- `GET {CMS_API_BASE}/v1/admin/site/content` (load nội dung)
- `PUT {CMS_API_BASE}/v1/admin/site/content` (lưu nội dung vào KV)

Ảnh/media: dán **Cloudinary URL** vào các trường Image (admin sẽ preview).

## Cloudflare Pages (CMS API) — Variables + Bindings (quan trọng)
Trên Cloudflare Pages project `coffee-box-site`:
- KV binding: `VIBE_CONTENT_KV` (KV Namespace) — nơi lưu nội dung JSON
- Variables:
  - `WIDGET_PUBLIC_KEY`: phải trùng `window.VIBE_CHATBOT_WIDGET_KEY` trên website/admin
  - `CORS_ORIGINS`: ví dụ `https://vibecoffee.vn,https://www.vibecoffee.vn` (không có path)
  - `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`: bật đăng nhập admin
  - (tuỳ chọn) `ADMIN_TOKEN_TTL_SECONDS`, `ADMIN_OPEN`

## Render (Chatbot API) — Environment Variables (quan trọng)
Trong Render service `vibe-chatbot-api`, cần set (không commit secrets vào git):
- `CORS_ORIGINS`: ví dụ `https://vuongtran189.github.io,https://vibecoffee.vn,https://www.vibecoffee.vn`
- `MONGODB_URI`: MongoDB connection string (Atlas)
- `WIDGET_PUBLIC_KEY`: phải trùng `window.VIBE_CHATBOT_WIDGET_KEY` trên website (khuyến nghị dùng cùng key với Cloudflare CMS)
- `OPENAI_API_KEY`: OpenAI API key

Tuỳ chọn:
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_MAX_OUTPUT_TOKENS` (default: 350)
- `OPENAI_INSTRUCTIONS`: “system prompt” cho tư vấn viên (placeholder: `{{knowledge_chunks}}`, `{{user_message}}`)
- `VIBE_KNOWLEDGE_TEXT`, `VIBE_KNOWLEDGE_PATH`, `VIBE_KNOWLEDGE_MAX_CHARS`

## Bán hàng online (Giỏ hàng + Checkout)
### Giỏ hàng
- Nút “Thêm vào giỏ” nằm ở trang `products.html` và `product.html`.
- Giỏ hàng lưu ở `localStorage` (key: `vibe_cart_v1`) và mở dạng drawer ở góc phải.

### Checkout (COD / Chuyển khoản / MoMo)
- Trang checkout: `checkout.html` (từ giỏ hàng bấm “Gửi đơn đặt hàng”).
- Form **tự chọn endpoint**:
  - Nếu có `window.VIBE_CHATBOT_API_BASE` + `window.VIBE_CHATBOT_WIDGET_KEY` → gửi `POST {API_BASE}/v1/leads` (khuyến nghị cho GitHub Pages / cPanel).
  - Nếu không có cấu hình chatbot → fallback `POST /lead` (Cloudflare Pages Functions / backend cùng origin).
- Cấu hình thông tin thanh toán nằm trong `assets/cms-data.json`:
  - `site.payments.bank_name`, `site.payments.bank_account_number`, `site.payments.bank_account_name`, `site.payments.momo_phone`

## Deploy lên Linux hosting (cPanel) — vibecoffee.vn
### 1) DNS
- Tạo bản ghi:
  - `A` cho `@` → IP hosting
  - `A` cho `www` → IP hosting

### 2) Upload website
- Upload + Extract zip website vào `public_html/`.
- **Nhớ upload cả thư mục `admin/`** (để có trang `https://vibecoffee.vn/admin/`).

### 3) Set biến CMS + Chatbot trên website
- Set `window.VIBE_CMS_API_BASE = "https://cms.vibecoffee.vn"` để website đọc nội dung từ KV.
- Giữ `window.VIBE_CHATBOT_API_BASE = "https://vibe-chatbot-api.onrender.com"` cho chatbot/leads.

## Checklist khi deploy / debug
### 1) CMS API sống?
- Mở: `https://cms.vibecoffee.vn/health` → phải thấy `{"ok":true}`
- Lưu ý: `GET /v1/site/content` yêu cầu header `x-widget-key` (mở trực tiếp trên browser sẽ báo `Unauthorized` là bình thường).

### 2) Admin gọi đúng CMS API?
- Mở `https://vibecoffee.vn/admin/` → “Cài đặt kết nối”:
  - `API base` = `https://cms.vibecoffee.vn`
  - `Widget key` đúng
  - đăng nhập → sửa → bấm “Lưu”

### 3) Chatbot API sống?
- Mở: `https://vibe-chatbot-api.onrender.com/health` → phải thấy `{"ok":true}`

### 4) CORS đúng?
- `CORS_ORIGINS` phải đúng **origin** (không có path):
  - Đúng: `https://vibecoffee.vn`
  - Sai: `https://vibecoffee.vn/admin`

### 5) Widget load local?
- Trên website, kiểm tra Network:
  - `assets/chatbot/widget.js` và `assets/chatbot/widget.css` load 200 OK

## Tiến độ (cập nhật: 2026-04-07)
### Đã hoàn thành
- [x] Website tĩnh + các trang chính + `product.html`, giỏ hàng, `checkout.html`.
- [x] Widget nhúng hiển thị tiếng Việt + avatar launcher, website ưu tiên load widget local.
- [x] Chatbot API (Render) có `GET /health`, CORS preflight ổn định, degraded/stateless khi MongoDB lỗi.
- [x] Flow submit lead/đơn hàng chạy được trên hosting tĩnh: ưu tiên `POST /v1/leads`.
- [x] CMS nội dung chạy trên Cloudflare Pages + KV (`cms.vibecoffee.vn`) và website đọc nội dung qua `VIBE_CMS_API_BASE`.
- [x] Trang quản trị `/admin/` UI kiểu WordPress (Pages/Posts/Products/Tools/Settings) lưu/đọc nội dung từ Cloudflare KV.

### Việc cần làm tiếp (khuyến nghị)
- [ ] Rà soát Render env vars (đặc biệt: `CORS_ORIGINS`, `WIDGET_PUBLIC_KEY`, `MONGODB_URI`, `OPENAI_API_KEY`).
- [ ] (Tuỳ chọn) Media Library (lưu danh sách Cloudinary URL) và editor nâng cao (WYSIWYG) trong admin.
- [ ] (Tuỳ chọn) tách “Bài viết” thành file HTML thật trong `news/` nếu muốn SEO bài viết theo URL riêng.

## Nhật ký thay đổi (để quay lại nhanh)
### 2026-03-23
- Thêm `OPENAI_INSTRUCTIONS.txt` + knowledge base, nạp knowledge vào prompt, fallback/log chẩn đoán OpenAI.

### 2026-03-24
- Thêm `product.html`, giỏ hàng, `checkout.html`, config thanh toán trong `assets/cms-data.json`.

### 2026-04-02 → 2026-04-03
- Fix CMS data render, logo/topbar, bỏ CTA “Nhận báo giá”, sửa redirect `san-pham/`, `ve-chung-toi/`, đổi flow submit lead ưu tiên `POST /v1/leads`.

### 2026-04-07
- Thêm CMS API chạy trên Cloudflare Pages + KV: `functions/*`.
- `cms-render.js` hỗ trợ `window.VIBE_CMS_API_BASE`.
- Xây lại `/admin/` theo UI kiểu WordPress và lưu nội dung lên KV.

