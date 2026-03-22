# CMS Admin Setup (GitHub OAuth)

Website includes Decap CMS at:
- `/admin/`

This repo uses GitHub OAuth via Cloudflare Pages Functions (no Netlify Identity / Git Gateway).

## Setup
Follow: `CLOUDFLARE-PAGES-SETUP.md`

## Access CMS
- Open: `https://<your-site>.pages.dev/admin/`
- Log in with GitHub OAuth.
- Edit content and publish.

## Notes
- Content is stored in `assets/cms-data.json`.
- All 5 pages read from this file via `cms-render.js`.
- Contact form submits to `POST /lead` (see `CLOUDFLARE-PAGES-SETUP.md` for delivery env vars).

