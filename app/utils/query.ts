// utils/query.ts

export type QueryValue = string | number | boolean | null | undefined;

/** يبني query string (مع علامة ?) متجاهلاً القيم الفارغة، أو "" إذا لم توجد قيم */
export const toQueryString = (params?: object): string => {
  const search = new URLSearchParams();
  Object.entries((params ?? {}) as Record<string, QueryValue>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, String(value));
      }
    },
  );
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};
