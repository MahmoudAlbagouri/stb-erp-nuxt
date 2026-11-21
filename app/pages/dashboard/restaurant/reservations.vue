<!-- pages/dashboard/restaurant/reservations.vue — حجوزات الطاولات ليوم -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الحجوزات</h1>
        <p>حجوزات اليوم بطاولاتها، وما حدث فعلاً: جلس، أنهى، ألغى، لم يحضر</p>
      </div>
      <div class="page-header__actions">
        <StbDateInput v-model="date" class="form-input" @update:model-value="load" />
        <button v-can="'manage_reservations'" class="btn btn--primary" @click="open()"><Plus :size="18" /> حجز</button>
      </div>
    </div>

    <div v-if="loading" class="empty-state"><div class="spinner spinner--lg" /></div>
    <div v-else-if="!rows.length" class="card"><div class="empty-state">
      <CalendarCheck :size="44" class="empty-state__icon" />
      <div class="empty-state__title">لا حجوزات في هذا اليوم</div>
    </div></div>
    <div v-else class="card doc-table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>الوقت</th><th>الضيف</th><th>العدد</th><th>الطاولة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="doc-num">{{ formatTime(r.reservedAt) }} <small>({{ r.durationMinutes }} د)</small></td>
              <td>
                <div class="doc-cell">
                  <span class="doc-cell__main">{{ r.customerName }}</span>
                  <span class="doc-cell__sub" dir="ltr">{{ r.phone }}</span>
                </div>
              </td>
              <td class="doc-num">{{ r.guestCount }}</td>
              <td>{{ r.table?.name ?? "—" }}</td>
              <td><span :class="['badge', `doc-status--${STATUS[r.status].tone}`]">{{ STATUS[r.status].label }}</span></td>
              <td>
                <div v-can="'manage_reservations'" class="doc-actions">
                  <template v-if="r.status === 'booked'">
                    <button class="btn btn--sm btn--primary" @click="setStatus(r, 'seated')">جلس</button>
                    <button class="btn btn--sm btn--ghost" @click="open(r)"><Pencil :size="14" /></button>
                    <button class="btn btn--sm btn--ghost" @click="setStatus(r, 'no_show')">لم يحضر</button>
                    <button class="btn btn--sm btn--danger" @click="setStatus(r, 'cancelled')">إلغاء</button>
                  </template>
                  <button v-else-if="r.status === 'seated'" class="btn btn--sm btn--success" @click="setStatus(r, 'completed')">أنهى</button>
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
              <h3><CalendarCheck :size="20" class="doc-modal__icon" /> {{ form.id ? "تعديل حجز" : "حجز جديد" }}</h3>
              <button class="btn btn--icon btn--ghost" @click="form = null"><X :size="20" /></button>
            </div>
            <form class="doc-form" @submit.prevent="save">
              <div class="doc-grid">
                <div class="form-group"><label>الاسم *</label><input v-model.trim="form.customerName" class="form-input" required maxlength="150" /></div>
                <div class="form-group"><label>الجوال</label><input v-model.trim="form.phone" class="form-input" dir="ltr" maxlength="30" /></div>
                <div class="form-group"><label>عدد الضيوف *</label><StbNumberInput v-model.number="form.guestCount" class="form-input" min="1" required /></div>
                <div class="form-group"><label>الوقت *</label><input v-model="form.time" type="time" class="form-input" required /></div>
                <div class="form-group"><label>المدة (دقيقة)</label><StbNumberInput v-model.number="form.durationMinutes" class="form-input" min="15" /></div>
                <div class="form-group">
                  <label>الطاولة</label>
                  <select v-model="form.tableId" class="form-select">
                    <option value="">بدون</option>
                    <option v-for="t in tables" :key="t.id" :value="t.id">{{ t.name }} ({{ t.seats }})</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>المصدر</label>
                  <select v-model="form.source" class="form-select">
                    <option value="phone">هاتف</option>
                    <option value="walk_in">حضور مباشر</option>
                    <option value="online">أونلاين</option>
                    <option value="other">آخر</option>
                  </select>
                </div>
                <div class="form-group doc-grid__full"><label>ملاحظة</label><input v-model.trim="form.note" class="form-input" maxlength="500" /></div>
              </div>
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
import { CalendarCheck, Pencil, Plus, X } from "lucide-vue-next";
import { useRestaurantStore } from "@/stores/restaurant";
import { useApi } from "@/composables/useApi";
import { useToast } from "@/composables/useToast";
import type { Reservation, ReservationStatus } from "@/types/restaurant";

definePageMeta({ middleware: "auth" });

const STATUS: Record<ReservationStatus, { label: string; tone: string }> = {
  booked: { label: "محجوز", tone: "info" },
  seated: { label: "جالس", tone: "progress" },
  completed: { label: "أنهى", tone: "done" },
  cancelled: { label: "ملغي", tone: "cancelled" },
  no_show: { label: "لم يحضر", tone: "cancelled" },
};

const store = useRestaurantStore();
const api = useApi();
const toast = useToast();
const date = ref(companyToday());
const rows = ref<Reservation[]>([]);
const tables = ref<{ id: string; name: string; seats: number }[]>([]);
const loading = ref(true);
const busy = ref(false);

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });

const load = async () => {
  loading.value = true;
  try {
    rows.value = await store.fetchReservations(date.value);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل الحجوزات"));
  } finally {
    loading.value = false;
  }
};

const form = ref<{
  id?: string;
  customerName: string;
  phone: string;
  guestCount: number | "";
  time: string;
  durationMinutes: number | "";
  tableId: string;
  source: string;
  note: string;
} | null>(null);

const open = (r?: Reservation) => {
  form.value = {
    id: r?.id,
    customerName: r?.customerName ?? "",
    phone: r?.phone ?? "",
    guestCount: r?.guestCount ?? 2,
    time: r ? new Date(r.reservedAt).toTimeString().slice(0, 5) : "20:00",
    durationMinutes: r?.durationMinutes ?? 90,
    tableId: r?.tableId ?? "",
    source: r?.source ?? "phone",
    note: r?.note ?? "",
  };
};

const save = async () => {
  const f = form.value!;
  busy.value = true;
  try {
    await store.saveReservation(
      {
        customerName: f.customerName,
        phone: f.phone || undefined,
        guestCount: Number(f.guestCount),
        reservedAt: new Date(`${date.value}T${f.time}:00`).toISOString(),
        durationMinutes: Number(f.durationMinutes) || 90,
        tableId: f.tableId || null,
        source: f.source,
        note: f.note || undefined,
      },
      f.id,
    );
    toast.success("تم الحفظ");
    form.value = null;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر حفظ الحجز"));
  } finally {
    busy.value = false;
  }
};

const setStatus = async (r: Reservation, status: ReservationStatus) => {
  try {
    await store.setReservationStatus(r.id, status);
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تغيير الحالة"));
  }
};

onMounted(async () => {
  load();
  try {
    tables.value = (await api.get<{ id: string; name: string; seats: number }[]>("/pos/restaurant/tables")).data;
  } catch {
    // بلا طاولات: الحجز بلا طاولة
  }
});
</script>
