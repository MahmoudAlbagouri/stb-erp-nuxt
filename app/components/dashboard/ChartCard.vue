<!--
  كرت رسم بياني: عنوان + الرسم + نسخة جدول من نفس البيانات.
  الجدول ليس زينة: هو الطريق لقراءة القيم بلا اعتماد على اللون أو على تحريك
  المؤشر فوق الرسم (قارئ شاشة، عمى ألوان، شاشة لمس).
-->
<template>
  <section class="chart-card card">
    <header class="chart-card__header">
      <div class="chart-card__titles">
        <h2 class="chart-card__title">{{ title }}</h2>
        <p v-if="subtitle" class="chart-card__subtitle">{{ subtitle }}</p>
      </div>
      <div class="chart-card__actions">
        <slot name="actions" />
        <button
          v-if="table && !empty"
          type="button"
          class="chart-card__toggle"
          :aria-pressed="showTable"
          :title="showTable ? 'عرض الرسم' : 'عرض البيانات كجدول'"
          @click="showTable = !showTable"
        >
          <component :is="showTable ? ChartNoAxesColumn : Table2" :size="15" />
          <span>{{ showTable ? "رسم" : "جدول" }}</span>
        </button>
      </div>
    </header>

    <div v-if="empty" class="chart-card__empty">
      <component :is="emptyIcon" :size="30" />
      <span>{{ emptyText }}</span>
    </div>

    <div v-else-if="showTable && table" class="chart-card__table table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="head in table.headers" :key="head">{{ head }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in table.rows" :key="index">
            <td v-for="(cell, cellIndex) in row" :key="cellIndex">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="chart-card__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, type Component } from "vue";
import { ChartNoAxesColumn, Inbox, Table2 } from "lucide-vue-next";

export interface ChartTable {
  headers: string[];
  rows: (string | number)[][];
}

withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    /** نفس بيانات الرسم كجدول */
    table?: ChartTable;
    /** لا بيانات في الفترة: رسالة بدل رسم فارغ */
    empty?: boolean;
    emptyText?: string;
    emptyIcon?: Component;
  }>(),
  { emptyText: "لا توجد بيانات في هذه الفترة", emptyIcon: () => Inbox },
);

const showTable = ref(false);
</script>

<style lang="scss" scoped>
@use "~/assets/scss/mixins" as *;

.chart-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: $space-5;

  &__header {
    @include flex(row, flex-start, space-between, $space-3);
    margin-bottom: $space-4;
  }

  &__titles {
    min-width: 0;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: 700;
    color: $stb-text-primary;
  }

  &__subtitle {
    margin-top: 2px;
    font-size: $font-size-xs;
    color: $stb-text-muted;
  }

  &__actions {
    @include flex(row, center, flex-end, $space-2);
    flex-shrink: 0;
  }

  &__toggle {
    @include flex(row, center, center, 4px);
    padding: 4px $space-2;
    border: 1px solid $stb-border;
    border-radius: $radius-md;
    background: transparent;
    color: $stb-text-secondary;
    font-family: inherit;
    font-size: $font-size-xs;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover,
    &[aria-pressed="true"] {
      border-color: $stb-accent;
      color: $stb-accent;
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
  }

  &__table {
    max-height: 300px;
    overflow: auto;
  }

  &__empty {
    @include flex(column, center, center, $space-2);
    flex: 1;
    min-height: 180px;
    color: $stb-text-muted;
    font-size: $font-size-sm;

    svg {
      opacity: 0.5;
    }
  }
}
</style>
