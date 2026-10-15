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
      <section class="doc-section">
        <h4 class="doc-section__title">ضريبة القيمة المضافة</h4>
        <label class="checkbox-label">
          <input v-model="form.vatRegistered" type="checkbox" />
          <span>المنشأة مسجّلة في ضريبة القيمة المضافة</span>
        </label>
        <p class="doc-hint">
          <template v-if="form.vatRegistered">
            الفواتير ضريبية: تُحسب ضريبة كل صنف حسب نسبته، ويُطبع الرقم الضريبي
            ورمز QR لهيئة الزكاة والضريبة والجمارك.
          </template>
          <template v-else>
            منشأة غير مسجّلة (مثل المنشآت دون حد التسجيل الإلزامي): الفواتير
            بعنوان «فاتورة مبيعات» <strong>بلا ضريبة</strong> على أي صنف، وبلا رقم
            ضريبي ولا رمز QR. ضريبة المشتريات لا تُسترد فتدخل في تكلفة البضاعة.
            نسب الضريبة على الأصناف تبقى كما هي وتعود للعمل إن سجّلت المنشأة.
          </template>
        </p>
        <div v-if="form.vatRegistered && !form.taxNumber" class="doc-note">
          <Info :size="16" />
          <span>أدخل الرقم الضريبي للمنشأة (أدناه) — يُطبع على كل فاتورة وفي رمز QR.</span>
        </div>

        <label v-if="form.vatRegistered" class="checkbox-label">
          <input v-model="form.pricesIncludeTax" type="checkbox" />
          <span>أسعار البيع شاملة الضريبة</span>
        </label>
        <p v-if="form.vatRegistered" class="doc-hint">
          {{
            form.pricesIncludeTax
              ? "السعر على الرف هو ما يدفعه العميل، والضريبة جزء منه. يناسب البيع للأفراد."
              : "الضريبة تُضاف فوق السعر عند البيع (البيع بالجملة للشركات). يسري على شاشة الكاشير، وهو الافتراضي لفواتير لوحة التحكم."
          }}
        </p>
        <p class="doc-hint">
          التغيير يسري على الفواتير الجديدة فقط — الصادرة تبقى كما صدرت. شاشات
          الكاشير تعرفه مع أول اتصال لها.
        </p>
      </section>

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

      <template v-if="hasFeature('pos_module')">
        <section class="doc-section">
          <h4 class="doc-section__title">شاشة الكاشير: موافقة المشرف</h4>
          <p class="doc-hint">
            ما يُحدَّد هنا يطلب رقم مشرف السري على شاشة الكاشير (المشرف يُعيَّن من
            صفحة الكاشيرات). الخصم فوق حد الكاشير والبيع تحت أقل سعر يحتاجان
            موافقة دائماً. يُسجَّل كل ذلك في «تدقيق الكاشير».
          </p>
          <label class="checkbox-label">
            <input v-model="pos.approvals.void" type="checkbox" />
            <span>حذف سطر من السلة، إفراغها، أو حذف فاتورة معلّقة</span>
          </label>
          <label class="checkbox-label">
            <input v-model="pos.approvals.cashOut" type="checkbox" />
            <span>سحب نقد من الدرج</span>
          </label>
          <label class="checkbox-label">
            <input v-model="pos.approvals.manualDrawer" type="checkbox" />
            <span>فتح الدرج بلا بيع</span>
          </label>
          <label class="checkbox-label">
            <input v-model="pos.approvals.priceChange" type="checkbox" />
            <span>
              تغيير سعر صنف في الفاتورة — بدونها يغيّره الكاشير بنفسه في حدود خصمه
              (إن ملك الصلاحية)
            </span>
          </label>
        </section>

        <section class="doc-section">
          <h4 class="doc-section__title">شاشة الكاشير: باركود الميزان</h4>
          <label class="checkbox-label">
            <input v-model="pos.scale.enabled" type="checkbox" />
            <span>الميزان يطبع باركوداً يحمل الوزن أو السعر (خضار، لحوم، عطارة)</span>
          </label>
          <div v-if="pos.scale.enabled" class="doc-grid">
            <div class="form-group">
              <label>بادئات الباركود الموزون</label>
              <input
                v-model.trim="scalePrefixes"
                class="form-input"
                dir="ltr"
                placeholder="20,21,22"
              />
              <small class="doc-hint">خانتان لكل بادئة، بينها فاصلة.</small>
            </div>
            <div class="form-group">
              <label>خانات كود الصنف</label>
              <select v-model.number="pos.scale.itemDigits" class="form-select">
                <option :value="4">4</option>
                <option :value="5">5 (الشائع)</option>
                <option :value="6">6</option>
              </select>
            </div>
            <div class="form-group">
              <label>الباركود يحمل</label>
              <select v-model="pos.scale.valueType" class="form-select">
                <option value="weight">الوزن</option>
                <option value="price">السعر الإجمالي</option>
              </select>
            </div>
            <div class="form-group">
              <label>خانات الكسر في القيمة</label>
              <select v-model.number="pos.scale.valueDecimals" class="form-select">
                <option :value="0">0</option>
                <option :value="1">1</option>
                <option :value="2">2 (سعر بالهللة)</option>
                <option :value="3">3 (وزن بالجرام)</option>
              </select>
            </div>
            <p class="doc-hint doc-grid__full">
              مثال: <span dir="ltr">{{ scaleExample }}</span>. الصنف يُعرَّف بكوده
              أو بباركود يساوي كود الميزان.
            </p>
          </div>
        </section>
      </template>

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
import { computed, onMounted, reactive, ref } from "vue";
import { Info, Save } from "lucide-vue-next";
import { useSalesStore } from "@/stores/sales";
import { useAccess } from "@/composables/useAccess";
import { useToast } from "@/composables/useToast";
import type { PosOptions } from "@/pos/types";

definePageMeta({ middleware: "auth" });

const store = useSalesStore();
const toast = useToast();
const { hasFeature } = useAccess();

const loading = ref(true);
const saving = ref(false);
const form = reactive({
  sellerName: "",
  taxNumber: "",
  commercialRegister: "",
  address: "",
  phone: "",
  invoiceFooter: "",
  vatRegistered: true,
  pricesIncludeTax: true,
});

/** إعدادات الكاشير (الافتراضي حتى تُحمَّل المحفوظة) */
const pos = reactive<PosOptions>({
  scale: {
    enabled: false,
    prefixes: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29"],
    itemDigits: 5,
    valueType: "weight",
    valueDecimals: 3,
  },
  approvals: {
    void: false,
    cashOut: false,
    manualDrawer: false,
    priceChange: false,
  },
});
const scalePrefixes = ref(pos.scale.prefixes.join(","));

/** شكل الباركود بالإعداد الحالي: بادئة + كود الصنف + القيمة + خانة تحقق */
const scaleExample = computed(() => {
  const valueDigits = 10 - pos.scale.itemDigits;
  const prefix = scalePrefixes.value.split(",")[0]?.trim() || "21";
  return `${prefix} ${"I".repeat(pos.scale.itemDigits)} ${"V".repeat(valueDigits)} C`;
});

const save = async () => {
  const prefixes = scalePrefixes.value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (pos.scale.enabled && (!prefixes.length || prefixes.some((p) => !/^\d{2}$/.test(p)))) {
    toast.warning("بادئات الميزان: خانتان رقميتان لكل بادئة، بينها فاصلة");
    return;
  }
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
      vatRegistered: form.vatRegistered,
      // غير المسجّلة لا ضريبة عندها أصلاً: الأساس يبقى كما حُفظ
      pricesIncludeTax: form.pricesIncludeTax,
      posOptions: {
        scale: { ...pos.scale, prefixes: prefixes.length ? prefixes : pos.scale.prefixes },
        approvals: { ...pos.approvals },
      },
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
      vatRegistered: settings?.vatRegistered ?? true,
      pricesIncludeTax: settings?.pricesIncludeTax ?? true,
    });
    Object.assign(pos.scale, settings?.posOptions?.scale ?? {});
    Object.assign(pos.approvals, settings?.posOptions?.approvals ?? {});
    scalePrefixes.value = pos.scale.prefixes.join(",");
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
