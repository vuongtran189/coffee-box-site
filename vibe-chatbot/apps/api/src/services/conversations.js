import { ObjectId } from "mongodb";

export async function createConversation(db, { visitorId }) {
  const now = new Date();
  const doc = {
    visitor_id: visitorId,
    lead_id: null,
    tags: [],
    messages: [],
    created_at: now,
    updated_at: now
  };
  const res = await db.collection("conversations").insertOne(doc);
  return { id: res.insertedId.toString() };
}

export async function getConversation(db, conversationId) {
  const _id = toObjectId(conversationId);
  if (!_id) return null;
  const doc = await db.collection("conversations").findOne({ _id });
  if (!doc) return null;
  return { ...doc, id: doc._id.toString() };
}

export async function appendMessage(db, conversationId, message) {
  const _id = toObjectId(conversationId);
  if (!_id) return { ok: false };
  const now = new Date();
  const res = await db.collection("conversations").updateOne(
    { _id },
    {
      $push: { messages: { ...message, ts: message.ts || now } },
      $set: { updated_at: now }
    }
  );
  return { ok: res.matchedCount === 1 };
}

export async function addConversationTags(db, conversationId, tags) {
  const _id = toObjectId(conversationId);
  if (!_id) return { ok: false };
  const now = new Date();
  const res = await db.collection("conversations").updateOne(
    { _id },
    { $addToSet: { tags: { $each: tags || [] } }, $set: { updated_at: now } }
  );
  return { ok: res.matchedCount === 1 };
}

export async function linkLead(db, conversationId, leadId) {
  const _id = toObjectId(conversationId);
  if (!_id) return { ok: false };
  const now = new Date();
  const res = await db.collection("conversations").updateOne(
    { _id },
    { $set: { lead_id: leadId, updated_at: now } }
  );
  return { ok: res.matchedCount === 1 };
}

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

