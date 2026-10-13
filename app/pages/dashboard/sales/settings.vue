<!-- pages/dashboard/sales/settings.vue — إعدادات الفوترة: بيانات البائع على الفاتورة -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>إعدادات الفوترة</h1>
        <p>بيانات منشأتك كما تُطبع على فواتير البيع وتدخل في رمز QR</p>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <form v-else class="card settings-card doc-form" @submit.prevent="save">
      <div v-if="!form.taxNumber" class="doc-note">
        <Info :size="16" />
        <span>
          بدون الرقم الضريبي تصدر الفواتير بلا رمز QR. إن كانت منشأتك مسجّلة في
          ضريبة القيمة المضافة فأدخل رقمها حتى تكون فواتيرك مطابقة لمتطلبات هيئة
          الزكاة والضريبة والجمارك.
        </span>
      </div>

      <section class="doc-section">
        <h4 class="doc-section__title">بيانات المنشأة</h4>
        <div class="doc-grid">
          <div class="form-group doc-grid__full">
            <label>اسم المنشأة</label>
            <input
              v-model.trim="form.sellerName"
              class="form-input"
              maxlength="200"
              placeholder="كما في شهادة التسجيل الضريبي"
            />
          </div>
          <div class="form-group">
            <label>الرقم الضريبي</label>
            <input
              v-model.trim="form.taxNumber"
              class="form-input"
              dir="ltr"
              inputmode="numeric"
              pattern="\d{15}"
              maxlength="15"
              placeholder="15 رقماً"
            />
          </div>
          <div class="form-group">
            <label>السجل التجاري</label>
            <input
              v-model.trim="form.commercialRegister"
              class="form-input"
              dir="ltr"
              maxlength="20"
            />
          </div>
          <div class="form-group">
            <label>الهاتف</label>
            <StbPhoneInput v-model="form.phone" />
          </div>
          <div class="form-group">
            <label>العنوان</label>
            <input v-model.trim="form.address" class="form-input" maxlength="300" />
          </div>
        </div>
      </section>

      <section class="doc-section">
        <h4 class="doc-section__title">الفاتورة المطبوعة</h4>
        <div class="form-group">
          <label>سطر أسفل الفاتورة</label>
          <input
            v-model.trim="form.invoiceFooter"
            class="form-input"
            maxlength="300"
            placeholder="مثال: الاسترجاع خلال 7 أيام بالفاتورة الأصلية — شكراً لزيارتكم"
          />
        </div>
      </section>

      <div class="settings-card__footer">
        <button
          type="submit"
          class="btn btn--primary"
          :class="{ 'btn--loading': saving }"
          :disabled="saving"
        >
          <Save :size="16" /> حفظ الإعدادات
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Info, Save } from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { useToast } from "@/composables/useToast";

definePageMeta({ middleware: "auth" });

const store = useSalesStore();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const form = reactive({
  sellerName: "",
  taxNumber: "",
  commercialRegister: "",
  address: "",
  phone: "",
  invoiceFooter: "",
});

const save = async () => {
  saving.value = true;
  try {
    // الحقل الفارغ يُرسل null ليُمسح من الإعدادات
    await store.updateSettings({
      sellerName: form.sellerName || null,
      taxNumber: form.taxNumber || null,
      commercialRegister: form.commercialRegister || null,
      address: form.address || null,
      phone: form.phone || null,
      invoiceFooter: form.invoiceFooter || null,
    });
    toast.success("تم حفظ إعدادات الفوترة");
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الإعدادات"));
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    const settings = await store.fetchSettings(true);
    Object.assign(form, {
      sellerName: settings?.sellerName ?? "",
      taxNumber: settings?.taxNumber ?? "",
      commercialRegister: settings?.commercialRegister ?? "",
      address: settings?.address ?? "",
      phone: settings?.phone ?? "",
      invoiceFooter: settings?.invoiceFooter ?? "",
    });
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الإعدادات"));
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.settings-card {
  max-width: 820px;
  padding: $space-5;

  &__footer {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
