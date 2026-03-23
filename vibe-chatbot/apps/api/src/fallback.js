function hasAny(text, patterns) {
  return patterns.some((p) => p.test(text));
}

function detectTaste(text) {
  const t = String(text || "").toLowerCase();
  if (hasAny(t, [/(đậm|dam|đắng|dang)/i, /(ít\s*chua|it\s*chua)/i, /(thơm|thom)/i])) return "strong";
  if (hasAny(t, [/(béo|beo)/i, /(ngọt|ngot)/i, /(dễ\s*uống|de\s*uong)/i])) return "creamy";
  if (hasAny(t, [/(nhẹ|nhe)/i])) return "light";
  return null;
}

function detectGoal(tags, text) {
  const t = String(text || "").toLowerCase();
  if (tags.includes("agent")) return "agent";
  if (tags.includes("gift")) return "gift";
  if (tags.includes("trial")) return "trial";
  if (tags.includes("daily")) return "daily";
  if (/(uống|uong)/i.test(t)) return "daily";
  return null;
}

function sentences(s) {
  return String(s || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function generateFallbackReply({ text, tags = [], phones = [] }) {
  const userText = String(text || "").trim();
  const t = userText.toLowerCase();

  // If user provided phone, switch to needs capture.
  if (phones.length) {
    return "Cảm ơn bạn! Mình đã ghi nhận số điện thoại. Bạn đang mua để uống hằng ngày, làm quà, hay muốn dùng thử ạ?";
  }

  // FAQ shortcuts (only info we are sure about from knowledge base).
  if (tags.includes("shipping")) {
    return "Bên mình giao toàn quốc và có COD ạ. Thời gian thường 2–5 ngày tuỳ khu vực. Bạn ở tỉnh/thành nào để mình ước tính sát hơn nhé?";
  }
  if (/(hạn\s*sử\s*dụng|han\s*su\s*dung|hsd)/i.test(t)) {
    return "Hạn sử dụng thường 12–24 tháng tuỳ sản phẩm ạ. Bạn đang quan tâm dòng hòa tan truyền thống hay hòa tan béo để mình kiểm tra đúng loại nhé?";
  }
  if (/(cách\s*pha|cach\s*pha|pha\s*sao)/i.test(t)) {
    return "Cách pha cơ bản: 1 gói + nước nóng 70–80°C, khuấy đều là dùng được ạ. Bạn thích uống đậm hay dễ uống/béo để mình gợi ý tỉ lệ nước phù hợp nhé?";
  }
  if (tags.includes("pricing") || /(giá|gia|bao\s*nhiêu)/i.test(t)) {
    return "Hiện bên mình có vài dòng khác nhau nên giá sẽ tuỳ loại ạ. Mình gửi bảng giá chi tiết qua Zalo cho bạn nhé—bạn cho mình xin SĐT/Zalo được không?";
  }

  // Conversation flow: goal -> taste -> quantity -> recommend.
  const goal = detectGoal(tags, t);
  const taste = detectTaste(t);

  // Step 1: identify goal.
  if (!goal) {
    return "Mình hỗ trợ bạn nhanh nha. Bạn đang tìm cà phê uống hằng ngày hay mua làm quà ạ?";
  }

  // Step 2: taste.
  if (!taste) {
    const goalHint =
      goal === "gift"
        ? "làm quà"
        : goal === "trial"
          ? "dùng thử"
          : goal === "agent"
            ? "làm đại lý"
            : "uống hằng ngày";
    return `Ok bạn, mình hiểu bạn mua để ${goalHint} ạ. Bạn thích vị đậm, nhẹ hay béo ngọt ạ?`;
  }

  // Step 3/4: recommend 1-2 products we know exist.
  const recommend =
    taste === "creamy"
      ? [
          "Mình gợi ý cà phê hòa tan béo: vị béo, dễ uống, hợp người mới bắt đầu.",
          "Bạn dự định mua dùng thử hay dùng lâu dài ạ?"
        ]
      : [
          "Mình gợi ý cà phê hòa tan truyền thống: vị đậm, thơm, ít chua, hợp uống hằng ngày.",
          "Bạn dự định mua dùng thử hay dùng lâu dài ạ?"
        ];

  return sentences(recommend.join("\n")).slice(0, 2).join(" ");
}
