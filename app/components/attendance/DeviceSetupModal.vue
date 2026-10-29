<!-- components/attendance/DeviceSetupModal.vue -->
<!-- طريقة توصيل جهاز البصمة بالسيرفر: ما يُكتب في إعداداته حسب نوعه، ومفتاحه
     (Hikvision / API) حين يكون متاحاً — يُعرض مرة واحدة عند توليده. -->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal modal-lg">
          <div class="modal__header">
            <h3>
              <PlugZap :size="20" class="modal-icon" />
              توصيل الجهاز: {{ device?.alias || device?.serialNumber }}
            </h3>
            <button
              class="btn btn--icon btn--ghost"
              aria-label="إغلاق"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <div class="setup-body">
            <div v-if="loading" class="empty-state">
              <div class="spinner spinner--lg" />
            </div>

            <template v-else-if="setup">
              <!-- المفتاح: يظهر مرة واحدة -->
              <div v-if="key" class="key-box">
                <div class="key-box__title">
                  <KeyRound :size="16" />
                  مفتاح الجهاز — انسخه الآن، لن يظهر مرة أخرى
                </div>
                <div class="copy-row">
                  <code dir="ltr">{{ key }}</code>
                  <button class="btn btn--sm btn--ghost" @click="copy(key)">
                    <Copy :size="14" />
                  </button>
                </div>
              </div>

              <!-- ZKTeco -->
              <template v-if="setup.zk">
                <ol class="steps">
                  <li>
                    من قائمة الجهاز: <b>Comm.</b> (الاتصالات) ←
                    <b>Cloud Server Setting</b> (في بعض الموديلات <b>ADMS</b>).
                  </li>
                  <li>اكتب القيم التالية واحفظ:</li>
                </ol>
                <table class="setup-table">
                  <tbody>
                    <tr>
                      <th>Server Address</th>
                      <td>
                        <div class="copy-row">
                          <code dir="ltr">{{ setup.zk.serverAddress }}</code>
                          <button
                            class="btn btn--sm btn--ghost"
                            @click="copy(setup.zk.serverAddress)"
                          >
                            <Copy :size="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th>Server Port</th>
                      <td><code dir="ltr">{{ setup.zk.serverPort }}</code></td>
                    </tr>
                    <tr>
                      <th>Enable Domain Name</th>
                      <td>{{ isIp(setup.zk.serverAddress) ? "Off" : "On" }}</td>
                    </tr>
                    <tr>
                      <th>HTTPS</th>
                      <td>{{ setup.zk.https ? "On" : "Off" }}</td>
                    </tr>
                    <tr>
                      <th>Enable Proxy Server</th>
                      <td>Off</td>
                    </tr>
                  </tbody>
                </table>
                <ol class="steps" start="3">
                  <li>
                    تأكد أن الرقم التسلسلي في <b>System Info</b> هو
                    <code dir="ltr">{{ setup.serialNumber }}</code> كما سُجّل هنا.
                  </li>
                  <li>
                    أعد تشغيل الجهاز: تظهر حالته "متصل" خلال دقيقة، وتصل كل بصمة
                    لحظة تسجيلها.
                  </li>
                </ol>
              </template>

              <!-- Hikvision -->
              <template v-else-if="setup.hikvision">
                <ol class="steps">
                  <li>
                    افتح صفحة الجهاز من المتصفح (أو iVMS-4200) ←
                    <b>Configuration</b> ← <b>Network</b> ←
                    <b>Advanced</b> ← <b>HTTP Listening</b>.
                  </li>
                  <li>اكتب القيم التالية وفعّل إرسال أحداث التحكم بالدخول:</li>
                </ol>
                <table class="setup-table">
                  <tbody>
                    <tr>
                      <th>Protocol</th>
                      <td>{{ setup.hikvision.https ? "HTTPS" : "HTTP" }}</td>
                    </tr>
                    <tr>
                      <th>IP / Domain</th>
                      <td>
                        <div class="copy-row">
                          <code dir="ltr">{{ setup.hikvision.host }}</code>
                          <button
                            class="btn btn--sm btn--ghost"
                            @click="copy(setup.hikvision.host)"
                          >
                            <Copy :size="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th>Port</th>
                      <td><code dir="ltr">{{ setup.hikvision.port }}</code></td>
                    </tr>
                    <tr>
                      <th>URL</th>
                      <td>
                        <div class="copy-row">
                          <code dir="ltr" class="wrap">{{ hikvisionPath }}</code>
                          <button
                            v-if="key"
                            class="btn btn--sm btn--ghost"
                            @click="copy(hikvisionPath)"
                          >
                            <Copy :size="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <ol class="steps" start="3">
                  <li>
                    رقم الموظف في الجهاز (<b>Employee No.</b>) هو كوده في النظام،
                    أو رقم البصمة المحدد في ملفه.
                  </li>
                </ol>
              </template>

              <!-- API -->
              <template v-else-if="setup.api">
                <p class="setup-text">
                  لأي جهاز أو برنامج وسيط يقرأ البصمات من جهازه ويرسلها للسيرفر:
                </p>
                <table class="setup-table">
                  <tbody>
                    <tr>
                      <th>الرابط (POST)</th>
                      <td>
                        <div class="copy-row">
                          <code dir="ltr" class="wrap">{{ setup.api.url }}</code>
                          <button
                            class="btn btn--sm btn--ghost"
                            @click="copy(setup.api.url)"
                          >
                            <Copy :size="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th>الترويسات</th>
                      <td>
                        <div class="stack">
                          <code dir="ltr" class="wrap">{{ setup.api.deviceIdHeader }}</code>
                          <code dir="ltr" class="wrap">{{
                            key ? `X-Device-Key: ${key}` : setup.api.deviceKeyHeader
                          }}</code>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <pre dir="ltr" class="sample">{{ apiSample }}</pre>
                <p class="setup-hint">
                  حتى 1000 بصمة في الطلب. الوقت بمنطقته، أو بلا منطقة فيُقرأ بتوقيت
                  الجهاز. إعادة إرسال نفس البصمة لا تكررها.
                </p>
              </template>

              <div v-if="needsKey" class="regen">
                <p>
                  المفتاح يظهر مرة واحدة عند إضافة الجهاز. إن ضاع، ولّد مفتاحاً
                  جديداً — القديم يتوقف فوراً وتحتاج كتابة الجديد في الجهاز.
                </p>
                <button
                  v-can="'update_biometric_device'"
                  class="btn btn--sm btn--outline"
                  :disabled="regenerating"
                  @click="regenerate"
                >
                  <span v-if="regenerating" class="spinner spinner--sm" />
                  <RefreshCw v-else :size="14" />
                  توليد مفتاح جديد
                </button>
              </div>

              <div class="info-note">
                <ShieldCheck :size="15" />
                <span>
                  للأمان: اقفل الجهاز على عنوان IP مكانه من "تعديل الجهاز"، فلا
                  يُقبل اتصال باسمه من أي مكان آخر.
                </span>
              </div>
            </template>
          </div>

          <div class="modal__footer">
            <button class="btn btn--primary" @click="close">تم</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Copy,
  KeyRound,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useToast } from "@/composables/useToast";
import type { BiometricDevice, DeviceSetup } from "@/types";

const props = defineProps<{
  modelValue: boolean;
  device: BiometricDevice | null;
  /** المفتاح إن كان معروفاً الآن (بعد الإنشاء مباشرة) */
  pushKey?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const store = useAttendanceStore();
const toast = useToast();

const setup = ref<DeviceSetup | null>(null);
const loading = ref(false);
const regenerating = ref(false);
const freshKey = ref<string | undefined>();

const key = computed(() => freshKey.value ?? props.pushKey);
const needsKey = computed(
  () => !!setup.value && setup.value.protocol !== "zk_adms" && !key.value,
);
const hikvisionPath = computed(() => {
  const path = setup.value?.hikvision?.urlPath ?? "";
  return key.value ? path.replace("<المفتاح>", key.value) : path;
});
const apiSample = computed(() =>
  JSON.stringify(
    {
      punches: [
        { pin: "1001", time: "2026-01-12T08:01:00+03:00", type: "check_in" },
        { pin: "1001", time: "2026-01-12 17:05:00" },
      ],
    },
    null,
    2,
  ),
);

const isIp = (host: string) => /^[\d.]+$|:/.test(host);

watch(
  () => [props.modelValue, props.device?.id] as const,
  async ([open, id]) => {
    if (!open || !id) return;
    freshKey.value = undefined;
    loading.value = true;
    try {
      setup.value = await store.fetchDeviceSetup(id);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  } catch {
    toast.error("تعذّر النسخ — انسخه يدوياً");
  }
};

const regenerate = async () => {
  if (!props.device) return;
  if (!confirm("المفتاح الحالي سيتوقف فوراً. هل تريد توليد مفتاح جديد؟")) return;
  regenerating.value = true;
  try {
    freshKey.value = (await store.regenerateKey(props.device.id)).pushKey;
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    regenerating.value = false;
  }
};

const close = () => emit("update:modelValue", false);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.modal-lg {
  max-width: 680px;
  padding: $space-5;
}
.modal-icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.setup-body {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
.steps {
  margin: 0;
  padding-inline-start: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  line-height: 1.7;
}
.setup-text,
.setup-hint {
  margin: 0;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
}
.setup-hint {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}
.setup-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;

  th,
  td {
    padding: $space-2 $space-3;
    border-bottom: 1px solid $stb-border;
    text-align: start;
    vertical-align: middle;
  }
  th {
    width: 38%;
    color: $stb-text-secondary;
    font-weight: 600;
    direction: ltr;
    text-align: end;
  }
}
.stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $space-1;
}
code {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: $font-size-sm;
  color: $stb-text-primary;
  background: $stb-surface-3;
  padding: 2px 8px;
  border-radius: $radius-sm;
}
.wrap {
  word-break: break-all;
  white-space: normal;
}
.copy-row {
  @include flex(row, center, space-between, $space-2);
}
.sample {
  margin: 0;
  padding: $space-3;
  background: $stb-surface-3;
  border-radius: $radius-md;
  font-size: $font-size-xs;
  overflow-x: auto;
}
.key-box {
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  border: 1px solid rgba($stb-warning, 0.4);
  background: rgba($stb-warning, 0.08);
  display: flex;
  flex-direction: column;
  gap: $space-2;

  &__title {
    @include flex(row, center, flex-start, $space-2);
    font-weight: 700;
    font-size: $font-size-sm;
    color: $stb-warning;
  }
  code {
    word-break: break-all;
  }
}
.regen {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $space-2;
  p {
    margin: 0;
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }
}
.info-note {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3 $space-4;
  background: rgba($stb-accent, 0.06);
  border: 1px solid rgba($stb-accent, 0.2);
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  svg {
    flex-shrink: 0;
    color: $stb-accent;
    margin-top: 1px;
  }
}
</style>
