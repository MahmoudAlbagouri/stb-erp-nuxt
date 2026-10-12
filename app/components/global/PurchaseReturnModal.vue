<!--
  مرتجع شراء من فاتورة معتمدة: يعرض أسطر الفاتورة وما بقي منها للإرجاع،
  والمرتجع يرث السعر والضريبة من الفاتورة.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal">
          <div class="modal__header">
            <h3>
              <Undo2 :size="20" class="doc-modal__icon" />
              مرتجع شراء
              <template v-if="invoice">من الفاتورة {{ invoice.number }}</template>
            </h3>
            <button
              class="btn btn--icon btn--ghost"
              aria-label="إغلاق"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <div v-if="!invoice" class="empty-state">
            <div class="spinner spinner--lg" />
          </div>

          <form v-else class="doc-form" @submit.prevent="submit(false)">
            <div class="doc-grid">
              <div class="doc-cell">
                <span class="doc-cell__sub">المورد</span>
                <span class="doc-cell__main">{{ invoice.supplier?.name }}</span>
              </div>
              <div class="doc-cell">
                <span class="doc-cell__sub">يخرج من مخزن</span>
                <span class="doc-cell__main">{{ invoice.warehouse?.name }}</span>
              </div>
              <div class="form-group">
                <label>تاريخ المرتجع *</label>
                <StbDateInput
                  v-model="form.returnDate"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label>سبب الإرجاع</label>
                <input
                  v-model.trim="form.reason"
                  class="form-input"
                  maxlength="500"
                  placeholder="تالف، غير مطابق، منتهي الصلاحية..."
                />
              </div>
            </div>

            <div class="doc-lines" :style="{ '--doc-cols': COLS }">
              <div class="doc-lines__head">
                <span>الصنف</span>
                <span>المتاح للإرجاع</span>
                <span>الكمية المُرجعة</span>
                <span>القيمة</span>
              </div>
              <div v-if="!lines.length" class="doc-lines__empty">
                أُرجعت كل أصناف هذه الفاتورة بالفعل
              </div>
              <div v-for="line in lines" :key="line.id" class="doc-lines__row">
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ line.name }}</span>
                  <span class="doc-cell__sub">{{ line.unit }}</span>
                </div>
                <div>
                  <span class="doc-lines__label">المتاح للإرجاع</span>
                  <span class="doc-num doc-num--strong">
                    {{ formatNumber(line.available) }}
                  </span>
                </div>
                <div>
                  <span class="doc-lines__label">الكمية المُرجعة</span>
                  <StbNumberInput
                    v-model.number="line.quantity"
                    class="form-input"
                    min="0"
                    :max="line.available"
                    step="any"
                    placeholder="0"
                  />
                </div>
                <div>
                  <span class="doc-lines__label">القيمة</span>
                  <span class="doc-money">{{ formatCurrency(valueOf(line)) }}</span>
                </div>
              </div>
            </div>

            <div class="doc-totals">
              <span>إجمالي المرتجع (شامل الضريبة)</span>
              <strong class="doc-money">{{ formatCurrency(total) }}</strong>
            </div>

            <div class="doc-note">
              <Info :size="16" />
              <span>
                عند الاعتماد تخرج البضاعة من المخزن وينقص المستحق للمورد بقيمة
                المرتجع.
              </span>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">
                إلغاء
              </button>
              <button
                type="submit"
                class="btn btn--secondary"
                :disabled="submitting || total <= 0"
              >
                حفظ كمسودة
              </button>
              <button
                type="button"
                class="btn btn--primary"
                :class="{ 'btn--loading': submitting }"
                :disabled="submitting || total <= 0"
                @click="submitAndPost"
              >
                <CheckCheck :size="16" /> حفظ واعتماد
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { CheckCheck, Info, Undo2, X } from "lucide-vue-next";
import { usePurchasingStore } from "@/stores/purchasing";
import { useToast } from "@/composables/useToast";
import type { PurchaseInvoice } from "@/types/purchasing";

const props = defineProps<{
  modelValue: boolean;
  invoiceId: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const store = usePurchasingStore();
const toast = useToast();

const COLS = "2fr 0.9fr 1fr 0.9fr";

interface ReturnLine {
  id: string;
  name: string;
  unit: string;
  available: number;
  /** قيمة الوحدة الواحدة شاملة الضريبة (من سطر الفاتورة) */
  unitTotal: number;
  quantity: number | "";
}

const invoice = ref<PurchaseInvoice | null>(null);
const lines = ref<ReturnLine[]>([]);
const submitting = ref(false);
const form = reactive({ returnDate: "", reason: "" });

const valueOf = (line: ReturnLine) =>
  (Number(line.quantity) || 0) * line.unitTotal;

const total = computed(() => sumMoney(lines.value.map(valueOf)));

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.invoiceId) return;
    invoice.value = null;
    lines.value = [];
    form.returnDate = todayStamp();
    form.reason = "";
    try {
      const full = await store.getInvoice(props.invoiceId);
      lines.value = (full.lines ?? [])
        .map((line) => ({
          id: line.id,
          name: line.product?.name ?? "",
          unit: line.unit?.name ?? "",
          available: line.quantity - line.returnedQuantity,
          unitTotal: line.total / line.quantity,
          quantity: "" as number | "",
        }))
        .filter((line) => line.available > 0);
      invoice.value = full;
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر تحميل الفاتورة"));
      emit("update:modelValue", false);
    }
  },
);

const close = () => {
  if (!submitting.value) emit("update:modelValue", false);
};

/** يحفظ المرتجع كمسودة، ثم يعتمده إن طُلب */
const submit = async (post: boolean) => {
  if (!invoice.value) return;
  submitting.value = true;
  let savedNumber = "";
  try {
    const saved = await store.createReturn({
      invoiceId: invoice.value.id,
      returnDate: form.returnDate,
      reason: form.reason || undefined,
      lines: lines.value
        .filter((l) => Number(l.quantity) > 0)
        .map((l) => ({ invoiceLineId: l.id, quantity: Number(l.quantity) })),
    });
    savedNumber = saved.number;

    if (post) {
      await store.postReturn(saved.id);
      toast.success(`تم اعتماد المرتجع ${saved.number}`);
    } else {
      toast.success(`تم حفظ المرتجع ${saved.number} كمسودة`);
    }
    emit("update:modelValue", false);
    emit("saved");
  } catch (e) {
    if (savedNumber) {
      // المسودة حُفظت وفشل الاعتماد: لا نكرر إنشاءها
      toast.error(
        `${getErrorMessage(e, "تعذر اعتماد المرتجع")} — حُفظ كمسودة برقم ${savedNumber}`,
      );
      emit("update:modelValue", false);
      emit("saved");
    } else {
      toast.error(getErrorMessage(e, "تعذر حفظ المرتجع"));
    }
  } finally {
    submitting.value = false;
  }
};

const submitAndPost = (event: MouseEvent) => {
  const formEl = (event.currentTarget as HTMLElement).closest("form");
  if (formEl && !formEl.reportValidity()) return;
  submit(true);
};
</script>
