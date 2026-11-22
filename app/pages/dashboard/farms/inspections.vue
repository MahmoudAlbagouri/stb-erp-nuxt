<!-- pages/dashboard/farms/inspections.vue — الآفات والأمراض: الفحص بشدته، العلاج، والانتهاء -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الآفات والأمراض</h1>
        <p>كل فحص: أين ومتى وكم شدته وكم نبتة أصيبت من كم فُحصت — حتى يُعالج ويُغلق</p>
      </div>
      <div class="page-header__actions">
        <button v-can="'record_farm_work'" class="btn btn--primary" :disabled="!scope.farmId.value" @click="openForm">
          <Plus :size="18" /> <span>تسجيل فحص</span>
        </button>
      </div>
    </div>

    <div class="doc-tabs">
      <button
        v-for="t in TABS"
        :key="t.value"
        class="doc-tab"
        :class="{ 'is-active': filters.status === t.value }"
        @click="setStatus(t.value)"
      >
        {{ t.label }}
      </button>
    </div>
    <div class="card doc-filters doc-filters--even">
      <select v-model="scope.farmId.value" class="form-select" @change="onFarm">
        <option v-for="f in scope.store.farms" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <select v-model="filters.unitId" class="form-select" @change="list.load(1)">
        <option value="">كل الوحدات</option>
        <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select>
      <select v-model="filters.pest" class="form-select" @change="list.load(1)">
        <option value="">كل الآفات</option>
        <option v-for="(label, key) in PEST" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div v-if="!list.ready.value" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!list.rows.value.length" class="card">
      <div class="empty-state">
        <Bug :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا فحوص هنا</div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الفحص</th>
              <th>الآفة</th>
              <th>أين</th>
              <th>الشدة</th>
              <th>الإصابة</th>
              <th>الحالة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in list.rows.value" :key="i.id">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ i.number }}</span>
                  <span class="doc-cell__sub">{{ formatDateTime(i.inspectedAt) }}<template v-if="i.inspectorName"> · {{ i.inspectorName }}</template></span>
                </div>
              </td>
              <td>{{ PEST[i.pest] }}<span v-if="i.pestName" class="doc-cell__sub"> — {{ i.pestName }}</span></td>
              <td>
                <span v-if="i.plant" class="doc-code" dir="ltr">{{ i.plant.tag }}</span>
                <template v-else>{{ i.unit?.name ?? "المزرعة" }}</template>
              </td>
              <td>
                <span :class="['farm-chip', i.severity >= 3 ? 'farm-chip--danger' : i.severity ? 'farm-chip--warn' : '']">
                  {{ SEVERITY[i.severity] }}
                </span>
              </td>
              <td class="doc-num">
                <template v-if="i.sampledCount">{{ i.affectedCount ?? 0 }} / {{ i.sampledCount }}</template>
                <template v-else>{{ i.affectedCount ?? "—" }}</template>
              </td>
              <td><span :class="['badge', INSPECTION_STATUS[i.status].badge]">{{ INSPECTION_STATUS[i.status].label }}</span></td>
              <td>
                <div class="doc-actions">
                  <NuxtLink
                    v-if="i.status === 'open'"
                    v-can="'record_farm_work'"
                    :to="`/dashboard/farms/operations`"
                    class="btn btn--sm btn--ghost"
                    title="سجّل الرش من العمليات واختر هذا الفحص"
                  >
                    علاج
                  </NuxtLink>
                  <button v-if="i.status === 'open'" v-can="'record_farm_work'" class="btn btn--sm btn--ghost" @click="setInspection(i, 'treating')">قيد العلاج</button>
                  <button v-if="i.status !== 'resolved'" v-can="'record_farm_work'" class="btn btn--sm btn--primary" @click="setInspection(i, 'resolved')">انتهى</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <DocPager
      v-if="list.ready.value"
      :total="list.total.value"
      :page="list.page.value"
      :total-pages="list.totalPages.value"
      label="فحص"
      @change="list.load"
    />

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><Bug :size="20" class="doc-modal__icon" /> فحص آفة</h3>
              <button class="btn btn--icon btn--ghost" @click="showForm = false"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submit">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الآفة / المرض *</label>
                  <select v-model="form.pest" class="form-select" required>
                    <option v-for="(label, key) in PEST" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>الشدة *</label>
                  <select v-model.number="form.severity" class="form-select">
                    <option v-for="(label, n) in SEVERITY" :key="n" :value="n">{{ n }} — {{ label }}</option>
                  </select>
                </div>
                <div v-if="form.pest === 'other'" class="form-group doc-grid__full">
                  <label>اسم الآفة</label>
                  <input v-model.trim="form.pestName" class="form-input" maxlength="120" />
                </div>
                <div class="form-group">
                  <label>الوحدة</label>
                  <select v-model="form.unitId" class="form-select">
                    <option value="">المزرعة</option>
                    <option v-for="o in scope.unitOptions.value" :key="o.id" :value="o.id">{{ o.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>نخلة بعينها (الوسم)</label>
                  <input v-model.trim="form.plantTag" class="form-input" dir="ltr" placeholder="اختياري" />
                </div>
                <div class="form-group">
                  <label>المصاب</label>
                  <StbNumberInput v-model.number="form.affectedCount" class="form-input" min="0" />
                </div>
                <div class="form-group">
                  <label>من المفحوص</label>
                  <StbNumberInput v-model.number="form.sampledCount" class="form-input" min="0" />
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظات</label>
                  <input v-model.trim="form.notes" class="form-input" maxlength="2000" />
                </div>
              </div>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showForm = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="saving" :class="{ 'btn--loading': saving }">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Bug, Plus, X } from "lucide-vue-next";
import { useFarmsStore } from "@/stores/farms";
import { useFarmScope } from "@/composables/useFarmScope";
import { usePagedList } from "@/composables/usePagedList";
import { useToast } from "@/composables/useToast";
import { INSPECTION_STATUS, PEST, SEVERITY } from "@/utils/farms";
import type { FarmInspection, InspectionStatus, PestType } from "@/types/farms";

definePageMeta({ middleware: "auth" });

const TABS = [
  { value: "open", label: "مفتوحة" },
  { value: "treating", label: "قيد العلاج" },
  { value: "resolved", label: "انتهت" },
  { value: "", label: "الكل" },
] as const;

const store = useFarmsStore();
const scope = useFarmScope();
const toast = useToast();
const saving = ref(false);

const filters = reactive({ status: "open" as string, unitId: "", pest: "" });
const list = usePagedList((page) =>
  store.fetchInspections({
    farmId: scope.farmId.value || undefined,
    unitId: filters.unitId || undefined,
    status: filters.status || undefined,
    pest: filters.pest || undefined,
    page,
  }),
);
const setStatus = (status: string) => {
  filters.status = status;
  void list.load(1);
};
const onFarm = () => {
  filters.unitId = "";
  void list.load(1);
};

const emptyForm = () => ({
  pest: "red_palm_weevil" as PestType,
  pestName: "",
  severity: 2,
  unitId: "",
  plantTag: "",
  affectedCount: "" as number | "",
  sampledCount: "" as number | "",
  notes: "",
});
const form = reactive(emptyForm());
const showForm = ref(false);
const openForm = () => {
  Object.assign(form, emptyForm());
  showForm.value = true;
};
const submit = async () => {
  saving.value = true;
  try {
    let plantId: string | null = null;
    if (form.plantTag) {
      const found = (
        await store.fetchPlants({ farmId: scope.farmId.value, search: form.plantTag, limit: 5 })
      ).data.find((p) => p.tag === form.plantTag);
      if (!found) throw new Error(`لا نخلة بالوسم ${form.plantTag}`);
      plantId = found.id;
    }
    await store.createInspection({
      farmId: scope.farmId.value,
      unitId: plantId ? null : form.unitId || null,
      plantId,
      pest: form.pest,
      pestName: form.pestName || null,
      severity: form.severity,
      affectedCount: form.affectedCount === "" ? null : Number(form.affectedCount),
      sampledCount: form.sampledCount === "" ? null : Number(form.sampledCount),
      notes: form.notes || null,
    });
    toast.success(plantId && form.severity ? "سُجّل الفحص وعُلّمت النخلة مصابة" : "سُجّل الفحص");
    showForm.value = false;
    await list.load(1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    saving.value = false;
  }
};
const setInspection = async (i: FarmInspection, status: InspectionStatus) => {
  try {
    await store.setInspectionStatus(i.id, { status });
    toast.success(status === "resolved" ? "انتهى الفحص" : "قيد العلاج");
    await list.load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحديث"));
  }
};

onMounted(async () => {
  try {
    await scope.init();
    await list.load(1);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحميل"));
  }
});
</script>
