export function inferIntentTags(text) {
  const t = String(text || "").toLowerCase();
  const tags = new Set();

  if (/(đại\s*lý|dai\s*ly|sỉ|si|bán\s*sỉ|ban\s*si|chiết\s*khấu|chiet\s*khau)/i.test(t)) {
    tags.add("agent");
  }
  if (/(quà|qua|tặng|tang|gift)/i.test(t)) {
    tags.add("gift");
  }
  if (/(dùng\s*thử|dung\s*thu|thử|thu|trial|test)/i.test(t)) {
    tags.add("trial");
  }
  if (/(uống\s*hằng\s*ngày|uong\s*hang\s*ngay|mỗi\s*ngày|moi\s*ngay|daily)/i.test(t)) {
    tags.add("daily");
  }
  if (/(giá|gia|bao\s*nhiêu|khuyến\s*mãi|khuyen\s*mai|price)/i.test(t)) {
    tags.add("pricing");
  }
  if (/(ship|giao\s*hàng|giao\s*hang|vận\s*chuyển|van\s*chuyen)/i.test(t)) {
    tags.add("shipping");
  }

  return Array.from(tags);
}

