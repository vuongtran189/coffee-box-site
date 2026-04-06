import express from "express";
import crypto from "node:crypto";

import { getMongo } from "../mongo.js";
import { extractPhoneNumbers } from "../phone.js";
import { inferIntentTags } from "../intent.js";
import { addConversationTags, appendMessage, createConversation, getConversation, linkLead } from "../services/conversations.js";
import { upsertLeadByPhone } from "../services/leads.js";
import { requireWidgetKey } from "../auth.js";
import { createAdminToken, isAdminConfigured, requireAdmin, verifyAdminPassword } from "../adminAuth.js";
import { generateAssistantReply } from "../openai.js";
import { generateFallbackReply } from "../fallback.js";
import { getSiteContent, upsertSiteContent } from "../services/siteContent.js";

export function v1Router({ env }) {
  const router = express.Router();
  router.use(requireWidgetKey(env));

  const adminOpen = ["1", "true", "yes", "on"].includes(String(env.ADMIN_OPEN || "").trim().toLowerCase());
  const requireAdminIfNeeded = adminOpen ? (_req, _res, next) => next() : requireAdmin(env);

  // Public (widget-key protected) site content read for vibecoffee.vn pages.
  router.get("/v1/site/content", async (_req, res) => {
    const { db } = await getMongo(env);
    const hit = await getSiteContent(db);
    if (!hit) return res.status(404).json({ ok: false, error: "No content found" });
    res.json({ ok: true, data: hit.data, updatedAt: hit.updatedAt });
  });

  // Admin auth
  router.post("/v1/admin/login", async (req, res) => {
    if (!isAdminConfigured(env)) {
      if (adminOpen) return res.json({ ok: true, token: "" });
      return res.status(501).json({ ok: false, error: "Admin not configured" });
    }
    const password = String(req.body?.password || "");
    if (!verifyAdminPassword(env, password)) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    const token = createAdminToken(env);
    res.json({ ok: true, token });
  });

  router.get("/v1/admin/site/content", requireAdminIfNeeded, async (_req, res) => {
    const { db } = await getMongo(env);
    const hit = await getSiteContent(db);
    res.json({ ok: true, data: hit?.data || null, updatedAt: hit?.updatedAt || null });
  });

  router.put("/v1/admin/site/content", requireAdminIfNeeded, async (req, res) => {
    const payload = req.body?.data ?? req.body;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ ok: false, error: "Body must be a JSON object (or { data: object })" });
    }

    const approxBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (approxBytes > 220_000) {
      return res.status(413).json({ ok: false, error: "Content too large" });
    }

    const { db } = await getMongo(env);
    const saved = await upsertSiteContent(db, payload);
    res.json({ ok: true, updatedAt: saved.updatedAt });
  });

  router.post("/v1/widget/init", async (req, res) => {
    const body = req.body || {};
    const visitorId = String(body.visitor_id || "").trim() || crypto.randomUUID();

    let conversationId = null;
    try {
      const { db } = await getMongo(env);
      const convo = await createConversation(db, { visitorId });
      conversationId = convo.id;
    } catch {
      // Degraded mode (no DB): still allow the widget to run.
      conversationId = crypto.randomUUID();
    }

    res.json({
      visitor_id: visitorId,
      conversation_id: conversationId,
      quick_replies: [
        { id: "pricing", text: "Xem giá" },
        { id: "recommend", text: "Tư vấn chọn vị" },
        { id: "agent", text: "Chính sách đại lý" }
      ]
    });
  });

  router.post("/v1/chat", async (req, res) => {
    const body = req.body || {};
    const visitorId = String(body.visitor_id || "").trim();
    const conversationId = String(body.conversation_id || "").trim();
    const text = String(body?.message?.text || "").trim();

    if (!visitorId || !conversationId || !text) {
      return res.status(400).json({ ok: false, error: "Missing visitor_id, conversation_id, or message.text" });
    }

    let db = null;
    let convo = null;
    try {
      ({ db } = await getMongo(env));
      convo = await getConversation(db, conversationId);
    } catch {
      db = null;
      convo = null;
    }

    // If DB is down or conversation missing, continue in stateless mode.
    if (db && convo) {
      await appendMessage(db, conversationId, { role: "user", text, ts: new Date() });
    }

    const inferredTags = inferIntentTags(text);
    if (db && convo && inferredTags.length) {
      await addConversationTags(db, conversationId, inferredTags);
    }

    // Extract & save phone automatically (best-effort).
    const phones = extractPhoneNumbers(text);
    let autoLeadId = null;
    if (db && phones.length) {
      const phone = phones[0];
      const { id } = await upsertLeadByPhone(db, {
        phone,
        visitor_id: visitorId,
        conversation_id: conversationId,
        tags: inferredTags
      });
      autoLeadId = id;
      if (autoLeadId) {
        await linkLead(db, conversationId, autoLeadId);
      }
    }
    let assistantText = null;
    try {
      assistantText = await generateAssistantReply({
        env,
        conversation: convo || { messages: [] },
        userText: text,
        context: { page_url: body?.context?.page_url || body?.page_url || null, extracted: { phones, tags: inferredTags } }
      });
    } catch (err) {
      // Log to help diagnose issues in Render logs (401/429/timeouts, etc.)
      console.error("openai_generateAssistantReply_failed", err?.message || err);
      assistantText = null;
    }

    if (!assistantText) {
      assistantText = generateFallbackReply({ text, tags: inferredTags, phones });
    }
    if (db && convo) {
      await appendMessage(db, conversationId, { role: "assistant", text: assistantText, ts: new Date() });
    }

    res.json({
      ok: true,
      assistant: { text: assistantText },
      extracted: { phones, tags: inferredTags },
      saved: { lead_id: autoLeadId }
    });
  });

  // Public lead save endpoint (explicit submission)
  router.post("/v1/leads", async (req, res) => {
    const body = req.body || {};

    // Basic anti-spam (matches the static site's hidden fields).
    const honeypot = String(body.company || "").trim();
    if (honeypot) return res.status(200).json({ ok: true, spam: true });
    const ts = Number(body.form_ts || 0);
    if (Number.isFinite(ts) && ts > 0 && Date.now() - ts < 1500) {
      return res.status(200).json({ ok: true, spam: true });
    }

    const visitorId = String(body.visitor_id || "").trim() || null;
    const conversationId = String(body.conversation_id || "").trim() || null;
    const name = body.name != null ? String(body.name).trim() : null;
    const phone = body.phone != null ? String(body.phone).trim() : "";
    const needs = body.need != null ? String(body.need).trim() : null;
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];

    if (!phone) return res.status(400).json({ ok: false, error: "Missing phone" });

    const { db } = await getMongo(env);
    const inferredTags = inferIntentTags(needs || "");
    const { id } = await upsertLeadByPhone(db, {
      phone,
      name,
      needs,
      visitor_id: visitorId,
      conversation_id: conversationId,
      tags: Array.from(new Set([...tags, ...inferredTags]))
    });
    if (conversationId && id) await linkLead(db, conversationId, id);

    res.json({ ok: true, lead_id: id });
  });

  // Alias required by prompt: /save-lead (auto or explicit)
  router.post("/save-lead", async (req, res) => {
    const body = req.body || {};
    const visitorId = body.visitor_id != null ? String(body.visitor_id).trim() : null;
    const conversationId = body.conversation_id != null ? String(body.conversation_id).trim() : null;
    const name = body.name != null ? String(body.name).trim() : null;
    const phoneText = body.phone != null ? String(body.phone).trim() : "";
    const needs = body.needs != null ? String(body.needs).trim() : (body.need != null ? String(body.need).trim() : null);
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];

    // If phone not explicitly provided, attempt extraction from a chat snippet.
    const fromChat = body.chat_text != null ? String(body.chat_text) : "";
    const phones = phoneText ? extractPhoneNumbers(phoneText) : extractPhoneNumbers(fromChat);
    const phone = phones[0] || "";
    if (!phone) return res.status(400).json({ ok: false, error: "Missing phone (or no phone found in chat_text)" });

    const inferredTags = Array.from(new Set([...inferIntentTags(fromChat), ...inferIntentTags(needs || "")]));
    const finalTags = Array.from(new Set([...tags, ...inferredTags]));

    const { db } = await getMongo(env);
    const { id } = await upsertLeadByPhone(db, {
      phone,
      name,
      needs,
      visitor_id: visitorId,
      conversation_id: conversationId,
      tags: finalTags
    });
    if (conversationId && id) await linkLead(db, conversationId, id);

    res.json({
      ok: true,
      lead_id: id,
      extracted: { phone, tags: finalTags }
    });
  });

  router.post("/v1/events", async (_req, res) => {
    res.status(204).end();
  });

  router.get("/v1/meta", async (_req, res) => {
    res.json({
      service: "@vibe/api",
      env: env.NODE_ENV
    });
  });

  return router;
}


