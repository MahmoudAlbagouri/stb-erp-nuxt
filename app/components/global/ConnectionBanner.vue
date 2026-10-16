<!--
  شريط انقطاع الاتصال في لوحة التحكم (الحالة من useConnection، يحدّثها useApi
  مع كل طلب). ما على الشاشة يبقى، والنماذج المفتوحة تبقى بما فيها — الحفظ
  وحده ينتظر الاتصال. يُفحص السيرفر كل 15 ثانية حتى يعود.
-->
<template>
  <Transition name="fade">
    <div
      v-if="connection.state.value.offline"
      class="connection-banner"
      role="status"
    >
      <WifiOff :size="18" class="connection-banner__icon" />
      <span class="connection-banner__text">
        <strong>لا يوجد اتصال بالسيرفر</strong>
        <span v-if="since" class="connection-banner__since">منذ {{ since }}</span>
        — ما تراه آخر ما حُمِّل، وما تكتبه يبقى في مكانه. الحفظ ينتظر عودة الاتصال.
      </span>
      <button
        class="btn btn--sm connection-banner__retry"
        :disabled="checking"
        @click="retry"
      >
        <RefreshCw :size="14" :class="{ 'is-spinning': checking }" />
        إعادة المحاولة
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RefreshCw, WifiOff } from "lucide-vue-next";
import { PROBE_INTERVAL_MS, useConnection } from "@/composables/useConnection";
import { useToast } from "@/composables/useToast";

const connection = useConnection();
const toast = useToast();
const checking = ref(false);

const since = computed(() => {
  const at = connection.state.value.since;
  return at ? formatDateTime(at) : "";
});

const retry = async () => {
  checking.value = true;
  try {
    await connection.probe();
  } finally {
    checking.value = false;
  }
};

let poller: ReturnType<typeof setInterval> | null = null;
const stopPolling = () => {
  if (poller) clearInterval(poller);
  poller = null;
};

watch(
  () => connection.state.value.offline,
  (offline, wasOffline) => {
    if (!import.meta.client) return;
    stopPolling();
    if (offline) {
      poller = setInterval(() => {
        if (document.visibilityState === "visible") void connection.probe();
      }, PROBE_INTERVAL_MS);
    } else if (wasOffline) {
      toast.success("عاد الاتصال بالسيرفر");
    }
  },
  // انقطع قبل أن يُرسم الشريط (أول طلب في الصفحة): يبدأ الفحص فوراً
  { immediate: true },
);

// المتصفح يعرف بعض الانقطاعات قبل أي طلب (فصل الشبكة)، وعودتها تستحق فحصاً
const onBrowserOffline = () => connection.markOffline();
const onBrowserOnline = () => void connection.probe();

onMounted(() => {
  window.addEventListener("offline", onBrowserOffline);
  window.addEventListener("online", onBrowserOnline);
  if (!navigator.onLine) connection.markOffline();
});

onBeforeUnmount(() => {
  stopPolling();
  window.removeEventListener("offline", onBrowserOffline);
  window.removeEventListener("online", onBrowserOnline);
});
</script>

<style lang="scss" scoped>
.connection-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2 $space-3;
  padding: $space-2 $space-4;
  font-size: $font-size-sm;
  color: $stb-text-primary;
  background: rgba($stb-danger, 0.14);
  border-bottom: 1px solid rgba($stb-danger, 0.45);

  &__icon {
    flex-shrink: 0;
    color: $stb-danger;
  }
  &__text {
    flex: 1;
    min-width: 220px;
  }
  &__since {
    margin-inline-start: $space-1;
    color: $stb-text-secondary;
  }
  &__retry {
    color: $stb-text-primary;
    background: transparent;
    border: 1px solid rgba($stb-danger, 0.6);

    &:hover:not(:disabled) {
      background: rgba($stb-danger, 0.2);
    }
  }
}

.is-spinning {
  animation: connection-spin 0.8s linear infinite;
}

@keyframes connection-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
