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
