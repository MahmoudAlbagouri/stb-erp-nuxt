<!-- pages/dashboard/delivery/agents.vue — الطيارون وشركات الشحن ومناطق التوصيل -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header__title">
        <h1>الطيارون وشركات الشحن</h1>
        <p>
          من يوصّل أوردراتك، وكم معه الآن من مالك — ومناطق التوصيل ورسومها على
          العميل
        </p>
      </div>
      <div class="page-header__actions">
        <button
          v-if="tab === 'agents'"
          v-can="'manage_delivery_agents'"
          class="btn btn--primary"
          @click="openAgent()"
        >
          <Plus :size="18" />
          <span>طيار / شركة شحن</span>
        </button>
        <button
          v-else
          v-can="'manage_delivery_agents'"
          class="btn btn--primary"
          @click="openZone()"
        >
          <Plus :size="18" />
          <span>منطقة</span>
        </button>
      </div>
    </div>

    <div class="doc-tabs">
      <button class="doc-tab" :class="{ 'is-active': tab === 'agents' }" @click="tab = 'agents'">
        الطيارون وشركات الشحن ({{ formatNumber(store.agents.length) }})
      </button>
      <button class="doc-tab" :class="{ 'is-active': tab === 'zones' }" @click="tab = 'zones'">
        مناطق التوصيل ({{ formatNumber(store.zones.length) }})
      </button>
    </div>

    <div v-if="loading && !store.agents.length && !store.zones.length" class="empty-state">
      <div class="spinner spinner--lg" />
    </div>

    <!-- ══ الجهات ══ -->
    <template v-else-if="tab === 'agents'">
      <div v-if="!store.agents.length" class="card">
        <div class="empty-state">
          <Bike :size="44" class="empty-state__icon" />
          <div class="empty-state__title">لا يوجد طيارون ولا شركات شحن بعد</div>
          <div class="empty-state__text">
            أضف طيار المحل أو شركة الشحن التي تتعامل معها لتسند لها الأوردرات
          </div>
          <button v-can="'manage_delivery_agents'" class="btn btn--primary" @click="openAgent()">
            <Plus :size="16" /> إضافة
          </button>
        </div>
      </div>

      <div v-else class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>التكلفة لكل أوردر</th>
                <th>في الطريق</th>
                <th>معه الآن</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in store.agents" :key="a.id">
                <td>
                  <div class="doc-cell">
                    <span class="doc-cell__main">
                      <component :is="a.type === 'carrier' ? Building2 : Bike" :size="14" />
                      {{ a.name }}
                    </span>
                    <span class="doc-cell__sub">
                      {{ a.type === "carrier" ? "شركة شحن" : "طيار" }}
                      <template v-if="a.phone"> · <span dir="ltr">{{ a.phone }}</span></template>
                    </span>
                  </div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-money">{{ formatCurrency(a.defaultFee) }}</span>
                    <span v-if="a.codFeePercent" class="doc-cell__sub">
                      + {{ formatNumber(a.codFeePercent) }}% من المحصّل
                    </span>
                  </div>
                </td>
                <td><span class="doc-num">{{ formatNumber(a.outCount) }}</span></td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-money doc-money--strong">{{ formatCurrency(a.heldAmount) }}</span>
                    <span v-if="a.unsettledCount" class="doc-cell__sub">
                      {{ formatNumber(a.unsettledCount) }} أوردر لم يُسوَّ
                    </span>
                  </div>
                </td>
                <td>
                  <span :class="['badge', a.isActive ? 'badge--active' : 'badge--inactive']">
                    {{ a.isActive ? "نشط" : "موقوف" }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <NuxtLink
                      v-if="a.unsettledCount"
                      v-can="'settle_delivery'"
                      :to="`/dashboard/delivery/settlements?agentId=${a.id}`"
                      class="btn btn--sm btn--success"
                    >
                      <HandCoins :size="14" /> تسوية
                    </NuxtLink>
                    <button
                      v-can="'manage_delivery_agents'"
                      class="btn btn--sm btn--ghost"
                      @click="openAgent(a)"
                    >
                      <Pencil :size="14" /> تعديل
                    </button>
                    <button
                      v-can="'manage_delivery_agents'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="askDelete('agent', a.id, a.name)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ المناطق ══ -->
    <template v-else>
      <div class="doc-note">
        <Info :size="16" />
        <span>
          رسوم المنطقة تُقترح على الأوردر كرسوم توصيل على العميل (تُعدَّل لكل
          أوردر)، والوقت المتوقع يحدد متى يظهر الأوردر متأخراً على اللوحة.
        </span>
      </div>
      <div v-if="!store.zones.length" class="card">
        <div class="empty-state">
          <MapPin :size="44" class="empty-state__icon" />
          <div class="empty-state__title">لا توجد مناطق بعد</div>
          <div class="empty-state__text">المناطق اختيارية — تسهّل رسوم التوصيل ومتابعة التأخير</div>
          <button v-can="'manage_delivery_agents'" class="btn btn--primary" @click="openZone()">
            <Plus :size="16" /> إضافة منطقة
          </button>
        </div>
      </div>
      <div v-else class="card doc-table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>المنطقة</th>
                <th>رسوم التوصيل</th>
                <th>الوقت المتوقع</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="z in store.zones" :key="z.id">
                <td><span class="doc-cell__main">{{ z.name }}</span></td>
                <td><span class="doc-money">{{ formatCurrency(z.fee) }}</span></td>
                <td>
                  <span class="doc-num">
                    {{ z.estimatedMinutes ? `${formatNumber(z.estimatedMinutes)} دقيقة` : "—" }}
                  </span>
                </td>
                <td>
                  <span :class="['badge', z.isActive ? 'badge--active' : 'badge--inactive']">
                    {{ z.isActive ? "نشطة" : "موقوفة" }}
                  </span>
                </td>
                <td>
                  <div class="doc-actions">
                    <button v-can="'manage_delivery_agents'" class="btn btn--sm btn--ghost" @click="openZone(z)">
                      <Pencil :size="14" /> تعديل
                    </button>
                    <button
                      v-can="'manage_delivery_agents'"
                      class="btn btn--sm btn--danger btn--icon"
                      title="حذف"
                      @click="askDelete('zone', z.id, z.name)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ نموذج الجهة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAgent" class="modal-overlay" @click.self="showAgent = false">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <Bike :size="20" class="doc-modal__icon" />
                {{ editingAgent ? "تعديل" : "إضافة طيار أو شركة شحن" }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="showAgent = false">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submitAgent">
              <div class="form-group">
                <label>النوع *</label>
                <select v-model="agentForm.type" class="form-select">
                  <option value="driver">طيار (موظف أو مندوب المحل)</option>
                  <option value="carrier">شركة شحن</option>
                </select>
              </div>
              <div class="form-group">
                <label>الاسم *</label>
                <input v-model.trim="agentForm.name" class="form-input" required maxlength="150" />
              </div>
              <div class="form-group">
                <label>الجوال</label>
                <input v-model.trim="agentForm.phone" class="form-input" dir="ltr" inputmode="tel" maxlength="30" />
              </div>
              <div class="doc-grid">
                <div class="form-group">
                  <label>{{ agentForm.type === "carrier" ? "رسوم الشحنة" : "أجرة المشوار" }}</label>
                  <StbNumberInput
                    v-model.number="agentForm.defaultFee"
                    class="form-input"
                    min="0"
                    :step="moneyStep()"
                    placeholder="0"
                  />
                </div>
                <div class="form-group">
                  <label>رسوم التحصيل %</label>
                  <StbNumberInput
                    v-model.number="agentForm.codFeePercent"
                    class="form-input"
                    min="0"
                    max="100"
                    step="any"
                    placeholder="0"
                  />
                </div>
              </div>
              <small class="doc-hint">
                تكلفة كل أوردر علينا = الرسوم + النسبة من المبلغ المحصّل. تُقترح
                عند الإسناد وتُعدَّل، وتُخصم مما يسلّمه في التسوية.
              </small>
              <div class="form-group">
                <label>ملاحظة</label>
                <input v-model.trim="agentForm.note" class="form-input" maxlength="300" />
              </div>
              <label class="checkbox-label">
                <input v-model="agentForm.isActive" type="checkbox" />
                <span>نشط (الموقوف لا تُسند له أوردرات جديدة)</span>
              </label>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showAgent = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': submitting }" :disabled="submitting">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ نموذج المنطقة ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showZone" class="modal-overlay" @click.self="showZone = false">
          <div class="modal doc-modal doc-modal--sm">
            <div class="modal__header">
              <h3>
                <MapPin :size="20" class="doc-modal__icon" />
                {{ editingZone ? "تعديل منطقة" : "إضافة منطقة" }}
              </h3>
              <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="showZone = false">
                <X :size="20" />
              </button>
            </div>
            <form class="doc-form" @submit.prevent="submitZone">
              <div class="form-group">
                <label>اسم المنطقة *</label>
                <input v-model.trim="zoneForm.name" class="form-input" required maxlength="120" />
              </div>
              <div class="doc-grid">
                <div class="form-group">
                  <label>رسوم التوصيل على العميل *</label>
                  <StbNumberInput
                    v-model.number="zoneForm.fee"
                    class="form-input"
                    min="0"
                    :step="moneyStep()"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>الوقت المتوقع (دقيقة)</label>
                  <StbNumberInput
                    v-model.number="zoneForm.estimatedMinutes"
                    class="form-input"
                    min="1"
                    step="1"
                    placeholder="اختياري"
                  />
                </div>
              </div>
              <label class="checkbox-label">
                <input v-model="zoneForm.isActive" type="checkbox" />
                <span>نشطة</span>
              </label>
              <div class="modal__footer">
                <button type="button" class="btn btn--ghost" @click="showZone = false">إلغاء</button>
                <button type="submit" class="btn btn--primary" :class="{ 'btn--loading': submitting }" :disabled="submitting">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showConfirm"
      :title="deleteTarget?.kind === 'agent' ? 'حذف جهة التوصيل' : 'حذف المنطقة'"
      :message="`حذف '${deleteTarget?.name}'؟ الأوردرات السابقة تحتفظ باسمه.`"
      confirm-text="حذف"
      :loading="submitting"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  Bike,
  Building2,
  HandCoins,
  Info,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-vue-next";
import { useToast } from "@/composables/useToast";
import { useDeliveryStore } from "@/stores/delivery";
import type { DeliveryAgent, DeliveryAgentType, DeliveryZone } from "@/types/delivery";

definePageMeta({ middleware: "auth" });

const store = useDeliveryStore();
const toast = useToast();

const tab = ref<"agents" | "zones">("agents");
const loading = ref(false);
const submitting = ref(false);

const load = async () => {
  loading.value = true;
  try {
    await Promise.all([store.fetchAgents(), store.fetchZones()]);
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر تحميل البيانات"));
  } finally {
    loading.value = false;
  }
};

// ─── الجهات ───────────────────────────────────────────────────────────────────
const showAgent = ref(false);
const editingAgent = ref<DeliveryAgent | null>(null);
const agentForm = reactive({
  type: "driver" as DeliveryAgentType,
  name: "",
  phone: "",
  defaultFee: "" as number | "",
  codFeePercent: "" as number | "",
  note: "",
  isActive: true,
});

const openAgent = (agent?: DeliveryAgent) => {
  editingAgent.value = agent ?? null;
  Object.assign(agentForm, {
    type: agent?.type ?? "driver",
    name: agent?.name ?? "",
    phone: agent?.phone ?? "",
    defaultFee: agent?.defaultFee ?? "",
    codFeePercent: agent?.codFeePercent || "",
    note: agent?.note ?? "",
    isActive: agent?.isActive ?? true,
  });
  showAgent.value = true;
};

const submitAgent = async () => {
  submitting.value = true;
  try {
    const payload = {
      type: agentForm.type,
      name: agentForm.name,
      phone: agentForm.phone || null,
      defaultFee: Number(agentForm.defaultFee) || 0,
      codFeePercent: Number(agentForm.codFeePercent) || 0,
      note: agentForm.note || null,
      isActive: agentForm.isActive,
    };
    if (editingAgent.value) await store.updateAgent(editingAgent.value.id, payload);
    else await store.createAgent(payload);
    toast.success("تم الحفظ");
    showAgent.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    submitting.value = false;
  }
};

// ─── المناطق ──────────────────────────────────────────────────────────────────
const showZone = ref(false);
const editingZone = ref<DeliveryZone | null>(null);
const zoneForm = reactive({
  name: "",
  fee: "" as number | "",
  estimatedMinutes: "" as number | "",
  isActive: true,
});

const openZone = (zone?: DeliveryZone) => {
  editingZone.value = zone ?? null;
  Object.assign(zoneForm, {
    name: zone?.name ?? "",
    fee: zone?.fee ?? "",
    estimatedMinutes: zone?.estimatedMinutes ?? "",
    isActive: zone?.isActive ?? true,
  });
  showZone.value = true;
};

const submitZone = async () => {
  submitting.value = true;
  try {
    const payload = {
      name: zoneForm.name,
      fee: Number(zoneForm.fee) || 0,
      estimatedMinutes:
        zoneForm.estimatedMinutes === "" ? null : Number(zoneForm.estimatedMinutes),
      isActive: zoneForm.isActive,
    };
    if (editingZone.value) await store.updateZone(editingZone.value.id, payload);
    else await store.createZone(payload);
    toast.success("تم الحفظ");
    showZone.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحفظ"));
  } finally {
    submitting.value = false;
  }
};

// ─── الحذف ────────────────────────────────────────────────────────────────────
const showConfirm = ref(false);
const deleteTarget = ref<{ kind: "agent" | "zone"; id: string; name: string } | null>(null);

const askDelete = (kind: "agent" | "zone", id: string, name: string) => {
  deleteTarget.value = { kind, id, name };
  showConfirm.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  submitting.value = true;
  try {
    if (deleteTarget.value.kind === "agent") await store.removeAgent(deleteTarget.value.id);
    else await store.removeZone(deleteTarget.value.id);
    toast.success("تم الحذف");
    showConfirm.value = false;
    await load();
  } catch (e) {
    toast.error(getErrorMessage(e, "تعذر الحذف"));
  } finally {
    submitting.value = false;
  }
};

onMounted(load);
</script>
