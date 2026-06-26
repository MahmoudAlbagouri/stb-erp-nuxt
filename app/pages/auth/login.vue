<template>
  <div class="auth-card">
    <!-- ✅ استبدال SVG بالصورة -->
    <div class="auth-card__logo">
      <img src="/images/logo.png" alt="STB HR Logo" />
    </div>

    <h1 class="auth-card__title">مرحباً بك</h1>
    <p class="auth-card__subtitle">سجّل دخولك إلى نظام STB ERP</p>

    <div v-if="auth.error" class="auth-error">{{ auth.error }}</div>

    <form class="auth-form" @submit.prevent="handleLogin">
      <div class="form-group">
        <label>البريد الإلكتروني</label>
        <div class="input-wrapper">
          <Mail class="input-icon" />
          <input
            v-model="form.email"
            type="email"
            class="form-input with-icon"
            placeholder="example@company.com"
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label>كلمة المرور</label>
        <div class="input-password">
          <Lock class="input-icon" />
          <input
            v-model="form.password"
            :type="showPass ? 'text' : 'password'"
            class="form-input with-icon"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            class="input-password__toggle"
            @click="showPass = !showPass"
          >
            <!-- ✅ أيقونة العين بدل الإيموجي -->
            <Eye v-if="!showPass" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
      </div>

      <div class="auth-form__meta">
        <NuxtLink to="/auth/forgot-password" class="auth-form__forgot">
          نسيت كلمة المرور؟
        </NuxtLink>
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
import { useAuthStore } from "@/stores/auth";
// ✅ استيراد الأيقونات
import { Mail, Lock, Eye, EyeOff } from "lucide-vue-next";

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

    img {
      width: 70px; /* حجم مناسب للوجو */
      height: auto;
      filter: drop-shadow(0 0 12px rgba($stb-accent, 0.3));
    }
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

/* ✅ تنسيق الحقول مع الأيقونات */
.input-wrapper,
.input-password {
  position: relative;

  .input-icon {
    position: absolute;
    right: $space-4; /* مكان الأيقونة يمين للحقل العربي */
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: $stb-text-muted;
    pointer-events: none;
    transition: color $transition-fast;
  }

  .form-input.with-icon {
    padding-right: $space-10; /* مساحة للأيقونة يمين */

    &:focus + .input-icon,
    &:not(:placeholder-shown) + .input-icon {
      color: $stb-accent;
    }
  }
}

.input-password {
  .form-input.with-icon {
    padding-left: $space-10; /* مساحة لزر العين يسار */
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
      color: $stb-text-primary;
    }
  }
}
</style>
