<template>
  <div class="auth-card" style="max-width: 520px">
    <div class="auth-card__logo">
      <svg viewBox="0 0 60 60" width="52" height="52">
        <defs>
          <linearGradient
            id="lg1r"
            x1="0"
            y1="0"
            x2="60"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#1a6fd4" />
            <stop offset="1" stop-color="#062d6b" />
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r="30" fill="url(#lg1r)" />
        <text
          x="30"
          y="37"
          text-anchor="middle"
          fill="white"
          font-weight="900"
          font-size="16"
          font-family="Cairo, sans-serif"
        >
          STB
        </text>
      </svg>
    </div>
    <h1 class="auth-card__title">إنشاء حساب جديد</h1>
    <p class="auth-card__subtitle">سجّل شركتك في منصة STB ERP</p>

    <div v-if="auth.error" class="auth-error">{{ auth.error }}</div>

    <form class="auth-form" @submit.prevent="handleRegister">
      <div class="auth-form__section">بيانات الشركة</div>
      <div class="form-group">
        <label>اسم الشركة *</label>
        <input
          v-model="form.companyName"
          type="text"
          class="form-input"
          placeholder="شركة المستقبل التقنية"
          required
        />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label>رقم الهاتف</label>
          <input
            v-model="form.phone"
            type="tel"
            class="form-input"
            placeholder="+966500000000"
          />
        </div>
        <div class="form-group">
          <label>العنوان</label>
          <input
            v-model="form.address"
            type="text"
            class="form-input"
            placeholder="الرياض - حي العليا"
          />
        </div>
      </div>

      <div class="auth-form__section">بيانات المدير</div>
      <div class="form-group">
        <label>اسم المستخدم *</label>
        <input
          v-model="form.username"
          type="text"
          class="form-input"
          placeholder="admin_sara"
          required
        />
      </div>
      <div class="form-group">
        <label>البريد الإلكتروني *</label>
        <input
          v-model="form.email"
          type="email"
          class="form-input"
          placeholder="sara@company.com"
          required
        />
      </div>
      <div class="form-group">
        <label>كلمة المرور *</label>
        <input
          v-model="form.password"
          type="password"
          class="form-input"
          placeholder="••••••••"
          minlength="6"
          required
        />
      </div>

      <button
        type="submit"
        class="btn btn--primary btn--full btn--lg"
        :disabled="auth.loading"
      >
        <span v-if="auth.loading" class="spinner" />
        <span v-else>إنشاء الحساب</span>
      </button>
    </form>

    <p class="auth-card__footer">
      لديك حساب بالفعل؟ <NuxtLink to="/auth/login">تسجيل الدخول</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useAuthStore } from "../../stores/auth";

definePageMeta({ layout: "auth", middleware: "auth" });

const auth = useAuthStore();
const form = reactive({
  companyName: "",
  phone: "",
  address: "",
  username: "",
  email: "",
  password: "",
});

const handleRegister = async () => {
  await auth.register(form);
};
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.auth-form__section {
  font-size: $font-size-xs;
  font-weight: 700;
  color: $stb-accent;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-bottom: $space-2;
  border-bottom: 1px solid rgba($stb-accent, 0.2);
  margin-top: $space-2;
}
</style>
