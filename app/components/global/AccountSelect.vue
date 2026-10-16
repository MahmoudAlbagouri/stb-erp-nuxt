<!--
  اختيار حساب من الشجرة: الحسابات مرتبة بالكود ومزاحة بمستواها. للقيود
  (`postable`) لا يُختار إلا الحساب الفرعي الفعّال؛ والتجميعية تظهر عناوين.
-->
<template>
  <select
    class="form-select account-select"
    :value="modelValue ?? ''"
    :required="required"
    :disabled="disabled"
    @change="onChange"
  >
    <option value="" :disabled="required">{{ placeholder }}</option>
    <option
      v-for="item in items"
      :key="item.account.id"
      :value="item.account.id"
      :disabled="!item.selectable"
    >
      {{ "  ".repeat(item.depth - 1) }}{{ item.account.code }} — {{ item.account.name }}{{ item.account.isActive ? "" : " (موقوف)" }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Account, AccountType } from "@/types/accounting";

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    accounts: Account[];
    /** حسابات يُرحَّل عليها فقط (فرعية فعّالة) */
    postable?: boolean;
    /** التجميعية فقط (أب لحساب جديد) */
    groupsOnly?: boolean;
    /** أنواع مسموحة (الأصول لحسابات طرق الدفع مثلاً) */
    types?: AccountType[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
  }>(),
  { placeholder: "اختر الحساب…" },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const items = computed(() => {
  const byId = new Map(props.accounts.map((a) => [a.id, a]));
  const depthOf = (account: Account) => {
    let depth = 1;
    let parent = account.parentId ? byId.get(account.parentId) : undefined;
    while (parent && depth < 20) {
      depth++;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return depth;
  };
  return props.accounts
    .filter((a) => !props.types || props.types.includes(a.type))
    .filter((a) => !props.groupsOnly || a.isGroup)
    .map((account) => ({
      account,
      depth: depthOf(account),
      selectable: props.groupsOnly
        ? account.isGroup
        : !props.postable || (!account.isGroup && account.isActive),
    }));
});

const onChange = (event: Event) =>
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
</script>

<style scoped>
.account-select {
  font-variant-numeric: tabular-nums;
}
</style>
