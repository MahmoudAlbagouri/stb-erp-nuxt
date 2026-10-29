<!--
  رسالة من الإدارة: لموظفين بعينهم، أو (بصلاحية الإرسال الجماعي) للجميع أو
  فروع أو أقسام. قبل الإرسال يعرض كم سيستلمها ومن لن تصله لأنه بلا حساب دخول.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal compose-modal">
          <div class="modal__header">
            <h3>
              <Send :size="20" class="doc-modal__icon" />
              رسالة للموظفين
            </h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit">
            <!-- المستلمون -->
            <div class="doc-section">
              <div class="doc-section__title">إلى</div>
              <div class="audience-tabs" role="tablist">
                <button
                  v-for="option in audienceOptions"
                  :key="option.kind"
                  type="button"
                  role="tab"
                  class="audience-tab"
                  :class="{ active: form.kind === option.kind }"
                  :aria-selected="form.kind === option.kind"
                  @click="setKind(option.kind)"
                >
                  <component :is="option.icon" :size="15" />
                  {{ option.label }}
                </button>
              </div>

              <!-- موظفون بعينهم -->
              <template v-if="form.kind === 'employees'">
                <div class="picker-search">
                  <Search :size="15" />
                  <input
                    v-model="search"
                    type="search"
                    class="form-input"
                    placeholder="ابحث بالاسم أو الرقم الوظيفي..."
                  />
                </div>
                <div v-if="selectedEmployees.length" class="chips">
                  <span v-for="e in selectedEmployees" :key="e.id" class="chip">
                    {{ e.fullName }}
                    <button type="button" aria-label="إزالة" @click="toggle(e.id)">
                      <X :size="12" />
                    </button>
                  </span>
                </div>
                <div class="picker-list" data-native-scroll>
                  <label v-for="e in employeeMatches" :key="e.id" class="picker-row">
                    <input
                      type="checkbox"
                      :checked="form.ids.includes(e.id)"
                      @change="toggle(e.id)"
                    />
                    <span>{{ e.fullName }}</span>
                    <small>{{ e.employeeCode }}</small>
                  </label>
                  <p v-if="!employeeMatches.length" class="picker-empty">لا نتائج</p>
                </div>
              </template>

              <!-- فروع / أقسام -->
              <div v-else-if="form.kind !== 'all'" class="picker-list picker-list--grid">
                <label v-for="o in groupOptions" :key="o.id" class="picker-row">
                  <input
                    type="checkbox"
                    :checked="form.ids.includes(o.id)"
                    @change="toggle(o.id)"
                  />
                  <span>{{ o.name }}</span>
                </label>
                <p v-if="!groupOptions.length" class="picker-empty">لا توجد خيارات</p>
              </div>

              <p v-else class="doc-hint">
                تصل لكل مستخدمي الشركة (ولموظفي فروعك فقط إن كنت مقيَّداً بفروع).
              </p>

              <div class="reach" :class="{ 'is-empty': reach && !reach.recipients }">
                <span v-if="reachLoading" class="spinner spinner--sm" />
                <template v-else-if="reach">
                  <Users :size="15" />
                  ستصل إلى <strong>{{ reach.recipients }}</strong>
                  {{ reach.recipients === 1 ? "مستخدم" : "مستخدماً" }}
                </template>
                <span v-else class="text-muted">اختر من سيستلم الرسالة</span>
              </div>
              <div v-if="reach?.withoutAccount.count" class="no-account">
                <AlertTriangle :size="15" />
                <span>
                  {{ reach.withoutAccount.count }} موظف بلا حساب دخول لن تصلهم:
                  {{ reach.withoutAccount.sample.map((e) => e.fullName).join("، ")
                  }}{{ reach.withoutAccount.count > reach.withoutAccount.sample.length ? "…" : "" }}
                </span>
              </div>
            </div>

            <!-- الرسالة -->
            <div class="form-group">
              <label>العنوان *</label>
              <input
                v-model="form.title"
                class="form-input"
                maxlength="150"
                required
                placeholder="مثلاً: اجتماع الموظفين يوم الأحد"
              />
            </div>
            <div class="form-group">
              <label>نص الرسالة *</label>
              <textarea
                v-model="form.body"
                class="form-input"
                rows="5"
                maxlength="4000"
                required
              />
              <small class="doc-hint">{{ form.body.length }} / 4000</small>
            </div>

            <div class="form-group">
              <label>الأهمية</label>
              <div class="severity-options">
                <label
                  v-for="(label, key) in MESSAGE_SEVERITY_LABEL"
                  :key="key"
                  class="severity-option"
                  :class="[`sev-${key}`, { active: form.severity === key }]"
                >
                  <input v-model="form.severity" type="radio" :value="key" />
                  {{ label }}
                </label>
              </div>
            </div>

            <label class="ack-toggle">
              <input v-model="form.requiresAck" type="checkbox" />
              <span>
                <strong>يتطلب تأكيد الاطلاع</strong>
                <small>يضغط كل مستلم «تم الاطلاع»، وتعرف من أكّد ومن لم يؤكد</small>
              </span>
            </label>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">إلغاء</button>
              <button
                type="submit"
                class="btn btn--primary"
                :disabled="sending || !canSubmit"
              >
                <Send :size="16" />
                {{ sending ? "جارٍ الإرسال..." : "إرسال" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  AlertTriangle,
  Building2,
  Layers,
  Search,
  Send,
  UserRound,
  Users,
  X,
} from "lucide-vue-next";
import { useNotificationsStore } from "@/stores/notifications";
import { useEmployeesStore } from "@/stores/employees";
import { useBranchesStore } from "@/stores/branches";
import { useDepartmentsStore } from "@/stores/departments";
import { useToast } from "@/composables/useToast";
import { useAccess } from "@/composables/useAccess";
import { MESSAGE_SEVERITY_LABEL } from "@/utils/notifications";
import type {
  MessageAudienceKind,
  MessageReach,
  MessageSeverity,
} from "@/types/notifications";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  sent: [];
}>();

const store = useNotificationsStore();
const employees = useEmployeesStore();
const branches = useBranchesStore();
const departments = useDepartmentsStore();
const toast = useToast();
const { can, P } = useAccess();

/** أقصى ما تعرضه قائمة الموظفين (البحث يضيّقها) */
const LISTED = 60;

const form = reactive({
  kind: "employees" as MessageAudienceKind,
  ids: [] as string[],
  title: "",
  body: "",
  severity: "info" as MessageSeverity,
  requiresAck: false,
});
const search = ref("");
const sending = ref(false);
const reach = ref<MessageReach | null>(null);
const reachLoading = ref(false);

const canBroadcast = computed(() => can(P.NOTIFICATION_BROADCAST));

const audienceOptions = computed(() => [
  { kind: "employees" as const, label: "موظفون محددون", icon: UserRound },
  ...(canBroadcast.value
    ? [
        { kind: "branches" as const, label: "فروع", icon: Building2 },
        { kind: "departments" as const, label: "أقسام", icon: Layers },
        { kind: "all" as const, label: "الجميع", icon: Users },
      ]
    : []),
]);

const activeEmployees = computed(() =>
  employees.employees.filter((e) => e.status === "active"),
);
const employeeMatches = computed(() => {
  const term = search.value.trim().toLowerCase();
  const list = term
    ? activeEmployees.value.filter(
        (e) =>
          e.fullName.toLowerCase().includes(term) ||
          e.employeeCode.toLowerCase().includes(term),
      )
    : activeEmployees.value;
  return list.slice(0, LISTED);
});
const selectedEmployees = computed(() =>
  employees.employees.filter((e) => form.ids.includes(e.id)),
);
const groupOptions = computed(() =>
  form.kind === "branches"
    ? branches.activeOptions.map((b) => ({ id: b.id, name: b.name }))
    : departments.departments.map((d) => ({ id: d.id, name: d.name })),
);

const audienceReady = computed(() => form.kind === "all" || form.ids.length > 0);
const canSubmit = computed(
  () =>
    audienceReady.value &&
    !!form.title.trim() &&
    !!form.body.trim() &&
    (reach.value?.recipients ?? 1) > 0,
);

const setKind = (kind: MessageAudienceKind) => {
  if (form.kind === kind) return;
  form.kind = kind;
  form.ids = [];
};

const toggle = (id: string) => {
  form.ids = form.ids.includes(id)
    ? form.ids.filter((x) => x !== id)
    : [...form.ids, id];
};

// معاينة الوصول بعد توقف الاختيار لحظة
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let previewId = 0;
watch(
  () => [form.kind, form.ids.join(","), props.modelValue] as const,
  () => {
    if (previewTimer) clearTimeout(previewTimer);
    reach.value = null;
    if (!props.modelValue || !audienceReady.value) return;
    previewTimer = setTimeout(async () => {
      const current = ++previewId;
      reachLoading.value = true;
      try {
        const result = await store.previewMessage({
          kind: form.kind,
          ids: form.kind === "all" ? undefined : form.ids,
        });
        if (current === previewId) reach.value = result;
      } catch (e) {
        if (current === previewId) toast.error(getErrorMessage(e));
      } finally {
        if (current === previewId) reachLoading.value = false;
      }
    }, 400);
  },
);

// القوائم تُحمَّل عند الفتح أول مرة
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    if (!employees.employees.length) void employees.fetchAll();
    if (canBroadcast.value) {
      void branches.fetchOptions().catch(() => undefined);
      if (!departments.departments.length) void departments.fetchAll();
    }
  },
  { immediate: true },
);

const resetForm = () => {
  Object.assign(form, {
    kind: "employees",
    ids: [],
    title: "",
    body: "",
    severity: "info",
    requiresAck: false,
  });
  search.value = "";
  reach.value = null;
};

const close = () => emit("update:modelValue", false);

const submit = async () => {
  if (!canSubmit.value) return;
  sending.value = true;
  try {
    const result = await store.sendMessage({
      title: form.title.trim(),
      body: form.body.trim(),
      severity: form.severity,
      requiresAck: form.requiresAck,
      audience: {
        kind: form.kind,
        ids: form.kind === "all" ? undefined : form.ids,
      },
    });
    toast.success(`أُرسلت الرسالة إلى ${result.recipients} مستخدم`);
    resetForm();
    emit("sent");
    close();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر إرسال الرسالة"));
  } finally {
    sending.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

$severities: (
  info: $stb-info,
  warning: $stb-warning,
  danger: $stb-danger,
);

.compose-modal {
  max-width: 620px;
}

.audience-tabs {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;
}
.audience-tab {
  @include flex(row, center, center, $space-2);
  padding: $space-2 $space-3;
  border: 1px solid $stb-border;
  border-radius: $radius-full;
  background: $stb-surface;
  color: $stb-text-secondary;
  font: inherit;
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;
  &.active {
    border-color: $stb-primary;
    background: rgba($stb-primary, 0.12);
    color: $stb-text-primary;
    font-weight: 600;
  }
}

.picker-search {
  position: relative;
  svg {
    position: absolute;
    inset-inline-start: $space-3;
    top: 50%;
    transform: translateY(-50%);
    color: $stb-text-muted;
  }
  input {
    padding-inline-start: $space-8;
  }
}

.chips {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;
}
.chip {
  @include flex(row, center, center, 4px);
  padding: 2px $space-2 2px $space-3;
  background: rgba($stb-accent, 0.12);
  color: $stb-text-primary;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  button {
    @include flex(row, center, center);
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 2px;
  }
}

.picker-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  background: $stb-surface;
  &--grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    max-height: 200px;
  }
}
.picker-row {
  @include flex(row, center, flex-start, $space-2);
  padding: $space-2 $space-3;
  font-size: $font-size-sm;
  cursor: pointer;
  &:hover {
    background: rgba($stb-primary, 0.05);
  }
  span {
    flex: 1;
  }
  small {
    color: $stb-text-muted;
  }
}
.picker-empty {
  padding: $space-4;
  text-align: center;
  color: $stb-text-muted;
  font-size: $font-size-sm;
  margin: 0;
}

.reach {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  min-height: 22px;
  &.is-empty {
    color: $stb-danger;
  }
}
.no-account {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  background: rgba($stb-warning, 0.1);
  color: $stb-warning;
  font-size: $font-size-xs;
  line-height: 1.6;
  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
}

.severity-options {
  @include flex(row, center, flex-start, $space-2);
  flex-wrap: wrap;
}
.severity-option {
  padding: $space-2 $space-4;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  cursor: pointer;
  input {
    display: none;
  }
}
@each $name, $color in $severities {
  .severity-option.sev-#{$name}.active {
    border-color: $color;
    background: rgba($color, 0.12);
    color: $color;
    font-weight: 600;
  }
}

.ack-toggle {
  @include flex(row, flex-start, flex-start, $space-3);
  padding: $space-3 $space-4;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  cursor: pointer;
  input {
    margin-top: 4px;
  }
  span {
    @include flex(column, flex-start, flex-start, 2px);
  }
  small {
    color: $stb-text-muted;
    font-size: $font-size-xs;
  }
}
</style>
