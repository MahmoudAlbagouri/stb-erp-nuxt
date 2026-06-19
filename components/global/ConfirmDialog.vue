<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="confirm-dialog">
          <div class="confirm-dialog__icon">⚠️</div>
          <h3 class="confirm-dialog__title">{{ title }}</h3>
          <p class="confirm-dialog__text">{{ message }}</p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--ghost" @click="$emit('update:modelValue', false)">إلغاء</button>
            <button class="btn btn--danger" :disabled="loading" @click="$emit('confirm')">
              <span v-if="loading" class="spinner" />
              <span v-else>{{ confirmText }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  loading?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
}>()
</script>
