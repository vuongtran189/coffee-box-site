# Vibe Coffee - CMS First Website

Website duoc toi uu theo mo hinh quan tri don gian:
- Quan ly noi dung bang `admin/` (UI).
- Luu noi dung tren Cloudflare Pages Functions + KV (`functions/`).
- Website tinh doc noi dung tu CMS API qua `cms-render.js`.
- Ban tu upload file web len cPanel khi can cap nhat giao dien/code.

## Muc tieu van hanh
- Noi dung thay doi tai `https://vibecoffee.vn/admin/` va bam `Luu`.
- Website lay noi dung moi tu Cloudflare CMS API.
- Khong phu thuoc deploy tu dong len cPanel.

## Cau truc can quan tam
- Website: `index.html`, `about.html`, `products.html`, `product.html`, `news.html`, `contact.html`, `checkout.html`
- Renderer: `cms-render.js`
- Frontend behavior: `script.js`
- Admin CMS: `admin/`
- Cloudflare CMS API: `functions/`
- Fallback data: `assets/cms-data.json`

## Bien can set tren website (HTML)
- `window.VIBE_CMS_API_BASE = "https://cms.vibecoffee.vn"`
- `window.VIBE_CHATBOT_WIDGET_KEY = "<widget_key>"`
- (neu dung chatbot) `window.VIBE_CHATBOT_API_BASE = "https://vibe-chatbot-api.onrender.com"`

## Cloudflare Pages (CMS API)
Project chua `functions/` can:
- KV binding: `VIBE_CONTENT_KV`
- Variables:
  - `WIDGET_PUBLIC_KEY`
  - `CORS_ORIGINS` (chi origin, khong co path)
  - `ADMIN_PASSWORD`
  - `ADMIN_JWT_SECRET`
  - tuy chon: `ADMIN_OPEN=1` de mo admin khong can login

## Quy trinh cap nhat noi dung
1. Mo `https://vibecoffee.vn/admin/`
2. Nhap `Widget key` + dang nhap admin (neu bat auth)
3. Sua noi dung/anh
4. Bam `Luu`
5. Reload trang website de thay doi

## Quy trinh cap nhat code giao dien
1. Chinh code trong repo
2. Push GitHub (de version control)
3. Upload file can thiet len cPanel (`public_html`) bang tay

## Toi uu da ap dung
- Don gian hoa menu admin, bo cac muc mo phong khong can dung.
- Co dinh admin vao Cloudflare CMS API (`https://cms.vibecoffee.vn`) de tranh sai cau hinh.
- Bo workflow deploy cPanel tu dong trong GitHub Actions.
- Bo artifact deploy cu trong repo (`_deploy_cpanel/`, `vibecoffee.vn-site.zip`).

## Ghi chu
- Media Library nam trong menu `Media`, ho tro:
  - them URL anh
  - quet anh dang dung trong CMS
  - preview, copy URL, gan tags
- Moi thay doi trong admin se cap nhat len CMS sau khi bam `Luu`.
