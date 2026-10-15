// stores/delivery.ts — التوصيل والشحن: الأوردرات، الطيارون وشركات الشحن،
// المناطق، والتسويات.
import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
import type { Paginated } from "@/types/catalog";
import type {
  DeliveryAgent,
  DeliveryAgentPayload,
  DeliveryOrder,
  DeliveryOrderFilters,
  DeliveryOrderPayload,
  DeliverySettlement,
  DeliverySettlementPayload,
  DeliverySummary,
  DeliveryZone,
  DeliveryZonePayload,
} from "@/types/delivery";

const BASE = "/delivery";

export const useDeliveryStore = defineStore("delivery", () => {
  const api = useApi();

  // ─── الجهات والمناطق: تُحفظ لقوائم الاختيار ───
  const agents = ref<DeliveryAgent[]>([]);
  const zones = ref<DeliveryZone[]>([]);

  const fetchAgents = async () => {
    agents.value = (await api.get<DeliveryAgent[]>(`${BASE}/agents`)).data;
    return agents.value;
  };

  const createAgent = async (payload: DeliveryAgentPayload) =>
    (await api.post<DeliveryAgent>(`${BASE}/agents`, payload)).data;

  const updateAgent = async (id: string, payload: Partial<DeliveryAgentPayload>) =>
    (await api.patch<DeliveryAgent>(`${BASE}/agents/${id}`, payload)).data;

  const removeAgent = async (id: string) => {
    await api.del(`${BASE}/agents/${id}`);
  };

  /** رابط شاشة الطيار: المفتاح يعود مرة واحدة، ورابط جديد يُبطل القديم */
  const issueDriverAccess = async (id: string) =>
    (
      await api.post<{ agentId: string; key: string }>(
        `${BASE}/agents/${id}/driver-access`,
        {},
      )
    ).data;

  const revokeDriverAccess = async (id: string) => {
    await api.del(`${BASE}/agents/${id}/driver-access`);
  };

  const fetchZones = async () => {
    zones.value = (await api.get<DeliveryZone[]>(`${BASE}/zones`)).data;
    return zones.value;
  };

  const createZone = async (payload: DeliveryZonePayload) =>
    (await api.post<DeliveryZone>(`${BASE}/zones`, payload)).data;

  const updateZone = async (id: string, payload: Partial<DeliveryZonePayload>) =>
    (await api.patch<DeliveryZone>(`${BASE}/zones/${id}`, payload)).data;

  const removeZone = async (id: string) => {
    await api.del(`${BASE}/zones/${id}`);
  };

  // ─── الأوردرات ───
  const fetchSummary = async () =>
    (await api.get<DeliverySummary>(`${BASE}/summary`)).data;

  const fetchOrders = async (filters: DeliveryOrderFilters = {}) =>
    (
      await api.get<Paginated<DeliveryOrder>>(
        `${BASE}/orders${toQueryString(filters)}`,
      )
    ).data;

  const getOrder = async (id: string) =>
    (await api.get<DeliveryOrder>(`${BASE}/orders/${id}`)).data;

  const createOrder = async (payload: DeliveryOrderPayload) =>
    (await api.post<DeliveryOrder>(`${BASE}/orders`, payload)).data;

  const assignOrder = async (
    id: string,
    payload: { agentId: string; agentFee?: number; trackingNumber?: string | null },
  ) =>
    (await api.post<DeliveryOrder>(`${BASE}/orders/${id}/assign`, payload)).data;

  /** dispatch | deliver | cancel */
  const moveOrder = async (
    id: string,
    action: "dispatch" | "deliver" | "cancel",
  ) => (await api.post<DeliveryOrder>(`${BASE}/orders/${id}/${action}`, {})).data;

  const failOrder = async (id: string, reason: string) =>
    (await api.post<DeliveryOrder>(`${BASE}/orders/${id}/fail`, { reason })).data;

  // ─── التسويات ───
  const fetchSettlements = async (
    filters: { agentId?: string; page?: number } = {},
  ) =>
    (
      await api.get<Paginated<DeliverySettlement>>(
        `${BASE}/settlements${toQueryString(filters)}`,
      )
    ).data;

  const getSettlement = async (id: string) =>
    (await api.get<DeliverySettlement>(`${BASE}/settlements/${id}`)).data;

  const settle = async (payload: DeliverySettlementPayload) =>
    (await api.post<DeliverySettlement>(`${BASE}/settlements`, payload)).data;

  return {
    agents,
    zones,
    fetchAgents,
    createAgent,
    updateAgent,
    removeAgent,
    issueDriverAccess,
    revokeDriverAccess,
    fetchZones,
    createZone,
    updateZone,
    removeZone,
    fetchSummary,
    fetchOrders,
    getOrder,
    createOrder,
    assignOrder,
    moveOrder,
    failOrder,
    fetchSettlements,
    getSettlement,
    settle,
  };
});
