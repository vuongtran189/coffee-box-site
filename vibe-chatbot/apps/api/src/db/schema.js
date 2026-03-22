/**
 * MongoDB "schema" for collections via JSON Schema validators + indexes.
 * This is not an ORM schema; it's runtime DB constraints.
 */

const MessagesJsonSchema = {
  bsonType: "array",
  items: {
    bsonType: "object",
    required: ["role", "text", "ts"],
    additionalProperties: false,
    properties: {
      role: { enum: ["user", "assistant", "system", "tool"] },
      text: { bsonType: "string", maxLength: 10000 },
      ts: { bsonType: "date" }
    }
  }
};

export async function ensureMongoSchema(db) {
  await ensureCollection(db, "conversations", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["visitor_id", "created_at", "updated_at", "messages"],
        additionalProperties: false,
        properties: {
          visitor_id: { bsonType: "string", maxLength: 80 },
          lead_id: { bsonType: ["string", "null"], maxLength: 80 },
          tags: { bsonType: "array", items: { bsonType: "string", maxLength: 40 } },
          messages: MessagesJsonSchema,
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" }
        }
      }
    }
  });

  await ensureCollection(db, "leads", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["phone", "created_at", "updated_at"],
        additionalProperties: false,
        properties: {
          name: { bsonType: ["string", "null"], maxLength: 120 },
          phone: { bsonType: "string", maxLength: 32 },
          visitor_id: { bsonType: ["string", "null"], maxLength: 80 },
          conversation_id: { bsonType: ["string", "null"], maxLength: 80 },
          tags: { bsonType: "array", items: { bsonType: "string", maxLength: 40 } },
          needs: { bsonType: ["string", "null"], maxLength: 1000 },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" }
        }
      }
    }
  });

  await db.collection("conversations").createIndex({ visitor_id: 1, updated_at: -1 });
  await db.collection("leads").createIndex({ phone: 1 }, { unique: true });
  await db.collection("leads").createIndex({ conversation_id: 1, updated_at: -1 });
}

async function ensureCollection(db, name, options) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, options);
    return;
  }

  // Update validator for existing collections (best-effort).
  try {
    await db.command({ collMod: name, ...options });
  } catch {
    // Ignore in environments without privileges.
  }
}

