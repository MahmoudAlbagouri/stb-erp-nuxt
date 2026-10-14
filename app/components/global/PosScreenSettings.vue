<!--
  PosScreenSettings — إعدادات هذه الشاشة (العتاد الموصول بها والتثبيت كتطبيق).
  تخص الشاشة نفسها لا جهاز الكاشير في السيرفر: تبقى حتى لو تغيّر الجهاز.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><Settings :size="20" class="doc-modal__icon" /> إعدادات الشاشة</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="doc-form">
            <!-- ══ درج النقود ══ -->
            <h4 class="pos-settings__title"><Inbox :size="16" /> درج النقود</h4>
            <p class="doc-hint">
              الدرج يُوصَّل بطابعة الإيصالات ويفتحه أمر تُرسله الطابعة. يُفتح
              تلقائياً مع كل بيع نقدي وكل ردّ مبلغ نقداً.
            </p>

            <div class="form-group">
              <label>طريقة الفتح</label>
              <select v-model="form.mode" class="form-select" @change="save">
                <option value="off">لا يُفتح من الشاشة</option>
                <option value="serial" :disabled="!supported">
                  عبر منفذ الطابعة (Serial / USB-COM)
                </option>
              </select>
            </div>

            <p v-if="!supported" class="doc-hint">
              هذا المتصفح لا يسمح بالتحكم بالمنافذ. استخدم Chrome أو Edge على
              الكمبيوتر، أو فعّل خيار «فتح الدرج عند الطباعة» في إعدادات تعريف
              الطابعة — يعمل مع طباعة الإيصال بلا أي إعداد هنا.
            </p>

            <template v-if="form.mode === 'serial'">
              <div class="doc-grid">
                <div class="form-group">
                  <label>سرعة المنفذ (Baud)</label>
                  <select v-model.number="form.baudRate" class="form-select" @change="save">
                    <option v-for="rate in BAUD_RATES" :key="rate" :value="rate">
                      {{ rate }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>مخرج الدرج</label>
                  <select v-model.number="form.pin" class="form-select" @change="save">
                    <option :value="0">الأول (الشائع)</option>
                    <option :value="1">الثاني</option>
                  </select>
                </div>
              </div>

              <div class="doc-actions">
                <button
                  type="button"
                  class="btn btn--sm btn--ghost"
                  :disabled="busy"
                  @click="pair"
                >
                  <Cable :size="14" />
                  {{ paired ? "تغيير منفذ الطابعة" : "اختيار منفذ الطابعة" }}
                </button>
                <button
                  type="button"
                  class="btn btn--sm btn--primary"
                  :class="{ 'btn--loading': busy }"
                  :disabled="busy || !paired"
                  @click="test"
                >
                  تجربة فتح الدرج
                </button>
              </div>
              <p class="doc-hint">
                {{
                  paired
                    ? "المنفذ مختار. لو لم يُفتح الدرج في التجربة جرّب سرعة أخرى أو المخرج الثاني."
                    : "اختر منفذ الطابعة مرة واحدة والمتصفح يتذكره."
                }}
              </p>
            </template>

            <!-- ══ الأصوات ══ -->
            <h4 class="pos-settings__title"><Volume2 :size="16" /> الأصوات</h4>
            <p class="doc-hint">
              تنبيه بالصوت للأحداث المهمة، فلا يحتاج الكاشير للنظر إلى الشاشة: مسح
              الباركود، صنف غير معروف، تمام البيع، طلب موافقة مشرف، وانقطاع
              الاتصال وعودته. الإعداد لهذا الجهاز فقط.
            </p>
            <SoundSettingsPanel scope="pos" :sounds="POS_SOUNDS" />

            <!-- ══ التثبيت كتطبيق ══ -->
            <h4 class="pos-settings__title">
              <MonitorDown :size="16" /> تثبيت الشاشة كتطبيق
            </h4>
            <p v-if="standalone || installed" class="doc-hint">
              <CircleCheck :size="14" class="pos-settings__ok" />
              الشاشة مثبّتة كتطبيق على هذا الجهاز.
            </p>
            <template v-else>
              <p class="doc-hint">
                تفتح الشاشة من أيقونة على سطح المكتب أو الشاشة الرئيسية، في
                نافذة كاملة بلا شريط المتصفح، وتعمل بلا إنترنت كما هي.
              </p>
              <div v-if="canInstall" class="doc-actions">
                <button type="button" class="btn btn--primary btn--sm" @click="doInstall">
                  <MonitorDown :size="14" /> تثبيت الآن
                </button>
              </div>
              <p v-else-if="isIos" class="doc-hint">
                في iPhone / iPad: افتح الشاشة في Safari، اضغط زر المشاركة
                <Share :size="13" /> ثم «إضافة إلى الشاشة الرئيسية».
              </p>
              <p v-else class="doc-hint">
                من قائمة المتصفح (⋮) اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة
                الرئيسية». يتطلب فتح الموقع عبر https.
              </p>
            </template>

            <div class="modal__footer">
              <button type="button" class="btn btn--primary" @click="close">تم</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import {
  Cable,
  CircleCheck,
  Inbox,
  MonitorDown,
  Settings,
  Share,
  Volume2,
  X,
} from "lucide-vue-next";
import type { SoundName } from "@/utils/sounds";
import { usePwaInstall } from "@/composables/usePwaInstall";
import { useToast } from "@/composables/useToast";
import {
  BAUD_RATES,
  drawerPaired,
  drawerSupported,
  kickDrawer,
  pairDrawer,
  type DrawerConfig,
} from "@/pos/drawer";
import { usePosStore } from "@/stores/pos";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const pos = usePosStore();
const toast = useToast();
const { canInstall, installed, standalone, isIos, install } = usePwaInstall();

/** أصوات شاشة الكاشير بترتيب أهميتها (الأول يُسمع عند التشغيل وتغيير المستوى) */
const POS_SOUNDS: SoundName[] = [
  "scan",
  "error",
  "success",
  "attention",
  "offline",
  "online",
  "rejected",
];

const supported = drawerSupported();
const form = reactive<DrawerConfig>({ ...pos.drawer });
const paired = ref(false);
const busy = ref(false);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    Object.assign(form, pos.drawer);
    paired.value = supported ? await drawerPaired() : false;
  },
);

const close = () => emit("update:modelValue", false);

const save = () => pos.setDrawer({ ...form });

const pair = async () => {
  try {
    await pairDrawer();
    paired.value = true;
  } catch (e) {
    // إغلاق نافذة اختيار المنفذ بلا اختيار ليس خطأ
    if (e instanceof DOMException && e.name === "NotFoundError") return;
    toast.error(getErrorMessage(e, "تعذر اختيار المنفذ"));
  }
};

const test = async () => {
  busy.value = true;
  try {
    await kickDrawer({ ...form });
    toast.success("أُرسل أمر الفتح للطابعة");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر فتح الدرج — تأكد أن الطابعة تعمل وموصولة"));
  } finally {
    busy.value = false;
  }
};

const doInstall = async () => {
  if (await install()) toast.success("تم تثبيت شاشة الكاشير");
};
</script>

<style lang="scss" scoped>
.pos-settings__title {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: $space-2 0 0;
  font-size: $font-size-base;

  &:not(:first-child) {
    padding-top: $space-4;
    border-top: 1px solid $stb-border;
  }
}

.pos-settings__ok {
  color: $stb-success;
  vertical-align: middle;
}
</style>
