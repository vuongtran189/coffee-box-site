import { el } from "../lib/dom.js";

export function listTable({ columns, rows }) {
  const table = el("table", { class: "wp-table" });
  const thead = el("thead");
  const trh = el("tr");
  for (const col of columns) trh.appendChild(el("th", { text: col.label }));
  thead.appendChild(trh);
  const tbody = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const col of columns) {
      const td = el("td");
      const val = col.render(row);
      td.appendChild(val instanceof Node ? val : el("span", { text: String(val ?? "") }));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

