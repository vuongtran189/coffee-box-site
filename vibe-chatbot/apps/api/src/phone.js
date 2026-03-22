const VN_PHONE_CANDIDATE = /(?<!\d)(?:\+?84|0)(?:\s*[-.]?\s*\d){8,10}(?!\d)/g;

export function extractPhoneNumbers(text) {
  const input = String(text || "");
  const hits = input.match(VN_PHONE_CANDIDATE) || [];
  return hits
    .map((h) => normalizeVnPhone(h))
    .filter(Boolean);
}

export function normalizeVnPhone(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const digits = s.replace(/[^\d+]/g, "");

  // Handle +84XXXXXXXXX
  if (digits.startsWith("+84")) {
    const rest = digits.slice(3).replace(/[^\d]/g, "");
    if (rest.length < 9 || rest.length > 10) return "";
    return `+84${rest}`;
  }

  // Handle 84XXXXXXXXX (rare)
  if (digits.startsWith("84")) {
    const rest = digits.slice(2).replace(/[^\d]/g, "");
    if (rest.length < 9 || rest.length > 10) return "";
    return `+84${rest}`;
  }

  // Handle 0XXXXXXXXX
  if (digits.startsWith("0")) {
    const rest = digits.slice(1).replace(/[^\d]/g, "");
    if (rest.length < 9 || rest.length > 10) return "";
    return `+84${rest}`;
  }

  return "";
}

