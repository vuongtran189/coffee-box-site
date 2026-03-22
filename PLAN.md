# Execution Plan — VIBE COFFEE Website AI Chatbot (based on `SPEC.md`)

This plan breaks the build into **Codex-friendly, atomic tasks**. It assumes we will create a monorepo folder `vibe-chatbot/` inside this repo (so the existing static website remains unchanged until we embed the widget build).

**Primary stack (from `SPEC.md`)**
- Backend: Node.js + **Fastify** + TypeScript
- AI: **OpenAI API** (tool calling + streaming responses)
- DB: **PostgreSQL + pgvector** (via Docker for local dev)
- ORM: **Prisma** (or Drizzle; tasks below assume Prisma)
- Widget: TypeScript + DOM UI, bundled to a single embeddable file via **tsup** (or Vite; tasks below assume tsup)
- Testing: Vitest + Supertest (+ Playwright optional)

**Priority levels**
- **Critical**: must-have for a usable v1.
- **Important**: strongly recommended for production readiness.
- **Optional**: nice-to-have / v1.5.

---

## Phase 1 — Setup project (Estimated: 6–10 hours)

### Dependencies
- Node.js 20+ (dev)
- pnpm or npm (choose one and standardize)
- Docker Desktop (for Postgres+pgvector local)

### Tasks
1) **[Critical] Create monorepo skeleton**
   - Create `vibe-chatbot/` with workspaces:
     - `vibe-chatbot/apps/api`
     - `vibe-chatbot/packages/widget`
     - `vibe-chatbot/packages/shared`
     - `vibe-chatbot/infra`
     - `vibe-chatbot/docs`
   - Add root `package.json` + workspace config.

2) **[Critical] TypeScript + lint/format baseline**
   - Add `tsconfig.base.json`
   - Add ESLint + Prettier (or biome) configuration
   - Add scripts: `dev`, `build`, `lint`, `test`, `typecheck`

3) **[Critical] Local infrastructure via Docker Compose**
   - Add `postgres:16` + `pgvector` extension enabled.
   - Expose port 5432, create database `vibe_chatbot`.
   - Add `.env.example` with DB + OpenAI placeholders.

4) **[Important] CI scaffolding**
   - Add GitHub Actions (or your CI) to run: install → typecheck → lint → test.

5) **[Important] Documentation wiring**
   - Copy/link `SPEC.md` into `vibe-chatbot/docs/SPEC.md` (or keep single source of truth).
   - Add `README.md` with local dev instructions.

### Expected output
- You can run:
  - `docker compose up -d` (DB ready)
  - `pnpm -C vibe-chatbot install`
  - `pnpm -C vibe-chatbot lint` / `typecheck`

### Files to create (minimum)
- `vibe-chatbot/package.json`
- `vibe-chatbot/pnpm-workspace.yaml` (or npm workspaces)
- `vibe-chatbot/tsconfig.base.json`
- `vibe-chatbot/.env.example`
- `vibe-chatbot/infra/docker-compose.yml`
- `vibe-chatbot/docs/SPEC.md`
- `vibe-chatbot/README.md`
- `vibe-chatbot/.eslintrc.*` / `vibe-chatbot/.prettierrc*`
- `.github/workflows/ci.yml` (optional but recommended)

---

## Phase 2 — Build backend API (Estimated: 14–22 hours)

### Dependencies
- Phase 1 complete
- Postgres running locally

### Tasks
1) **[Critical] API app bootstrap**
   - Create Fastify server entry with graceful shutdown.
   - Add config loader (env validation with Zod).
   - Add request logging (pino).
   - Add CORS allowlist based on `SITE_DOMAIN_ALLOWLIST`.

2) **[Critical] Public widget authentication**
   - Implement `x-widget-key` header validation:
     - lookup `sites.widget_public_key`
     - attach `site_id` to request context

3) **[Critical] Rate limiting & abuse controls**
   - Add per-IP and per-visitor throttles (Fastify rate-limit).
   - Add basic payload size limits.

4) **[Critical] Implement public endpoints (stubs first)**
   - `POST /v1/widget/init`
     - upsert visitor, create conversation if needed
     - return `visitor_id`, `conversation_id`, quick replies
   - `POST /v1/chat`
     - append user message to DB
     - (Phase 3 will generate assistant response)
   - `POST /v1/leads`
     - validate + normalize VN phone
     - store lead with consent + attribution
   - `POST /v1/events`
     - store analytics events

5) **[Important] Internal endpoints for tools (stubs first)**
   - `GET /internal/kb/search`
   - `GET /internal/products/search`
   - `GET /internal/pricing`

6) **[Important] Standardized response envelope + error handling**
   - Global error handler (400/401/429/500)
   - Consistent JSON shapes; never leak stack traces

### Expected output
- API runs locally: `pnpm -C vibe-chatbot --filter api dev`
- Can init a conversation and store messages/leads in DB.

### Files to create (minimum)
- `vibe-chatbot/apps/api/src/server.ts`
- `vibe-chatbot/apps/api/src/config/env.ts`
- `vibe-chatbot/apps/api/src/plugins/logger.ts`
- `vibe-chatbot/apps/api/src/plugins/cors.ts`
- `vibe-chatbot/apps/api/src/plugins/rateLimit.ts`
- `vibe-chatbot/apps/api/src/plugins/authWidgetKey.ts`
- `vibe-chatbot/apps/api/src/routes/public/widget.init.ts`
- `vibe-chatbot/apps/api/src/routes/public/chat.ts`
- `vibe-chatbot/apps/api/src/routes/public/leads.ts`
- `vibe-chatbot/apps/api/src/routes/public/events.ts`
- `vibe-chatbot/apps/api/src/routes/internal/kb.search.ts`
- `vibe-chatbot/apps/api/src/routes/internal/products.search.ts`
- `vibe-chatbot/apps/api/src/routes/internal/pricing.ts`

---

## Phase 3 — Integrate AI (Estimated: 14–24 hours)

### Dependencies
- Phase 2 complete (API endpoints exist)
- OpenAI API key available in env (`OPENAI_API_KEY`)
- Seed content in DB (Phase 5 will finalize, but minimal seed is needed to test RAG)

### Tasks
1) **[Critical] OpenAI client wrapper**
   - Centralize model name, timeouts, retries, and streaming support.
   - Add request/response telemetry: latency, token usage, errors.

2) **[Critical] Prompt packaging**
   - Store the **system prompt (Vietnamese)** as a versioned file in repo.
   - Add “conversation state” assembly:
     - last N messages
     - optional `conversations.summary`
     - current page URL + UTM/referrer

3) **[Critical] Tool calling (server-side)**
   - Implement tool adapters that call internal services / DB:
     - `kb_search(query, filters, top_k)`
     - `product_search(query)`
     - `pricing_lookup(sku, price_type)`
     - `create_lead(...)` (calls Lead Service)
   - Validate tool inputs/outputs with Zod.

4) **[Critical] `/v1/chat` end-to-end AI response**
   - On user message:
     - store message
     - run orchestrator (model + tools)
     - store assistant response (text + UI JSON)
     - return response to widget (optionally streaming)

5) **[Important] Guardrails & policy checks**
   - Block medical claims; enforce “no hallucinated discounts”.
   - If pricing is missing → ask for intent + offer lead capture.

6) **[Important] Structured “next action”**
   - Add lightweight classification output:
     - `next.action = ask | recommend | lead_capture | handoff`
   - Use this to drive widget UI (show form / quick replies).

7) **[Optional] Conversation summarization**
   - When message count exceeds threshold:
     - summarize and store in `conversations.summary`
     - keep only last N raw messages for context

### Expected output
- Chat endpoint returns high-quality Vietnamese sales responses.
- Tool usage is logged and deterministic (no hidden state).

### Files to create (minimum)
- `vibe-chatbot/apps/api/src/modules/ai/openaiClient.ts`
- `vibe-chatbot/apps/api/src/modules/ai/orchestrator.ts`
- `vibe-chatbot/apps/api/src/modules/ai/tools/*.ts`
- `vibe-chatbot/apps/api/src/modules/ai/prompts/system.vi.v1.txt`
- `vibe-chatbot/apps/api/src/modules/ai/guardrails.ts`
- `vibe-chatbot/packages/shared/src/types/ai.ts`

---

## Phase 4 — Build frontend chat widget (Estimated: 18–30 hours)

### Dependencies
- Phase 2 (API reachable)
- Phase 3 (AI responses available) is recommended, but widget can be built against stubs.

### Tasks
1) **[Critical] Widget bundle setup**
   - Create `packages/widget` build pipeline:
     - output `dist/widget.js` (single file)
     - output `dist/widget.css` (or inline CSS)
   - Provide global init:
     - `window.VibeChatbot.init({ widgetKey, apiBaseUrl, locale, theme })`

2) **[Critical] UI foundation**
   - Launcher button + panel
   - Message list with roles (user/assistant)
   - Input box + send button
   - Loading/typing indicator

3) **[Critical] Session + conversation lifecycle**
   - Store `visitor_id` and `conversation_id` in `localStorage`.
   - Call `POST /v1/widget/init` on first open.
   - Implement resend/retry on network errors.

4) **[Critical] Lead capture UX**
   - When backend indicates lead capture (or user clicks CTA):
     - show a mini-form inside chat:
       - name, phone, need
       - consent checkbox with link to privacy text (config)
   - Submit to `POST /v1/leads`.

5) **[Important] Rich UI payload rendering**
   - Render cards/buttons from `assistant.ui`.
   - Track clicks to `POST /v1/events`.

6) **[Important] Vietnam-specific validation**
   - Phone format guidance + normalization client-side (still validate on server).
   - Vietnamese placeholders, error copy, consent text.

7) **[Optional] Streaming responses**
   - Support server-sent events (SSE) or chunked fetch streaming.

8) **[Optional] Embedding into the existing website**
   - Add a snippet into `coffee-box-site/index.html` (or `script.js`) to load `widget.js`.
   - Ensure no conflicts with existing CSS.

### Expected output
- A production embeddable widget with stable API contract.
- Visitor can chat, get recommendations, and submit lead info.

### Files to create (minimum)
- `vibe-chatbot/packages/widget/src/index.ts`
- `vibe-chatbot/packages/widget/src/api/client.ts`
- `vibe-chatbot/packages/widget/src/state/storage.ts`
- `vibe-chatbot/packages/widget/src/ui/widget.ts`
- `vibe-chatbot/packages/widget/src/ui/renderers.ts`
- `vibe-chatbot/packages/widget/src/styles/widget.css`
- `vibe-chatbot/packages/widget/tsup.config.ts`
- `vibe-chatbot/packages/widget/package.json`

---

## Phase 5 — Database integration (Estimated: 16–26 hours)

### Dependencies
- Postgres running + pgvector enabled (Phase 1)
- API app ready (Phase 2)

### Tasks
1) **[Critical] Prisma schema + migrations**
   - Implement schema from `SPEC.md`:
     - sites, visitors, conversations, messages, leads
     - products, prices
     - kb_documents, kb_embeddings, events
   - Add indexes and constraints.

2) **[Critical] DB plugin + repositories**
   - Initialize Prisma client in API.
   - Implement repository functions per module:
     - visitor upsert
     - conversation create/get
     - message insert/list
     - lead create

3) **[Critical] Seed baseline data**
   - Create site row (VIBE COFFEE) with:
     - `domain`
     - `widget_public_key`
   - Seed minimal products + prices + FAQ/policies.

4) **[Important] RAG embedding pipeline**
   - Chunk `kb_documents.content` into chunks.
   - Generate embeddings (OpenAI embeddings model).
   - Store into `kb_embeddings` (pgvector).
   - Implement hybrid search:
     - vector topK + simple lexical fallback.

5) **[Important] Data retention utilities**
   - Scheduled job or CLI:
     - delete old conversations/messages beyond retention window.

6) **[Optional] Multi-tenant readiness**
   - Ensure all queries are scoped by `site_id`.
   - Add ability to rotate `widget_public_key`.

### Expected output
- API endpoints persist real data and retrieve knowledge reliably.
- Tool calls (`kb_search`, `pricing_lookup`) use DB sources only.

### Files to create (minimum)
- `vibe-chatbot/apps/api/prisma/schema.prisma`
- `vibe-chatbot/apps/api/prisma/migrations/*`
- `vibe-chatbot/apps/api/src/plugins/db.ts`
- `vibe-chatbot/apps/api/src/modules/*/repo.ts`
- `vibe-chatbot/apps/api/src/workers/embedder.ts`
- `vibe-chatbot/apps/api/src/scripts/seed.ts`

---

## Phase 6 — Testing (Estimated: 12–20 hours)

### Dependencies
- Phases 1–5 complete

### Tasks
1) **[Critical] Unit tests (shared + api)**
   - Validators:
     - VN phone normalization
     - consent requirements
   - Tool adapter contracts (zod validation)

2) **[Critical] API integration tests (Supertest)**
   - `POST /v1/widget/init` returns ids and persists visitor.
   - `POST /v1/chat` stores messages and returns assistant response (mock OpenAI).
   - `POST /v1/leads` stores lead and links to conversation.

3) **[Important] RAG tests**
   - Embedding generation mocked.
   - Search returns expected snippets given seeded docs.

4) **[Important] Widget smoke tests**
   - Basic rendering in jsdom (or Playwright if needed).
   - Ensure widget init works and can send a message.

5) **[Important] Security/regression checks**
   - Rate-limit works (429).
   - CORS allowlist enforced.
   - Logs do not contain raw phone numbers (redaction test).

6) **[Optional] E2E tests (Playwright)**
   - Serve a static page that embeds the widget.
   - Run through: open → ask price → submit lead.

### Expected output
- `pnpm -C vibe-chatbot test` passes locally and in CI.
- Confidence that core flows won’t regress.

### Files to create (minimum)
- `vibe-chatbot/apps/api/src/**/*.test.ts`
- `vibe-chatbot/packages/widget/src/**/*.test.ts`
- `vibe-chatbot/apps/api/test/helpers.ts`
- `vibe-chatbot/apps/api/test/fixtures/*`
- `vibe-chatbot/playwright.config.ts` (optional)
- `vibe-chatbot/apps/api/test/e2e/*` (optional)

---

## Milestone Checklist (v1 “Shippable”)
- **Critical**
  - Widget can init + chat + store messages
  - AI answers in Vietnamese with sales flow
  - Lead capture stores name/phone/need with consent
  - DB schema + migrations + seed data
  - Rate limiting + CORS allowlist
- **Important**
  - RAG knowledge retrieval (pgvector) working
  - Click/event tracking
  - Mockable OpenAI layer + integration tests
- **Optional**
  - Streaming UI
  - Admin dashboard
  - Human handoff automation (Zalo OA)

