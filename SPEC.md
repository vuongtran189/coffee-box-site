# VIBE COFFEE — Website AI Chatbot System Specification (SPEC)

## 0) Goals & Non‑Goals

### Goals
- **Increase sales conversion**: guide visitors to the right product, handle objections, and drive purchase intent.
- **Answer questions in Vietnamese**: product info, pricing, FAQ, recommendations.
- **Collect leads**: name, phone, customer needs; optionally email/Zalo, location, intended use.
- **Store and analyze**: chat history + lead data with attribution, consent, and analytics.
- **Production-ready**: secure, observable, scalable, and compliant with privacy expectations in Vietnam.

### Non‑Goals (v1)
- Full e-commerce checkout inside chat (chat will link to product/contact/purchase channels).
- Voice, WhatsApp, or social channels (future).
- Agentic browsing of the public internet at runtime (use curated knowledge sources).

---

## 1) System Architecture

### 1.1 Text-Based Architecture Diagram

```
Visitor Browser
  |
  | 1) Load website + widget embed <script>
  v
Chat Widget (JS/TS)
  - UI/UX (popup)
  - Session state (localStorage)
  - Event tracking (view/open/click)
  - PII capture + consent UI
  |
  | HTTPS (CORS) JSON
  v
API Gateway / Backend (Node.js: Fastify or Express)
  - Auth & tenancy (siteId)
  - Rate limiting / bot protection
  - Conversation service
  - Lead service
  - Knowledge service (RAG)
  - Prompt orchestration
  - OpenAI API client
  - Observability (logs/metrics/traces)
  |
  | SQL (transactions) + vector search
  v
PostgreSQL (+ pgvector)
  - conversations, messages
  - visitors, leads
  - products, faq, policies
  - embeddings (documents)
  |
  | Optional outbound
  v
Integrations
  - CRM / Google Sheets webhook
  - Email (MailChannels/SendGrid) / Zalo OA (future)
  - Admin dashboard (future)
```

### 1.2 Key Design Choices
- **Backend**: Node.js + **Fastify** (preferred for performance) or Express. This spec assumes Fastify.
- **DB**: **PostgreSQL** for structured analytics + compliance + **pgvector** for retrieval.
- **AI**: OpenAI API (Chat Completions / Responses API) with **tool calling** for:
  - knowledge retrieval (RAG),
  - lead extraction,
  - pricing lookup (from DB),
  - escalation/handoff.
- **Knowledge**: curated documents + product catalog + FAQ stored in DB, embedded for semantic search.

---

## 2) Feature Breakdown

### 2.1 Chat Widget (Frontend)
**Core**
- Floating launcher button + popup panel.
- Vietnamese-first UI copy; supports English fallback (optional).
- Conversation persistence per visitor via `visitor_id` stored in `localStorage`.
- Typing indicators, streaming responses, retry.
- Rich messages: buttons (CTA), product cards, quick replies.

**Sales UX**
- “Quick intents”: *Xem giá*, *Tư vấn chọn vị*, *Chính sách đại lý*, *Cách pha*.
- Contextual CTAs:
  - “Nhận báo giá sỉ/đại lý”
  - “Đặt thử ngay”
  - “Gọi hotline”
- Lead capture forms embedded in chat (name/phone/need).

**Compliance & Trust**
- Consent checkbox before collecting phone number (configurable).
- “Xóa lịch sử chat” (delete local + request deletion server-side if lead exists).
- Anti-spam honeypot + minimum time-to-submit.

### 2.2 Backend Services
**Conversation Service**
- Create/retrieve conversation by `visitor_id` + `site_id`.
- Store messages, roles, and metadata (device, URL, referrer).
- Maintain session memory summary (optional) to reduce token usage.

**Sales Agent Orchestrator**
- Determines next action:
  - answer question,
  - ask qualifying questions,
  - recommend product(s),
  - request lead info,
  - offer purchase channels,
  - escalate to human.
- Enforces policies: truthful pricing, no sensitive medical claims, no hallucinated promotions.

**Knowledge (RAG) Service**
- Index documents: product specs, pricing tiers, shipping policy, FAQs, marketing copy.
- Retrieval:
  - lexical (ILIKE) + semantic (vector) hybrid search.
- Content versioning and cache invalidation.

**Lead Service**
- Validate and normalize phone numbers (VN formats).
- Store lead fields + link to conversation.
- Optional delivery:
  - webhook to CRM/Sheets,
  - email notifications.

**Security & Abuse**
- Rate limiting (IP + visitor_id).
- Bot detection (challenge after N msgs).
- PII redaction for logs.

### 2.3 Admin / Ops (v1.5)
- Admin dashboard (optional scope) for:
  - viewing conversations/leads,
  - editing products/prices/FAQ,
  - exporting leads,
  - monitoring AI costs and performance.

---

## 3) User Flow (Step-by-Step)

### 3.1 First-Time Visitor → Product Q&A → Lead Capture
1. Visitor opens website.
2. Widget auto-loads and shows launcher “Tư vấn nhanh”.
3. Visitor opens chat → widget calls `POST /v1/widget/init`.
4. Backend returns:
   - `visitor_id` (if new),
   - `conversation_id`,
   - suggested quick replies.
5. Visitor asks: “Cà phê muối vị phô mai giá bao nhiêu?”
6. Widget sends message to `POST /v1/chat`.
7. Backend:
   - detects intent “pricing”,
   - calls tool `pricing_lookup(product_sku)` from DB,
   - responds with price, pack size, and CTA.
8. Assistant asks a qualifying question:
   - “Bạn mua dùng cá nhân hay làm đại lý/quán?”
9. Visitor selects “Đại lý”.
10. Assistant requests lead info:
    - name, phone, nhu cầu (khu vực, số lượng/tháng, kênh bán).
11. Visitor submits lead form inside chat.
12. Widget calls `POST /v1/leads`.
13. Backend stores lead + optionally sends webhook/email.
14. Assistant confirms + next step:
    - “Mình đã ghi nhận. Bạn muốn nhận bảng giá qua Zalo hay gọi tư vấn?”

### 3.2 Recommendation Flow (Guided Selling)
1. Visitor: “Mình thích vị béo, ít ngọt.”
2. Assistant asks:
   - mức độ đậm, uống nóng/lạnh, mục tiêu (tỉnh táo/buổi sáng), ngân sách.
3. Assistant recommends product(s) + how-to-use + upsell combo.
4. CTA: “Xem sản phẩm” + “Nhận mẫu thử”.
5. Lead capture if visitor shows intent.

### 3.3 FAQ Flow (Low Friction)
1. Visitor selects quick reply “Cách pha”.
2. Assistant returns short steps + tips (nước nóng bao nhiêu độ, tỉ lệ).
3. CTA: “Bạn muốn mình tư vấn vị phù hợp khẩu vị không?”

### 3.4 Human Escalation (Optional)
1. Visitor: “Mình muốn hợp đồng đại lý, gửi báo giá ngay.”
2. Assistant collects lead + offers handoff:
   - hotline,
   - Zalo link (configured),
   - “Nhân viên gọi trong 15 phút”.
3. Backend tags lead as `priority=high`.

---

## 4) Database Schema (PostgreSQL + pgvector)

> Suggested tooling: Prisma or Drizzle. Use `uuid` primary keys; store timestamps in UTC.

### 4.1 Tables

#### `sites`
- `id` (uuid, pk)
- `name` (text) — e.g. “VIBE COFFEE”
- `domain` (text)
- `widget_public_key` (text, unique) — used by embed script
- `created_at`, `updated_at`

#### `visitors`
- `id` (uuid, pk)
- `site_id` (uuid, fk -> sites.id)
- `first_seen_at`, `last_seen_at`
- `user_agent` (text)
- `ip_hash` (text) — hash, not raw IP (optional; raw IP can be stored short-term in logs only)
- `utm_source`, `utm_medium`, `utm_campaign` (text, nullable)
- `referrer` (text, nullable)

#### `conversations`
- `id` (uuid, pk)
- `site_id` (uuid, fk)
- `visitor_id` (uuid, fk)
- `status` (text) — `open | closed | escalated`
- `summary` (text, nullable) — rolling summary to reduce context
- `last_message_at` (timestamptz)
- `created_at`, `updated_at`

#### `messages`
- `id` (uuid, pk)
- `conversation_id` (uuid, fk)
- `role` (text) — `user | assistant | system | tool`
- `content_text` (text)
- `content_json` (jsonb, nullable) — rich UI payload (cards, buttons)
- `token_count` (int, nullable)
- `latency_ms` (int, nullable)
- `created_at` (timestamptz)

#### `leads`
- `id` (uuid, pk)
- `site_id` (uuid, fk)
- `conversation_id` (uuid, fk, nullable)
- `visitor_id` (uuid, fk, nullable)
- `name` (text)
- `phone` (text) — normalized E.164-like `+84...` when possible
- `need` (text) — free text
- `email` (text, nullable)
- `source_page` (text, nullable)
- `priority` (text) — `low | normal | high`
- `consent` (jsonb) — `{ collected_at, method, text_version }`
- `created_at` (timestamptz)

#### `products`
- `id` (uuid, pk)
- `site_id` (uuid, fk)
- `sku` (text, unique per site)
- `name` (text)
- `short_desc` (text)
- `pack_size` (text) — e.g. “20g x 10 gói”
- `tags` (text[], nullable) — `["béo", "ít ngọt", "bestseller"]`
- `image_url` (text, nullable)
- `purchase_url` (text, nullable)
- `active` (bool)
- `created_at`, `updated_at`

#### `prices`
- `id` (uuid, pk)
- `product_id` (uuid, fk)
- `currency` (text) — `VND`
- `price_type` (text) — `retail | wholesale | agent`
- `amount` (int) — in VND
- `min_qty` (int, nullable)
- `effective_from`, `effective_to` (timestamptz, nullable)

#### `kb_documents`
- `id` (uuid, pk)
- `site_id` (uuid, fk)
- `type` (text) — `faq | policy | product | marketing`
- `title` (text)
- `content` (text)
- `source` (text, nullable) — e.g. “internal”
- `version` (int)
- `active` (bool)
- `created_at`, `updated_at`

#### `kb_embeddings`
- `id` (uuid, pk)
- `document_id` (uuid, fk -> kb_documents.id)
- `chunk_index` (int)
- `chunk_text` (text)
- `embedding` (vector) — pgvector
- `created_at` (timestamptz)

#### `events`
- `id` (uuid, pk)
- `site_id` (uuid, fk)
- `visitor_id` (uuid, fk, nullable)
- `conversation_id` (uuid, fk, nullable)
- `type` (text) — `widget_loaded | widget_opened | cta_clicked | lead_submitted`
- `meta` (jsonb)
- `created_at` (timestamptz)

### 4.2 Indexes (minimum)
- `visitors(site_id, last_seen_at)`
- `conversations(visitor_id, last_message_at)`
- `messages(conversation_id, created_at)`
- `leads(site_id, created_at)`
- `products(site_id, sku)`
- `kb_embeddings USING ivfflat (embedding vector_cosine_ops)` (pgvector)

---

## 5) API Endpoints (Backend: Fastify)

### 5.1 Public (Widget)
All public endpoints require `x-widget-key` (site public key) and enforce CORS allowlist.

#### `POST /v1/widget/init`
**Purpose**: create/retrieve `visitor_id` and open a conversation.

Request
```json
{
  "visitor_id": "uuid-optional",
  "page_url": "https://...",
  "referrer": "https://...",
  "utm": { "source": "", "medium": "", "campaign": "" },
  "locale": "vi"
}
```

Response
```json
{
  "visitor_id": "uuid",
  "conversation_id": "uuid",
  "quick_replies": [
    { "id": "pricing", "text": "Xem giá" },
    { "id": "recommend", "text": "Tư vấn chọn vị" },
    { "id": "agent", "text": "Chính sách đại lý" }
  ]
}
```

#### `POST /v1/chat`
**Purpose**: append user message and get assistant response.

Request
```json
{
  "visitor_id": "uuid",
  "conversation_id": "uuid",
  "message": { "text": "..." },
  "context": { "page_url": "...", "cart": null }
}
```

Response
```json
{
  "message_id": "uuid",
  "assistant": {
    "text": "...",
    "ui": {
      "cards": [],
      "buttons": [{ "label": "Nhận báo giá", "href": "/contact.html" }]
    },
    "next": { "action": "ask", "fields": ["need"] }
  }
}
```

#### `POST /v1/leads`
**Purpose**: store lead data; link to conversation.

Request
```json
{
  "visitor_id": "uuid",
  "conversation_id": "uuid",
  "name": "Nguyễn ...",
  "phone": "09...",
  "need": "Mua sỉ làm đại lý ...",
  "consent": { "accepted": true, "text_version": "2026-03-22" },
  "source_page": "contact"
}
```

Response
```json
{ "ok": true, "lead_id": "uuid" }
```

#### `POST /v1/events`
**Purpose**: analytics (open, click, etc.)

### 5.2 Internal Tools (AI Tool Calling)
Not exposed to the browser. Used by orchestrator only.

- `GET /internal/kb/search?q=...` (hybrid retrieval)
- `GET /internal/products/search?q=...`
- `GET /internal/pricing?sku=...&type=retail`
- `POST /internal/leads/extract` (optional: structured extraction via LLM)

### 5.3 Admin (Future)
- `POST /v1/admin/login`
- CRUD for products, prices, kb documents
- conversation/lead viewer

---

## 6) AI Prompt Design

### 6.1 Orchestration Pattern
Use a **single “Sales Agent” system prompt** + tools:
- `kb_search(query, filters)` → returns relevant snippets (Vietnamese preferred).
- `product_search(query)` → returns product SKUs and metadata.
- `pricing_lookup(sku, price_type)` → returns current price and tiers.
- `create_lead(name, phone, need, consent)` → persists lead.
- `handoff_request(channel, note)` → marks escalation (optional).

The backend orchestrator:
1. Builds a context package (site + product catalog + policies + recent messages + summary).
2. Runs model with tool calling enabled.
3. Validates tool outputs and formats for UI.

### 6.2 System Prompt (Vietnamese, Production-Ready)

> Use this as the **System** message. Keep it stable; update only by versioning.

```text
Bạn là trợ lý AI bán hàng của VIBE COFFEE (thương hiệu cà phê hòa tan). Mục tiêu của bạn:
1) Tư vấn đúng nhu cầu và tăng khả năng chốt đơn.
2) Trả lời chính xác, ngắn gọn, tự nhiên bằng tiếng Việt.
3) Thu thập lead: Họ tên + Số điện thoại + Nhu cầu khi phù hợp và có sự đồng ý.

NGUYÊN TẮC BẮT BUỘC
- Không bịa thông tin. Nếu không chắc (giá, tồn kho, khuyến mãi), hãy nói rõ “mình sẽ xác nhận” và đề nghị để lại SĐT.
- Chỉ dùng dữ liệu từ công cụ (pricing_lookup/kb_search/product_search). Nếu chưa có dữ liệu, hỏi lại hoặc xin thông tin liên hệ.
- Tập trung vào hành vi mua hàng: hỏi 1 câu hỏi/ lần để làm rõ nhu cầu (mục đích, khẩu vị, số lượng, kênh bán).
- Không đưa ra tuyên bố y tế/điều trị bệnh.
- Tôn trọng quyền riêng tư: chỉ xin SĐT khi người dùng có ý định mua/nhận báo giá/tư vấn sâu; luôn xin phép trước.

PHONG CÁCH
- Giọng thân thiện, chuyên nghiệp, “tư vấn nhanh”.
- Ưu tiên câu trả lời dạng bullet ngắn + 1 CTA.

CHIẾN LƯỢC BÁN HÀNG
- Bắt đầu bằng: (a) xác nhận nhu cầu, (b) đề xuất 1–2 lựa chọn phù hợp, (c) gợi ý combo/ưu đãi nếu có dữ liệu.
- Khi người dùng hỏi giá: trả giá rõ ràng theo loại (lẻ/sỉ/đại lý) nếu có; nếu không có, xin SĐT để gửi bảng giá.
- Khi người dùng quan tâm đại lý/số lượng lớn: hỏi khu vực + sản lượng dự kiến/tháng, sau đó xin SĐT.

THU THẬP LEAD
- Khi cần thu lead, hãy hỏi: “Mình xin Họ tên + SĐT + nhu cầu (lẻ/sỉ/đại lý, số lượng) để tư vấn chính xác, bạn đồng ý chứ?”
- Nếu đồng ý, thu thập lần lượt (tối đa 3 câu).
- Chuẩn hóa SĐT Việt Nam: chấp nhận 09/03/07/08/05 hoặc +84...

OUTPUT
- Trả về câu trả lời cho khách.
- Nếu cần dùng dữ liệu, hãy gọi công cụ phù hợp.
```

### 6.3 Tool Schemas (suggested)

#### `kb_search`
Input: `{ "query": string, "top_k": number, "filters": { "type"?: "faq"|"policy"|"product"|"marketing" } }`
Output: `[{ "title": string, "snippet": string, "source_id": string }]`

#### `product_search`
Input: `{ "query": string }`
Output: `[{ "sku": string, "name": string, "pack_size": string, "tags": string[] }]`

#### `pricing_lookup`
Input: `{ "sku": string, "price_type": "retail"|"wholesale"|"agent" }`
Output: `{ "currency": "VND", "amount": number, "min_qty"?: number, "notes"?: string }`

#### `create_lead`
Input: `{ "name": string, "phone": string, "need": string, "consent": { "accepted": boolean, "text_version": string } }`
Output: `{ "lead_id": string }`

---

## 7) Folder Structure (Production Monorepo)

```
vibe-chatbot/
  apps/
    api/                       # Fastify backend
      src/
        config/
        modules/
          auth/
          conversations/
          leads/
          kb/
          products/
          ai/
        plugins/
          db.ts                # Postgres client/ORM init
          rateLimit.ts
          cors.ts
          logger.ts
        routes/
          public/
            widget.init.ts
            chat.ts
            leads.ts
            events.ts
          internal/
            kb.search.ts
            pricing.ts
        workers/
          embedder.ts          # chunk + embed KB docs
        server.ts
      prisma/                  # or drizzle migrations
      package.json
      Dockerfile
  packages/
    widget/                    # JS embed widget (build to single file)
      src/
        ui/
        state/
        api/
        styles/
        index.ts
      build/
      package.json
    shared/
      src/
        types/
        validators/            # zod schemas
        utils/
  infra/
    docker-compose.yml         # postgres + pgvector, redis (optional)
    nginx/                     # optional reverse proxy
  docs/
    SPEC.md
  .env.example
  README.md
```

---

## 8) Operational Requirements (Production Checklist)

### 8.1 Security
- Store OpenAI key server-side only.
- Encrypt/limit access to PII (phone).
- CORS allowlist to VIBE COFFEE domains only.
- Rate limit: e.g. 20 req/min per visitor, 60 req/min per IP.
- Log redaction for phone/email.

### 8.2 Observability
- Structured logs (pino) with request_id.
- Metrics: response latency, OpenAI tokens/cost, lead conversion rate, top intents.
- Tracing: OpenTelemetry optional.

### 8.3 Data Retention
- Chat history retained for N days (configurable).
- Lead data retained until deletion request.
- Provide deletion endpoint/admin action.

### 8.4 Quality & Safety
- Prompt versioning + A/B testing.
- Guardrails:
  - refuse/redirect medical claims,
  - no fabricated discounts,
  - always disclose when unsure.

---

## 9) Open Questions (Decisions to Confirm)
- Purchase channel: link to `products.html` / `contact.html` / Shopee / TikTok Shop / hotline?
- Pricing strategy: fixed retail vs tiered by quantity/region?
- Human handoff: Zalo OA, phone callback SLA, or ticketing?
- Data privacy text/version to show before collecting phone number.

