// stores/pos.ts — حالة شاشة الكاشير ومنطقها
//
// المبدأ: مسار واحد دائماً — كل بيع يُكتب أولاً في قاعدة بيانات الجهاز
// (IndexedDB) مع عملية في طابور الرفع، ثم يُرفع للسيرفر حين يتوفر الاتصال.
// لا فرق بين "أونلاين" و"أوفلاين" في طريقة البيع؛ الفرق فقط متى يُفرَّغ
// الطابور.
//
// المتجر يجمع أجزاءه من pos/store/:
//   state       الحالة المشتركة والثوابت
//   connection  الربط، ساعة الشاشة وحد العمل بلا اتصال، الرفع والسحب
//   shift       الوردية، كاشيرها، الدرج، موافقة المشرف، سجل التدقيق
//   cart        السلة والتسعير والرصيد، التعليق، عميل من الشاشة
//   checkout    إتمام البيع والمرتجع
//   restaurant  الطاولات والإرسال للمطبخ وحالة الطلبات فيه
//   init        تحميل الحالة المحفوظة على الجهاز
import { defineStore } from "pinia";
import { watch } from "vue";
import { usePosApi } from "@/pos/api";
import { posTaxMode, setTaxMode, unitPriceOf } from "@/pos/calc";
import { isRepriced } from "@/pos/promotions";
import { createCart } from "@/pos/store/cart";
import { createCheckout } from "@/pos/store/checkout";
import { createConnection } from "@/pos/store/connection";
import { createInit } from "@/pos/store/init";
import { createRestaurant } from "@/pos/store/restaurant";
import { createShift } from "@/pos/store/shift";
import { createPosState } from "@/pos/store/state";

export const usePosStore = defineStore("pos", () => {
  const state = createPosState();
  const connection = createConnection(state, usePosApi());
  const shiftModule = createShift(state, connection);
  const cartModule = createCart(state, connection, shiftModule);
  const checkoutModule = createCheckout(
    state,
    connection,
    shiftModule,
    cartModule,
  );
  const restaurant = createRestaurant(state, connection, cartModule);
  const { init } = createInit(state, cartModule);

  /**
   * البيع، ثم المطبخ والطاولة: ما لم يصل المطبخ يُرسل (البون للطباعة في
   * takeKitchenTicket)، والطاولة تُخلى
   */
  const checkout = async (
    ...args: Parameters<typeof checkoutModule.checkout>
  ) => {
    const captured = restaurant.captureOrder();
    const sale = await checkoutModule.checkout(...args);
    await restaurant.completeOrder(sale, captured);
    return sale;
  };

  /** التقفيل: طاولة مفتوحة على الشاشة تُحفظ عليها وتُحاسب في الوردية التالية */
  const closeShift = async (
    ...args: Parameters<typeof shiftModule.closeShift>
  ) => {
    await restaurant.parkActiveTable();
    return shiftModule.closeShift(...args);
  };

  // وضع الضريبة (مسجّلة؟ الأسعار شاملة؟) من إعدادات الفوترة التي تنزل للجهاز.
  // إن تغيّر والسلة ممتلئة: أسطرها بسعر القائمة تُعاد بالوضع الجديد (ما كتبه
  // الكاشير بيده يبقى)
  watch(
    () => state.settings.value,
    (settings) => {
      const before = posTaxMode();
      setTaxMode(settings);
      const after = posTaxMode();
      if (
        before.vatRegistered === after.vatRegistered &&
        before.pricesIncludeTax === after.pricesIncludeTax
      ) {
        return;
      }
      for (const line of state.cart.value) {
        if (!isRepriced(line) && !line.product.openPrice) {
          line.unitPrice = unitPriceOf(line.product, line.unitId);
        }
      }
    },
    { immediate: true },
  );

  const reset = () => {
    connection.stop();
    restaurant.stopKitchen();
    // السلة تبقى محفوظة على الجهاز: تعود عند فتح الشاشة من جديد
    state.ready.value = false;
    state.cart.value = [];
    state.customerId.value = "";
    state.invoiceDiscount.value = null;
  };

  return {
    // الحالة
    ready: state.ready,
    device: state.device,
    settings: state.settings,
    shift: state.shift,
    counter: state.counter,
    lastSync: state.lastSync,
    cashierName: state.cashierName,
    products: state.products,
    customers: state.customers,
    categories: state.categories,
    sales: state.sales,
    outbox: state.outbox,
    online: state.online,
    sessionExpired: state.sessionExpired,
    syncing: state.syncing,
    lastError: state.lastError,
    installationId: state.installationId,
    bindError: state.bindError,
    tenant: state.tenant,
    cashiers: state.cashiers,
    suspended: state.suspended,
    lastContactAt: state.lastContactAt,
    offlinePolicy: state.offlinePolicy,
    pendingCount: state.pendingCount,
    failedEntries: state.failedEntries,
    cart: state.cart,
    order: state.order,
    tableOrders: state.tableOrders,
    kitchenTickets: state.kitchenTickets,
    kitchenOrders: state.kitchenOrders,
    restaurant: state.restaurant,
    customerId: state.customerId,
    invoiceDiscount: state.invoiceDiscount,
    selectedKey: state.selectedKey,
    held: state.held,
    cashMoves: state.cashMoves,
    promotions: state.promotions,
    posOptions: state.posOptions,
    deliveryOptions: state.deliveryOptions,
    returns: state.returns,
    drawer: state.drawer,

    // الاتصال
    rebind: connection.rebind,
    offlineHours: connection.offlineHours,
    offlineState: connection.offlineState,
    shiftBlockReason: connection.shiftBlockReason,
    fetchUserAccess: connection.fetchUserAccess,
    start: connection.start,
    stop: connection.stop,
    sync: connection.sync,
    pull: connection.pull,
    fetchDevices: connection.fetchDevices,
    bindDevice: connection.bindDevice,
    forgetDevice: connection.forgetDevice,
    retryFailed: connection.retryFailed,

    // الوردية والدرج
    shiftCashier: shiftModule.shiftCashier,
    cashierRevoked: shiftModule.cashierRevoked,
    canReturn: shiftModule.canReturn,
    openShift: shiftModule.openShift,
    closeShift,
    shiftSummary: shiftModule.shiftSummary,
    addCashMove: shiftModule.addCashMove,
    supervisors: shiftModule.supervisors,
    needsSupervisor: shiftModule.needsSupervisor,
    needsPriceApproval: shiftModule.needsPriceApproval,
    logAudit: shiftModule.logAudit,
    setDrawer: shiftModule.setDrawer,
    openDrawer: shiftModule.openDrawer,

    // السلة
    priced: cartModule.priced,
    cartTotals: cartModule.cartTotals,
    cartIssues: cartModule.cartIssues,
    discountLimit: cartModule.discountLimit,
    addProduct: cartModule.addProduct,
    setDeliveryFee: cartModule.setDeliveryFee,
    listPriceOf: cartModule.listPriceOf,
    setLinePrice: cartModule.setLinePrice,
    resetLinePrice: cartModule.resetLinePrice,
    scan: cartModule.scan,
    removeLine: cartModule.removeLine,
    clearCart: cartModule.clearCart,
    holdCart: cartModule.holdCart,
    resumeHeld: restaurant.resumeHeld,
    deleteHeld: cartModule.deleteHeld,
    addCustomer: cartModule.addCustomer,
    customerBalance: cartModule.customerBalance,
    stockOf: cartModule.stockOf,
    stockEnforced: cartModule.stockEnforced,

    // البيع والمرتجع
    checkout,
    lookupInvoice: checkoutModule.lookupInvoice,
    refundPreview: checkoutModule.refundPreview,
    refund: checkoutModule.refund,

    // المطاعم
    restaurantEnabled: restaurant.enabled,
    tables: restaurant.tables,
    tableStatus: restaurant.tableStatus,
    pendingKitchen: restaurant.pendingKitchen,
    sendToKitchen: restaurant.sendToKitchen,
    takeKitchenTicket: restaurant.takeTicketToPrint,
    openTable: restaurant.openTable,
    switchToTakeaway: restaurant.switchToTakeaway,
    moveTable: restaurant.moveTable,
    readyOrders: restaurant.readyOrders,
    refreshKitchen: restaurant.refreshKitchen,
    markServed: restaurant.markServed,
    startKitchen: restaurant.startKitchen,
    stopKitchen: restaurant.stopKitchen,

    init,
    reset,
  };
});
