// pos/store/init.ts — تحميل حالة الشاشة المحفوظة على الجهاز (بلا إنترنت)
import { newUuid } from "@/pos/calc";
import { posDb } from "@/pos/db";
import { DEFAULT_DRAWER, type DrawerConfig } from "@/pos/drawer";
import type {
  CashMove,
  HeldCart,
  LocalShift,
  PosCashier,
  PosDevice,
  PosOfflinePolicy,
  PosOptions,
  PosPromotion,
  PosTenantProfile,
  StoredCart,
} from "@/pos/types";
import { useAuthStore } from "@/stores/auth";
import type { SalesSettings } from "@/types/sales";
import type { PosCart } from "./cart";
import {
  DEFAULT_OFFLINE_POLICY,
  DEFAULT_POS_OPTIONS,
  type PosState,
} from "./state";

export const createInit = (state: PosState, cartModule: PosCart) => {
  /** يحمّل حالة الجهاز المحفوظة. لا يحتاج إنترنت */
  const init = async () => {
    if (state.ready.value) return;
    const [d, s, sh, c, ls, name, inst, isBound] = await Promise.all([
      posDb.getMeta<PosDevice>("device"),
      posDb.getMeta<SalesSettings>("settings"),
      posDb.getMeta<LocalShift>("shift"),
      posDb.getMeta<number>("counter"),
      posDb.getMeta<string>("lastSync"),
      posDb.getMeta<string>("cashierName"),
      posDb.getMeta<string>("installationId"),
      posDb.getMeta<boolean>("bound"),
    ]);
    state.drawer.value = {
      ...DEFAULT_DRAWER,
      ...((await posDb.getMeta<DrawerConfig>("drawer")) ?? {}),
    };

    const [key, profile, staff, mayReturn, policy, hold, contact, clock] =
      await Promise.all([
        posDb.getMeta<string>("deviceKey"),
        posDb.getMeta<PosTenantProfile>("tenant"),
        posDb.getMeta<PosCashier[]>("cashiers"),
        posDb.getMeta<boolean>("returnsAllowed"),
        posDb.getMeta<PosOfflinePolicy>("offlinePolicy"),
        posDb.getMeta<string>("suspended"),
        posDb.getMeta<number>("lastContactAt"),
        posDb.getMeta<number>("clock"),
      ]);
    state.deviceKey.value = key;
    state.tenant.value = profile;
    state.cashiers.value = staff ?? [];
    state.returnsAllowed.value = mayReturn === true;
    state.offlinePolicy.value = policy ?? { ...DEFAULT_OFFLINE_POLICY };
    state.suspended.value = hold ?? "";
    state.now.value = Math.max(Date.now(), clock ?? 0);
    // شاشة تعمل من قبل هذا التحديث: مهلتها تبدأ من الآن لا من الماضي
    state.lastContactAt.value = contact ?? (d ? state.now.value : null);
    if (contact === null && d) {
      void posDb.setMeta({ lastContactAt: state.now.value });
    }
    // العملة والتوقيت من الجهاز: الشاشة تفتح صحيحة بلا إنترنت ولا جلسة
    useAuthStore().setDeviceLocale(profile);
    state.returns.value = await posDb.all("returns");
    state.installationId.value = inst ?? newUuid();
    if (!inst) await posDb.setMeta({ installationId: state.installationId.value });
    state.bound.value = isBound === true;
    // false محفوظة = السيرفر رفض هذه الشاشة قبل إغلاقها؛ null = لم تُربط بعد
    if (isBound === false && d) {
      state.bindError.value = "هذه الشاشة ليست المربوطة بجهاز الكاشير";
    }
    state.device.value = d;
    state.settings.value = s;
    state.shift.value = sh;
    state.counter.value = c ?? 0;
    state.lastSync.value = ls;
    state.cashierName.value = name ?? "";

    [
      state.products.value,
      state.customers.value,
      state.categories.value,
      state.sales.value,
    ] = await Promise.all([
      posDb.all("products"),
      posDb.all("customers"),
      posDb.all("categories"),
      posDb.all("sales"),
    ]);
    await state.reloadOutbox();

    const [levels, balances, promos, options, parked, moves, savedCart] =
      await Promise.all([
        posDb.getMeta<Record<string, number>>("stock"),
        posDb.getMeta<Record<string, number>>("customerBalances"),
        posDb.getMeta<PosPromotion[]>("promotions"),
        posDb.getMeta<PosOptions>("posOptions"),
        posDb.getMeta<HeldCart[]>("held"),
        posDb.getMeta<CashMove[]>("cashMoves"),
        posDb.getMeta<StoredCart>("cart"),
      ]);
    const stockComplete = await posDb.getMeta<boolean>("stockComplete");
    state.stockLevels.value = levels ?? {};
    // نسخة كاملة من الأرصدة استُلمت من قبل؟ بدونها لا تُعرض ولا يُمنع بها بيع
    state.stockKnown.value = stockComplete === true;
    state.serverBalances.value = balances ?? {};
    state.promotions.value = promos ?? [];
    state.posOptions.value = options ?? DEFAULT_POS_OPTIONS;
    state.held.value = parked ?? [];
    state.cashMoves.value = moves ?? [];
    // سلة لم تكتمل قبل إغلاق المتصفح أو انقطاع الكهرباء
    if (savedCart && sh) cartModule.restoreCart(savedCart);
    state.ready.value = true;
  };

  return { init };
};
