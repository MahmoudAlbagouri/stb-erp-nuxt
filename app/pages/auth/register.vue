<template>
  <div class="auth-card" style="max-width: 520px">
    <!-- ✅ استبدال SVG بالصورة -->
    <div class="auth-card__logo">
      <img src="/images/logo.png" alt="STB HR Logo" />
    </div>

    <h1 class="auth-card__title">إنشاء حساب جديد</h1>
    <p class="auth-card__subtitle">سجّل شركتك في منصة STB ERP</p>

    <div v-if="auth.error" class="auth-error">{{ auth.error }}</div>

    <form class="auth-form" @submit.prevent="handleRegister">
      <div class="auth-form__section">
        <Building2 :size="14" />
        <span>بيانات الشركة</span>
      </div>

      <div class="form-group">
        <label>اسم الشركة *</label>
        <div class="input-wrapper">
          <Briefcase :size="18" class="input-icon" />
          <input
            v-model="form.companyName"
            type="text"
            class="form-input with-icon"
            placeholder="شركة المستقبل التقنية"
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label>الدولة *</label>
        <div class="input-wrapper">
          <Globe :size="18" class="input-icon" />
          <select
            v-model="form.country"
            class="form-select with-icon"
            required
          >
            <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">
              {{ c.nameAr }}
            </option>
          </select>
        </div>
        <p class="auth-form__hint">
          <Coins :size="14" />
          <span>
            عملة الحساب:
            <strong>
              {{ selectedCountry.currencyNameAr }} ({{
                selectedCountry.currencySymbol
              }})
            </strong>
            — تُحدَّد حسب الدولة ولا يمكن تغييرها لاحقاً
          </span>
        </p>
      </div>

      <div class="form-group">
        <label>رقم الهاتف</label>
        <StbPhoneInput v-model="form.phone" :country="form.country" />
      </div>

      <div class="form-group">
        <label>العنوان</label>
        <div class="input-wrapper">
          <MapPin :size="18" class="input-icon" />
          <input
            v-model="form.address"
            type="text"
            class="form-input with-icon"
            placeholder="المدينة - الحي - الشارع"
          />
        </div>
      </div>

      <div class="form-group">
        <label>شعار الشركة (اختياري)</label>
        <CompanyLogoPicker
          v-model="logo"
          hint="يظهر على الفواتير والتقارير. تقدر تضيفه أو تغيّره لاحقاً من الملف الشخصي."
        />
      </div>

      <div class="auth-form__section">
        <UserCog :size="14" />
        <span>بيانات المدير</span>
      </div>

      <div class="form-group">
        <label>اسم المستخدم *</label>
        <div class="input-wrapper">
          <AtSign :size="18" class="input-icon" />
          <input
            v-model="form.username"
            type="text"
            class="form-input with-icon"
            placeholder="admin_sara"
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label>البريد الإلكتروني *</label>
        <div class="input-wrapper">
          <Mail :size="18" class="input-icon" />
          <input
            v-model="form.email"
            type="email"
            class="form-input with-icon"
            placeholder="sara@company.com"
            required
          />
        </div>
      </div>

      <!-- ✅ حقل كلمة المرور مع زر الإظهار والإخفاء -->
      <div class="form-group">
        <label>كلمة المرور *</label>
        <div class="input-password">
          <Lock :size="18" class="input-icon" />
          <input
            v-model="form.password"
            :type="showPass ? 'text' : 'password'"
            class="form-input with-icon"
            placeholder="••••••••"
            minlength="6"
            required
          />
          <button
            type="button"
            class="input-password__toggle"
            @click="showPass = !showPass"
            aria-label="إظهار أو إخفاء كلمة المرور"
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
        <span v-else>إنشاء الحساب</span>
      </button>
    </form>

    <p class="auth-card__footer">
      لديك حساب بالفعل؟ <NuxtLink to="/auth/login">تسجيل الدخول</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
// ✅ استيراد الأيقونات المطلوبة
import {
  Building2,
  Briefcase,
  Globe,
  Coins,
  MapPin,
  UserCog,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-vue-next";

definePageMeta({ layout: "auth", middleware: "auth" });

const auth = useAuthStore();
const showPass = ref(false); // ✅ حالة إظهار/إخفاء الباسورد
const form = reactive({
  companyName: "",
  // من الدولة تُحدَّد عملة الحساب ومفتاح الهاتف
  country: DEFAULT_COUNTRY_CODE,
  phone: "",
  address: "",
  username: "",
  email: "",
  password: "",
});

const selectedCountry = computed(() => getCountry(form.country));
/** شعار مصغّر جاهز للرفع بعد إنشاء الحساب (null = بلا شعار) */
const logo = ref<string | null>(null);

const handleRegister = async () => {
  await auth.register({ ...form, phone: form.phone || undefined }, logo.value);
};
</script>

<style lang="scss">
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.auth-form__section {
  @include flex(row, center, flex-start, $space-2);
  font-size: $font-size-xs;
  font-weight: 700;
  color: $stb-accent;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-bottom: $space-2;
  border-bottom: 1px solid rgba($stb-accent, 0.2);
  margin-top: $space-2;
}

.auth-form__hint {
  @include flex(row, center, flex-start, $space-2);
  margin-top: $space-2;
  font-size: $font-size-xs;
  color: $stb-text-muted;

  strong {
    color: $stb-accent;
  }
}

/* تنسيق الحقول العادية */
.input-wrapper {
  position: relative;

  .form-select.with-icon {
    padding-right: $space-10;
  }

  .input-icon {
    position: absolute;
    right: $space-4;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: $stb-text-muted;
    pointer-events: none;
    transition: color $transition-fast;
  }

  .form-input.with-icon {
    padding-right: $space-10;

    &:focus ~ .input-icon {
      color: $stb-accent;
    }
  }
}

/* ✅ تنسيق خاص لحقل كلمة المرور ليحتوي الزر */
.input-password {
  position: relative;

  .input-icon {
    position: absolute;
    right: $space-4;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: $stb-text-muted;
    pointer-events: none;
    transition: color $transition-fast;
  }

  .form-input.with-icon {
    padding-right: $space-10; /* مساحة لأيقونة القفل يمين */
    padding-left: $space-10; /* مساحة لزر العين يسار */

    &:focus ~ .input-icon {
      color: $stb-accent;
    }
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
