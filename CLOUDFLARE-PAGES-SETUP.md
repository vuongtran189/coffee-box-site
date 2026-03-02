# Cloudflare Pages Setup

## 1) Create Cloudflare Pages project
- Go to Cloudflare Dashboard -> `Workers & Pages` -> `Create` -> `Pages`.
- Connect GitHub repo: `vuongtran189/coffee-box-site`.
- Branch: `main`.
- Build command: leave empty.
- Build output directory: `/` (root).

## 2) Configure environment variables (Pages -> Settings -> Variables)
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- Optional: `GITHUB_SCOPE` = `repo`

Set these for both `Production` and `Preview`.

## 3) Create GitHub OAuth App
- GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App.
- Homepage URL: your Cloudflare Pages domain (example: `https://your-site.pages.dev`).
- Authorization callback URL: `https://your-site.pages.dev/callback`
- Copy `Client ID` and `Client Secret` into Cloudflare variables above.

## 4) Update Decap CMS config
In `admin/config.yml`, replace:
- `base_url: https://YOUR_CLOUDFLARE_PAGES_DOMAIN`

With your real domain, for example:
- `base_url: https://your-site.pages.dev`

Then push to `main`.

## 5) Verify CMS
- Open: `https://your-site.pages.dev/admin/`
- Log in with GitHub OAuth popup.
- Edit and publish content.

## Notes
- This setup removes dependency on Netlify Identity/Git Gateway.
- CMS writes directly to GitHub repository through OAuth token.
