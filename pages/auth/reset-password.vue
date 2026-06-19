<template>
  <div class="auth-card">
    <h1 class="auth-card__title">تعيين كلمة مرور جديدة</h1>
    <p class="auth-card__subtitle">أدخل كلمة المرور الجديدة</p>

    <div v-if="auth.error" class="auth-error">{{ auth.error }}</div>

    <form class="auth-form" @submit.prevent="handleReset">
      <div class="form-group">
        <label>كلمة المرور الجديدة *</label>
        <input v-model="form.newPassword" type="password" class="form-input" placeholder="••••••••" minlength="6" required />
      </div>
      <div class="form-group">
        <label>تأكيد كلمة المرور *</label>
        <input v-model="confirm" type="password" class="form-input" placeholder="••••••••" required />
        <span v-if="mismatch" class="form-error">كلمتا المرور غير متطابقتين</span>
      </div>
      <button type="submit" class="btn btn--primary btn--full btn--lg" :disabled="auth.loading">
        <span v-if="auth.loading" class="spinner" />
        <span v-else>تعيين كلمة المرور</span>
      </button>
    </form>

    <p class="auth-card__footer"><NuxtLink to="/auth/login">← العودة لتسجيل الدخول</NuxtLink></p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })

const auth    = useAuthStore()
const route   = useRoute()
const confirm = ref('')
const mismatch = ref(false)

const form = reactive({ newPassword: '' })

const handleReset = async () => {
  mismatch.value = form.newPassword !== confirm.value
  if (mismatch.value) return
  const token = route.query.token as string
  if (!token) { auth.error = 'رابط غير صالح'; return }
  await auth.resetPassword(token, form.newPassword)
}
</script>
