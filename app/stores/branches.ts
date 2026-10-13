// stores/branches.ts — الفروع: الإدارة + قائمة الاختيار المشتركة بين النماذج
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Branch, BranchOption, BranchPayload } from "@/types/branches";

const BASE = "/branches";

export const useBranchesStore = defineStore("branches", () => {
  const api = useApi();

  // ─── قائمة الاختيار (تكفيها المصادقة، وتقتصر على فروع المستخدم) ───
  const options = ref<BranchOption[]>([]);
  const optionsLoaded = ref(false);

  const fetchOptions = async (force = false) => {
    if (optionsLoaded.value && !force) return;
    options.value = (await api.get<BranchOption[]>(`${BASE}/options`)).data;
    optionsLoaded.value = true;
  };

  /** الفروع النشطة: ما يُعرض للاختيار عند إنشاء شيء جديد */
  const activeOptions = computed(() => options.value.filter((b) => b.isActive));
  /** شركة بفرع واحد لا تحتاج أن ترى اختيار الفرع ولا فلتره */
  const hasMany = computed(() => options.value.length > 1);
  const nameOf = (id?: string | null) =>
    options.value.find((b) => b.id === id)?.name ?? "";

  // ─── الإدارة ───
  const branches = ref<Branch[]>([]);
  const loading = ref(false);

  const fetchAll = async () => {
    loading.value = true;
    try {
      branches.value = (await api.get<Branch[]>(BASE)).data;
    } finally {
      loading.value = false;
    }
  };

  const refresh = () => Promise.all([fetchAll(), fetchOptions(true)]);

  const create = async (payload: BranchPayload) => {
    const res = await api.post<Branch>(BASE, payload);
    await refresh();
    return res.data;
  };

  const update = async (id: string, payload: Partial<BranchPayload>) => {
    const res = await api.patch<Branch>(`${BASE}/${id}`, payload);
    await refresh();
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`${BASE}/${id}`);
    await refresh();
  };

  const reset = () => {
    options.value = [];
    optionsLoaded.value = false;
    branches.value = [];
    loading.value = false;
  };

  return {
    options,
    optionsLoaded,
    activeOptions,
    hasMany,
    nameOf,
    fetchOptions,
    branches,
    loading,
    fetchAll,
    create,
    update,
    remove,
    reset,
  };
});
