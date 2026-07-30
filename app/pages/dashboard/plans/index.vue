<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>إدارة خطط الاشتراك</h1>
        <p>تحديد الباقات، الأسعار، والميزات التقنية لكل خطة</p>
      </div>
      <button class="btn btn--primary" @click="openModal()">
        <Plus :size="16" /> إضافة خطة جديدة
      </button>
    </div>

    <div v-if="store.loading" class="loading-grid">
      <div v-for="i in 3" :key="i" class="plan-skeleton card"></div>
    </div>

    <div v-else class="plans-grid">
      <div v-for="plan in store.plans" :key="plan.id" class="plan-card card">
        <div class="plan-header">
          <div class="plan-title">
            <h3>{{ plan.nameAr }}</h3>
            <span class="plan-key">{{ plan.name }}</span>
          </div>
          <div class="plan-price">
            {{ formatPrice(plan.price) }}
            <small>/ {{ getBillingLabel(plan.billingCycle) }}</small>
          </div>
        </div>

        <div class="plan-body">
          <!-- قسم الحدود -->
          <div class="section">
            <h4>الحدود المسموحة (Quotas)</h4>
            <ul class="list-dashed">
              <li v-for="(val, key) in plan.quotas" :key="key">
                <span class="quota-label">{{ getQuotaLabel(key) }}</span>
                <strong class="quota-value">{{
                  val === -1 ? "غير محدود" : val
                }}</strong>
              </li>
            </ul>
          </div>

          <!-- قسم الميزات -->
          <div class="section">
            <h4>الميزات المتاحة</h4>
            <div class="features-list">
              <span
                v-for="f in plan.features"
                :key="f"
                class="feature-pill"
                :title="getFeatureName(f)"
              >
                <CheckCircle2 :size="12" />
                {{ getFeatureName(f) }}
              </span>
              <span v-if="!plan.features.length" class="text-muted text-sm"
                >لا توجد ميزات إضافية</span
              >
            </div>
          </div>
        </div>

        <div class="plan-footer">
          <button class="btn btn--ghost btn--sm" @click="openModal(plan)">
            <Edit :size="14" /> تعديل
          </button>
          <button
            class="btn btn--danger-outline btn--sm"
            @click="confirmDelete(plan.id)"
          >
            <Trash2 :size="14" /> حذف
          </button>
        </div>
      </div>
    </div>

    <!-- Modal for Create/Edit Plan -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal modal--lg">
            <div class="modal__header">
              <h3>{{ isEditing ? "تعديل الخطة" : "خطة جديدة" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="closeModal">
                <X :size="18" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="modal-form">
              <div class="grid-2">
                <div class="form-group">
                  <label>الاسم (EN)</label>
                  <input
                    v-model="form.name"
                    class="form-input"
                    required
                    placeholder="e.g. Basic"
                  />
                </div>
                <div class="form-group">
                  <label>الاسم (AR)</label>
                  <input
                    v-model="form.nameAr"
                    class="form-input"
                    required
                    placeholder="مثال: الأساسية"
                  />
                </div>
              </div>

              <div class="grid-3">
                <div class="form-group">
                  <label>السعر (ر.س)</label>
                  <input
                    v-model="form.price"
                    type="number"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>الدورة</label>
                  <select v-model="form.billingCycle" class="form-select">
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                    <option value="lifetime">مدى الحياة</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>النوع</label>
                  <select v-model="form.isCustom" class="form-select">
                    <option :value="false">عام (Public)</option>
                    <option :value="true">مخصص (Custom)</option>
                  </select>
                </div>
              </div>

              <div class="form-section">
                <label class="section-label">الحدود والقيود (Quotas)</label>
                <div class="grid-2">
                  <div class="form-group">
                    <label>عدد المستخدمين (Users)</label>
                    <input
                      v-model.number="form.quotas.max_users"
                      type="number"
                      class="form-input"
                      placeholder="0 = غير محدود"
                    />
                  </div>
                  <div class="form-group">
                    <label>عدد الموظفين (Employees)</label>
                    <input
                      v-model.number="form.quotas.max_employees"
                      type="number"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label>عدد العقود (Contracts)</label>
                    <input
                      v-model.number="form.quotas.max_contracts"
                      type="number"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label>أجهزة البصمة (Devices)</label>
                    <input
                      v-model.number="form.quotas.max_biometric_devices"
                      type="number"
                      class="form-input"
                    />
                  </div>
                </div>
              </div>

              <div class="form-section">
                <label class="section-label">الميزات الإضافية (Add-ons)</label>
                <div class="features-checkboxes">
                  <label
                    v-for="feat in store.availableFeatures"
                    :key="feat.name"
                    class="checkbox-label feature-check"
                  >
                    <input
                      type="checkbox"
                      :value="feat.name"
                      v-model="selectedFeatures"
                    />
                    <span>{{ feat.labelAr }}</span>
                  </label>
                </div>
              </div>

              <div class="modal__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="closeModal"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  class="btn btn--primary"
                  :disabled="submitting"
                >
                  {{ submitting ? "جاري الحفظ..." : "حفظ الخطة" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="حذف الخطة"
      message="هل أنت متأكد من حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء."
      confirm-text="حذف نهائي"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { usePlanStore } from "@/stores/plans";
import { useToast } from "@/composables/useToast";
import { Plus, Edit, Trash2, X, CheckCircle2 } from "lucide-vue-next";
import ConfirmDialog from "@/components/global/ConfirmDialog.vue";

definePageMeta({ middleware: "auth" });

const store = usePlanStore();
const toast = useToast();
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const submitting = ref(false);
const isEditing = ref(false);
const currentId = ref<string | null>(null);
const selectedFeatures = ref<string[]>([]);

type BillingCycle = "monthly" | "yearly" | "lifetime";

// تعريف الهيكل الافتراضي للنموذج
const initialQuotas = {
  max_users: 0,
  max_employees: 0,
  max_contracts: 0,
  max_biometric_devices: 0,
};

const form = reactive<{
  name: string;
  nameAr: string;
  price: string;
  billingCycle: BillingCycle;
  isCustom: boolean;
  quotas: typeof initialQuotas;
}>({
  name: "",
  nameAr: "",
  price: "",
  billingCycle: "monthly",
  isCustom: false,
  quotas: { ...initialQuotas },
});

const openModal = (plan?: any) => {
  if (plan) {
    isEditing.value = true;
    currentId.value = plan.id;
    // نسخ البيانات بعمق لتجنب التعديل المباشر
    Object.assign(form, {
      ...plan,
      quotas: { ...initialQuotas, ...plan.quotas },
    });
    selectedFeatures.value = [...(plan.features || [])];
  } else {
    isEditing.value = false;
    currentId.value = null;
    form.name = "";
    form.nameAr = "";
    form.price = "";
    form.quotas = { ...initialQuotas };
    selectedFeatures.value = [];
  }
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload = {
      ...form,
      features: selectedFeatures.value,
    };

    if (isEditing.value) {
      await store.update(currentId.value!, payload);
    } else {
      await store.create(payload);
    }

    toast.success("تم حفظ الخطة بنجاح");
    closeModal();
  } catch (e: any) {
    toast.error(e.message || "حدث خطأ أثناء الحفظ");
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (id: string) => {
  currentId.value = id;
  showDeleteConfirm.value = true;
};

const handleDelete = async () => {
  try {
    await store.deletePlan(currentId.value!);
    toast.success("تم حذف الخطة");
  } catch (e: any) {
    toast.error(e.message || "فشل الحذف");
  }
};

const closeModal = () => (showModal.value = false);

// دوال مساعدة للعرض
const formatPrice = (p: string) => Number(p).toLocaleString("ar-SA") + " ر.س";
const getBillingLabel = (c: string) => {
  const map: Record<string, string> = {
    monthly: "شهر",
    yearly: "سنة",
    lifetime: "مدى الحياة",
  };
  return map[c] || c;
};

const getQuotaLabel = (k: string) => {
  const map: Record<string, string> = {
    max_users: "المستخدمين",
    max_employees: "الموظفين",
    max_contracts: "العقود",
    max_biometric_devices: "أجهزة البصمة",
    max_storage_mb: "مساحة التخزين (MB)",
  };
  return map[k] || k;
};

const getFeatureName = (name: string) => {
  const feat = store.availableFeatures.find((f) => f.name === name);
  return feat ? feat.labelAr : name;
};

onMounted(() => {
  store.fetchAll();
  store.fetchFeatures();
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: $space-5;
}

.plan-card {
  display: flex;
  flex-direction: column;
  transition: all $transition-base;
  border: 1px solid $stb-border;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    border-color: $stb-accent;
  }

  .plan-header {
    padding: $space-5;
    border-bottom: 1px solid $stb-border;
    background: rgba($stb-accent, 0.03);

    .plan-title h3 {
      font-size: $font-size-lg;
      margin-bottom: 4px;
      color: $stb-text-primary;
    }
    .plan-key {
      font-size: $font-size-xs;
      color: $stb-text-muted;
      font-family: monospace;
      background: $stb-surface-2;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .plan-price {
      font-size: $font-size-xl;
      font-weight: 700;
      color: $stb-accent;
      margin-top: $space-3;
      small {
        font-size: $font-size-sm;
        font-weight: 400;
        color: $stb-text-secondary;
      }
    }
  }

  .plan-body {
    padding: $space-5;
    flex: 1;
  }

  .section {
    margin-bottom: $space-5;
    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      font-size: $font-size-xs;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: $stb-text-muted;
      margin-bottom: $space-3;
      font-weight: 600;
    }
  }

  .list-dashed {
    list-style: none;
    li {
      @include flex(row, space-between, center);
      font-size: $font-size-sm;
      padding: 6px 0;
      border-bottom: 1px dashed $stb-border-light;

      .quota-label {
        color: $stb-text-secondary;
      }
      .quota-value {
        color: $stb-text-primary;
      }
    }
  }

  .features-list {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    .feature-pill {
      @include flex(row, center, center);
      gap: 4px;
      font-size: 0.75rem;
      padding: 4px 8px;
      background: $stb-surface-2;
      border-radius: 6px;
      color: $stb-text-secondary;
      border: 1px solid transparent;
      transition: all 0.2s;

      svg {
        color: $stb-success;
      }

      &:hover {
        background: $stb-surface-3;
        border-color: $stb-border;
      }
    }
  }

  .plan-footer {
    padding: $space-4 $space-5;
    border-top: 1px solid $stb-border;
    @include flex(row, center, space-between);
    background: $stb-surface-2;
  }
}

.modal--lg {
  max-width: 800px;
}

.features-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: $space-3;
}

.feature-check {
  background: $stb-surface;
  padding: $space-3;
  border-radius: $radius-md;
  border: 1px solid $stb-border;
  cursor: pointer;
  @include flex(row, flex-start, center);
  gap: $space-2;
  transition: all 0.2s;

  &:has(input:checked) {
    background: rgba($stb-accent, 0.08);
    border-color: $stb-accent;
    color: $stb-accent;

    span {
      font-weight: 500;
    }
  }

  input {
    accent-color: $stb-accent;
  }
}
</style>
