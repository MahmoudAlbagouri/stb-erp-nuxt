// composables/usePagedList.ts
// قائمة مُرقَّمة من السيرفر: الصفوف + العدد + الصفحة + التحميل، بدل تكرار
// نفس الحالة في كل صفحة.
import { ref, type Ref } from "vue";
import { useToast } from "./useToast";
import type { Paginated } from "@/types/catalog";

export const usePagedList = <T>(
  fetcher: (page: number) => Promise<Paginated<T>>,
  errorMessage = "تعذر تحميل البيانات",
) => {
  const toast = useToast();

  const rows = ref([]) as Ref<T[]>;
  const total = ref(0);
  const page = ref(1);
  const totalPages = ref(1);
  const loading = ref(false);
  /** أول تحميل لم ينتهِ بعد (لعرض spinner بدل "لا توجد بيانات") */
  const ready = ref(false);

  // طلب قديم أبطأ من الأحدث لا يكتب فوق نتيجته (كتابة سريعة في البحث)
  let requestId = 0;

  const load = async (target = page.value) => {
    const current = ++requestId;
    loading.value = true;
    try {
      const res = await fetcher(target);
      if (current !== requestId) return;
      rows.value = res.data;
      total.value = res.total;
      page.value = res.page;
      totalPages.value = Math.max(res.totalPages, 1);
    } catch (e) {
      if (current === requestId) toast.error(getErrorMessage(e, errorMessage));
    } finally {
      if (current === requestId) {
        loading.value = false;
        ready.value = true;
      }
    }
  };

  /** بعد حذف/إلغاء صف: لو كان الأخير في صفحته نرجع صفحة */
  const reloadAfterRemoval = () =>
    load(rows.value.length === 1 ? Math.max(page.value - 1, 1) : page.value);

  return { rows, total, page, totalPages, loading, ready, load, reloadAfterRemoval };
};
