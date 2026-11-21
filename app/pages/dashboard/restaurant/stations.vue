<!-- pages/dashboard/restaurant/stations.vue — محطات المطبخ: كل محطة تجهّز أسطر تصنيفاتها -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>محطات المطبخ</h1>
        <p>كل محطة (شواية، مقلاة، مشروبات) تستلم أسطر تصنيفاتها من البون وتجهّزها وحدها — والبون جاهز حين تجهز كل محطاته</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/kitchen" class="btn btn--ghost"><ChefHat :size="16" /> شاشة المطبخ</NuxtLink>
        <button v-can="'manage_restaurant'" class="btn btn--primary" @click="open()"><Plus :size="18" /> محطة</button>
      </div>
    </div>

    <div v-if="!store.stations.length" class="card"><div class="empty-state">
      <Flame :size="44" class="empty-state__icon" />
      <div class="empty-state__title">لا محطات</div>
      <div class="empty-state__text">بلا محطات: المطبخ كله شاشة واحدة. أضف محطة لكل قسم يجهّز وحده</div>
    </div></div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>المحطة</th><th>التصنيفات</th><th>الوقت المستهدف</th><th>الحالة</th><th /></tr></thead>
          <tbody>
            <tr v-for="s in store.stations" :key="s.id">
              <td><strong>{{ s.name }}</strong></td>
              <td>{{ s.categoryIds.length ? s.categoryIds.map(categoryName).join("، ") : "ما لم تأخذه المحطات الأخرى" }}</td>
              <td class="doc-num">{{ s.targetMinutes ? `${s.targetMinutes} د` : "—" }}</td>
              <td><span :class="['badge', s.isActive ? 'badge--active' : 'badge--inactive']">{{ s.isActive ? "نشطة" : "موقوفة" }}</span></td>
              <td>
                <div class="doc-actions">
                  <NuxtLink :to="{ path: '/kitchen', query: { stationId: s.id } }" class="btn btn--sm btn--ghost">شاشتها</NuxtLink>
                  <button v-can="'manage_restaurant'" class="btn btn--sm btn--ghost" @click="open(s)"><Pencil :size="14" /></button>
                  <button v-can="'manage_restaurant'" class="btn btn--sm btn--danger btn--icon" @click="remove(s)"><Trash2 :size="14" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="form" class="modal-overlay" @click.self="form = null">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3><Flame :size="20" class="doc-modal__icon" /> {{ form.id ? "تعديل محطة" : "محطة جديدة" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="form = null"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="save">
              <div class="form-group">
                <label>الاسم *</label>
                <input v-model.trim="form.name" class="form-input" required maxlength="80" />
              </div>
              <div class="form-group">
                <label>الوقت المستهدف للتحضير (دقيقة)</label>
                <StbNumberInput v-model.number="form.targetMinutes" class="form-input" min="1" placeholder="اختياري" />
              </div>
              <div class="form-group">
                <label>التصنيفات</label>
                <div class="categories">
                  <label v-for="c in catalog.categories" :key="c.id" class="checkbox-label">
                    <input v-model="form.categoryIds" type="checkbox" :value="c.id" />
                    <span>{{ c.name }}</span>
                  </label>
                </div>
                <small class="doc-hint">بلا تصنيفات: تستلم كل ما لم تأخذه محطة أخرى</small>
              </div>
              <label class="checkbox-label"><input v-model="form.isActive" type="checkbox" /> <span>نشطة</span></label>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="form = null">إلغاء</button>
                <button type="submit" class="btn btn--primary" :disabled="busy">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ChefHat, Flame, Pencil, Plus, Trash2, X } from "lucide-vue-next";
import { useRestaurantStore } from "@/stores/restaurant";
import { useCatalogStore } from "@/stores/catalog";
import { useToast } from "@/composables/useToast";
import type { KitchenStation } from "@/types/restaurant";

definePageMeta({ middleware: "auth" });

const store = useRestaurantStore();
const catalog = useCatalogStore();
const toast = useToast();
const busy = ref(false);
const form = ref<{
  id?: string;
  name: string;
  targetMinutes: number | "";
  categoryIds: string[];
  isActive: boolean;
} | null>(null);

const categoryName = (id: string) => catalog.categories.find((c) => c.id === id)?.name ?? "—";

const open = (station?: KitchenStation) => {
  form.value = {
    id: station?.id,
    name: station?.name ?? "",
    targetMinutes: station?.targetMinutes ?? "",
    categoryIds: [...(station?.categoryIds ?? [])],
    isActive: station?.isActive ?? true,
  };
};

const save = async () => {
  const f = form.value!;
  busy.value = true;
  try {
    await store.saveStation(
      {
        name: f.name,
        targetMinutes: f.targetMinutes === "" ? null : Number(f.targetMinutes),
        categoryIds: f.categoryIds,
        isActive: f.isActive,
      },
      f.id,
    );
    toast.success("تم الحفظ");
    form.value = null;
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    busy.value = false;
  }
};

const remove = async (station: KitchenStation) => {
  if (!confirm(`حذف محطة "${station.name}"؟`)) return;
  try {
    await store.removeStation(station.id);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  }
};

onMounted(async () => {
  try {
    await Promise.all([store.fetchStations(), catalog.fetchSettings()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر التحميل"));
  }
});
</script>

<style lang="scss" scoped>
.categories {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
}
</style>
