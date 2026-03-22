import { ObjectId } from "mongodb";

export async function upsertLeadByPhone(db, input) {
  const now = new Date();
  const phone = String(input.phone || "");
  if (!phone) throw new Error("Missing phone");

  const update = {
    $setOnInsert: {
      created_at: now
    },
    $set: {
      updated_at: now,
      phone,
      name: input.name ?? null,
      visitor_id: input.visitor_id ?? null,
      conversation_id: input.conversation_id ?? null,
      needs: input.needs ?? null
    },
    $addToSet: {
      tags: { $each: input.tags || [] }
    }
  };

  const res = await db.collection("leads").findOneAndUpdate(
    { phone },
    update,
    { upsert: true, returnDocument: "after" }
  );

  const doc = res.value;
  return { id: doc?._id?.toString() || null, lead: doc };
}

export async function getLeadById(db, leadId) {
  const _id = toObjectId(leadId);
  if (!_id) return null;
  const doc = await db.collection("leads").findOne({ _id });
  if (!doc) return null;
  return { ...doc, id: doc._id.toString() };
}

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

