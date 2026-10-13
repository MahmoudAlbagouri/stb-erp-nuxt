<!-- pages/dashboard/pos/cashiers.vue — الكاشيرات وأرقامهم السرية -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الكاشيرات</h1>
        <p>
          كل كاشير يفتح ورديته على شاشة البيع برقمه السري — حتى بلا إنترنت —
          فتُنسب الوردية ودرج النقد لصاحبها
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_pos_devices'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="18" />
          <span>إضافة كاشير</span>
        </button>
      </div>
    </div>

    <div class="doc-note">
      <Info :size="16" />
      <span>
        التغييرات هنا تصل أجهزة الكاشير عند أول اتصال لها بالإنترنت (خلال دقائق
        إن كانت متصلة). ما دامت القائمة فارغة تُفتح الورديات باسم حر بلا رقم
        سري.
      </span>
    </div>

    <div v-if="loading && !cashiers.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <div v-else-if="!cashiers.length" class="card">
      <div class="empty-state">
        <UserRound :size="44" class="empty-state__icon" />
        <div class="empty-state__title">لا يوجد كاشيرات بعد</div>
        <div class="empty-state__text">
          أضف كاشيراً برقم سري ليصير فتح الوردية على كل الأجهزة باسمه ورقمه
        </div>
        <button
          v-can="'manage_pos_devices'"
          class="btn btn--primary"
          @click="openCreate"
        >
          <Plus :size="16" /> إضافة كاشير
        </button>
      </div>
    </div>

    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>الكاشير</th>
              <th>المرتجع</th>
              <th>الحالة</th>
              <th>أُضيف في</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cashiers" :key="c.id">
              <td>
                <span class="doc-cell__main">{{ c.name }}</span>
              </td>
              <td>
                <span
                  :class="[
                    'badge',
                    c.canReturn ? 'doc-status--done' : 'doc-status--draft',
                  ]"
                >
                  {{ c.canReturn ? "مسموح" : "غير مسموح" }}
                </span>
              </td>
              <td>
                <span
                  :class="['badge', c.isActive ? 'badge--active' : 'badge--inactive']"
                >
                  {{ c.isActive ? "نشط" : "موقوف" }}
                </span>
              </td>
              <td>
                <span class="doc-num">{{ formatDate(c.createdAt) }}</span>
              </td>
              <td>
                <div class="doc-actions">
                  <button
                    v-can="'manage_pos_devices'"
                    class="btn btn--sm btn--ghost"
                    @click="openEdit(c)"
                  >
                    <Pencil :size="14" /> تعديل
                  </button>
                  <button
                    v-can="'manage_pos_devices'"
                    class="btn btn--sm btn--danger btn--icon"
                    title="حذف"
                    @click="askDelete(c)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ نموذج الكاشير ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <UserRound :size="20" class="doc-modal__icon" />
                {{ editing ? "تعديل كاشير" : "إضافة كاشير" }}
              </h3>
              <button
                class="btn btn--icon btn--ghost"
                aria-label="إغلاق"
                @click="closeModal"
              >
                <X :size="20" />
              </button>
            </div>

            <form class="doc-form" @submit.prevent="handleSubmit">
              <div class="doc-grid">
                <div class="form-group doc-grid__full">
                  <label>اسم الكاشير *</label>
                  <input
                    v-model.trim="form.name"
                    class="form-input"
                    required
                    maxlength="150"
                    placeholder="كما يظهر على شاشة البيع وفي تقارير الورديات"
                  />
                </div>
                <div class="form-group doc-grid__full">
                  <label>
                    {{ editing ? "رقم سري جديد" : "الرقم السري *" }}
                  </label>
                  <input
                    v-model="form.pin"
                    type="password"
                    inputmode="numeric"
                    autocomplete="new-password"
                    class="form-input"
                    dir="ltr"
                    pattern="\d{4,6}"
                    maxlength="6"
                    :required="!editing"
                    :placeholder="editing ? 'اتركه فارغاً لإبقاء الرقم الحالي' : '4 إلى 6 أرقام'"
                    @input="form.pin = form.pin.replace(/\D/g, '')"
                  />
                  <small class="doc-hint">
                    من 4 إلى 6 أرقام. لا يُعرض بعد الحفظ — إن نسيه الكاشير
                    عيّن له رقماً جديداً من هنا.
                  </small>
                </div>
              </div>

              <label class="checkbox-label">
                <input v-model="form.canReturn" type="checkbox" />
                <span>يُسمح له بعمل مرتجع وردّ مبلغ من الدرج</span>
              </label>
              <label class="checkbox-label">
                <input v-model="form.isActive" type="checkbox" />
                <span>نشط (الموقوف لا يفتح وردية جديدة)</span>
              </label>

              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="closeModal">
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :class="{ 'btn--loading': submitting }"
                  :disabled="submitting"
                >
                  {{ editing ? "حفظ التعديلات" : "إضافة الكاشير" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      title="حذف الكاشير"
      :message="`هل تريد حذف الكاشير '${deleteTarget?.name}'؟ ورديّاته السابقة تبقى باسمه، ولن يستطيع فتح وردية جديدة بعد أن تتصل الأجهزة.`"
      confirm-text="حذف"
      :loading="deleting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Info, Pencil, Plus, Trash2, UserRound, X } from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import type { PosCashierPayload, PosCashierRecord } from "@/pos/types";
import { usePosAdminStore } from "@/stores/posAdmin";

definePageMeta({ middleware: "auth" });

const store = usePosAdminStore();
const toast = useToast();

const cashiers = ref<PosCashierRecord[]>([]);
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    cashiers.value = await store.fetchCashiers();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الكاشيرات"));
  } finally {
    loading.value = false;
  }
};

// ─── النموذج ──────────────────────────────────────────────────────────────────
const showModal = ref(false);
const submitting = ref(false);
const editing = ref<PosCashierRecord | null>(null);
const form = reactive({ name: "", pin: "", canReturn: false, isActive: true });

const openCreate = () => {
  Object.assign(form, { name: "", pin: "", canReturn: false, isActive: true });
  editing.value = null;
  showModal.value = true;
};

const openEdit = (cashier: PosCashierRecord) => {
  Object.assign(form, {
    name: cashier.name,
    pin: "",
    canReturn: cashier.canReturn,
    isActive: cashier.isActive,
  });
  editing.value = cashier;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  // الرقم لا يبقى في الذاكرة بعد إغلاق النموذج
  form.pin = "";
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload: PosCashierPayload = {
      name: form.name,
      canReturn: form.canReturn,
      isActive: form.isActive,
      // عند التعديل يُرسل الرقم فقط إذا أُدخل رقم جديد
      ...(form.pin ? { pin: form.pin } : {}),
    };
    if (editing.value) {
      await store.updateCashier(editing.value.id, payload);
      toast.success("تم حفظ التعديلات");
    } else {
      await store.createCashier(payload);
      toast.success("تمت إضافة الكاشير");
    }
    closeModal();
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الكاشير"));
  } finally {
    submitting.value = false;
  }
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleting = ref(false);
const deleteTarget = ref<PosCashierRecord | null>(null);

const askDelete = (cashier: PosCashierRecord) => {
  deleteTarget.value = cashier;
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeCashier(deleteTarget.value.id);
    toast.success("تم حذف الكاشير");
    showConfirm.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حذف الكاشير"));
  } finally {
    deleting.value = false;
  }
};

onMounted(load);
</script>
