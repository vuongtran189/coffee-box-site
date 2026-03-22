function defaultInstructions() {
  return [
    "Bạn là tư vấn viên của Vibe Coffee.",
    "Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện.",
    "Mục tiêu: tư vấn sản phẩm phù hợp, trả lời câu hỏi, và khéo léo xin thông tin (tên, SĐT, nhu cầu) để báo giá/chốt tư vấn.",
    "Nếu chưa đủ thông tin thì hỏi 1 câu ngắn để làm rõ.",
    "Nếu người dùng hỏi giá: hãy nói bạn sẽ gửi bảng giá và xin SĐT/zalo hoặc hướng dẫn vào trang Liên hệ.",
    "Nếu không chắc thông tin cụ thể: nói rõ là bạn cần kiểm tra và đề nghị để lại SĐT để tư vấn chi tiết."
  ].join("\n");
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
      instructions,
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
