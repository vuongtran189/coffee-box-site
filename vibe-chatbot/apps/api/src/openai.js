import { getKnowledgeText } from "./knowledge.js";

function defaultInstructions() {
  return [
    "Bạn là AI tư vấn bán hàng chuyên nghiệp cho thương hiệu VIBE COFFEE.",
    'Luôn nói tiếng Việt tự nhiên, xưng "mình - bạn", thân thiện và không dài dòng.',
    "Mỗi lần trả lời không quá 4-5 câu; luôn kết thúc bằng 1 câu hỏi mở để giữ cuộc hội thoại.",
    "Nguyên tắc: không bịa thông tin (giá/chính sách/sản phẩm). Nếu không chắc → nói: “Mình kiểm tra lại giúp bạn nhé”.",
    "Luôn ưu tiên hỏi để hiểu khách trước khi tư vấn; không xin SĐT quá sớm, chỉ xin khi đã có cơ hội phù hợp.",
    "Quy trình: (1) hỏi mục đích: “Bạn đang tìm cà phê uống hằng ngày hay mua làm quà ạ?” (2) hỏi khẩu vị: “Bạn thích vị đậm, nhẹ hay béo ngọt ạ?” (3) hỏi số lượng: “Bạn dự định mua dùng thử hay dùng lâu dài ạ?” (4) đề xuất 1–2 sản phẩm phù hợp nhất kèm lý do ngắn gọn (nếu thiếu thông tin, hỏi 1 câu để làm rõ).",
    "Xử lý từ chối: nếu chê giá → nhấn mạnh chất lượng/giá trị; nếu phân vân → gợi ý gói dùng thử.",
    "Chốt: “Mình xin SĐT/Zalo để gửi ưu đãi và giữ đơn cho bạn nhé”. Khi khách hỏi giá, ưu tiên xin SĐT/Zalo để gửi bảng giá chi tiết."
  ].join("\n");
}

function renderInstructionsTemplate(template, { knowledgeText, userText }) {
  const t = String(template || "");
  if (!t.includes("{{knowledge_chunks}}") && !t.includes("{{user_message}}")) return null;
  const kb = knowledgeText && String(knowledgeText).trim() ? String(knowledgeText).trim() : "(Không có dữ liệu trong CONTEXT)";
  const um = userText != null ? String(userText) : "";
  return t.replaceAll("{{knowledge_chunks}}", kb).replaceAll("{{user_message}}", um).trim();
}

function messagesToResponsesInput(messages) {
  const input = [];
  for (const m of messages || []) {
    const role = m?.role === "assistant" ? "assistant" : "user";
    const text = String(m?.text || "").trim();
    if (!text) continue;
    input.push({ role, content: [{ type: "input_text", text }] });
  }
  return input;
}

export async function generateAssistantReply({ env, conversation, userText, context }) {
  const apiKey = String(env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const model = String(env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const maxOutputTokens = Number(env.OPENAI_MAX_OUTPUT_TOKENS || 350);

  const baseInstructions = env.OPENAI_INSTRUCTIONS ? String(env.OPENAI_INSTRUCTIONS) : "";
  const instructions = (baseInstructions.trim() || defaultInstructions()).trim();
  const knowledgeText = await getKnowledgeText(env);
  const rendered = renderInstructionsTemplate(instructions, { knowledgeText, userText });
  const finalInstructions = rendered
    ? rendered
    : knowledgeText
      ? `${instructions}\n\n---\nKIẾN THỨC NỘI BỘ (Knowledge Base):\n${knowledgeText}`
      : instructions;

  const history = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const clipped = history.slice(-16);
  const input = messagesToResponsesInput([...clipped, { role: "user", text: userText }]);

  // Add small structured context as a final user message to help grounding.
  const ctxLines = [];
  if (context?.page_url) ctxLines.push(`Trang hiện tại: ${context.page_url}`);
  if (context?.extracted?.phones?.length) ctxLines.push(`Người dùng có nhắc SĐT: ${context.extracted.phones.join(", ")}`);
  if (context?.extracted?.tags?.length) ctxLines.push(`Nhu cầu (suy luận): ${context.extracted.tags.join(", ")}`);
  if (ctxLines.length) {
    input.push({
      role: "user",
      content: [{ type: "input_text", text: `Thông tin thêm (ngữ cảnh):\n${ctxLines.join("\n")}` }]
    });
  }

  const ac = new AbortController();
  const timeoutMs = 8000;
  const t = setTimeout(() => ac.abort(), timeoutMs);

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: ac.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: finalInstructions,
      input,
      max_output_tokens: maxOutputTokens
    })
  }).finally(() => clearTimeout(t));

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`openai_error_${res.status}:${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    if (item?.type !== "message") continue;
    if (item?.role !== "assistant") continue;
    const content = Array.isArray(item?.content) ? item.content : [];
    const t = content.find((c) => c?.type === "output_text" && typeof c?.text === "string")?.text;
    if (t && String(t).trim()) return String(t).trim();
  }

  return null;
}
