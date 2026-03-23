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
  if (/(uống\s*hằng\s*ngày|uong\s*hang\s*ngay|hằng\s*ngày|hang\s*ngay|hàng\s*ngày|mỗi\s*ngày|moi\s*ngay|daily)/i.test(t)) {
    tags.add("daily");
  }
  if (/(giá|gia|bao\s*nhiêu|khuyến\s*mãi|khuyen\s*mai|price)/i.test(t)) {
    tags.add("pricing");
  }
  if (/(ship|giao\s*hàng|giao\s*hang|vận\s*chuyển|van\s*chuyen)/i.test(t)) {
    tags.add("shipping");
  }
  if (/(đậm|dam|đắng|dang|ít\s*chua|it\s*chua|thơm|thom)/i.test(t)) {
    tags.add("taste_strong");
  }
  if (/(béo|beo|ngọt|ngot|dễ\s*uống|de\s*uong)/i.test(t)) {
    tags.add("taste_creamy");
  }
  if (/(nhẹ|nhe)/i.test(t)) {
    tags.add("taste_light");
  }

  return Array.from(tags);
}

