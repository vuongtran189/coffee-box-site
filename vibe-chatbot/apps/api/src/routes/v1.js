import express from "express";
import crypto from "node:crypto";

import { getMongo } from "../mongo.js";
import { extractPhoneNumbers } from "../phone.js";
import { inferIntentTags } from "../intent.js";
import { addConversationTags, appendMessage, createConversation, getConversation, linkLead } from "../services/conversations.js";
import { upsertLeadByPhone } from "../services/leads.js";

export function v1Router({ env }) {
  const router = express.Router();

  router.post("/v1/widget/init", async (req, res) => {
    const body = req.body || {};
    const visitorId = String(body.visitor_id || "").trim() || crypto.randomUUID();

    const { db } = await getMongo(env);
    const convo = await createConversation(db, { visitorId });

    res.json({
      visitor_id: visitorId,
      conversation_id: convo.id,
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

    const { db } = await getMongo(env);
    const convo = await getConversation(db, conversationId);
    if (!convo) {
      return res.status(404).json({ ok: false, error: "Conversation not found" });
    }

    await appendMessage(db, conversationId, { role: "user", text, ts: new Date() });

    const inferredTags = inferIntentTags(text);
    if (inferredTags.length) {
      await addConversationTags(db, conversationId, inferredTags);
    }

    // Extract & save phone automatically (best-effort).
    const phones = extractPhoneNumbers(text);
    let autoLeadId = null;
    if (phones.length) {
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

    // Placeholder assistant message; Phase 3 will replace with OpenAI output.
    const assistantText = autoLeadId
      ? "Cảm ơn bạn! Mình đã ghi nhận số điện thoại. Bạn cho mình xin thêm nhu cầu (uống hằng ngày / làm quà / dùng thử / đại lý) để tư vấn đúng nhất nhé?"
      : "Dạ mình hỗ trợ bạn nhanh ạ. Bạn mua để uống hằng ngày, làm quà tặng, hay muốn dùng thử trước?";

    await appendMessage(db, conversationId, { role: "assistant", text: assistantText, ts: new Date() });

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
