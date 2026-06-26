<template>
  <div class="stb-uploader">
    <!-- ── Label ─────────────────────────────────────────────────────────── -->
    <label v-if="label" class="stb-uploader__label">{{ label }}</label>

    <!-- ── Drop Zone ──────────────────────────────────────────────────────── -->
    <div
      class="stb-uploader__dropzone"
      :class="{
        'stb-uploader__dropzone--dragging': isDragging,
        'stb-uploader__dropzone--uploading': isUploading,
        'stb-uploader__dropzone--error': hasError,
        'stb-uploader__dropzone--success': isSuccess && !showPreview,
        'stb-uploader__dropzone--has-preview':
          showPreview && (hasFiles || !!modelValue),
      }"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @click.self="triggerFileInput"
    >
      <!-- ① Image Preview — ملف جديد تم رفعه للتو -->
      <template v-if="showPreview && hasFiles && !multiple">
        <div class="stb-uploader__preview-wrap" @click.stop>
          <img
            :src="
              uploader.uploadedFiles.value[0]?.previewUrl ||
              uploader.uploadedFiles.value[0]?.url
            "
            :alt="uploader.uploadedFiles.value[0]?.name"
            class="stb-uploader__preview-img"
          />
          <button
            class="stb-uploader__preview-remove"
            type="button"
            title="إزالة الصورة"
            @click.stop="removeFirst"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </template>

      <!-- ② Image Preview — قيمة موجودة من الـ v-model (وضع التعديل) -->
      <template
        v-else-if="showPreview && modelValue && !hasFiles && !isUploading"
      >
        <div class="stb-uploader__preview-wrap" @click.stop>
          <img
            :src="modelValue"
            alt="الملف الحالي"
            class="stb-uploader__preview-img"
          />
          <button
            class="stb-uploader__preview-remove"
            type="button"
            title="إزالة"
            @click.stop="clearModel"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </template>

      <!-- ③ Uploading State -->
      <template v-else-if="isUploading">
        <div class="stb-uploader__uploading">
          <div class="stb-uploader__spinner"></div>
          <span class="stb-uploader__uploading-text"
            >جاري الرفع... {{ progress }}%</span
          >
          <div class="stb-uploader__progress-bar">
            <div
              class="stb-uploader__progress-fill"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>
      </template>

      <!-- ④ ملف غير صورة موجود في v-model (وضع التعديل، بدون showPreview) -->
      <template v-else-if="!showPreview && modelValue && !hasFiles">
        <div class="stb-uploader__idle" @click="triggerFileInput">
          <div class="stb-uploader__icon-wrap stb-uploader__icon-wrap--success">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
              />
              <polyline points="13 2 13 9 20 9" />
            </svg>
          </div>
          <p class="stb-uploader__idle-title">يوجد ملف مرفق</p>
          <p class="stb-uploader__idle-hint">انقر لاستبداله</p>
        </div>
      </template>

      <!-- ⑤ Default / Idle State -->
      <template v-else>
        <div class="stb-uploader__idle" @click="triggerFileInput">
          <div class="stb-uploader__icon-wrap">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
          </div>
          <p class="stb-uploader__idle-title">
            {{ isDragging ? "أفلت الملف هنا" : idleTitle }}
          </p>
          <p v-if="hint" class="stb-uploader__idle-hint">{{ hint }}</p>
        </div>
      </template>

      <!--
        Hidden native input — مخفي تماماً خارج الـ flow
        لا يرث الـ click من الـ parent لأنه بـ pointer-events: none
        ويُفتح فقط عبر fileInputRef.click() في triggerFileInput()
      -->
      <input
        ref="fileInputRef"
        type="file"
        class="stb-uploader__input"
        :accept="acceptAttr"
        :multiple="multiple"
        @change="handleInputChange"
        @click.stop
      />
    </div>

    <!-- ── Error Message ───────────────────────────────────────────────────── -->
    <Transition name="fade">
      <p v-if="hasError" class="stb-uploader__error">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {{ uploader.error.value }}
      </p>
    </Transition>

    <!-- ── File List (multiple mode) ──────────────────────────────────────── -->
    <TransitionGroup
      v-if="multiple && hasFiles"
      name="slide-up"
      tag="ul"
      class="stb-uploader__file-list"
    >
      <li
        v-for="file in uploader.uploadedFiles.value"
        :key="file.id"
        class="stb-uploader__file-item"
      >
        <div class="stb-uploader__file-icon">
          <img
            v-if="file.previewUrl"
            :src="file.previewUrl"
            :alt="file.name"
            class="stb-uploader__file-thumb"
          />
          <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
            />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        </div>
        <div class="stb-uploader__file-info">
          <span class="stb-uploader__file-name">{{ file.name }}</span>
          <span class="stb-uploader__file-size">{{
            formatSize(file.size)
          }}</span>
        </div>
        <button
          class="stb-uploader__file-remove"
          type="button"
          title="إزالة"
          @click="uploader.removeFile(file.id)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </li>
    </TransitionGroup>

    <!-- ── Success Banner (single, non-preview) ───────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="isSuccess && !showPreview && !multiple"
        class="stb-uploader__success"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>تم الرفع بنجاح</span>
        <button class="stb-uploader__reset-btn" type="button" @click="resetAll">
          رفع آخر
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useUpload } from "../../composables/useUpload";
import type { UploadedFile } from "../../composables/useUpload";

// ─── Props ─────────────────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    /** v-model: يُخزّن الـ URL المُعادة من السيرفر */
    modelValue?: string;
    /**
     * API endpoint path — يجب أن يكون مساراً موجوداً في الـ backend
     * مثال: "/employees/upload-id" أو "/files/upload"
     */
    endpoint: string;
    /** FormData field name (default: "file") */
    fieldName?: string;
    /** Label above the dropzone */
    label?: string;
    /** Accepted MIME types — comma-separated string or array */
    accept?: string | string[];
    /** Max file size in bytes (default: 5 MB) */
    maxSize?: number;
    /** Allow multiple files */
    multiple?: boolean;
    /** Max files when multiple=true */
    maxFiles?: number;
    /** Show image preview inside dropzone */
    showPreview?: boolean;
    /** Idle zone title */
    idleTitle?: string;
    /** Hint text below the title */
    hint?: string;
    /** Extra FormData fields */
    extraFields?: Record<string, string>;
  }>(),
  {
    modelValue: "",
    fieldName: "file",
    multiple: false,
    showPreview: false,
    maxFiles: 10,
    idleTitle: "اسحب ملفك هنا أو انقر للاختيار",
    hint: "",
  },
);

// ─── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  "update:modelValue": [value: string];
  success: [files: UploadedFile[]];
  error: [message: string];
  remove: [id: string];
}>();

// ─── Composable ────────────────────────────────────────────────────────────────

const acceptArray = computed<string[]>(() => {
  if (!props.accept) return [];
  if (Array.isArray(props.accept)) return props.accept;
  return props.accept.split(",").map((s) => s.trim());
});

const uploader = useUpload({
  endpoint: props.endpoint,
  fieldName: props.fieldName,
  accept: acceptArray.value,
  maxSize: props.maxSize,
  multiple: props.multiple,
  maxFiles: props.maxFiles,
  extraFields: props.extraFields,
  onSuccess(files) {
    const url = props.multiple
      ? files.map((f) => f.url).join(",")
      : (files[0]?.url ?? "");
    emit("update:modelValue", url);
    emit("success", files);
  },
  onError(msg) {
    emit("error", msg);
  },
});

const { isUploading, isSuccess, hasError, hasFiles, progress } = uploader;

// ─── Local State ───────────────────────────────────────────────────────────────

const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// ─── Computed ──────────────────────────────────────────────────────────────────

const acceptAttr = computed(() => acceptArray.value.join(",") || undefined);

// ─── Methods ───────────────────────────────────────────────────────────────────

/**
 * يُفتح الـ input عبر ref.click() فقط — لا يُفتح تلقائياً بسبب الـ click bubble
 * الـ input نفسه بـ pointer-events: none فلا يُطلق حدث click ثانٍ
 */
const triggerFileInput = () => {
  if (isUploading.value) return;
  fileInputRef.value?.click();
};

const handleInputChange = async (event: Event) => {
  await uploader.uploadFromEvent(event);
};

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false;
  await uploader.uploadFromDrop(event);
};

const removeFirst = () => {
  const file = uploader.uploadedFiles.value[0];
  if (file) {
    uploader.removeFile(file.id);
    emit("update:modelValue", "");
    emit("remove", file.id);
  }
};

const clearModel = () => {
  emit("update:modelValue", "");
};

const resetAll = () => {
  uploader.reset();
  emit("update:modelValue", "");
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

// ── Container ─────────────────────────────────────────────────────────────────

.stb-uploader {
  display: flex;
  flex-direction: column;
  gap: $space-2;

  &__label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $stb-text-secondary;
  }
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

.stb-uploader__dropzone {
  position: relative;
  @include glass-card;
  border: 2px dashed $stb-border-light;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all $transition-base;
  min-height: 140px;
  // لا يوجد padding هنا — كل state تتحكم بـ padding داخلياً
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: rgba($stb-accent, 0.5);
    background: rgba($stb-accent, 0.03);
  }

  &--dragging {
    border-color: $stb-accent;
    background: rgba($stb-accent, 0.07);
    @include glow-border($stb-accent);
  }

  &--uploading {
    cursor: default;
    border-style: solid;
    border-color: rgba($stb-accent, 0.3);
  }

  &--error {
    border-color: rgba($stb-danger, 0.5);
    background: rgba($stb-danger, 0.04);
  }

  &--success {
    border-color: rgba($stb-success, 0.4);
    background: rgba($stb-success, 0.04);
  }

  &--has-preview {
    overflow: hidden;
    border-style: solid;
    border-color: rgba($stb-accent, 0.3);
    min-height: 160px;
    padding: 0;
  }
}

// ── Hidden Input ──────────────────────────────────────────────────────────────
// pointer-events: none يمنعه من اعتراض أي click أو إطلاق حدث ثانٍ
// يُفتح فقط برمجياً عبر fileInputRef.click()

.stb-uploader__input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none; // ← الحل الجذري لمشكلة فتح النافذة مرتين
  overflow: hidden;
}

// ── Idle ──────────────────────────────────────────────────────────────────────

.stb-uploader__idle {
  @include flex(column, center, center, $space-3);
  text-align: center;
  padding: $space-8;
  width: 100%;
  height: 100%;
}

.stb-uploader__icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: $radius-xl;
  background: rgba($stb-accent, 0.08);
  border: 1px solid rgba($stb-accent, 0.2);
  @include flex(row, center, center);
  color: $stb-accent;
  transition: all $transition-base;

  &--success {
    background: rgba($stb-success, 0.1);
    border-color: rgba($stb-success, 0.3);
    color: $stb-success;
  }

  .stb-uploader__dropzone:hover & {
    background: rgba($stb-accent, 0.14);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba($stb-accent, 0.15);
  }
}

.stb-uploader__idle-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $stb-text-primary;
}

.stb-uploader__idle-hint {
  font-size: $font-size-xs;
  color: $stb-text-muted;
  margin-top: -$space-1;
}

// ── Uploading ─────────────────────────────────────────────────────────────────

.stb-uploader__uploading {
  @include flex(column, center, center, $space-3);
  width: 100%;
  padding: $space-8;
}

.stb-uploader__spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba($stb-accent, 0.2);
  border-top-color: $stb-accent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.stb-uploader__uploading-text {
  font-size: $font-size-sm;
  color: $stb-text-secondary;
  font-weight: 600;
}

.stb-uploader__progress-bar {
  width: 100%;
  max-width: 200px;
  height: 4px;
  background: rgba($stb-accent, 0.15);
  border-radius: $radius-full;
  overflow: hidden;
}

.stb-uploader__progress-fill {
  height: 100%;
  background: $gradient-accent;
  border-radius: $radius-full;
  transition: width 0.3s ease;
}

// ── Image Preview ─────────────────────────────────────────────────────────────

.stb-uploader__preview-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 160px;
  @include flex(row, center, center);
}

.stb-uploader__preview-img {
  width: 100%;
  height: 100%;
  min-height: 160px;
  object-fit: cover;
  border-radius: calc($radius-lg - 2px);
  display: block;
}

.stb-uploader__preview-remove {
  position: absolute;
  top: $space-2;
  left: $space-2;
  width: 28px;
  height: 28px;
  border-radius: $radius-full;
  background: rgba($stb-dark, 0.8);
  border: 1px solid $stb-border-light;
  color: $stb-text-primary;
  @include flex(row, center, center);
  cursor: pointer;
  transition: all $transition-fast;
  backdrop-filter: blur(4px);

  &:hover {
    background: $stb-danger;
    border-color: $stb-danger;
    transform: scale(1.1);
  }
}

// ── Error ─────────────────────────────────────────────────────────────────────

.stb-uploader__error {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-xs;
  color: $stb-danger;
  padding: $space-2 $space-3;
  background: rgba($stb-danger, 0.08);
  border-radius: $radius-md;
  border: 1px solid rgba($stb-danger, 0.2);
}

// ── Success Banner ────────────────────────────────────────────────────────────

.stb-uploader__success {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-xs;
  color: $stb-success;
  padding: $space-2 $space-3;
  background: rgba($stb-success, 0.08);
  border-radius: $radius-md;
  border: 1px solid rgba($stb-success, 0.2);
}

.stb-uploader__reset-btn {
  margin-right: auto;
  background: none;
  border: none;
  color: $stb-accent;
  font-size: $font-size-xs;
  font-family: $font-family;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;

  &:hover {
    color: $stb-accent-glow;
  }
}

// ── File List ─────────────────────────────────────────────────────────────────

.stb-uploader__file-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-top: $space-1;
}

.stb-uploader__file-item {
  @include glass-card;
  padding: $space-3 $space-4;
  @include flex(row, center, flex-start, $space-3);
  border-radius: $radius-md;
}

.stb-uploader__file-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: $radius-sm;
  overflow: hidden;
  background: rgba($stb-accent, 0.08);
  border: 1px solid rgba($stb-accent, 0.15);
  @include flex(row, center, center);
  color: $stb-accent;
}

.stb-uploader__file-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stb-uploader__file-info {
  flex: 1;
  min-width: 0;
  @include flex(column, flex-start, center, $space-1);
}

.stb-uploader__file-name {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $stb-text-primary;
  @include truncate;
}

.stb-uploader__file-size {
  font-size: $font-size-xs;
  color: $stb-text-muted;
}

.stb-uploader__file-remove {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: $radius-sm;
  background: transparent;
  border: 1px solid rgba($stb-danger, 0.2);
  color: $stb-text-muted;
  @include flex(row, center, center);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba($stb-danger, 0.12);
    border-color: $stb-danger;
    color: $stb-danger;
  }
}

// ── Animations ────────────────────────────────────────────────────────────────

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-fast;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all $transition-base;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
