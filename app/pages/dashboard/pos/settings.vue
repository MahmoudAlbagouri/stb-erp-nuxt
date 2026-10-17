<!--
  pages/dashboard/pos/settings.vue — إعدادات شاشة الكاشير: ما يظهر من مميزات
  لهذه الشركة (قالب جاهز لنوع النشاط ثم تعديل أي ميزة). المميزات المرتبطة
  بالباقة تظهر مقفلة لمن ليست في باقته.
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>إعدادات شاشة الكاشير</h1>
        <p>
          شغّل ما يحتاجه نشاطك وأقفل الباقي: ما يُقفل يختفي زره واختصاره من الشاشة،
          فتبقى بسيطة وسريعة للكاشير
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-can="'manage_pos_settings'"
          class="btn btn--primary"
          :class="{ 'btn--loading': saving }"
          :disabled="saving || !dirty || !settings"
          @click="save"
        >
          <Save :size="16" /> حفظ
        </button>
      </div>
    </div>

    <div v-if="!settings" class="empty-state"><div class="spinner spinner--lg" /></div>

    <template v-else>
      <!-- ══ القوالب ══ -->
      <div class="card section">
        <div class="section__head">
          <h3><LayoutTemplate :size="18" /> نوع النشاط</h3>
          <p>
            قالب جاهز يشغّل المميزات المناسبة لنشاطك بضغطة — نقطة بداية: عدّل بعده أي
            ميزة كما تريد.
          </p>
        </div>
        <div class="templates">
          <button
            v-for="template in settings.templates"
            :key="template.key"
            type="button"
            class="templates__item"
            :class="{ 'is-active': currentTemplate === template.key }"
            :disabled="!editable"
            @click="applyTemplate(template.key)"
          >
            <component :is="TEMPLATE_ICONS[template.key] ?? Store" :size="22" />
            <strong>{{ template.label }}</strong>
            <span>{{ template.description }}</span>
          </button>
        </div>
        <p v-if="currentTemplate === 'custom'" class="doc-hint">
          <SlidersHorizontal :size="14" /> إعداد مخصص (عُدّلت مميزات القالب)
        </p>
      </div>

      <!-- ══ المميزات ══ -->
      <div v-for="group in settings.groups" :key="group.title" class="card section">
        <div class="section__head">
          <h3>{{ group.title }}</h3>
        </div>
        <div class="features">
          <label
            v-for="feature in group.features"
            :key="feature.key"
            class="features__item"
            :class="{ 'is-off': !form[feature.key], 'is-locked': lockReason(feature.key) }"
          >
            <input
              v-model="form[feature.key]"
              type="checkbox"
              class="features__switch"
              :disabled="!editable || !!lockReason(feature.key)"
            />
            <span class="features__text">
              <strong>
                {{ feature.label }}
                <span v-if="lockReason(feature.key)" class="badge badge--inactive">
                  {{ lockReason(feature.key) }}
                </span>
              </strong>
              <small>{{ feature.description }}</small>
            </span>
          </label>
        </div>
      </div>

      <p class="doc-hint">
        تصل التغييرات لشاشات الكاشير مع مزامنتها التالية (خلال دقائق)، أو فوراً بالضغط
        على حالة الاتصال أعلى الشاشة. البيع الآجل المقفل يرفضه السيرفر أيضاً، إلا ما
        بيع على جهاز بلا إنترنت قبل إقفاله.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from "vue";
import {
  Coffee,
  LayoutTemplate,
  Pill,
  Save,
  Shirt,
  ShoppingCart,
  SlidersHorizontal,
  Store,
} from "lucide-vue-next";
import { useAccess } from "@/composables/useAccess";
import { useToast } from "@/composables/useToast";
import {
  POS_FEATURE_KEYS,
  type PosFeatureKey,
  type PosFeatures,
  type PosScreenSettings,
} from "@/pos/types";
import { usePosAdminStore } from "@/stores/posAdmin";
import { PERMS } from "@/utils/access";

definePageMeta({ middleware: "auth" });

const TEMPLATE_ICONS: Record<string, Component> = {
  all: Store,
  supermarket: ShoppingCart,
  restaurant: Coffee,
  retail: Shirt,
  pharmacy: Pill,
};

const store = usePosAdminStore();
const toast = useToast();
const { can } = useAccess();
const editable = computed(() => can(PERMS.POS_SETTINGS_MANAGE));

const settings = ref<PosScreenSettings | null>(null);
const saving = ref(false);
const form = reactive({} as PosFeatures);

const fill = (data: PosScreenSettings) => {
  settings.value = data;
  Object.assign(form, data.features);
};

const dirty = computed(
  () =>
    !!settings.value &&
    POS_FEATURE_KEYS.some((key) => form[key] !== settings.value!.features[key]),
);

/** القالب الذي تطابقه المميزات المعروضة الآن (قبل الحفظ أيضاً) */
const currentTemplate = computed(() => {
  const found = settings.value?.templates.find((template) =>
    POS_FEATURE_KEYS.every((key) => template.features[key] === form[key]),
  );
  return found?.key ?? "custom";
});

/** سبب إقفال ميزة: ليست في الباقة، أو تحتاج ميزة مقفلة */
const lockReason = (key: PosFeatureKey): string => {
  if (!settings.value) return "";
  if (settings.value.available[key] === false) return "ليست في باقتك";
  const required = settings.value.requires[key];
  if (required && !form[required]) {
    const label = settings.value.groups
      .flatMap((group) => group.features)
      .find((feature) => feature.key === required)?.label;
    return `تحتاج: ${label ?? required}`;
  }
  return "";
};

// ميزة تحتاج أخرى أُقفلت (الآجل بلا اختيار عميل): تُقفل معها كما يفعل السيرفر
watch(form, () => {
  for (const [key, required] of Object.entries(settings.value?.requires ?? {})) {
    if (required && !form[required] && form[key as PosFeatureKey]) {
      form[key as PosFeatureKey] = false;
    }
  }
});

const applyTemplate = (key: string) => {
  const template = settings.value?.templates.find((t) => t.key === key);
  if (!template) return;
  Object.assign(form, template.features);
  toast.info(`قالب «${template.label}» — راجع المميزات ثم احفظ`);
};

const save = async () => {
  saving.value = true;
  try {
    const features = Object.fromEntries(
      POS_FEATURE_KEYS.map((key) => [key, form[key]]),
    ) as PosFeatures;
    fill(await store.updateScreenSettings({ features }));
    toast.success("حُفظت إعدادات الشاشة — تصل الأجهزة مع مزامنتها التالية");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الإعدادات"));
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    fill(await store.fetchScreenSettings());
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل إعدادات الشاشة"));
  }
});
</script>

<style lang="scss" scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  margin-bottom: $space-4;
  padding: $space-5;

  &__head {
    h3 {
      display: flex;
      align-items: center;
      gap: $space-2;
      margin: 0 0 $space-1;
    }
    p {
      margin: 0;
      font-size: $font-size-sm;
      color: $stb-text-secondary;
    }
  }
}

.templates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: $space-3;

  &__item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $space-1;
    padding: $space-4;
    font-family: inherit;
    text-align: start;
    color: $stb-text-primary;
    background: $stb-surface-2;
    border: 2px solid $stb-border-light;
    border-radius: $radius-lg;
    cursor: pointer;
    transition: border-color 0.15s;

    svg {
      color: $stb-accent;
    }
    span {
      font-size: $font-size-xs;
      color: $stb-text-secondary;
    }
    &:hover:not(:disabled) {
      border-color: $stb-primary-light;
    }
    &.is-active {
      border-color: $stb-accent;
      background: rgba($stb-accent, 0.08);
    }
    &:disabled {
      cursor: default;
    }
  }
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-2 $space-4;

  &__item {
    display: flex;
    align-items: flex-start;
    gap: $space-3;
    padding: $space-3;
    border: 1px solid $stb-border;
    border-radius: $radius-md;
    cursor: pointer;

    &.is-off {
      opacity: 0.75;
    }
    &.is-locked {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
  &__switch {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    accent-color: $stb-accent;
  }
  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: $space-2;
      font-size: $font-size-sm;
    }
    small {
      font-size: $font-size-xs;
      color: $stb-text-secondary;
    }
  }
}
</style>
