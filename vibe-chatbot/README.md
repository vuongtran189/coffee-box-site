# VIBE COFFEE — AI Chatbot (Monorepo)

## Prerequisites
- Node.js 20+
- Docker Desktop (for MongoDB)

## Start MongoDB (local)
From `vibe-chatbot/`:
```powershell
docker compose -f .\\infra\\docker-compose.yml up -d
```

## Install dependencies
From `vibe-chatbot/`:
```powershell
npm install
```

## Run API (dev)
From `vibe-chatbot/`:
```powershell
copy .env.example .env
npm run dev:api
```

Health check:
- `GET http://localhost:8787/health`

## Build widget (served by API)
From `vibe-chatbot/`:
```powershell
npm run build:widget
```

Then the API serves:
- `GET http://localhost:8787/widget.js`
- `GET http://localhost:8787/widget.css`

## Deploy (Render + MongoDB Atlas)
### 1) MongoDB Atlas
- Create a cluster and database user.
- Get your connection string and set it as `MONGODB_URI` on Render.

### 2) Render
- Create a new **Web Service** from this GitHub repo.
- Render will detect `vibe-chatbot/render.yaml` (Blueprint) or you can choose Docker manually:
  - Root directory: `vibe-chatbot`
  - Dockerfile: `vibe-chatbot/Dockerfile`
- Set environment variables:
  - `MONGODB_URI` = your Atlas connection string
  - `WIDGET_PUBLIC_KEY` = a long random string (public, but used as a simple gate)
  - `CORS_ORIGINS` = your website domains (comma-separated), e.g. `https://coffee-box-site.pages.dev`

### 3) Embed on website
Use this snippet on your website (replace values):
```html
<script>
  (function () {
    var API_BASE = "https://YOUR-RENDER-SERVICE.onrender.com";
    var WIDGET_KEY = "YOUR_WIDGET_PUBLIC_KEY";
    var s = document.createElement("script");
    s.src = API_BASE.replace(/\/$/, "") + "/widget.js";
    s.async = true;
    s.onload = function () {
      window.VibeChatbot.init({ apiBaseUrl: API_BASE, widgetKey: WIDGET_KEY, preload: true });
    };
    document.head.appendChild(s);
  })();
</script>
```
