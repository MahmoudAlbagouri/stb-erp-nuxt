<!-- pages/auth/reset-password.vue -->
<template>
  <div class="auth-card">
    <h1 class="auth-card__title">تعيين كلمة مرور جديدة</h1>
    <p class="auth-card__subtitle">
      أدخل الرمز الذي وصلك عبر البريد وكلمة المرور الجديدة
    </p>

    <div v-if="auth.error" class="auth-error">{{ auth.error }}</div>

    <form class="auth-form" @submit.prevent="handleReset">
      <!-- حقل البريد الإلكتروني -->
      <div class="form-group">
        <label>البريد الإلكتروني *</label>
        <input
          v-model="form.email"
          type="email"
          class="form-input"
          placeholder="example@company.com"
          required
          :disabled="auth.loading"
        />
      </div>

      <!-- حقل رمز التحقق -->
      <div class="form-group">
        <label>رمز التحقق (12 رقم) *</label>
        <input
          v-model="form.code"
          type="text"
          inputmode="numeric"
          class="form-input"
          placeholder="مثال: 123456789012"
          maxlength="12"
          minlength="12"
          required
          :disabled="auth.loading"
          style="letter-spacing: 2px; font-family: monospace"
        />
      </div>

      <!-- كلمة المرور الجديدة مع زر الإظهار والإخفاء -->
      <div class="form-group">
        <label>كلمة المرور الجديدة *</label>
        <div class="input-password">
          <input
            v-model="form.newPassword"
            :type="showPass ? 'text' : 'password'"
            class="form-input with-icon"
            placeholder="••••••••"
            minlength="8"
            required
            :disabled="auth.loading"
          />
          <button
            type="button"
            class="input-password__toggle"
            @click="showPass = !showPass"
          >
            <Eye v-if="!showPass" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
      </div>

      <button
        type="submit"
        class="btn btn--primary btn--full btn--lg"
        :disabled="auth.loading"
      >
        <span v-if="auth.loading" class="spinner" />
        <span v-else>تعيين كلمة المرور</span>
      </button>
    </form>

    <p class="auth-card__footer">
      <NuxtLink to="/auth/login">← العودة لتسجيل الدخول</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { reactive, ref } from "vue";
// ✅ استيراد أيقونات العين لإظهار وإخفاء الباسورد
import { Eye, EyeOff } from "lucide-vue-next";

definePageMeta({ layout: "auth" });

const auth = useAuthStore();
const showPass = ref(false);

const form = reactive({
  email: "",
  code: "",
  newPassword: "",
});

const handleReset = async () => {
  if (!form.email || !form.code || !form.newPassword) {
    auth.error = "يرجى ملء جميع الحقول المطلوبة";
    return;
  }

  await auth.resetPassword(form.email, form.code, form.newPassword);
};
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;

/* ✅ تنسيق حاوية الباسورد وزر العين ليتطابق مع صفحة الـ Login */
.input-password {
  position: relative;

  .form-input.with-icon {
    padding-left: $space-10; /* مساحة لزر العين على اليسار في RTL */
    width: 100%;
  }

  &__toggle {
    position: absolute;
    left: $space-3;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: $stb-text-muted;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color $transition-fast;

    &:hover {
      color: $stb-accent;
    }
  }
}
</style>
