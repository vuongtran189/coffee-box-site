import { MongoClient } from "mongodb";
import { ensureMongoSchema } from "./db/schema.js";

let cached = /** @type {null | { client: MongoClient, db: import('mongodb').Db }} */ (null);

export async function getMongo(env) {
  if (cached) return cached;

  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10
  });

  await client.connect();
  const db = client.db(env.MONGODB_DB);

  // Best-effort: create collections, validators, indexes.
  await ensureMongoSchema(db);

  cached = { client, db };
  return cached;
}
