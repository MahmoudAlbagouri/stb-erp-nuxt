// pos/store/cart.ts — السلة: الأصناف والمسح، التسعير والعروض، الرصيد المتاح،
// الفواتير المعلّقة، وإضافة عميل من الشاشة
import { computed, watch } from "vue";
import { newUuid, roundAmount, sumAmounts, unitPriceOf } from "@/pos/calc";
import { posDb } from "@/pos/db";
import { isRepriced, priceCart, pricingIssue } from "@/pos/promotions";
import { parseScaleBarcode } from "@/pos/scale";
import type {
  CartLine,
  HeldCart,
  PosCustomer,
  PosProduct,
  StoredCart,
} from "@/pos/types";
import type { PosConnection } from "./connection";
import type { PosShiftModule } from "./shift";
import {
  CART_SAVE_DELAY_MS,
  roundQuantity,
  WEIGHT_DECIMALS,
  type PosState,
} from "./state";

export const createCart = (
  state: PosState,
  connection: PosConnection,
  shiftModule: PosShiftModule,
) => {
  const {
    ready,
    device,
    products,
    customers,
    sales,
    outbox,
    stockLevels,
    stockKnown,
    serverBalances,
    promotions,
    posOptions,
    held,
    now,
    cart,
    customerId,
    invoiceDiscount,
    selectedKey,
    reloadOutbox,
  } = state;
  const { sync } = connection;
  const { logAudit, shiftCashier } = shiftModule;
  let lineKey = 0;

  /** باركود ← الصنف ووحدته، للبحث الفوري عند المسح */
  const barcodeIndex = computed(() => {
    const index = new Map<string, { product: PosProduct; unitId: string | null }>();
    for (const product of products.value) {
      for (const item of product.barcodes) {
        index.set(item.barcode, { product, unitId: item.unitId });
      }
    }
    return index;
  });

  // ─── الرصيد وأرصدة العملاء ──────────────────────────────────────────────────
  /** مبيعات هذه الشاشة التي لم يؤكد السيرفر استلامها بعد */
  const pendingSales = computed(() => {
    const queued = new Set(
      outbox.value.filter((e) => e.type === "sale").map((e) => e.id),
    );
    return sales.value.filter((sale) => queued.has(`sale-${sale.uuid}`));
  });

  /** ما بيع هنا ولم يصل السيرفر بعد، بوحدة الأساس لكل صنف */
  const pendingSold = computed(() => {
    const sold = new Map<string, number>();
    for (const line of pendingSales.value.flatMap((sale) => sale.lines)) {
      sold.set(
        line.productId,
        (sold.get(line.productId) ?? 0) + (line.baseQuantity ?? line.quantity),
      );
    }
    return sold;
  });

  /**
   * المتاح من الصنف في مخزن الجهاز (بوحدة الأساس) = آخر رصيد من السيرفر − ما
   * بيع هنا ولم يُرفع. null = خدمة بلا مخزون، أو الأرصدة لم تصل بعد.
   */
  const stockOf = (product: PosProduct): number | null => {
    if (!product.isStocked || !stockKnown.value) return null;
    return roundQuantity(
      (stockLevels.value[product.id] ?? 0) - (pendingSold.value.get(product.id) ?? 0),
    );
  };

  /**
   * مخزن الجهاز لا يسمح بالرصيد السالب: الشاشة تمنع البيع بأكثر مما تعرفه
   * متاحاً. ما بيع رغم ذلك (رصيد الشاشة قديم) يقبله السيرفر ويُبلّغ عنه.
   */
  const stockEnforced = computed(
    () => device.value?.warehouse?.allowNegativeStock === false,
  );

  /** ما في السلة من الصنف بوحدة الأساس */
  const inCart = (productId: string) =>
    cart.value
      .filter((line) => line.product.id === productId)
      .reduce((sum, line) => sum + (Number(line.quantity) || 0) * line.factor, 0);

  /** ما على العميل = آخر ما عرفه السيرفر + ما بيع له آجلاً هنا ولم يُرفع */
  const customerBalance = (id: string): number =>
    sumAmounts([
      serverBalances.value[id] ?? 0,
      ...pendingSales.value
        .filter((sale) => sale.customerId === id)
        .map((sale) => sale.creditAmount ?? 0),
    ]);

  // ─── التسعير ────────────────────────────────────────────────────────────────
  /** السلة مسعّرة: العروض، خصم الكاشير، وخصم الفاتورة موزّعاً على الأسطر */
  const priced = computed(() =>
    priceCart(cart.value, {
      promotions: promotions.value,
      customerId: customerId.value || null,
      now: now.value,
      invoiceDiscount: invoiceDiscount.value,
    }),
  );

  const cartTotals = computed(() => ({
    subtotal: priced.value.subtotal,
    taxTotal: priced.value.taxTotal,
    total: priced.value.total,
    items: priced.value.items,
  }));

  /** حد خصم كاشير الوردية % (null = بلا حد) */
  const discountLimit = computed(
    () => shiftCashier.value?.maxDiscountPercent ?? null,
  );

  /**
   * ما يتجاوز صلاحية الكاشير في السلة الحالية ويحتاج موافقة مشرف قبل الدفع.
   * `blocked`: ما لا يُتجاوز أصلاً (كمية أو خصم غير منطقي، أو رصيد غير كافٍ).
   */
  const cartIssues = computed(() => {
    const issues = priced.value.lines
      .map((line) => pricingIssue(line))
      .filter((issue): issue is NonNullable<typeof issue> => !!issue);
    const blocked = issues.filter((issue) => issue.blocking).map((i) => i.message);

    if (stockEnforced.value) {
      for (const product of new Set(cart.value.map((line) => line.product))) {
        const available = stockOf(product);
        if (available !== null && inCart(product.id) > available + 1e-9) {
          blocked.push(
            `الرصيد المتاح من "${product.name}" ${available} فقط`,
          );
        }
      }
    }
    return {
      blocked,
      belowMin: issues.filter((issue) => issue.kind === "belowMin").map((i) => i.message),
      /** تخفيض سعر صنف لا يقبل الخصم: بموافقة مشرف */
      reducedNoDiscount: issues
        .filter((issue) => issue.kind === "reducedNoDiscount")
        .map((i) => i.message),
      discountOverLimit:
        discountLimit.value !== null &&
        priced.value.manualPercent > discountLimit.value + 0.005,
    };
  });

  // ─── حفظ السلة واستعادتها ───────────────────────────────────────────────────
  const serializeCart = (): StoredCart => ({
    lines: cart.value.map((line) => ({
      productId: line.product.id,
      unitId: line.unitId,
      quantity: Number(line.quantity) || 0,
      discount: Number(line.discount) || 0,
      // السعر المكتوب يبقى مع السلة؛ سعر القائمة يُقرأ من الصنف عند الاسترجاع
      ...(line.product.openPrice || isRepriced(line)
        ? {
            unitPrice: line.unitPrice,
            listPrice: line.listPrice ?? null,
            priceReason: line.priceReason ?? null,
            priceApprovedBy: line.priceApprovedBy ?? null,
            pricePending: !!line.pricePending,
          }
        : {}),
    })),
    customerId: customerId.value,
    invoiceDiscount: invoiceDiscount.value,
  });

  const buildLine = (
    product: PosProduct,
    unitId: string | null,
    quantity: number,
    discount = 0,
  ): CartLine => {
    const unit = unitId ? product.units.find((u) => u.unitId === unitId) : null;
    return {
      key: ++lineKey,
      product,
      unitId: unit ? unit.unitId : null,
      unitName: unit ? unit.name : product.baseUnitName,
      factor: unit ? unit.factor : 1,
      quantity,
      // السعر المفتوح: سعر الصنف اقتراح يظهر في الخانة حتى يكتب الكاشير سعره
      unitPrice: unitPriceOf(product, unit ? unit.unitId : null),
      discount,
      listPrice: null,
      pricePending: !!product.openPrice,
    };
  };

  /** يعيد بناء سلة محفوظة بأحدث بيانات الأصناف (صنف حُذف من الجهاز يسقط) */
  const restoreCart = (stored: StoredCart) => {
    const byId = new Map(products.value.map((p) => [p.id, p]));
    cart.value = stored.lines.flatMap((line) => {
      const product = byId.get(line.productId);
      if (!product) return [];
      const restored = buildLine(product, line.unitId, line.quantity, line.discount);
      if (line.unitPrice !== undefined) {
        restored.unitPrice = line.unitPrice;
        restored.listPrice = line.listPrice ?? null;
        restored.priceReason = line.priceReason ?? null;
        restored.priceApprovedBy = line.priceApprovedBy ?? null;
        restored.pricePending = !!product.openPrice && !!line.pricePending;
      }
      return [restored];
    });
    customerId.value = customers.value.some((c) => c.id === stored.customerId)
      ? stored.customerId
      : "";
    invoiceDiscount.value = stored.invoiceDiscount ?? null;
    selectedKey.value = cart.value.at(-1)?.key ?? null;
  };

  // السلة تُحفظ على الجهاز مع كل تعديل: تبقى بعد إغلاق المتصفح أو انقطاع الكهرباء
  let cartSaveTimer: ReturnType<typeof setTimeout> | null = null;
  watch(
    [cart, customerId, invoiceDiscount],
    () => {
      if (!ready.value) return;
      if (cartSaveTimer) clearTimeout(cartSaveTimer);
      cartSaveTimer = setTimeout(() => {
        void posDb.setMeta({ cart: cart.value.length ? serializeCart() : null });
      }, CART_SAVE_DELAY_MS);
    },
    { deep: true },
  );

  // ─── الأصناف في السلة ───────────────────────────────────────────────────────
  /**
   * يضيف صنفاً للسلة، أو يزيد كميته إن كان موجوداً بنفس الوحدة. يرمي خطأ إن
   * كان مخزن الجهاز لا يسمح بالسالب والمتاح لا يكفي.
   */
  const addProduct = (
    product: PosProduct,
    unitId: string | null = null,
    quantity = 1,
  ): CartLine => {
    // باركود وحدة الأساس قد يحمل معرّفها صراحةً
    const effectiveUnit = unitId === product.baseUnitId ? null : unitId;
    const unit = effectiveUnit
      ? product.units.find((u) => u.unitId === effectiveUnit)
      : null;

    const available = stockOf(product);
    if (stockEnforced.value && available !== null) {
      const wanted = inCart(product.id) + quantity * (unit ? unit.factor : 1);
      if (wanted > available + 1e-9) {
        throw new Error(
          available > 0
            ? `الرصيد المتاح من "${product.name}" ${available} فقط`
            : `"${product.name}" غير متوفر في المخزن`,
        );
      }
    }

    // السعر المفتوح: كل إضافة سطر بسعره (الخدمة نفسها قد تُباع بسعرين)
    const existing = product.openPrice
      ? undefined
      : cart.value.find(
          (line) =>
            line.product.id === product.id && line.unitId === (unit?.unitId ?? null),
        );
    if (existing) {
      existing.quantity = roundQuantity((Number(existing.quantity) || 0) + quantity);
      selectedKey.value = existing.key;
      return existing;
    }
    const line = buildLine(product, unit?.unitId ?? null, quantity);
    cart.value.push(line);
    selectedKey.value = line.key;
    // من مصفوفة السلة: الكائن التفاعلي الذي يراه القالب
    return cart.value.at(-1)!;
  };

  /**
   * مسح باركود: باركود صنف، أو باركود ميزان يحمل الوزن أو السعر. يعيد false
   * إذا لم يُعرف.
   */
  const scan = (barcode: string): boolean => {
    const code = barcode.trim();
    const match = barcodeIndex.value.get(code);
    if (match) {
      addProduct(match.product, match.unitId);
      return true;
    }

    const reading = parseScaleBarcode(code, posOptions.value.scale);
    if (!reading) return false;
    const product =
      reading.itemCodes
        .map((item) => barcodeIndex.value.get(item)?.product)
        .find((found) => !!found) ??
      products.value.find((p) => reading.itemCodes.includes(p.sku));
    if (!product) return false;

    // صنف بسعر مفتوح والميزان طبع سعره: هو سعر السطر
    if (product.openPrice && reading.type === "price") {
      if (!(reading.value > 0)) return false;
      const line = addProduct(product, null, 1);
      line.unitPrice = reading.value;
      line.pricePending = false;
      return true;
    }

    const unitPrice = unitPriceOf(product, null);
    const quantity =
      reading.type === "weight"
        ? reading.value
        : unitPrice > 0
          ? // الميزان طبع السعر: الوزن = السعر ÷ سعر الكيلو
            Math.round((reading.value / unitPrice) * 10 ** WEIGHT_DECIMALS) /
            10 ** WEIGHT_DECIMALS
          : 0;
    if (!(quantity > 0)) return false;
    addProduct(product, null, quantity);
    return true;
  };

  /** سعر القائمة لسطر: ما يُقارن به التخفيض والرفع */
  const listPriceOf = (line: CartLine): number =>
    line.listPrice ?? unitPriceOf(line.product, line.unitId);

  /**
   * يغيّر سعر وحدة سطر في هذه الفاتورة وحدها (سعر الصنف نفسه لا يتغيّر). للسعر
   * المفتوح: يكتب السعر. سعر يساوي سعر القائمة يلغي التعديل. التخفيض يحتاج
   * سبباً. الصلاحية وموافقة المشرف تفحصهما الشاشة قبل الاستدعاء
   * (needsPriceApproval)، وحد الخصم وأقل سعر يُفحصان عند الدفع.
   */
  const setLinePrice = (
    key: number,
    price: number,
    info: { reason?: string | null; approvedBy?: string | null } = {},
  ) => {
    const line = cart.value.find((l) => l.key === key);
    if (!line) return;
    const value = roundAmount(price);
    if (!(value > 0)) throw new Error("أدخل سعراً أكبر من صفر");

    if (line.product.openPrice) {
      line.unitPrice = value;
      line.pricePending = false;
      return;
    }

    const list = listPriceOf(line);
    if (Math.abs(value - list) < 1e-9) {
      line.unitPrice = list;
      line.listPrice = null;
      line.priceReason = null;
      line.priceApprovedBy = null;
      return;
    }
    const reason = info.reason?.trim() || null;
    if (value < list && !reason) throw new Error("اختر سبب تخفيض السعر");
    line.unitPrice = value;
    line.listPrice = list;
    line.priceReason = reason;
    line.priceApprovedBy = info.approvedBy ?? null;
  };

  /** يعيد سعر سطر بعد تغيير وحدته: سعر الوحدة الجديدة، ويُلغى أي تعديل */
  const resetLinePrice = (line: CartLine) => {
    line.unitPrice = unitPriceOf(line.product, line.unitId);
    line.listPrice = null;
    line.priceReason = null;
    line.priceApprovedBy = null;
    line.pricePending = !!line.product.openPrice;
  };

  const lineLabel = (line: CartLine) =>
    `${line.product.name} × ${Number(line.quantity) || 0} ${line.unitName}`;

  /** يحذف سطراً ويسجّله في سجل التدقيق */
  const removeLine = async (key: number, approvedBy: string | null = null) => {
    const target = priced.value.lines.find((p) => p.line.key === key);
    cart.value = cart.value.filter((line) => line.key !== key);
    if (selectedKey.value === key) selectedKey.value = cart.value.at(-1)?.key ?? null;
    if (target) {
      await logAudit("line_removed", {
        amount: target.total,
        details: lineLabel(target.line),
        approvedBy,
      });
    }
  };

  /** يفرغ السلة بلا تسجيل (بعد بيع أو تعليق) */
  const resetCart = () => {
    cart.value = [];
    customerId.value = "";
    invoiceDiscount.value = null;
    selectedKey.value = null;
  };

  /** الكاشير يفرغ السلة: يُسجَّل في سجل التدقيق */
  const clearCart = async (approvedBy: string | null = null) => {
    if (!cart.value.length) return;
    const total = priced.value.total;
    const details = cart.value.map(lineLabel).join("، ");
    resetCart();
    await logAudit("cart_cleared", { amount: total, details, approvedBy });
  };

  // ─── تعليق الفاتورة ─────────────────────────────────────────────────────────
  const saveHeld = () => posDb.setMeta({ held: held.value });

  /** يعلّق السلة الحالية ليخدم الكاشير عميلاً آخر */
  const holdCart = async (label = "") => {
    if (!cart.value.length) throw new Error("السلة فارغة");
    const entry: HeldCart = {
      ...serializeCart(),
      id: newUuid(),
      heldAt: new Date().toISOString(),
      label: label.trim(),
      total: priced.value.total,
      items: priced.value.items,
    };
    held.value = [...held.value, entry];
    await saveHeld();
    resetCart();
    await logAudit("sale_held", {
      amount: entry.total,
      details: entry.label || undefined,
    });
  };

  /** يسترجع فاتورة معلّقة (والسلة الحالية، إن وُجدت، تُعلَّق مكانها) */
  const resumeHeld = async (id: string) => {
    const entry = held.value.find((h) => h.id === id);
    if (!entry) return;
    if (cart.value.length) await holdCart();
    held.value = held.value.filter((h) => h.id !== id);
    await saveHeld();
    restoreCart(entry);
  };

  const deleteHeld = async (id: string, approvedBy: string | null = null) => {
    const entry = held.value.find((h) => h.id === id);
    if (!entry) return;
    held.value = held.value.filter((h) => h.id !== id);
    await saveHeld();
    await logAudit("held_deleted", {
      amount: entry.total,
      details: entry.label || undefined,
      approvedBy,
    });
  };

  // ─── عميل من الشاشة ─────────────────────────────────────────────────────────
  /** يضيف عميلاً على الجهاز ويختاره؛ يُرفع قبل فواتيره (الطابور بالترتيب) */
  const addCustomer = async (input: {
    name: string;
    phone?: string;
    taxNumber?: string;
  }): Promise<PosCustomer> => {
    const name = input.name.trim();
    if (!name) throw new Error("اسم العميل مطلوب");
    const taxNumber = input.taxNumber?.trim() || null;
    if (taxNumber && !/^\d{15}$/.test(taxNumber)) {
      throw new Error("الرقم الضريبي يتكون من 15 رقماً");
    }

    const customer: PosCustomer = {
      id: newUuid(),
      name,
      phone: input.phone?.trim() || null,
      taxNumber,
      creditLimit: null,
      paymentTermsDays: 0,
      available: true,
      local: true,
    };
    await posDb.saveCustomer(customer, {
      id: `customer-${customer.id}`,
      type: "customer.create",
      createdAt: new Date().toISOString(),
      payload: {
        id: customer.id,
        name,
        phone: customer.phone ?? undefined,
        taxNumber: taxNumber ?? undefined,
      },
    });
    customers.value = [...customers.value, customer];
    customerId.value = customer.id;
    await reloadOutbox();
    void sync();
    return customer;
  };

  return {
    pendingSales,
    customerBalance,
    stockOf,
    stockEnforced,
    priced,
    cartTotals,
    discountLimit,
    cartIssues,
    restoreCart,
    resetCart,
    listPriceOf,
    setLinePrice,
    resetLinePrice,
    addProduct,
    scan,
    removeLine,
    clearCart,
    holdCart,
    resumeHeld,
    deleteHeld,
    addCustomer,
  };
};

export type PosCart = ReturnType<typeof createCart>;
