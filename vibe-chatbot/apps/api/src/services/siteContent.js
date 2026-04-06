const COLLECTION = "site_content";
const DOC_ID = "main";

export async function getSiteContent(db) {
  const doc = await db.collection(COLLECTION).findOne({ _id: DOC_ID });
  return doc ? { data: doc.data, updatedAt: doc.updatedAt || null } : null;
}

export async function upsertSiteContent(db, data) {
  const now = new Date();
  await db.collection(COLLECTION).updateOne(
    { _id: DOC_ID },
    { $set: { data, updatedAt: now } },
    { upsert: true }
  );
  return { updatedAt: now };
}

