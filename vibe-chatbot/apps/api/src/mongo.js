import { MongoClient } from "mongodb";
import { ensureMongoSchema } from "./db/schema.js";

let cached = /** @type {null | { client: MongoClient, db: import('mongodb').Db }} */ (null);

export async function getMongo(env) {
  if (cached) return cached;

  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10,
    // Fail fast to avoid upstream 502s on cold starts / transient network issues.
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000
  });

  await client.connect();
  const db = client.db(env.MONGODB_DB);

  // Best-effort: create collections, validators, indexes.
  await ensureMongoSchema(db);

  cached = { client, db };
  return cached;
}
