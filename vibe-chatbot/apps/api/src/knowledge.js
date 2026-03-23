import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedFileText = null;
const cachedByPath = new Map();

function normalizeKnowledgeText(raw) {
  return String(raw || "")
    .replaceAll("XXXXX", "(chưa cập nhật)")
    .replaceAll("số lượng X", "số lượng tối thiểu (mình kiểm tra lại giúp bạn nhé)")
    .trim();
}

async function readDefaultKnowledgeFile() {
  if (cachedFileText != null) return cachedFileText;
  const filePath = path.resolve(__dirname, "../../../knowledge/vibe-coffee.md");
  try {
    cachedFileText = await fs.readFile(filePath, "utf8");
  } catch {
    cachedFileText = "";
  }
  return cachedFileText;
}

async function readKnowledgeFile(customPath) {
  const resolved = path.isAbsolute(customPath)
    ? customPath
    : path.resolve(process.cwd(), customPath);
  if (cachedByPath.has(resolved)) return cachedByPath.get(resolved);
  let text = "";
  try {
    text = await fs.readFile(resolved, "utf8");
  } catch {
    text = "";
  }
  cachedByPath.set(resolved, text);
  return text;
}

export async function getKnowledgeText(env) {
  const fromEnv = normalizeKnowledgeText(env?.VIBE_KNOWLEDGE_TEXT);
  const fromPath = normalizeKnowledgeText(env?.VIBE_KNOWLEDGE_PATH);
  const raw = fromEnv || (fromPath ? await readKnowledgeFile(fromPath) : await readDefaultKnowledgeFile());
  const text = normalizeKnowledgeText(raw);
  if (!text) return "";

  const maxChars = Number(env?.VIBE_KNOWLEDGE_MAX_CHARS ?? 8000);
  if (!Number.isFinite(maxChars) || maxChars <= 0) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...(rút gọn)`;
}
