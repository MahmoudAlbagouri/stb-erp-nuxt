<template>
  <div class="auth-card">
    <div class="auth-card__logo">
      <svg viewBox="0 0 60 60" width="60" height="60">
        <defs>
          <linearGradient
            id="lg1"
            x1="0"
            y1="0"
            x2="60"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#1a6fd4" />
            <stop offset="1" stop-color="#062d6b" />
          </linearGradient>
          <linearGradient
            id="lg2"
            x1="0"
            y1="0"
            x2="60"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#00aaff" />
            <stop offset="1" stop-color="#00d4ff" />
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r="30" fill="url(#lg1)" />
        <circle
          cx="30"
          cy="30"
          r="22"
          fill="none"
          stroke="url(#lg2)"
          stroke-width="2"
          opacity="0.6"
        />
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

    <h1 class="auth-card__title">مرحباً بك</h1>
    <p class="auth-card__subtitle">سجّل دخولك إلى نظام STB ERP</p>

    <div v-if="auth.error" class="auth-error">{{ auth.error }}</div>

    <form class="auth-form" @submit.prevent="handleLogin">
      <div class="form-group">
        <label>البريد الإلكتروني</label>
        <input
          v-model="form.email"
          type="email"
          class="form-input"
          placeholder="example@company.com"
          required
        />
      </div>
      <div class="form-group">
        <label>كلمة المرور</label>
        <div class="input-password">
          <input
            v-model="form.password"
            :type="showPass ? 'text' : 'password'"
            class="form-input"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            class="input-password__toggle"
            @click="showPass = !showPass"
          >
            {{ showPass ? "🙈" : "👁" }}
          </button>
        </div>
      </div>

      <div class="auth-form__meta">
        <NuxtLink to="/auth/forgot-password" class="auth-form__forgot"
          >نسيت كلمة المرور؟</NuxtLink
        >
      </div>

      <button
        type="submit"
        class="btn btn--primary btn--full btn--lg"
        :disabled="auth.loading"
      >
        <span v-if="auth.loading" class="spinner" />
        <span v-else>تسجيل الدخول</span>
      </button>
    </form>

    <p class="auth-card__footer">
      ليس لديك حساب؟
      <NuxtLink to="/auth/register">إنشاء حساب جديد</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useAuthStore } from "../../stores/auth";

definePageMeta({ layout: "auth", middleware: "auth" });

const auth = useAuthStore();
const showPass = ref(false);
const form = reactive({ email: "", password: "" });

const handleLogin = async () => {
  await auth.login(form);
};
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.auth-card {
  @include glass-card;
  width: 100%;
  max-width: 440px;
  padding: $space-10 $space-8;
  position: relative;
  z-index: 1;
  animation: modalIn 0.4s ease;

  &__logo {
    @include flex(row, center, center);
    margin-bottom: $space-6;
    filter: drop-shadow(0 0 16px rgba($stb-accent, 0.4));
  }

  &__title {
    font-size: $font-size-3xl;
    font-weight: 900;
    text-align: center;
    background: $gradient-accent;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__subtitle {
    text-align: center;
    color: $stb-text-muted;
    font-size: $font-size-sm;
    margin-top: $space-2;
    margin-bottom: $space-8;
  }

  &__footer {
    text-align: center;
    font-size: $font-size-sm;
    color: $stb-text-muted;
    margin-top: $space-5;

    a {
      color: $stb-accent;
      font-weight: 600;
    }
  }
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: $space-5;

  &__meta {
    @include flex(row, center, flex-end);
  }

  &__forgot {
    font-size: $font-size-xs;
    color: $stb-text-muted;
    &:hover {
      color: $stb-accent;
    }
  }
}

.auth-error {
  background: rgba($stb-danger, 0.1);
  border: 1px solid rgba($stb-danger, 0.3);
  color: $stb-danger;
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  margin-bottom: $space-4;
  text-align: center;
}

.input-password {
  position: relative;

  input {
    padding-left: $space-10;
  }

  &__toggle {
    position: absolute;
    left: $space-3;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: $font-size-sm;
    color: $stb-text-muted;
    padding: 0;
    line-height: 1;
  }
}
</style>
