// plugins/table-labels.client.ts
// ✅ يجعل كل الجداول قابلة للتحول إلى "كروت" في الفون بدون تعديل أي صفحة:
// ينسخ عنوان كل عمود (th) إلى خاصية data-label على خانات الصف (td)، وتتولى
// _responsive.scss عرضه بجانب القيمة عند الشاشات الصغيرة.

import { defineNuxtPlugin } from "nuxt/app";

const labelTable = (table: HTMLTableElement) => {
  const headers = Array.from(table.querySelectorAll("thead th")).map(
    (th) => th.textContent?.trim() ?? "",
  );
  if (headers.length === 0) return;

  table.querySelectorAll("tbody tr").forEach((row) => {
    let column = 0;
    Array.from(row.children).forEach((cell) => {
      if (!(cell instanceof HTMLTableCellElement)) return;
      const label = headers[column] ?? "";
      if (cell.getAttribute("data-label") !== label) {
        cell.setAttribute("data-label", label);
      }
      column += cell.colSpan || 1;
    });
  });
};

export default defineNuxtPlugin(() => {
  let scheduled = false;

  const labelAll = () => {
    scheduled = false;
    document.querySelectorAll("table").forEach(labelTable);
  };

  // دفعة واحدة لكل إطار مهما كثرت تغييرات الـ DOM
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(labelAll);
  };

  const observer = new MutationObserver((mutations) => {
    // نتجاهل تغييراتنا نحن (data-label) حتى لا ندخل في حلقة
    if (mutations.some((m) => m.type === "childList")) schedule();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
});
