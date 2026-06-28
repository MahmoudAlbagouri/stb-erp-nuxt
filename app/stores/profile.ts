// stores/profile.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "../composables/useApi";
import type { Employee } from "@/types";

export interface ProfileData {
  personal: {
    user: { id: string; email: string; username: string; role?: string };
    employee: Employee | null;
  };
  hr: {
    contract: {
      statusLabel: string;
      isExpiringSoon: boolean;
      daysUntilExpiry: number | null;
    } | null;
    leaveBalance: {
      year: number;
      totalAllowance: number;
      consumedDays: number;
      remaining: number;
      usagePercentage: number;
      breakdown?: any;
    } | null;
    leaveHistory?: Array<{
      id: string;
      type: string;
      startDate: string;
      endDate: string;
      status: string;
      reason?: string;
      createdAt: string;
      durationDays: number;
    }>;
  };
  financial: {
    salary: {
      total: number;
      basic: number;
      allowances: number;
    } | null;
    stats: {
      summary: {
        totalDebt: number;
        debtToSalaryRatio: number;
        pendingAdvancesCount: number;
        activeLoansCount: number;
      };
      recentAdvances: Array<{
        id: string;
        amount: number;
        status: string;
        requestedAt: string;
        repaymentDate?: string;
      }>;
      recentLoans: Array<{
        id: string;
        totalAmount: number;
        monthlyInstallment: number;
        remainingInstallments: number;
        status: string;
      }>;
    };
    rejectedLoans?: Array<{
      id: string;
      totalAmount: number;
      monthlyInstallment: number;
      installmentsCount: number;
      reason?: string;
      rejectedAt: string;
    }>;
    rejectedAdvances?: Array<{
      id: string;
      amount: number;
      reason?: string;
      repaymentDate: string;
      rejectedAt: string;
    }>;
  };
}

export const useProfileStore = defineStore("profile", () => {
  const api = useApi();

  const data = ref<ProfileData | null>(null);
  const loading = ref(false);
  const lastFetched = ref<number | null>(null);
  let inFlightRequest: Promise<ProfileData> | null = null;

  const isLoaded = computed(() => !!data.value);
  const fullName = computed(
    () =>
      data.value?.personal?.employee?.fullName ||
      data.value?.personal?.user?.username ||
      "",
  );
  const avatarInitials = computed(() => {
    const name = fullName.value;
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  });

  const currentLeaveRemaining = computed(
    () => data.value?.hr?.leaveBalance?.remaining ?? 0,
  );
  const totalDebt = computed(
    () => data.value?.financial?.stats?.summary?.totalDebt ?? 0,
  );
  const debtToSalaryRatio = computed(
    () => data.value?.financial?.stats?.summary?.debtToSalaryRatio ?? 0,
  );
  const pendingAdvancesCount = computed(
    () => data.value?.financial?.stats?.summary?.pendingAdvancesCount ?? 0,
  );
  const activeLoansCount = computed(
    () => data.value?.financial?.stats?.summary?.activeLoansCount ?? 0,
  );

  const leaveHistory = computed(() => data.value?.hr?.leaveHistory ?? []);
  const rejectedLoans = computed(
    () => data.value?.financial?.rejectedLoans ?? [],
  );
  const rejectedAdvances = computed(
    () => data.value?.financial?.rejectedAdvances ?? [],
  );

  const recentAdvances = computed(
    () => data.value?.financial?.stats?.recentAdvances ?? [],
  );
  const recentLoans = computed(
    () => data.value?.financial?.stats?.recentLoans ?? [],
  );

  const fetchProfile = async (forceRefresh = false): Promise<ProfileData> => {
    if (!forceRefresh && data.value && lastFetched.value) {
      const now = Date.now();
      if (now - lastFetched.value < 5 * 60 * 1000) return data.value;
    }

    if (inFlightRequest && !forceRefresh) {
      return inFlightRequest;
    }

    loading.value = true;
    inFlightRequest = (async () => {
      try {
        const res = await api.get<ProfileData>("/profile/me");
        data.value = res.data;
        lastFetched.value = Date.now();
        return res.data;
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        throw error;
      } finally {
        loading.value = false;
        inFlightRequest = null;
      }
    })();

    return inFlightRequest;
  };

  const refreshProfile = async () => fetchProfile(true);

  // ✅ تحديث دالة clearProfile لتكون متوافقة مع نمط reset
  const reset = () => {
    data.value = null;
    lastFetched.value = null;
    inFlightRequest = null;
    loading.value = false;
  };

  return {
    data,
    loading,
    isLoaded,
    fullName,
    avatarInitials,
    currentLeaveRemaining,
    totalDebt,
    debtToSalaryRatio,
    pendingAdvancesCount,
    activeLoansCount,
    recentAdvances,
    recentLoans,
    leaveHistory,
    rejectedLoans,
    rejectedAdvances,
    fetchProfile,
    refreshProfile,
    reset, // ✅ تم التصدير باسم reset للتوحيد
  };
});
