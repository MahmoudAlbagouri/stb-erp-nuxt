<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>اشتراك الشركة</h1>
        <p v-if="!subscription?.isSuperSystem">
          تفاصيل الخطة الحالية وحدود الاستخدام المتاحة
        </p>
        <p v-else class="super-badge-text">
          أنت مالك النظام ولديك صلاحيات وصول كاملة غير محدودة
        </p>
      </div>
    </div>

    <!-- حالة التحميل -->
    <div v-if="loading" class="flex-center p-10">
      <div class="spinner spinner--lg"></div>
    </div>

    <!-- عرض خاص لمالك النظام -->
    <div v-else-if="subscription?.isSuperSystem" class="card super-system-card">
      <div class="super-icon-wrapper">
        <ShieldCheck :size="48" />
      </div>
      <h2>مالك النظام (System Owner)</h2>
      <p>هذا الحساب يمتلك صلاحية الوصول الكاملة لجميع موارد النظام دون قيود.</p>
      <div class="super-stats">
        <span class="stat-item">الحالة: <strong>نشط دائماً</strong></span>
        <span class="stat-item">الحدود: <strong>غير محدودة ∞</strong></span>
      </div>
    </div>

    <!-- العرض العادي للشركات -->
    <div v-else-if="subscription" class="sub-grid">
      <div class="card sub-card main-info">
        <div class="sub-header">
          <div class="plan-icon"><Gem :size="24" /></div>
          <div>
            <h2>{{ subscription.plan.nameAr }}</h2>
            <span :class="['status-badge', `status--${subscription.status}`]">
              {{ getStatusLabel(subscription.status) }}
            </span>
          </div>
        </div>

        <div class="price-tag">
          {{ formatPrice(subscription.plan.price) }}
          <span class="cycle"
            >/ {{ getBillingLabel(subscription.plan.billingCycle) }}</span
          >
        </div>

        <div class="dates-row">
          <div class="date-box">
            <span class="label">بداية الفترة</span>
            <span class="val">{{ formatDate(subscription.startDate) }}</span>
          </div>
          <div class="date-box">
            <span class="label">نهاية الفترة</span>
            <span class="val">{{
              subscription.endDate
                ? formatDate(subscription.endDate)
                : "غير محدد"
            }}</span>
          </div>
        </div>
      </div>

      <div class="quotas-section">
        <h3 class="section-title">حدود الاستخدام (Quotas)</h3>
        <div class="quotas-grid">
          <div
            v-for="(quota, key) in subscription.quotas"
            :key="key"
            class="quota-card"
          >
            <div class="quota-head">
              <span class="q-name">{{ getQuotaLabel(String(key)) }}</span>
              <span class="q-count"
                >{{ quota.used }} /
                {{ quota.limit === null ? "∞" : quota.limit }}</span
              >
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: getPercentage(quota) + '%' }"
                :class="{ 'is-critical': getPercentage(quota) > 90 }"
              ></div>
            </div>
            <div class="quota-footer">
              <span v-if="quota.remaining !== null" class="remaining-text"
                >متبقي: {{ quota.remaining }}</span
              >
              <span v-else class="unlimited-text">غير محدود</span>
            </div>
          </div>
          <div
            v-if="Object.keys(subscription.quotas).length === 0"
            class="empty-quota"
          >
            لا توجد حدود محددة لهذه الخطة.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import { Gem, ShieldCheck } from "lucide-vue-next";

definePageMeta({ middleware: "auth" });

const api = useApi();
const loading = ref(true);
const subscription = ref<any>(null);

const fetchMySubscription = async () => {
  try {
    const res = await api.get("/subscriptions/me");
    subscription.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const formatPrice = (p: string) => Number(p).toLocaleString("en-US") + " ر.س";
const getBillingLabel = (c: string) =>
  c === "monthly" ? "شهر" : c === "yearly" ? "سنة" : "مدى الحياة";
const getStatusLabel = (s: string) => {
  const map: any = {
    active: "نشط",
    trial: "تجريبي",
    expired: "منتهي",
    cancelled: "ملغي",
    suspended: "معلق",
    pending: "قيد الانتظار",
  };
  return map[s] || s;
};
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA");
const getQuotaLabel = (k: string) =>
  k === "max_users" ? "المستخدمين" : k === "max_employees" ? "الموظفين" : k;
const getPercentage = (q: any) =>
  q.limit === null ? 0 : Math.min(100, Math.round((q.used / q.limit) * 100));

onMounted(fetchMySubscription);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.super-system-card {
  @include glass-card;
  text-align: center;
  padding: $space-8;
  background: linear-gradient(
    135deg,
    rgba($stb-accent, 0.05),
    rgba($stb-surface, 0.8)
  );

  .super-icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto $space-4;
    background: rgba($stb-accent, 0.1);
    color: $stb-accent;
    border-radius: 50%;
    @include flex(row, center, center);
  }

  h2 {
    font-size: $font-size-xl;
    margin-bottom: $space-2;
  }
  p {
    color: $stb-text-muted;
    margin-bottom: $space-6;
  }

  .super-stats {
    display: flex;
    justify-content: center;
    gap: $space-6;
    .stat-item strong {
      color: $stb-success;
    }
  }
}

.sub-grid {
  display: grid;
  gap: $space-6;
}
.sub-card {
  @include glass-card;
  padding: $space-6;
  .sub-header {
    @include flex(row, flex-start, flex-start, $space-4);
    margin-bottom: $space-5;
    .plan-icon {
      width: 50px;
      height: 50px;
      background: rgba($stb-accent, 0.1);
      color: $stb-accent;
      border-radius: $radius-lg;
      @include flex(row, center, center);
    }
    h2 {
      margin-bottom: 4px;
      font-size: $font-size-xl;
    }
  }
  .price-tag {
    font-size: $font-size-2xl;
    font-weight: 800;
    color: $stb-text-primary;
    margin-bottom: $space-5;
    .cycle {
      font-size: $font-size-sm;
      color: $stb-text-muted;
      font-weight: 400;
    }
  }
  .dates-row {
    @include flex(row, flex-start, space-between);
    background: $stb-surface;
    padding: $space-3;
    border-radius: $radius-md;
    .date-box {
      display: flex;
      flex-direction: column;
      .label {
        font-size: $font-size-xs;
        color: $stb-text-muted;
      }
      .val {
        font-size: $font-size-sm;
        font-weight: 600;
        color: $stb-text-primary;
      }
    }
  }
}
.section-title {
  font-size: $font-size-lg;
  margin-bottom: $space-4;
  color: $stb-text-primary;
}
.quotas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: $space-4;
}
.quota-card {
  @include glass-card;
  padding: $space-4;
  .quota-head {
    @include flex(row, space-between, center);
    margin-bottom: $space-2;
    .q-name {
      font-weight: 600;
      color: $stb-text-secondary;
    }
    .q-count {
      font-weight: 700;
      color: $stb-accent;
    }
  }
  .progress-track {
    height: 6px;
    background: $stb-surface-3;
    border-radius: $radius-full;
    overflow: hidden;
    margin-bottom: $space-2;
    .progress-fill {
      height: 100%;
      background: $stb-accent;
      transition: width 0.5s ease;
      &.is-critical {
        background: $stb-danger;
      }
    }
  }
  .quota-footer {
    font-size: $font-size-xs;
    color: $stb-text-muted;
    text-align: left;
  }
}
.status-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-weight: 600;
  &.status--active {
    background: rgba($stb-success, 0.15);
    color: $stb-success;
  }
  &.status--trial {
    background: rgba($stb-warning, 0.15);
    color: $stb-warning;
  }
  &.status--expired {
    background: rgba($stb-danger, 0.15);
    color: $stb-danger;
  }
  &.status--suspended {
    background: rgba($stb-text-muted, 0.15);
    color: $stb-text-muted;
  }
  &.status--pending {
    background: rgba($stb-info, 0.15);
    color: $stb-info;
  }
}
</style>
