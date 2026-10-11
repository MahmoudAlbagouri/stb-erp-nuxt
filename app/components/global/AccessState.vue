<template>
  <!--
    حالة تملأ الصفحة عندما لا يستطيع المستخدم الوصول:
    - locked: الموديول خارج خطة الشركة → دعوة للترقية
    - denied: لا يملك الصلاحية
  -->
  <div class="access-state" :class="`access-state--${state}`">
    <div class="access-state__card">
      <div class="access-state__icon">
        <component :is="state === 'locked' ? Lock : ShieldAlert" :size="34" />
      </div>

      <template v-if="state === 'locked'">
        <span class="access-state__badge">
          <Sparkles :size="13" /> ميزة ضمن خطة أعلى
        </span>
        <h2>{{ featureLabel || title }} غير متاح في خطتك الحالية</h2>
        <p>
          قم بترقية اشتراك شركتك لتفعيل
          <strong>{{ featureLabel || title }}</strong>
          والاستفادة من كامل إمكانياته.
        </p>
        <div class="access-state__actions">
          <NuxtLink
            v-if="canViewSubscription"
            to="/dashboard/subscription"
            class="btn btn--accent"
          >
            <Gem :size="16" /> عرض الخطط والترقية
          </NuxtLink>
          <p v-else class="access-state__hint">
            تواصل مع مدير شركتك لترقية الخطة.
          </p>
          <NuxtLink to="/dashboard" class="btn btn--ghost">
            العودة للرئيسية
          </NuxtLink>
        </div>
      </template>

      <template v-else>
        <h2>لا تملك صلاحية الوصول لهذه الصفحة</h2>
        <p>
          إذا كنت تحتاج الوصول إلى <strong>{{ title }}</strong
          >، اطلب من مدير شركتك إضافة الصلاحية لدورك الوظيفي.
        </p>
        <div class="access-state__actions">
          <NuxtLink to="/dashboard" class="btn btn--primary">
            العودة للرئيسية
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Gem, Lock, ShieldAlert, Sparkles } from "lucide-vue-next";
import { useAccess } from "@/composables/useAccess";
import { FEATURE_LABELS, type FeatureKey } from "@/utils/access";

const props = defineProps<{
  state: "locked" | "denied";
  /** اسم الصفحة */
  title?: string;
  feature?: FeatureKey;
}>();

const { can, P } = useAccess();

const featureLabel = computed(() =>
  props.feature ? FEATURE_LABELS[props.feature] : "",
);
const canViewSubscription = computed(() => can(P.SUBSCRIPTION_VIEW_OWN));
</script>

<style lang="scss" scoped>
.access-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: $space-8 $space-4;
}

.access-state__card {
  max-width: 520px;
  width: 100%;
  padding: $space-10 $space-8;
  text-align: center;
  background: $gradient-card;
  border: 1px solid $stb-border;
  border-radius: 16px;
  box-shadow: $shadow-md;

  h2 {
    margin: $space-4 0 $space-3;
    font-size: 1.35rem;
    font-weight: 700;
    color: $stb-text-primary;
    line-height: 1.6;
  }

  p {
    margin: 0;
    color: $stb-text-secondary;
    line-height: 1.9;

    strong {
      color: $stb-text-primary;
    }
  }
}

.access-state__icon {
  display: flex;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  color: $stb-danger;
  background: rgba($stb-danger, 0.1);
  border: 1px solid rgba($stb-danger, 0.25);
}

.access-state--locked .access-state__icon {
  color: $stb-warning;
  background: rgba($stb-warning, 0.1);
  border-color: rgba($stb-warning, 0.3);
  box-shadow: 0 0 28px rgba($stb-warning, 0.15);
}

.access-state__badge {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  margin-top: $space-4;
  padding: $space-1 $space-3;
  border-radius: 999px;
  font-size: $font-size-xs;
  font-weight: 700;
  color: $stb-warning;
  background: rgba($stb-warning, 0.12);
  border: 1px solid rgba($stb-warning, 0.3);
}

.access-state__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  margin-top: $space-6;
}

.access-state__hint {
  width: 100%;
  font-size: $font-size-sm;
}
</style>
