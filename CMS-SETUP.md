# CMS Admin Setup (WordPress-style workflow)

Website now includes Decap CMS at:
- /admin/

To make login/publish work reliably, use Netlify Identity + Git Gateway.

## 1) Connect GitHub repo to Netlify
1. Open Netlify and choose "Add new site" -> "Import an existing project".
2. Select GitHub repo: `vuongtran189/coffee-box-site`.
3. Build command: leave empty (static site).
4. Publish directory: `.`
5. Deploy.

## 2) Enable Identity
1. In Netlify site dashboard -> Identity -> Enable Identity.
2. In Identity -> Settings:
   - Registration preferences: Invite only (recommended)
   - External providers: optional

## 3) Enable Git Gateway
1. In Identity -> Services -> Git Gateway -> Enable Git Gateway.

## 4) Invite admin user
1. Identity -> Invite users.
2. Send invite to your email.
3. Accept invite from email and set password.

## 5) Access CMS
- Open: `https://<your-netlify-site>.netlify.app/admin/`
- Login with invited account.
- Edit content and publish.

## Notes
- Content is stored in `assets/cms-data.json`.
- All 5 pages read from this file via `cms-render.js`.
- You can keep GitHub Pages for public site and use Netlify URL only for admin, or move public domain to Netlify entirely.
