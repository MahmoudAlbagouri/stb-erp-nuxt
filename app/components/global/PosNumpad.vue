<!--
  PosNumpad — لوحة أرقام عائمة لشاشات اللمس: تُسحب من رأسها لأي مكان في
  الشاشة (ويُحفظ مكانها على الجهاز)، وتُفتح وتُقفل من الشريط العلوي أو F3.

  لا تأخذ التركيز: الضغط عليها يكتب في الحقل المركّز عليه (البحث، الكمية،
  المبلغ في نافذة الدفع…) كأنه من لوحة المفاتيح. بلا حقل مركّز تكتب في
  شاشتها، و"إدخال" يرسل الرقم (باركود أو كود صنف).
  "×" يجعل الرقم كمية الصنف التالي: 3 × ثم امسح أو اضغط الصنف = 3 قطع.
-->
<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      ref="panel"
      class="pos-numpad"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
      dir="ltr"
      @pointerdown.prevent
    >
      <div class="pos-numpad__head" title="اسحب لتحريكها" @pointerdown="startDrag">
        <GripHorizontal :size="16" class="pos-numpad__grip" />
        <span class="pos-numpad__display" dir="rtl">
          <span v-if="multiplier" class="pos-numpad__times">× {{ formatNumber(multiplier) }}</span>
          <template v-if="target">{{ targetHint }}</template>
          <strong v-else>{{ buffer || "0" }}</strong>
        </span>
        <button
          type="button"
          class="pos-numpad__close"
          tabindex="-1"
          aria-label="إغلاق لوحة الأرقام"
          @pointerdown.stop.prevent
          @click="emit('update:modelValue', false)"
        >
          <X :size="16" />
        </button>
      </div>

      <div class="pos-numpad__keys">
        <button
          v-for="key in KEYS"
          :key="key.value"
          type="button"
          tabindex="-1"
          class="pos-numpad__key"
          :class="key.tone ? `is-${key.tone}` : ''"
          :title="key.title"
          @pointerdown.prevent="press(key.value)"
        >
          <component :is="key.icon" v-if="key.icon" :size="20" />
          <template v-else>{{ key.label }}</template>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { CornerDownLeft, Delete, GripHorizontal, X } from "lucide-vue-next";

const props = defineProps<{
  modelValue: boolean;
  /** كمية الصنف التالي المعلّقة (تُعرض على اللوحة) */
  multiplier?: number | null;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  /** "×": الرقم كمية للصنف التالي. `input` الحقل الذي كُتب فيه (أو null) */
  multiply: [value: number, input: HTMLInputElement | null];
  /** "إدخال" بلا حقل مركّز: الرقم المكتوب على اللوحة */
  enter: [value: string];
}>();

type Key = {
  value: string;
  label?: string;
  icon?: unknown;
  title?: string;
  tone?: "action" | "danger" | "primary";
};

const KEYS: Key[] = [
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "back", icon: Delete, title: "مسح آخر رقم", tone: "action" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "clear", label: "C", title: "مسح الكل", tone: "danger" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "times", label: "×", title: "كمية الصنف التالي", tone: "action" },
  { value: "0", label: "0" },
  { value: "00", label: "00" },
  { value: ".", label: "." },
  { value: "enter", icon: CornerDownLeft, title: "إدخال", tone: "primary" },
];

const STORAGE_KEY = "stb-pos-numpad";
const WIDTH = 236;
const HEIGHT = 300;
const MARGIN = 8;

const panel = ref<HTMLElement | null>(null);
const buffer = ref("");
const target = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

// ─── المكان: يُسحب لأي مكان ويُحفظ على هذا الجهاز ─────────────────────────────
const pos = reactive({ x: 0, y: 0 });

const clamp = () => {
  const width = panel.value?.offsetWidth ?? WIDTH;
  const height = panel.value?.offsetHeight ?? HEIGHT;
  pos.x = Math.min(Math.max(pos.x, MARGIN), Math.max(window.innerWidth - width - MARGIN, MARGIN));
  pos.y = Math.min(Math.max(pos.y, MARGIN), Math.max(window.innerHeight - height - MARGIN, MARGIN));
};

const loadPosition = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
      x: number;
      y: number;
    } | null;
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      Object.assign(pos, saved);
      return;
    }
  } catch {
    // التخزين غير متاح: المكان الافتراضي
  }
  // أسفل يمين الشاشة (فوق الأصناف في الواجهة العربية)
  pos.x = window.innerWidth - WIDTH - 24;
  pos.y = window.innerHeight - HEIGHT - 24;
};

const savePosition = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: pos.x, y: pos.y }));
  } catch {
    // لا يهم: يعود للمكان الافتراضي عند الفتح التالي
  }
};

let drag: { id: number; dx: number; dy: number } | null = null;

const startDrag = (event: PointerEvent) => {
  event.preventDefault();
  drag = { id: event.pointerId, dx: event.clientX - pos.x, dy: event.clientY - pos.y };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", onDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
};
const onDrag = (event: PointerEvent) => {
  if (!drag || event.pointerId !== drag.id) return;
  pos.x = event.clientX - drag.dx;
  pos.y = event.clientY - drag.dy;
  clamp();
};
const endDrag = () => {
  drag = null;
  window.removeEventListener("pointermove", onDrag);
  window.removeEventListener("pointerup", endDrag);
  window.removeEventListener("pointercancel", endDrag);
  savePosition();
};

// ─── الحقل الذي تكتب فيه ─────────────────────────────────────────────────────
const TEXT_TYPES = new Set(["text", "search", "tel", "number", "password", ""]);

const editable = (element: Element | null) => {
  if (element instanceof HTMLTextAreaElement && !element.readOnly && !element.disabled) {
    return element;
  }
  if (
    element instanceof HTMLInputElement &&
    TEXT_TYPES.has(element.type) &&
    !element.readOnly &&
    !element.disabled
  ) {
    return element;
  }
  return null;
};

const onFocusChange = () => {
  target.value = editable(document.activeElement);
};

const targetHint = computed(() => {
  const input = target.value;
  if (!input) return "";
  return `← ${input.getAttribute("aria-label") || input.placeholder || "الحقل المحدد"}`;
});

/** يضع قيمة في الحقل كأنها كُتبت: v-model والمكوّنات تسمعها كإدخال عادي */
const setValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

/** يكتب مكان المؤشر (أو مكان النص المحدد: الكمية المحددة تُستبدل) */
const insert = (input: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  let start = input.value.length;
  let end = start;
  try {
    start = input.selectionStart ?? start;
    end = input.selectionEnd ?? start;
  } catch {
    // حقول لا تدعم التحديد: الكتابة في آخرها
  }
  setValue(input, input.value.slice(0, start) + text + input.value.slice(end));
  try {
    // المكوّن قد ينظّف القيمة: المؤشر في آخر ما كُتب بحدود القيمة الجديدة
    const caret = Math.min(start + text.length, input.value.length);
    input.setSelectionRange(caret, caret);
  } catch {
    // لا تحديد في هذا النوع
  }
};

const backspace = (input: HTMLInputElement | HTMLTextAreaElement) => {
  let start = input.value.length;
  let end = start;
  try {
    start = input.selectionStart ?? start;
    end = input.selectionEnd ?? start;
  } catch {
    // بلا تحديد: آخر حرف
  }
  if (start === end && start > 0) start -= 1;
  setValue(input, input.value.slice(0, start) + input.value.slice(end));
  try {
    input.setSelectionRange(start, start);
  } catch {
    // لا تحديد في هذا النوع
  }
};

/** إدخال في الحقل: كضغط Enter (بحث، دفع)، وإلا يُرسل نموذجه */
const submit = (input: HTMLInputElement | HTMLTextAreaElement) => {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  if (!event.defaultPrevented && input instanceof HTMLInputElement && input.form) {
    input.form.requestSubmit();
  }
};

const press = (key: string) => {
  const input = editable(document.activeElement);
  target.value = input;

  if (key === "times") {
    const raw = input ? input.value : buffer.value;
    const value = Number(raw.trim());
    if (Number.isFinite(value) && value > 0) emit("multiply", value, input as HTMLInputElement | null);
    if (!input) buffer.value = "";
    return;
  }

  if (input) {
    if (key === "back") backspace(input);
    else if (key === "clear") setValue(input, "");
    else if (key === "enter") submit(input);
    else insert(input, key);
    return;
  }

  if (key === "back") buffer.value = buffer.value.slice(0, -1);
  else if (key === "clear") buffer.value = "";
  else if (key === "enter") {
    if (buffer.value) emit("enter", buffer.value);
    buffer.value = "";
  } else if (key === "." && buffer.value.includes(".")) return;
  else if (buffer.value.length < 32) buffer.value += key;
};

// ─── الفتح والإغلاق ──────────────────────────────────────────────────────────
const onResize = () => clamp();

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    buffer.value = "";
    onFocusChange();
    requestAnimationFrame(clamp);
  },
);

onMounted(() => {
  loadPosition();
  requestAnimationFrame(clamp);
  window.addEventListener("resize", onResize);
  document.addEventListener("focusin", onFocusChange);
  document.addEventListener("focusout", onFocusChange);
});

onBeforeUnmount(() => {
  endDrag();
  window.removeEventListener("resize", onResize);
  document.removeEventListener("focusin", onFocusChange);
  document.removeEventListener("focusout", onFocusChange);
});
</script>

<style lang="scss" scoped>
.pos-numpad {
  position: fixed;
  // فوق النوافذ (يكتب في مبلغ الدفع) وتحت التنبيهات
  z-index: 250;
  width: 236px;
  padding: $space-2;
  background: $stb-surface;
  border: 1px solid $stb-border-light;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  user-select: none;
  touch-action: none;
}
.pos-numpad__head {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
  padding: $space-1 $space-2;
  background: $stb-surface-2;
  border-radius: $radius-md;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}
.pos-numpad__grip {
  flex-shrink: 0;
  color: $stb-text-muted;
}
.pos-numpad__display {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  text-overflow: ellipsis;
  white-space: nowrap;

  strong {
    font-size: $font-size-lg;
    color: $stb-text-primary;
    direction: ltr;
  }
}
.pos-numpad__times {
  margin-inline-end: $space-2;
  padding: 0 $space-2;
  font-weight: 800;
  color: $stb-on-accent;
  background: $stb-accent;
  border-radius: $radius-full;
}
.pos-numpad__close {
  display: inline-flex;
  padding: 2px;
  color: $stb-text-muted;
  background: none;
  border: 0;
  cursor: pointer;

  &:hover {
    color: $stb-danger;
  }
}
.pos-numpad__keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-2;
}
.pos-numpad__key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  font-family: inherit;
  font-size: 20px;
  font-weight: 700;
  color: $stb-text-primary;
  background: $stb-surface-3;
  border: 1px solid $stb-border-light;
  border-bottom-width: 3px;
  border-radius: $radius-md;
  cursor: pointer;
  touch-action: manipulation;

  &:active {
    transform: translateY(1px);
    border-bottom-width: 1px;
  }
  &.is-action {
    color: $stb-accent;
  }
  &.is-danger {
    color: $stb-danger;
  }
  &.is-primary {
    color: $stb-on-accent;
    background: $stb-primary;
    border-color: $stb-primary-dark;
  }
}
</style>
