<!--
  الصفحة الرئيسية لمالك النظام: نظرة على الشركات المشتركة وروابط إدارتها.
  (لوحة الشركات العادية تعرض بيانات شركة واحدة، ومالك النظام بلا شركة.)
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>لوحة مالك النظام</h1>
        <p>الشركات المشتركة وخططها — ومنها تدخل أي شركة لمساعدتها</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/dashboard/companies" class="btn btn--primary">
          <Building2 :size="18" />
          <span>إدارة الشركات</span>
        </NuxtLink>
      </div>
    </div>

    <!-- ══ الأرقام ══ -->
    <div class="doc-stats">
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--accent"><Building2 :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatNumber(tenants.length) }}</div>
          <div class="stat-card__label">إجمالي الشركات</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--success">
          <CircleCheck :size="22" />
        </div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatNumber(countOf("active")) }}</div>
          <div class="stat-card__label">شركات نشطة</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--warning"><Hourglass :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatNumber(countOf("trial")) }}</div>
          <div class="stat-card__label">في الفترة التجريبية</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon doc-tone--info"><Layers :size="22" /></div>
        <div class="stat-card__info">
          <div class="stat-card__value">{{ formatNumber(plansStore.plans.length) }}</div>
          <div class="stat-card__label">الخطط المتاحة</div>
        </div>
      </div>
    </div>

    <!-- ══ روابط سريعة ══ -->
    <div class="owner-links">
      <NuxtLink
        v-for="link in LINKS"
        :key="link.to"
        :to="link.to"
        class="card owner-link"
      >
        <component :is="link.icon" :size="22" class="owner-link__icon" />
        <span class="doc-cell">
          <span class="doc-cell__main">{{ link.label }}</span>
          <span class="doc-cell__sub">{{ link.hint }}</span>
        </span>
        <ChevronLeft :size="18" class="owner-link__arrow" />
      </NuxtLink>
    </div>

    <div class="owner-columns">
      <!-- ══ أحدث الشركات ══ -->
      <section class="card owner-panel">
        <h3 class="owner-panel__title">أحدث الشركات</h3>
        <div v-if="tenantStore.loading && !tenants.length" class="empty-state">
          <div class="spinner" />
        </div>
        <p v-else-if="!tenants.length" class="doc-lines__empty">
          لا توجد شركات مسجّلة بعد
        </p>
        <div v-else class="owner-list">
          <div v-for="t in recentTenants" :key="t.id" class="owner-row">
            <span class="doc-cell">
              <span class="doc-cell__main">{{ t.companyName }}</span>
              <span class="doc-cell__sub">
                {{ STATUS_LABELS[t.status] ?? t.status }} · منذ
                {{ formatDate(t.created_at) }}
              </span>
            </span>
            <button
              class="btn btn--sm btn--ghost"
              :disabled="entering === t.id"
              @click="enter(t.id)"
            >
              <LifeBuoy :size="14" /> دخول للدعم
            </button>
          </div>
        </div>
      </section>

      <!-- ══ سجل الدعم ══ -->
      <section class="card owner-panel">
        <h3 class="owner-panel__title">آخر جلسات الدعم</h3>
        <p v-if="!sessions.length" class="doc-lines__empty">
          لم تُفتح أي شركة في وضع الدعم بعد
        </p>
        <div v-else class="owner-list">
          <div v-for="s in sessions" :key="s.id" class="owner-row">
            <span class="doc-cell">
              <span class="doc-cell__main">
                {{ s.tenant?.companyName ?? "شركة محذوفة" }}
              </span>
              <span class="doc-cell__sub doc-num">
                {{ formatDateTime(s.startedAt) }}
              </span>
            </span>
            <span class="doc-cell__sub">{{ durationOf(s) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Building2,
  ChevronLeft,
  CircleCheck,
  CreditCard,
  FileText,
  Hourglass,
  Layers,
  LifeBuoy,
  Users,
} from "lucide-vue-next";
import { useApi } from "@/composables/useApi";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/auth";
import { usePlanStore } from "@/stores/plans";
import { useTenantStore, type Tenant } from "@/stores/tenants";

interface SupportSessionRow {
  id: string;
  tenant?: { companyName: string } | null;
  startedAt: string;
  lastSeenAt: string;
}

const RECENT_LIMIT = 6;

const STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  trial: "تجريبية",
  inactive: "غير نشطة",
};

const LINKS = [
  {
    to: "/dashboard/companies",
    label: "الشركات",
    hint: "إضافة وتعديل ودخول للدعم",
    icon: Building2,
  },
  {
    to: "/dashboard/plans",
    label: "الخطط",
    hint: "المميزات والحدود والأسعار",
    icon: Layers,
  },
  {
    to: "/dashboard/admin/subscriptions",
    label: "الاشتراكات",
    hint: "ترقية وتجديد وإيقاف",
    icon: CreditCard,
  },
  {
    to: "/dashboard/quotations",
    label: "عروض الأسعار",
    hint: "عروض العملاء المحتملين",
    icon: FileText,
  },
  {
    to: "/dashboard/users",
    label: "المستخدمون",
    hint: "حسابات فريق النظام",
    icon: Users,
  },
];

const api = useApi();
const auth = useAuthStore();
const tenantStore = useTenantStore();
const plansStore = usePlanStore();
const toast = useToast();

const tenants = computed(() => tenantStore.tenants);

const countOf = (status: Tenant["status"]) =>
  tenants.value.filter((t) => t.status === status).length;

const recentTenants = computed(() =>
  [...tenants.value]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, RECENT_LIMIT),
);

// ─── وضع الدعم ────────────────────────────────────────────────────────────────
const entering = ref<string | null>(null);

const enter = async (tenantId: string) => {
  entering.value = tenantId;
  try {
    await auth.enterSupport(tenantId); // ينتقل للوحة الشركة عند النجاح
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الدخول إلى الشركة"));
    entering.value = null;
  }
};

const sessions = ref<SupportSessionRow[]>([]);

const durationOf = (session: SupportSessionRow) => {
  const minutes = Math.round(
    (new Date(session.lastSeenAt).getTime() -
      new Date(session.startedAt).getTime()) /
      60000,
  );
  return minutes < 1 ? "أقل من دقيقة" : `${formatNumber(minutes)} دقيقة`;
};

onMounted(() => {
  tenantStore.fetchAll();
  plansStore.fetchAll().catch(() => {});
  api
    .get<SupportSessionRow[]>("/auth/support/sessions")
    .then((res) => {
      sessions.value = res.data.slice(0, RECENT_LIMIT);
    })
    .catch(() => {});
});
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

.owner-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: $space-3;
  margin-bottom: $space-4;
}

.owner-link {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4;
  color: inherit;
  text-decoration: none;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $stb-accent;
  }
  &__icon {
    flex-shrink: 0;
    color: $stb-accent;
  }
  &__arrow {
    margin-inline-start: auto;
    color: $stb-text-muted;
  }
}

.owner-columns {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: $space-4;

  @include respond-to("lg") {
    grid-template-columns: 1fr;
  }
}

.owner-panel {
  padding: $space-4;

  &__title {
    margin-bottom: $space-3;
    font-size: $font-size-base;
    font-weight: 700;
  }
}

.owner-list {
  display: flex;
  flex-direction: column;
}

.owner-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-3 0;
  border-bottom: 1px solid $stb-border;

  &:last-child {
    border-bottom: 0;
  }
}
</style>
