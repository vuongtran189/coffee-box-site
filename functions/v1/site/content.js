import { json } from "../../lib/http.js";
import { getSiteContent } from "../../lib/siteContent.js";

export async function onRequestGet(context) {
  const { env } = context;
  const hit = await getSiteContent(env);
  if (!hit || !hit.data) return json({ ok: false, error: "No content found" }, { status: 404 });
  return json({ ok: true, data: hit.data, updatedAt: hit.updatedAt }, { status: 200 });
}

