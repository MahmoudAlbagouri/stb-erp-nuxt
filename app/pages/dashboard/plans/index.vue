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
          <div class="section">
            <h4>الحدود (Quotas)</h4>
            <ul class="list-dashed">
              <li v-for="(val, key) in plan.quotas" :key="key">
                <span>{{ getQuotaLabel(key) }}</span>
                <strong>{{ val }}</strong>
              </li>
            </ul>
          </div>

          <div class="section">
            <h4>الميزات</h4>
            <div class="features-list">
              <span v-for="f in plan.features" :key="f" class="feature-pill">
                {{ getFeatureName(f) }}
              </span>
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
                  <input v-model="form.name" class="form-input" required />
                </div>
                <div class="form-group">
                  <label>الاسم (AR)</label>
                  <input v-model="form.nameAr" class="form-input" required />
                </div>
              </div>

              <div class="grid-3">
                <div class="form-group">
                  <label>السعر</label>
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
                    <option :value="false">عام</option>
                    <option :value="true">مخصص</option>
                  </select>
                </div>
              </div>

              <div class="form-section">
                <label class="section-label">الحدود (Quotas)</label>
                <div class="grid-2">
                  <div class="form-group">
                    <label>Max Users</label>
                    <input
                      v-model.number="form.quotas.max_users"
                      type="number"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label>Max Employees</label>
                    <input
                      v-model.number="form.quotas.max_employees"
                      type="number"
                      class="form-input"
                    />
                  </div>
                </div>
              </div>

              <div class="form-section">
                <label class="section-label">الميزات المتاحة</label>
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
                  حفظ
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
      message="هل أنت متأكد؟"
      confirm-text="حذف"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { usePlanStore } from "@/stores/plans"; // افترض وجود هذا المتجر كما سبق
import { useToast } from "@/composables/useToast";
import { Plus, Edit, Trash2, X } from "lucide-vue-next";
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
const form = reactive<{
  name: string;
  nameAr: string;
  price: string;
  billingCycle: BillingCycle;
  isCustom: boolean;
  quotas: { max_users: number; max_employees: number };
}>({
  name: "",
  nameAr: "",
  price: "",
  billingCycle: "monthly",
  isCustom: false,
  quotas: { max_users: 0, max_employees: 0 },
});

const openModal = (plan?: any) => {
  if (plan) {
    isEditing.value = true;
    currentId.value = plan.id;
    Object.assign(form, { ...plan, quotas: { ...plan.quotas } });
    selectedFeatures.value = [...plan.features];
  } else {
    isEditing.value = false;
    currentId.value = null;
    form.name = "";
    form.nameAr = "";
    form.price = "";
    form.quotas = { max_users: 0, max_employees: 0 };
    selectedFeatures.value = [];
  }
  showModal.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload = { ...form, features: selectedFeatures.value };
    if (isEditing.value) await store.update(currentId.value!, payload);
    else await store.create(payload);
    toast.success("تم الحفظ بنجاح");
    closeModal();
  } catch (e: any) {
    toast.error(e.message);
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
    toast.success("تم الحذف");
  } catch (e: any) {
    toast.error(e.message);
  }
};

const closeModal = () => (showModal.value = false);
const formatPrice = (p: string) => Number(p).toLocaleString() + " ر.س";
const getBillingLabel = (c: string) => (c === "monthly" ? "شهر" : "سنة");
const getQuotaLabel = (k: string) =>
  k === "max_users" ? "المستخدمين" : "الموظفين";
const getFeatureName = (name: string) =>
  store.availableFeatures.find((f) => f.name === name)?.labelAr || name;

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
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: $space-4;
}

.plan-card {
  display: flex;
  flex-direction: column;
  transition: transform $transition-base;

  &:hover {
    transform: translateY(-4px);
    border-color: $stb-accent;
  }

  .plan-header {
    padding: $space-5;
    border-bottom: 1px solid $stb-border;

    .plan-title h3 {
      font-size: $font-size-lg;
      margin-bottom: 2px;
    }
    .plan-key {
      font-size: $font-size-xs;
      color: $stb-text-muted;
      font-family: monospace;
    }
    .plan-price {
      font-size: $font-size-xl;
      font-weight: 700;
      color: $stb-accent;
      margin-top: $space-2;
    }
  }

  .plan-body {
    padding: $space-4 $space-5;
    flex: 1;
  }

  .section {
    margin-bottom: $space-4;
    h4 {
      font-size: $font-size-xs;
      text-transform: uppercase;
      color: $stb-text-muted;
      margin-bottom: $space-2;
    }
  }

  .list-dashed {
    list-style: none;
    li {
      @include flex(row, space-between, center);
      font-size: $font-size-sm;
      padding: 4px 0;
      border-bottom: 1px dashed $stb-border;
    }
  }

  .features-list {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    .feature-pill {
      font-size: 0.7rem;
      padding: 2px 6px;
      background: $stb-surface-3;
      border-radius: 4px;
      color: $stb-text-secondary;
    }
  }

  .plan-footer {
    padding: $space-3 $space-5;
    border-top: 1px solid $stb-border;
    @include flex(row, center, space-between);
    background: rgba($stb-dark, 0.2);
  }
}

.modal--lg {
  max-width: 700px;
}
.features-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-2;
}
.feature-check {
  background: $stb-surface;
  padding: $space-2;
  border-radius: $radius-md;
  border: 1px solid $stb-border;
  cursor: pointer;
  &:has(input:checked) {
    background: rgba($stb-accent, 0.1);
    border-color: $stb-accent;
    color: $stb-accent;
  }
}
</style>
