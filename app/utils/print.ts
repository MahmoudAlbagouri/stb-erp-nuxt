// utils/print.ts — طباعة تقرير معروض على الشاشة (كشف حساب، ميزان، قوائم)
//
// الطباعة تُخفي كل الواجهة إلا ‎.print-area (‎_documents.scss)، فنضع نسخة من
// عنصر التقرير هناك، نطبع، ثم نزيلها.

export const printElement = (element: HTMLElement | null | undefined): void => {
  if (!element) return;
  const area = document.createElement("div");
  area.className = "print-area report-print";
  area.appendChild(element.cloneNode(true));
  document.body.appendChild(area);
  const cleanup = () => {
    area.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
};
