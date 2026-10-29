<!--
  معاينة ملفات مرفوعة (هوية، مرفقات عقد، مؤهل): الصورة تُعرض، والـ PDF وغيره
  يُفتح في تبويب أو يُحمَّل. عند تعدد الملفات يظهر شريط للتنقل بينها.
  الروابط موقَّعة من الخادم ومؤقتة (ساعة): بعدها يكفي تحديث الصفحة.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal modal-lg file-viewer">
          <div class="modal__header">
            <h3>
              <FileText :size="20" class="file-viewer__icon" />
              {{ title || "عرض الملف" }}
            </h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="file-viewer__body">
            <template v-if="current">
              <img
                v-if="isImageFile(current)"
                :key="current.id"
                :src="current.url"
                alt="معاينة الملف"
                class="file-viewer__image"
                :class="{ 'file-viewer__image--compact': files.length > 1 }"
              />
              <div v-else class="file-viewer__placeholder">
                <FileText v-if="isPdfFile(current)" :size="64" class="file-viewer__pdf" />
                <File v-else :size="48" />
                <p>
                  {{
                    isPdfFile(current)
                      ? "ملف PDF — افتحه في تبويب جديد أو حمّله للمشاهدة الكاملة"
                      : "نوع الملف غير مدعوم للمعاينة المباشرة"
                  }}
                </p>
              </div>
              <!-- اتجاه الاسم من أول حرف فيه، والامتداد معزول: وإلا انقلب
                   "صفحة 2.jfif" إلى "jfif.2 صفحة" -->
              <span class="file-viewer__name" dir="auto"
                >{{ nameParts.base }}<bdi dir="ltr">{{ nameParts.ext }}</bdi></span
              >
              <div class="file-viewer__actions">
                <a :href="current.url" target="_blank" rel="noopener" class="btn btn--primary">
                  <ExternalLink :size="16" /> فتح في تبويب جديد
                </a>
                <a :href="downloadUrl(current)" class="btn btn--outline">
                  <Download :size="16" /> تحميل الملف
                </a>
              </div>
            </template>
            <p v-else class="file-viewer__empty">لا يوجد ملف للعرض</p>
          </div>

          <div v-if="files.length > 1" class="file-viewer__strip">
            <button
              v-for="(file, i) in files"
              :key="file.id"
              type="button"
              class="file-viewer__thumb"
              :class="{ active: i === index }"
              :title="file.name"
              @click="index = i"
            >
              <img v-if="isImageFile(file)" :src="file.url" alt="" />
              <FileText v-else :size="20" />
              <span>مرفق {{ i + 1 }}</span>
            </button>
          </div>

          <div class="modal__footer">
            <span v-if="files.length > 1" class="file-viewer__count">
              {{ index + 1 }} من {{ files.length }}
            </span>
            <button class="btn btn--ghost" @click="close">إغلاق</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Download, ExternalLink, File, FileText, X } from "lucide-vue-next";
import type { FileRef } from "@/types";
import { downloadUrl, isImageFile, isPdfFile } from "@/utils/files";

const props = defineProps<{
  modelValue: boolean;
  files: FileRef[];
  title?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const index = ref(0);
const current = computed<FileRef | null>(() => props.files[index.value] ?? null);
const nameParts = computed(() => {
  const name = current.value?.name ?? "";
  const ext = /\.[^.\s]{1,8}$/.exec(name)?.[0] ?? "";
  return { base: name.slice(0, name.length - ext.length), ext };
});

const close = () => emit("update:modelValue", false);
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") close();
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      index.value = 0;
      window.addEventListener("keydown", onKeydown);
    } else {
      window.removeEventListener("keydown", onKeydown);
    }
  },
);
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.file-viewer {
  max-width: 900px;
}
.file-viewer__icon {
  color: $stb-accent;
  margin-left: $space-2;
}
.file-viewer__body {
  @include flex(column, center, center, $space-3);
  padding: $space-4;
  min-height: 300px;
  background: $stb-surface-2;
}
.file-viewer__image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
  // مع شريط المرفقات تصغر الصورة كي يبقى الشريط والأزرار ظاهرين دون تمرير
  &--compact {
    max-height: 45vh;
  }
}
.file-viewer__placeholder {
  text-align: center;
  color: $stb-text-muted;
  font-size: $font-size-sm;
  padding: $space-6;
}
.file-viewer__pdf {
  color: $stb-danger;
  margin-bottom: $space-3;
}
.file-viewer__name {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  word-break: break-all;
  text-align: center;
}
.file-viewer__actions {
  @include flex(row, center, center, $space-3);
  flex-wrap: wrap;
}
.file-viewer__empty {
  color: $stb-text-muted;
}
.file-viewer__strip {
  @include flex(row, stretch, flex-start, $space-2);
  overflow-x: auto;
  padding: $space-3 $space-4;
  border-top: 1px solid $stb-border;
  @include scrollbar;
}
.file-viewer__thumb {
  @include flex(column, center, center, 4px);
  flex: 0 0 auto;
  width: 84px;
  padding: $space-1;
  border: 1px solid $stb-border;
  border-radius: $radius-md;
  background: $stb-surface;
  color: $stb-text-secondary;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: border-color $transition-fast;
  img {
    width: 100%;
    height: 48px;
    object-fit: cover;
    border-radius: $radius-sm;
  }
  svg {
    height: 48px;
  }
  &:hover {
    border-color: $stb-border-light;
  }
  &.active {
    border-color: $stb-accent;
    color: $stb-accent;
  }
}
.file-viewer__count {
  margin-inline-end: auto;
  color: $stb-text-muted;
  font-size: $font-size-sm;
}
</style>
