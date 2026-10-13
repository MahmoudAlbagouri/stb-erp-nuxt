<!--
  PosApprovalModal — موافقة مشرف برقمه السري على ما يتجاوز صلاحية الكاشير.
  التحقق على الجهاز نفسه (يعمل بلا إنترنت). الاستخدام:
    const approvedBy = await approval.value.request("سبب الطلب");  // الاسم أو null
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="modal-overlay" @click.self="cancel">
        <div class="modal doc-modal doc-modal--sm">
          <div class="modal__header">
            <h3><ShieldCheck :size="20" class="doc-modal__icon" /> موافقة مشرف</h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="cancel">
              <X :size="20" />
            </button>
          </div>

          <form class="doc-form" @submit.prevent="submit">
            <p class="pos-note">{{ reason }}</p>

            <p v-if="!pos.supervisors.length" class="form-error">
              لا يوجد مشرف معرّف — عيّن كاشيراً «مشرفاً» من صفحة الكاشيرات في لوحة
              التحكم.
            </p>
            <template v-else>
              <div class="form-group">
                <label>المشرف</label>
                <div class="pos-cashiers">
                  <button
                    v-for="s in pos.supervisors"
                    :key="s.id"
                    type="button"
                    class="pos-cashiers__item"
                    :class="{ 'is-active': supervisorId === s.id }"
                    @click="pick(s.id)"
                  >
                    <UserRound :size="16" />
                    <span>{{ s.name }}</span>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label>الرقم السري للمشرف</label>
                <input
                  ref="pinEl"
                  v-model="pin"
                  type="password"
                  inputmode="numeric"
                  autocomplete="off"
                  class="form-input pos-pin"
                  maxlength="6"
                  placeholder="••••"
                  required
                  @input="pin = pin.replace(/\D/g, '')"
                />
              </div>
            </template>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="cancel">إلغاء</button>
              <button
                type="submit"
                class="btn btn--primary"
                :class="{ 'btn--loading': checking }"
                :disabled="checking || !pos.supervisors.length"
              >
                موافقة
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import { ShieldCheck, UserRound, X } from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import { verifyCashierPin } from "@/pos/cashiers";
import { usePosStore } from "@/stores/pos";

const pos = usePosStore();
const toast = useToast();

const open = ref(false);
const reason = ref("");
const supervisorId = ref("");
const pin = ref("");
const checking = ref(false);
const pinEl = ref<HTMLInputElement | null>(null);
let settle: ((approvedBy: string | null) => void) | null = null;

const focusPin = async () => {
  await nextTick();
  pinEl.value?.focus();
};

const pick = (id: string) => {
  supervisorId.value = id;
  pin.value = "";
  void focusPin();
};

const finish = (approvedBy: string | null) => {
  open.value = false;
  pin.value = "";
  settle?.(approvedBy);
  settle = null;
};

const cancel = () => {
  // رفض الموافقة يُسجَّل: محاولة تجاوز لم تكتمل
  void pos.logAudit("approval_denied", { details: reason.value });
  finish(null);
};

const submit = async () => {
  const supervisor = pos.supervisors.find((s) => s.id === supervisorId.value);
  if (!supervisor) {
    toast.warning("اختر المشرف");
    return;
  }
  checking.value = true;
  try {
    if (await verifyCashierPin(supervisor, pin.value)) {
      finish(supervisor.name);
    } else {
      pin.value = "";
      toast.error("الرقم السري غير صحيح");
    }
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحقق"));
  } finally {
    checking.value = false;
  }
};

/** يطلب موافقة مشرف. يعيد اسمه، أو null إن أُلغي الطلب */
const request = (why: string): Promise<string | null> => {
  settle?.(null);
  reason.value = why;
  pin.value = "";
  supervisorId.value = pos.supervisors.length === 1 ? pos.supervisors[0]!.id : "";
  open.value = true;
  if (supervisorId.value) void focusPin();
  return new Promise((resolve) => {
    settle = resolve;
  });
};

defineExpose({ request, isOpen: open });
</script>
