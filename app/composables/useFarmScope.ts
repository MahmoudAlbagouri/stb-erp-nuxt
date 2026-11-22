// composables/useFarmScope.ts — المزرعة المختارة ووحداتها (للفلاتر والنماذج).
// آخر مزرعة اختارها المستخدم تُحفظ على الجهاز فتفتح الصفحات عليها.
import { computed, ref, watch } from "vue";
import { useFarmsStore } from "@/stores/farms";
import { unitOptionLabel } from "@/utils/farms";
import type { FarmUnit } from "@/types/farms";

const STORAGE_KEY = "stb-farm-scope";

export const useFarmScope = () => {
  const store = useFarmsStore();
  const farmId = ref<string>("");
  const units = ref<FarmUnit[]>([]);
  const loadingUnits = ref(false);
  /** المزرعة التي حُمّلت وحداتها (فلا يُعاد تحميلها مرتين) */
  let loadedFor: string | null = null;

  const farm = computed(() => store.farms.find((f) => f.id === farmId.value) ?? null);
  const unitOptions = computed(() =>
    units.value
      .filter((u) => u.isActive)
      .map((u) => ({ id: u.id, label: unitOptionLabel(u), unit: u })),
  );
  const unitName = (id?: string | null) =>
    units.value.find((u) => u.id === id)?.name ?? "";

  const loadUnits = async () => {
    loadedFor = farmId.value;
    if (!farmId.value) {
      units.value = [];
      return;
    }
    loadingUnits.value = true;
    try {
      units.value = await store.fetchUnits(farmId.value);
    } finally {
      loadingUnits.value = false;
    }
  };

  /** يحمّل المزارع ويختار المحفوظة (أو الأولى) */
  const init = async () => {
    if (!store.farms.length) await store.fetchFarms();
    let saved = "";
    try {
      saved = localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      // التخزين مغلق: تبدأ بالأولى
    }
    farmId.value =
      store.farms.find((f) => f.id === saved)?.id ?? store.farms[0]?.id ?? "";
    await loadUnits();
  };

  watch(farmId, (id, old) => {
    if (id === old) return;
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // لا شيء
    }
    if (id !== loadedFor) void loadUnits();
  });

  return { store, farmId, farm, units, unitOptions, unitName, loadingUnits, loadUnits, init };
};
