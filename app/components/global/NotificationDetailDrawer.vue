<!--
  درج تفاصيل الإشعار (مركّب مرة في التخطيط، تفتحه store.openItem /
  openAdminRow): النص كاملاً، التفاصيل المنظمة، الموعد محسوباً الآن، تأكيد
  الاطلاع، الانتقال للصفحة — وللمدير: من استلم ومن قرأ ومن أكّد.
-->
<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="target" class="nd-overlay" @click.self="store.closeDetail()">
        <aside
          class="nd-drawer"
          role="dialog"
          aria-modal="true"
          :aria-label="target.item.title"
        >
          <header class="nd-head">
            <div class="nd-icon" :class="`sev-${target.item.severity}`">
              <component :is="icon" :size="22" />
            </div>
            <div class="nd-head__meta">
              <span class="nd-type">{{ typeLabel }}</span>
              <span v-if="groupLabel !== typeLabel" class="nd-group">{{ groupLabel }}</span>
            </div>
            <button
              class="btn btn--icon btn--ghost"
              aria-label="إغلاق"
              @click="store.closeDetail()"
            >
              <X :size="20" />
            </button>
          </header>

          <div class="nd-body">
            <h3 class="nd-title">{{ target.item.title }}</h3>

            <div class="nd-chips">
              <span class="nd-chip" :class="`sev-${target.item.severity}`">
                {{ SEVERITY_LABEL[target.item.severity] }}
              </span>
              <span v-if="due" class="nd-chip nd-chip--due">
                <Clock :size="12" /> {{ due }}
              </span>
              <span class="nd-chip nd-chip--muted" :title="formatDateTime(target.item.createdAt)">
                {{ timeAgo(target.item.createdAt) }} · {{ formatDateTime(target.item.createdAt) }}
              </span>
            </div>

            <p v-if="target.item.sender" class="nd-sender">
              <UserRound :size="14" /> من: <strong>{{ target.item.sender.name }}</strong>
            </p>

            <p class="nd-text">{{ target.item.body }}</p>

            <dl v-if="target.item.details.length" class="nd-details">
              <template v-for="(row, i) in target.item.details" :key="i">
                <dt>{{ row.label }}</dt>
                <dd :class="{ 'is-money': row.format === 'money' }">
                  {{ detailValue(row) }}
                </dd>
              </template>
            </dl>

            <!-- تأكيد الاطلاع -->
            <template v-if="target.kind === 'inbox' && target.item.requiresAck">
              <div v-if="target.item.acknowledgedAt" class="nd-ack nd-ack--done">
                <ShieldCheck :size="16" />
                أكّدت الاطلاع {{ formatDateTime(target.item.acknowledgedAt) }}
              </div>
              <button
                v-else
                class="btn btn--primary btn--full nd-ack-btn"
                :disabled="busy"
                @click="acknowledge"
              >
                <ShieldCheck :size="18" /> تم الاطلاع
              </button>
            </template>

            <!-- لوحة المدير: من استلم ومن قرأ -->
            <section v-if="target.kind === 'admin'" class="nd-recipients">
              <div class="nd-reach">
                <div><strong>{{ target.item.recipients }}</strong><span>استلموه</span></div>
                <div><strong>{{ target.item.read }}</strong><span>قرأوه</span></div>
                <div v-if="target.item.requiresAck">
                  <strong>{{ target.item.acknowledged }}</strong><span>أكّدوا</span>
                </div>
              </div>
              <div v-if="loadingRecipients" class="nd-loading"><span class="spinner spinner--sm" /></div>
              <ul v-else class="nd-list">
                <li v-for="r in recipients" :key="r.userId">
                  <span class="nd-list__name">
                    {{ r.name }}
                    <small v-if="r.employeeCode">({{ r.employeeCode }})</small>
                  </span>
                  <span v-if="r.acknowledgedAt" class="nd-state nd-state--ack" :title="formatDateTime(r.acknowledgedAt)">
                    <ShieldCheck :size="13" /> أكّد
                  </span>
                  <span v-else-if="r.readAt" class="nd-state nd-state--read" :title="formatDateTime(r.readAt)">
                    <CheckCheck :size="13" /> قرأ
                  </span>
                  <span v-else class="nd-state">لم يقرأ</span>
                </li>
              </ul>
            </section>
          </div>

          <footer class="nd-foot">
            <NuxtLink
              v-if="target.item.link"
              :to="target.item.link"
              class="btn btn--primary"
              @click="store.closeDetail()"
            >
              <ExternalLink :size="16" /> فتح الصفحة
            </NuxtLink>
            <button
              v-if="target.kind === 'inbox' && can(P.NOTIFICATION_DELETE)"
              class="btn btn--ghost"
              :disabled="busy"
              @click="hide"
            >
              <EyeOff :size="16" /> إخفاء
            </button>
            <button
              v-if="target.kind === 'admin' && canRemove"
              class="btn btn--ghost text-danger"
              :disabled="busy"
              @click="remove"
            >
              <Trash2 :size="16" /> حذف من عند الجميع
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  CheckCheck,
  Clock,
  ExternalLink,
  EyeOff,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-vue-next";
import { useNotificationsStore } from "@/stores/notifications";
import { useToast } from "@/composables/useToast";
import { useAccess } from "@/composables/useAccess";
import type { NotificationRecipientRow } from "@/types/notifications";
import {
  detailValue,
  dueText,
  notificationIcon,
  SEVERITY_LABEL,
  timeAgo,
} from "@/utils/notifications";
import { formatDateTime } from "@/utils/format";

const store = useNotificationsStore();
const toast = useToast();
const { can, P } = useAccess();

const target = computed(() => store.detail);
const busy = ref(false);
const recipients = ref<NotificationRecipientRow[]>([]);
const loadingRecipients = ref(false);

const typeDef = computed(() =>
  target.value ? store.typeOf(target.value.item.type) : undefined,
);
const typeLabel = computed(() => typeDef.value?.label ?? "إشعار");
const groupLabel = computed(() =>
  target.value ? store.groupLabel(target.value.item.group) : "",
);
const icon = computed(() => notificationIcon(typeDef.value?.icon));
const due = computed(() =>
  target.value?.kind === "inbox" ? dueText(target.value.item.data) : null,
);
const canRemove = computed(
  () => can(P.NOTIFICATION_VIEW_ALL) && can(P.NOTIFICATION_DELETE),
);

// المستلمون: الرسالة من مسار الرسائل (يكفي أن يكون مرسلها)، وغيرها من لوحة المدير
watch(
  () => (store.detail?.kind === "admin" ? store.detail.item : null),
  async (row) => {
    recipients.value = [];
    if (!row) return;
    loadingRecipients.value = true;
    try {
      recipients.value =
        row.type === "manager_message"
          ? await store.messageRecipients(row.id)
          : await store.adminRecipients(row.id);
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر تحميل المستلمين"));
    } finally {
      loadingRecipients.value = false;
    }
  },
);

const run = async (action: () => Promise<unknown>, done?: string) => {
  busy.value = true;
  try {
    await action();
    if (done) toast.success(done);
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    busy.value = false;
  }
};

const acknowledge = () =>
  run(() => store.acknowledge(target.value!.item.id), "شكراً — سُجّل اطلاعك");
const hide = () => run(() => store.hide(target.value!.item.id), "أُخفي الإشعار");
const remove = () => {
  if (!confirm("حذف هذا الإشعار من عند كل مستلميه؟")) return;
  return run(() => store.adminRemove(target.value!.item.id), "حُذف الإشعار");
};

const onKey = (event: KeyboardEvent) => {
  if (event.key === "Escape" && store.detail) store.closeDetail();
};
onMounted(() => {
  window.addEventListener("keydown", onKey);
  void store.fetchCatalog().catch(() => undefined);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

$severities: (
  info: $stb-info,
  success: $stb-success,
  warning: $stb-warning,
  danger: $stb-danger,
);

.nd-overlay {
  position: fixed;
  inset: 0;
  background: $stb-scrim;
  backdrop-filter: blur(3px);
  z-index: $z-modal;
}

.nd-drawer {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  width: min(460px, 100%);
  background: $stb-surface-2;
  border-inline-start: 1px solid $stb-border;
  box-shadow: $shadow-lg;
  display: flex;
  flex-direction: column;
}

.nd-head {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-4 $space-5;
  border-bottom: 1px solid $stb-border;
  &__meta {
    flex: 1;
    min-width: 0;
    @include flex(column, flex-start, center, 2px);
  }
}

.nd-icon {
  width: 44px;
  height: 44px;
  border-radius: $radius-lg;
  @include flex(row, center, center);
  flex-shrink: 0;
}

@each $name, $color in $severities {
  .sev-#{$name} {
    background: rgba($color, 0.12);
    color: $color;
  }
}

.nd-type {
  font-weight: 700;
  font-size: $font-size-sm;
  color: $stb-text-primary;
}
.nd-group {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.nd-body {
  flex: 1;
  overflow-y: auto;
  padding: $space-5;
  @include flex(column, stretch, flex-start, $space-4);
}

.nd-title {
  font-size: $font-size-lg;
  font-weight: 700;
  line-height: 1.5;
  margin: 0;
}

.nd-chips {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;
}
.nd-chip {
  @include flex(row, center, center, 4px);
  padding: 2px $space-3;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 600;
  &--due {
    background: rgba($stb-warning, 0.12);
    color: $stb-warning;
  }
  &--muted {
    background: $stb-surface-3;
    color: $stb-text-secondary;
    font-weight: 400;
  }
}

.nd-sender {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  margin: 0;
}

.nd-text {
  font-size: $font-size-base;
  line-height: 1.8;
  color: $stb-text-primary;
  white-space: pre-wrap;
  margin: 0;
}

.nd-details {
  display: grid;
  grid-template-columns: minmax(110px, auto) 1fr;
  gap: $space-2 $space-4;
  padding: $space-4;
  margin: 0;
  background: rgba($stb-surface, 0.6);
  border: 1px solid $stb-border;
  border-radius: $radius-lg;
  dt {
    font-size: $font-size-sm;
    color: $stb-text-muted;
  }
  dd {
    margin: 0;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-primary;
    word-break: break-word;
    &.is-money {
      direction: ltr;
      text-align: end;
    }
  }
}

.nd-ack {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  &--done {
    background: rgba($stb-success, 0.1);
    color: $stb-success;
  }
}

.nd-recipients {
  @include flex(column, stretch, flex-start, $space-3);
}
.nd-reach {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: $space-2;
  > div {
    @include flex(column, center, center, 2px);
    padding: $space-3;
    background: $stb-surface-3;
    border-radius: $radius-md;
  }
  strong {
    font-size: $font-size-xl;
  }
  span {
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
}
.nd-list {
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    @include flex(row, center, space-between, $space-3);
    padding: $space-2 0;
    font-size: $font-size-sm;
    & + li {
      border-top: 1px solid rgba($stb-border, 0.5);
    }
  }
  &__name small {
    color: $stb-text-muted;
  }
}
.nd-state {
  @include flex(row, center, center, 4px);
  font-size: $font-size-xs;
  color: $stb-text-muted;
  &--read {
    color: $stb-info;
  }
  &--ack {
    color: $stb-success;
  }
}
.nd-loading {
  @include flex(row, center, center);
  padding: $space-4;
}

.nd-foot {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;
  padding: $space-4 $space-5;
  border-top: 1px solid $stb-border;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
  .nd-drawer {
    transition: transform 0.25s ease;
  }
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  .nd-drawer {
    transform: translateX(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active,
  .drawer-leave-active,
  .drawer-enter-active .nd-drawer,
  .drawer-leave-active .nd-drawer {
    transition: none;
  }
}
</style>
