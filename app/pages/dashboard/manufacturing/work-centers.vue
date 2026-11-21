<!-- pages/dashboard/manufacturing/work-centers.vue — مراكز العمل: الطاقة وتكلفة الساعة -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>مراكز العمل</h1>
        <p>الماكينات وخطوط الإنتاج: طاقتها اليومية وتكلفة ساعتها — منها تكلفة الوقت على أوامر الإنتاج وحمل المصنع</p>
      </div>
      <div class="page-header__actions">
        <button v-can="'manage_work_centers'" class="btn btn--primary" @click="openForm()">
          <Plus :size="18" /> <span>إضافة مركز</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!store.workCenters.length" class="card">
      <div class="empty-state">
        <Cog :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا مراكز عمل بعد</div>
        <div class="empty-state__text">أضف الماكينات أو الخطوط التي تمر بها خطوات التصنيع</div>
      </div>
    </div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>المركز</th><th>الطاقة اليومية</th><th>أيام العمل</th><th>الكفاءة</th>
              <th>تكلفة الساعة</th><th>غير مباشرة/ساعة</th><th>الحالة</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in store.workCenters" :key="c.id">
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ c.name }}</span>
                  <span class="doc-cell__sub">{{ c.code }}<template v-if="c.branch"> · {{ c.branch.name }}</template></span>
                </div>
              </td>
              <td class="doc-num">{{ formatNumber(c.parallelUnits * c.hoursPerDay) }} ساعة</td>
              <td>{{ c.workingDays.map((d) => DAYS[d]).join("، ") }}</td>
              <td class="doc-num">{{ formatNumber(c.efficiencyPercent) }}%</td>
              <td class="doc-money">{{ formatCurrency(c.costPerHour) }}</td>
              <td class="doc-money">{{ formatCurrency(c.overheadPerHour) }}</td>
              <td>
                <span :class="['badge', c.isActive ? 'badge--active' : 'badge--inactive']">
                  {{ c.isActive ? "نشط" : "موقوف" }}
                </span>
              </td>
              <td>
                <div class="doc-actions">
                  <button v-can="'manage_work_centers'" class="btn btn--sm btn--ghost" @click="openForm(c)">
                    <Pencil :size="14" /> تعديل
                  </button>
                  <button v-can="'manage_work_centers'" class="btn btn--sm btn--danger btn--icon" title="حذف" @click="askDelete(c)">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal">
            <div class="modal__header">
              <h3><Cog :size="20" class="doc-modal__icon" /> {{ editing ? "تعديل مركز عمل" : "إضافة مركز عمل" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="closeModal"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="submit">
              <div class="doc-grid">
                <div class="form-group">
                  <label>الاسم *</label>
                  <input v-model.trim="form.name" class="form-input" required maxlength="120" placeholder="فرن 1، خط التعبئة..." />
                </div>
                <div class="form-group">
                  <label>الكود</label>
                  <input v-model.trim="form.code" class="form-input" dir="ltr" maxlength="20" placeholder="يُولَّد تلقائياً" />
                </div>
                <div v-if="branches.options.length > 1" class="form-group">
                  <label>الفرع</label>
                  <select v-model="form.branchId" class="form-select">
                    <option value="">الرئيسي</option>
                    <option v-for="b in branches.options" :key="b.id" :value="b.id">{{ b.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>عدد الماكينات / العمال المتوازيين</label>
                  <StbNumberInput v-model.number="form.parallelUnits" class="form-input" min="1" required />
                </div>
                <div class="form-group">
                  <label>ساعات العمل في اليوم</label>
                  <StbNumberInput v-model.number="form.hoursPerDay" class="form-input" min="0.5" max="24" step="any" required />
                </div>
                <div class="form-group">
                  <label>الكفاءة %</label>
                  <StbNumberInput v-model.number="form.efficiencyPercent" class="form-input" min="1" max="200" step="any" />
                  <small class="doc-hint">80% تجعل الوقت المخطط أطول بالربع</small>
                </div>
                <div class="form-group">
                  <label>تكلفة الساعة (عمالة + تشغيل)</label>
                  <StbNumberInput v-model.number="form.costPerHour" class="form-input" min="0" :step="moneyStep()" />
                </div>
                <div class="form-group">
                  <label>غير مباشرة لكل ساعة</label>
                  <StbNumberInput v-model.number="form.overheadPerHour" class="form-input" min="0" :step="moneyStep()" />
                  <small class="doc-hint">كهرباء، إيجار، إهلاك الماكينة</small>
                </div>
                <div class="form-group doc-grid__full">
                  <label>أيام العمل</label>
                  <div class="days">
                    <label v-for="(name, day) in DAYS" :key="day" class="checkbox-label">
                      <input v-model="form.workingDays" type="checkbox" :value="day" />
                      <span>{{ name }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group doc-grid__full">
                  <label>ملاحظات</label>
                  <input v-model.trim="form.note" class="form-input" maxlength="500" />
                </div>
              </div>
              <label class="checkbox-label">
                <input v-model="form.isActive" type="checkbox" /> <span>نشط</span>
              </label>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeModal">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': submitting }" :disabled="submitting">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف مركز العمل"
      :message="`حذف '${deleteTarget?.name}'؟ المستعمل في قوائم أو أوامر يُوقف بدل حذفه.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Cog, Pencil, Plus, Trash2, X } from "lucide-vue-next";
import { useManufacturingStore } from "@/stores/manufacturing";
import { useBranchesStore } from "@/stores/branches";
import { useToast } from "@/composables/useToast";
import type { WorkCenter } from "@/types/manufacturing";

definePageMeta({ middleware: "auth" });

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const store = useManufacturingStore();
const branches = useBranchesStore();
const toast = useToast();
const loading = ref(true);

const emptyForm = () => ({
  name: "",
  code: "",
  branchId: "",
  parallelUnits: 1 as number | "",
  hoursPerDay: 8 as number | "",
  efficiencyPercent: 100 as number | "",
  costPerHour: "" as number | "",
  overheadPerHour: "" as number | "",
  workingDays: [0, 1, 2, 3, 4] as number[],
  note: "",
  isActive: true,
});
const form = reactive(emptyForm());
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<WorkCenter | null>(null);

const openForm = (center?: WorkCenter) => {
  Object.assign(form, emptyForm());
  if (center) {
    Object.assign(form, {
      name: center.name,
      code: center.code,
      branchId: center.branchId ?? "",
      parallelUnits: center.parallelUnits,
      hoursPerDay: center.hoursPerDay,
      efficiencyPercent: center.efficiencyPercent,
      costPerHour: center.costPerHour,
      overheadPerHour: center.overheadPerHour,
      workingDays: [...center.workingDays],
      note: center.note ?? "",
      isActive: center.isActive,
    });
  }
  editing.value = center ?? null;
  showModal.value = true;
};
const closeModal = () => {
  if (!submitting.value) showModal.value = false;
};

const submit = async () => {
  submitting.value = true;
  try {
    await store.saveWorkCenter(
      {
        name: form.name,
        code: form.code || undefined,
        branchId: form.branchId || null,
        parallelUnits: Number(form.parallelUnits) || 1,
        hoursPerDay: Number(form.hoursPerDay) || 8,
        efficiencyPercent: Number(form.efficiencyPercent) || 100,
        costPerHour: Number(form.costPerHour) || 0,
        overheadPerHour: Number(form.overheadPerHour) || 0,
        workingDays: [...form.workingDays].sort(),
        note: form.note || null,
        isActive: form.isActive,
      },
      editing.value?.id,
    );
    toast.success("تم الحفظ");
    showModal.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ مركز العمل"));
  } finally {
    submitting.value = false;
  }
};

const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<WorkCenter | null>(null);
const askDelete = (center: WorkCenter) => {
  deleteTarget.value = center;
  showConfirm.value = true;
};
const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeWorkCenter(deleteTarget.value.id);
    toast.success("تم الحذف");
    showConfirm.value = false;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  try {
    await Promise.all([store.fetchWorkCenters(), branches.fetchOptions()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل مراكز العمل"));
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.days {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
}
</style>
