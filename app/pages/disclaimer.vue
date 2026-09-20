<template>
  <div class="disclaimer-card">
    <div class="disclaimer-card__logo">
      <img src="/images/logo.png" alt="STB HR Logo" />
    </div>

    <div class="disclaimer-card__badge">
      <ShieldCheck :size="24" />
    </div>

    <h1 class="disclaimer-card__title">الإقرار والموافقة على الشروط</h1>
    <p class="disclaimer-card__subtitle">
      خطوة أخيرة لإتمام تفعيل حسابك في نظام STB HR
    </p>

    <div v-if="auth.error" class="disclaimer-error">{{ auth.error }}</div>

    <div class="disclaimer-text">
      <p>
        أقر بأنني مسؤول عن استخدام حسابي في نظام STB HR، وألتزم بالمحافظة على
        سرية بيانات الدخول وعدم مشاركتها مع أي شخص. كما أتحمل مسؤولية جميع
        العمليات والبيانات التي تتم من خلال حسابي، وأوافق على أن شركة التقنية
        الذكية للأعمال STB غير مسؤولة عن أي استخدام ناتج عن إهمال أو إساءة
        استخدام أو مشاركة بيانات الدخول.
      </p>
    </div>

    <button
      type="button"
      class="btn btn--primary btn--full btn--lg"
      :disabled="auth.loading"
      @click="handleAccept"
    >
      <span v-if="auth.loading" class="spinner" />
      <span v-else>أقر وأوافق على الشروط</span>
    </button>

    <button
      type="button"
      class="disclaimer-card__logout"
      :disabled="auth.loading"
      @click="auth.logout()"
    >
      <LogOut :size="14" />
      <span>تسجيل الخروج</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { ShieldCheck, LogOut } from "lucide-vue-next";

// الحماية (منع غير المسجلين / من وافق مسبقاً) يتولاها middleware/auth.global.ts
definePageMeta({ layout: "auth" });

const auth = useAuthStore();

const handleAccept = async () => {
  try {
    await auth.acceptDisclaimer();
  } catch {
    // الخطأ ظاهر للمستخدم عبر auth.error
  }
};
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.disclaimer-card {
  @include glass-card;
  width: 100%;
  max-width: 560px;
  padding: $space-10 $space-8;
  position: relative;
  z-index: 1;
  animation: disclaimerIn 0.4s ease;

  &__logo {
    @include flex(row, center, center);
    margin-bottom: $space-4;

    img {
      width: 70px;
      height: auto;
      filter: drop-shadow(0 0 12px rgba($stb-accent, 0.3));
    }
  }

  &__badge {
    @include flex(row, center, center);
    width: 52px;
    height: 52px;
    margin: 0 auto $space-4;
    border-radius: 50%;
    color: $stb-accent;
    background: rgba($stb-accent, 0.12);
    border: 1px solid rgba($stb-accent, 0.3);
    animation: disclaimerPulse 2.6s ease-in-out infinite;
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
    margin-bottom: $space-6;
  }

  &__logout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-2;
    width: 100%;
    margin-top: $space-4;
    padding: $space-2;
    background: none;
    border: none;
    cursor: pointer;
    font-size: $font-size-xs;
    color: $stb-text-muted;
    transition: color $transition-fast;

    &:hover:not(:disabled) {
      color: $stb-text-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.disclaimer-text {
  padding: $space-5;
  margin-bottom: $space-6;
  border-radius: $radius-md;
  background: rgba($stb-accent, 0.06);
  border: 1px solid rgba($stb-accent, 0.2);
  border-inline-start: 3px solid $stb-accent;

  p {
    margin: 0;
    font-size: $font-size-sm;
    line-height: 2;
    color: $stb-text-primary;
    text-align: justify;
  }
}

.disclaimer-error {
  background: rgba($stb-danger, 0.1);
  border: 1px solid rgba($stb-danger, 0.3);
  color: $stb-danger;
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  margin-bottom: $space-4;
  text-align: center;
}

@keyframes disclaimerIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes disclaimerPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba($stb-accent, 0.35);
  }
  50% {
    box-shadow: 0 0 0 10px rgba($stb-accent, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .disclaimer-card,
  .disclaimer-card__badge {
    animation: none;
  }
}
</style>
