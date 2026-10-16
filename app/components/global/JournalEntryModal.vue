<!--
  عرض قيد بأسطره (الحساب، الفرع، الطرف، المدين والدائن). القيد اليدوي
  والافتتاحي يُعكسان من هنا بقيد معاكس؛ قيود المستندات تُصحَّح بمستنداتها.
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="entryId" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal journal-modal">
          <div class="modal__header">
            <h3>
              <BookOpen :size="20" class="doc-modal__icon" />
              {{ entry ? `القيد ${entry.number}` : "القيد" }}
            </h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div v-if="!entry" class="empty-state"><div class="spinner" /></div>

          <div v-else class="doc-form">
            <div class="doc-info">
              <div class="doc-cell">
                <span class="doc-cell__sub">التاريخ</span>
                <span class="doc-num">{{ entry.date }}</span>
                <span v-if="entry.documentDate" class="doc-cell__sub">
                  تاريخ المستند {{ entry.documentDate }} (الفترة كانت مقفلة)
                </span>
              </div>
              <div class="doc-cell">
                <span class="doc-cell__sub">المصدر</span>
                <span>
                  {{ JOURNAL_SOURCE_LABEL[entry.sourceType] }}
                  <code v-if="entry.sourceRef" class="doc-code">{{ entry.sourceRef }}</code>
                </span>
              </div>
              <div class="doc-cell">
                <span class="doc-cell__sub">الإجمالي</span>
                <span class="doc-num doc-num--strong">{{ formatMoney(entry.total) }}</span>
              </div>
              <div class="doc-cell">
                <span class="doc-cell__sub">الحالة</span>
                <span v-if="entry.reversedById" class="badge doc-status--cancelled">معكوس</span>
                <span v-else-if="entry.reversalOfId" class="badge doc-status--progress">قيد عكسي</span>
                <span v-else class="badge doc-status--done">مُرحَّل</span>
              </div>
            </div>
            <p class="journal-modal__description">{{ entry.description }}</p>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th>البيان</th>
                    <th>الفرع</th>
                    <th>الطرف</th>
                    <th>مدين</th>
                    <th>دائن</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in entry.lines" :key="line.id">
                    <td>
                      <code class="doc-code">{{ line.accountCode }}</code>
                      {{ line.accountName }}
                    </td>
                    <td>{{ line.description || "—" }}</td>
                    <td>{{ line.branchName || "—" }}</td>
                    <td>
                      <template v-if="line.partyName">
                        <span class="doc-cell__sub">{{ PARTY_LABEL[line.partyType!] }}:</span>
                        {{ line.partyName }}
                      </template>
                      <template v-else>—</template>
                    </td>
                    <td class="doc-num">{{ line.debit ? formatMoney(line.debit) : "" }}</td>
                    <td class="doc-num">{{ line.credit ? formatMoney(line.credit) : "" }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th colspan="4">الإجمالي</th>
                    <th class="doc-num">{{ formatMoney(entry.total) }}</th>
                    <th class="doc-num">{{ formatMoney(entry.total) }}</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" @click="close">إغلاق</button>
              <template v-if="reversible">
                <StbDateInput v-model="reverseDate" class="journal-modal__date" />
                <button
                  v-can="'create_journal_entries'"
                  type="button"
                  class="btn btn--danger"
                  :class="{ 'btn--loading': reversing }"
                  :disabled="reversing || !reverseDate"
                  @click="reverse"
                >
                  <Undo2 :size="16" /> عكس القيد
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { BookOpen, Undo2, X } from "lucide-vue-next";
import { useAccountingStore } from "@/stores/accounting";
import { useToast } from "@/composables/useToast";
import {
  JOURNAL_SOURCE_LABEL,
  PARTY_LABEL,
  type JournalEntryView,
} from "@/types/accounting";

const props = defineProps<{ entryId: string | null }>();
const emit = defineEmits<{
  "update:entryId": [value: string | null];
  reversed: [];
}>();

const store = useAccountingStore();
const toast = useToast();
const entry = ref<JournalEntryView | null>(null);
const reverseDate = ref(companyToday());
const reversing = ref(false);

const reversible = computed(
  () =>
    !!entry.value &&
    (entry.value.sourceType === "manual" || entry.value.sourceType === "opening") &&
    !entry.value.reversedById &&
    !entry.value.reversalOfId,
);

const close = () => emit("update:entryId", null);

watch(
  () => props.entryId,
  async (id) => {
    entry.value = null;
    if (!id) return;
    try {
      entry.value = await store.getJournal(id);
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر تحميل القيد"));
      close();
    }
  },
  { immediate: true },
);

const reverse = async () => {
  if (!entry.value) return;
  reversing.value = true;
  try {
    const reversal = await store.reverseJournal(entry.value.id, reverseDate.value);
    toast.success(`سُجّل القيد العكسي ${reversal.number}`);
    emit("reversed");
    close();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر عكس القيد"));
  } finally {
    reversing.value = false;
  }
};
</script>

<style lang="scss" scoped>
.modal.journal-modal {
  max-width: 1000px;
}
.journal-modal__description {
  margin: 0;
  color: $stb-text-secondary;
}
.journal-modal__date {
  max-width: 170px;
}
</style>
