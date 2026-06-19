<template>
  <div class="auth-card">
    <h1 class="auth-card__title">استعادة كلمة المرور</h1>
    <p class="auth-card__subtitle">أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة</p>

    <div v-if="sent" class="auth-success">
      ✓ إذا كان البريد مسجلاً، ستصلك تعليمات إعادة التعيين
    </div>

    <form v-else class="auth-form" @submit.prevent="handleForgot">
      <div v-if="auth.error" class="auth-error">{{ auth.error }}</div>
      <div class="form-group">
        <label>البريد الإلكتروني</label>
        <input v-model="email" type="email" class="form-input" placeholder="example@company.com" required />
      </div>
      <button type="submit" class="btn btn--primary btn--full btn--lg" :disabled="auth.loading">
        <span v-if="auth.loading" class="spinner" />
        <span v-else>إرسال رابط الاستعادة</span>
      </button>
    </form>

    <p class="auth-card__footer"><NuxtLink to="/auth/login">← العودة لتسجيل الدخول</NuxtLink></p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })

const auth  = useAuthStore()
const email = ref('')
const sent  = ref(false)

const handleForgot = async () => {
  try {
    await auth.forgotPassword(email.value)
    sent.value = true
  } catch {}
}
</script>

<style lang="scss">
@use '~/assets/scss/variables' as *;
.auth-success {
  background: rgba(#10b981, 0.1);
  border: 1px solid rgba(#10b981, 0.3);
  color: #10b981;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
  margin-bottom: 1rem;
}
</style>
