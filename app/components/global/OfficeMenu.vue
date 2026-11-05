<!--
  زر "المكتب": صفحات المبيعات والعملاء والمشتريات والموردين والمخزون والأصناف
  (كلٌّ بصلاحيته)، وحالة رفع ما حُفظ فيها بلا اتصال. في الشريط العلوي للوحة
  التحكم وفي شاشة الكاشير. النقطة الملونة: أخضر = كل شيء وصل، أصفر = ينتظر
  الرفع، أحمر = يحتاج مراجعة.
-->
<template>
  <div v-if="links.length" v-click-outside="close" class="office-menu">
    <button
      class="office-menu__btn"
      :class="compact ? 'btn btn--sm btn--ghost' : 'office-menu__icon-btn'"
      :title="statusText"
      @click="open = !open"
    >
      <Briefcase :size="compact ? 15 : 20" />
      <span v-if="compact" class="office-menu__label">المكتب</span>
      <span class="office-menu__dot" :class="`office-menu__dot--${tone}`" />
      <span v-if="office.ops.length" class="office-menu__count">
        {{ office.ops.length }}
      </span>
    </button>
    <Transition name="fade-scale">
      <div v-if="open" class="office-menu__popover">
        <button class="office-menu__status" @click="openQueue">
          <component :is="statusIcon" :size="16" :class="`is-${tone}`" />
          <span>{{ statusText }}</span>
        </button>
        <p class="office-menu__hint">
          تعمل بلا إنترنت من آخر نسخة، وما تحفظه يُرفع حين يعود الاتصال.
        </p>
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="office-menu__link"
          @click="close"
        >
          <component :is="link.icon" :size="16" />
          {{ link.label }}
        </NuxtLink>
      </div>
    </Transition>
    <OfficeQueueModal v-model="showQueue" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Directive } from "vue";
import {
  ArrowLeftRight,
  Boxes,
  Briefcase,
  CircleAlert,
  CloudCheck,
  CloudUpload,
  HandCoins,
  Package,
  ReceiptText,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-vue-next";
import { useAccess } from "@/composables/useAccess";
import { useOfficeStore } from "@/stores/office";

defineProps<{ compact?: boolean }>();

const office = useOfficeStore();
const { can } = useAccess();
const open = ref(false);
const showQueue = ref(false);

const ALL = [
  { to: "/dashboard/sales", label: "فواتير البيع", icon: ReceiptText, perm: "view_sales" },
  { to: "/dashboard/sales/customers", label: "العملاء", icon: Users, perm: "view_customers" },
  { to: "/dashboard/sales/payments", label: "المقبوضات", icon: HandCoins, perm: "view_sales" },
  { to: "/dashboard/purchasing", label: "فواتير الشراء", icon: ShoppingBag, perm: "view_purchases" },
  { to: "/dashboard/purchasing/suppliers", label: "الموردون", icon: Truck, perm: "view_suppliers" },
  { to: "/dashboard/inventory", label: "المخزون", icon: Boxes, perm: "view_inventory" },
  { to: "/dashboard/inventory/transfers", label: "التحويلات", icon: ArrowLeftRight, perm: "view_inventory" },
  { to: "/dashboard/products", label: "الأصناف", icon: Package, perm: "view_products" },
];

const links = computed(() => ALL.filter((link) => can(link.perm)));

const tone = computed(() =>
  office.failed.length ? "danger" : office.pending.length ? "warning" : "success",
);

const statusText = computed(() => {
  if (office.failed.length) {
    return `${office.failed.length} عملية رفضها السيرفر وتحتاج مراجعتك`;
  }
  if (office.pending.length) {
    return `${office.pending.length} عملية على هذا الجهاز تنتظر الرفع`;
  }
  return "كل عمليات المكتب وصلت السيرفر";
});

const statusIcon = computed(() =>
  office.failed.length ? CircleAlert : office.pending.length ? CloudUpload : CloudCheck,
);

const close = () => {
  open.value = false;
};

const openQueue = () => {
  open.value = false;
  showQueue.value = true;
};

type ClickOutsideEl = HTMLElement & { clickOutsideEvent?: (event: Event) => void };
const vClickOutside: Directive<ClickOutsideEl, () => void> = {
  mounted: (el, binding) => {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) binding.value();
    };
    document.addEventListener("click", el.clickOutsideEvent);
  },
  unmounted: (el) => {
    if (el.clickOutsideEvent) document.removeEventListener("click", el.clickOutsideEvent);
  },
};
</script>

<style lang="scss" scoped>
.office-menu {
  position: relative;

  &__btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }
  // مثل أزرار الشريط العلوي (الجرس): أيقونة بلا خلفية
  &__icon-btn {
    width: 36px;
    height: 36px;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    border-radius: $radius-md;
    color: $stb-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $stb-surface-3;
      color: $stb-text-primary;
    }
  }
  &__dot {
    position: absolute;
    top: 4px;
    inset-inline-end: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &--success {
      background: $stb-success;
    }
    &--warning {
      background: $stb-warning;
    }
    &--danger {
      background: $stb-danger;
    }
  }
  &__count {
    font-size: $font-size-xs;
    font-weight: 700;
  }
  &__popover {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    width: 280px;
    max-width: calc(100vw - 24px);
    padding: $space-2;
    background: $stb-surface-2;
    border: 1px solid $stb-border;
    border-radius: $radius-lg;
    box-shadow: $shadow-lg;
    z-index: $z-dropdown;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  &__status {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2;
    text-align: start;
    color: $stb-text-primary;
    background: transparent;
    border: 1px solid $stb-border;
    border-radius: $radius-md;
    cursor: pointer;

    .is-success {
      color: $stb-success;
    }
    .is-warning {
      color: $stb-warning;
    }
    .is-danger {
      color: $stb-danger;
    }
  }
  &__hint {
    margin: $space-1 $space-2 $space-2;
    color: $stb-text-secondary;
    font-size: $font-size-xs;
  }
  &__link {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2;
    color: $stb-text-primary;
    border-radius: $radius-md;
    text-decoration: none;

    &:hover {
      background: $stb-surface-3;
    }
  }
}
</style>
