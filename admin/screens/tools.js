import { el, setNotice, setSaveState } from "../lib/dom.js";

function prettyJson(v) {
  return JSON.stringify(v, null, 2);
}

function safeParseJson(s) {
  try {
    return { ok: true, value: JSON.parse(String(s || "")) };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export function toolsScreen({ data, setData }) {
  const wrap = el("div");

  const exportBtn = el("button", {
    class: "wp-btn",
    type: "button",
    text: "Export JSON",
    onclick: () => {
      const blob = new Blob([prettyJson(data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: "cms-data.json" });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice("Đã tải file cms-data.json", "ok");
    }
  });

  const file = el("input", { type: "file", accept: "application/json" });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    const text = await f.text();
    const parsed = safeParseJson(text);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
      setNotice("File JSON không hợp lệ.", "error");
      return;
    }
    setData(parsed.value);
    setSaveState("Chưa lưu");
    setNotice("Đã import JSON vào bộ nhớ. Bấm Lưu để cập nhật lên CMS.", "ok");
    file.value = "";
  });

  wrap.appendChild(
    el("section", { class: "wp-card" }, [
      el("h2", { text: "Import/Export" }),
      el("p", { text: "Xuất/nhập toàn bộ nội dung website. Sau khi import, nhớ bấm Lưu." }),
      el("div", { class: "wp-toolbar" }, [exportBtn, file])
    ])
  );

  return wrap;
}

