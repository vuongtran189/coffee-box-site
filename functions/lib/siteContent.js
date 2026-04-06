const KV_KEY = "vibe_site_content_v1";

export async function getSiteContent(env) {
  const kv = env.VIBE_CONTENT_KV;
  if (!kv) throw new Error("Missing VIBE_CONTENT_KV binding");
  const raw = await kv.get(KV_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  return { data: parsed.data ?? null, updatedAt: parsed.updatedAt ?? null };
}

export async function putSiteContent(env, data) {
  const kv = env.VIBE_CONTENT_KV;
  if (!kv) throw new Error("Missing VIBE_CONTENT_KV binding");
  const record = { data, updatedAt: new Date().toISOString() };
  await kv.put(KV_KEY, JSON.stringify(record));
  return record;
}

