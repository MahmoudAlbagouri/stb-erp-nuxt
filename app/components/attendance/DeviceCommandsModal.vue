<!-- components/attendance/DeviceCommandsModal.vue -->
<!-- أوامر جهاز ZKTeco وحالاتها: في الطابور، أُرسل، نفّذه الجهاز، رفضه، أو لم
     يرد عليه. يتحدّث كل بضع ثوانٍ وهو مفتوح، فيُتابَع إرسال موظف لحظة بلحظة. -->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal modal-lg">
          <div class="modal__header">
            <h3>
              <ListChecks :size="20" class="modal-icon" />
              أوامر الجهاز: {{ device?.alias || device?.serialNumber }}
            </h3>
            <button
              class="btn btn--icon btn--ghost"
              aria-label="إغلاق"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <p v-if="device && !device.handshakeAt" class="commands-hint commands-hint--warn">
            <Info :size="14" />
            الجهاز لم يعرّف نفسه منذ أُضيف، فلا تُعرف صيغة أوامره بعد: يُطلب منه
            ذلك تلقائياً ثم تُرسل أوامره. إن طال الانتظار أعد تشغيل الجهاز.
          </p>
          <p class="commands-hint">
            الأمر الذي لا يرد عليه الجهاز يُعاد بعد دقيقة، ويُترك بعد
            {{ MAX_ATTEMPTS }} محاولات فلا يؤخّر ما بعده.
          </p>

          <div v-if="loading && !commands.length" class="empty-state">
            <div class="spinner spinner--lg" />
          </div>

          <div v-else-if="!commands.length" class="empty-state">
            <div class="empty-state__title">لم يُرسل لهذا الجهاز أي أمر بعد</div>
          </div>

          <div v-else class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الأمر</th>
                  <th>الحالة</th>
                  <th>المحاولات</th>
                  <th>أُضيف</th>
                  <th>آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cmd in commands" :key="cmd.id">
                  <td dir="ltr">{{ cmd.seq }}</td>
                  <td>{{ describe(cmd) }}</td>
                  <td>
                    <span
                      :class="['badge', STATUS[cmd.status].badge]"
                      :title="errorHint(cmd.returnCode)"
                    >
                      {{ STATUS[cmd.status].label }}
                      <template v-if="cmd.status === 'failed'">
                        (<span dir="ltr">{{ cmd.returnCode }}</span>)
                      </template>
                    </span>
                  </td>
                  <td>{{ cmd.attempts }}</td>
                  <td>{{ formatDateTime(cmd.createdAt) }}</td>
                  <td>
                    {{
                      cmd.executedAt || cmd.sentAt
                        ? formatDateTime((cmd.executedAt || cmd.sentAt)!)
                        : "—"
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" :disabled="loading" @click="load">
              <RefreshCw :size="16" />
              تحديث
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { Info, ListChecks, RefreshCw, X } from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useToast } from "@/composables/useToast";
import type {
  BiometricDevice,
  DeviceCommandStatus,
  DeviceCommandView,
} from "@/types";

const props = defineProps<{
  modelValue: boolean;
  device: BiometricDevice | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const store = useAttendanceStore();
const toast = useToast();

/** كما في السيرفر: يُترك الأمر بعدها ("لم يرد الجهاز") */
const MAX_ATTEMPTS = 3;
const REFRESH_MS = 5000;

const STATUS: Record<DeviceCommandStatus, { label: string; badge: string }> = {
  queued: { label: "في الطابور", badge: "badge--inactive" },
  sent: { label: "أُرسل، بانتظار رد الجهاز", badge: "badge--system" },
  done: { label: "نفّذه الجهاز", badge: "badge--active" },
  failed: { label: "رفضه الجهاز", badge: "badge--terminated" },
  no_reply: { label: "لم يرد الجهاز", badge: "badge--terminated" },
  cancelled: { label: "أُلغي", badge: "badge--inactive" },
};

/** رموز الخطأ كما تردها أجهزة ZKTeco */
const ERROR_HINTS: Record<number, string> = {
  [-1]: "الأمر غير مدعوم أو لا بيانات له",
  [-1002]: "صيغة الأمر غير مفهومة للجهاز",
  [-1004]: "غير مدعوم على هذا الموديل",
};

const commands = ref<DeviceCommandView[]>([]);
const loading = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

const describe = (cmd: DeviceCommandView) => {
  if (cmd.kind === "user") {
    return `تسجيل موظف: ${cmd.name || "—"} (${cmd.pin})`;
  }
  if (cmd.kind === "template") return `نسخ بصمة للرقم ${cmd.pin}`;
  if (cmd.kind === "check") return "طلب تعريف الجهاز";
  return "أمر آخر";
};

const errorHint = (code: number | null) =>
  code != null && code < 0 ? ERROR_HINTS[code] ?? `رمز الخطأ ${code}` : "";

const load = async () => {
  if (!props.device) return;
  loading.value = true;
  try {
    commands.value = await store.fetchDeviceCommands(props.device.id);
  } catch (e) {
    toast.error(getErrorMessage(e));
    stop();
  } finally {
    loading.value = false;
  }
};

const stop = () => {
  if (timer) clearInterval(timer);
  timer = undefined;
};

watch(
  () => [props.modelValue, props.device?.id] as const,
  ([open, id]) => {
    stop();
    if (!open || !id) return;
    commands.value = [];
    load();
    timer = setInterval(load, REFRESH_MS);
  },
  { immediate: true },
);

onBeforeUnmount(stop);

const close = () => emit("update:modelValue", false);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.modal-lg {
  max-width: 820px;
  padding: $space-5;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.commands-hint {
  @include flex(row, center, flex-start, $space-2);
  margin: 0 0 $space-3;
  font-size: $font-size-xs;
  color: $stb-text-muted;

  &--warn {
    padding: $space-2 $space-3;
    border-radius: $radius-md;
    background: rgba($stb-warning, 0.08);
    color: $stb-text-secondary;
    svg {
      flex-shrink: 0;
      color: $stb-warning;
    }
  }
}
.table-responsive {
  overflow-x: auto;
  max-height: 60vh;
  @include scrollbar;
}
</style>
