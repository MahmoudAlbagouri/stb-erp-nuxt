# STB ERP — الواجهة (مرجع)

واجهة نظام STB ERP: Nuxt 4، Vue 3، Pinia، SCSS بمتغيرات CSS للثيمات، عربية RTL.

> **كتالوج المشروع الكامل** (الموديولات، القواعد، المسارات) في مشروع الباك إند:
> `back-end/erp-sass/docs/README.md`. هذا الملف يشرح الواجهة وحدها، ولكل موديول
> هناك قسم «صفحات الواجهة» يدلّ على صفحاته هنا.

## التشغيل

```bash
npm install
npm run dev          # يتصل بـ NUXT_PUBLIC_API_BASE
npm run typecheck    # أو: npx vue-tsc --noEmit -p .nuxt/tsconfig.json
```

| المتغير | الغرض |
|---|---|
| `NUXT_PUBLIC_API_BASE` | عنوان الباك إند (محلياً: `http://localhost:3002`) |

## البنية

```
app/                      (srcDir — والاختصار @ يشير إليه)
  pages/                  الصفحات (المسار = مسار الملف)
    auth/                 الدخول والتسجيل واستعادة كلمة المرور
    dashboard/            لوحة التحكم: صفحة لكل موديول
    pos/                  شاشة الكاشير (ترسم في المتصفح فقط، تعمل بلا إنترنت)
  layouts/                default (لوحة التحكم) · auth · pos
  components/
    global/               مكوّنات مشتركة (القائمة، النوافذ، الحقول، الطباعة)
    dashboard/            مكوّنات رسوم الصفحة الرئيسية (ECharts)
    employees/            معالج تهيئة الموظف
  stores/                 مخزن Pinia لكل موديول (يطابق موديول الباك إند)
  composables/            useApi · useAccess · useToast · useTheme · useUpload…
  plugins/access.ts       التوجيهات v-can و v-feature و v-quota
  plugins/session-refresh يجدّد الجلسة قبل انتهاء توكن الوصول بدقيقة
  plugins/scrollbars      شريط تمرير موحّد (OverlayScrollbars) لكل ما يتمرر
  middleware/             auth.global: حماية الصفحات وقواعد الوصول
  pos/                    منطق الكاشير: api · db (IndexedDB) · calc · cashiers · drawer
  types/                  أنواع البيانات (تطابق ما يعيده الباك إند)
  utils/                  navigation · access · countries · format · timezone…
  assets/scss/            المتغيرات والثيمات والأنماط العامة
public/sw.js              الـ service worker لشاشة الكاشير
```

## كيف تتصل الواجهة بالباك إند

- **`useApi()`** (`composables/useApi.ts`): كل الطلبات تمرّ منه. يضيف التوكن،
  يجدّده تلقائياً عند انتهائه، يفكّ غلاف الاستجابة (`data`)، ويحوّل الخطأ إلى
  رسالة عربية تُعرض بـ `getErrorMessage(e, 'نص بديل')`.
- **الجلسة**: توكن الوصول 15 دقيقة وتوكن التجديد 7 أيام. `plugins/session-refresh.client.ts`
  يجدّد قبل الانتهاء بدقيقة (وعند العودة للتبويب)، و`useApi` يجدّد عند 401 إن
  فات ذلك. الجلسة قائمة ما بقي توكن التجديد (`auth.isAuthenticated`)، فلا تُحجب
  الصفحة حين يختفي كوكي الوصول. إعدادات الكوكيين في `utils/auth.ts` وحدها
  (`accessCookieOptions` و`refreshCookieOptions`): كل من يكتبهما يمرّرها.
- **المخازن** (`stores/*.ts`): مخزن لكل موديول يحمل بياناته ودوال طلباته، وله
  `reset()` تُستدعى عند تسجيل الخروج. الأصل أن تطلب الصفحة عبر مخزنها (قليل من
  الصفحات، كالرئيسية، يستدعي `useApi` مباشرة لطلب واحد خاص بها).
- **الأنواع** (`types/`): تُحدَّث مع أي تغيير في استجابة الباك إند.
- **البث اللحظي** (`useApi().openStream`): اتصال Server-Sent Events بتوكن الجلسة
  (fetch لا EventSource، فيجدّد التوكن كباقي الطلبات). مخزن الإشعارات يفتحه من
  الجرس ويعيد الاتصال بانتظار متزايد، ويسأل العدّاد كل دقيقة ما دام منقطعاً.
  أيقونات وأسماء أنواع الإشعارات تأتي من الباك إند (`GET /notifications/types`)
  وخريطة أيقوناتها في `utils/notifications.ts`.

## الوصول: ماذا يرى المستخدم

ثلاث طبقات تطابق الباك إند (الباك إند هو الحاكم؛ الواجهة تخفي وتوضّح فقط):

| الطبقة | في القالب | المصدر |
|---|---|---|
| الصلاحية | `v-can="'create_user'"` — يخفي العنصر | صلاحيات الدور في التوكن |
| ميزة الباقة | `v-feature="'reports_export'"` — يظهر مقفولاً ويقود للترقية | `GET /subscriptions/me/access` |
| حد الباقة | `v-quota="'max_employees'"` — يتعطل عند بلوغ الحد | نفسه |

- **`utils/access.ts`**: مرآة لثوابت الباك إند (`PERMS` و`FEATURES`). أي صلاحية أو
  ميزة جديدة هناك تُضاف هنا بنفس الاسم.
- **`utils/navigation.ts`**: المصدر الوحيد لعناصر القائمة الجانبية **ولقواعد
  الوصول لكل مسار** (تمنع الدخول بالرابط المباشر أيضاً). صفحة جديدة = عنصر هنا.
- **`stores/access.ts`**: يحمل مميزات الباقة وحدودها واستهلاكها.
- **`stores/auth.ts`**: المستخدم والتوكن، ومنه `country` و`currency` و`timezone`.
- **الفروع**: `stores/branches.ts` يحمل فروع المستخدم. اختيار الفرع في النماذج
  والفلاتر يظهر فقط إن كان `hasMany` (أكثر من فرع).

## العملة والوقت والهاتف

- **المبالغ**: من `utils/format.ts` — `formatMoney(value)` بخانات عملة الشركة
  (2 أو 3)، و`formatCurrency(value)` مع رمزها. لا تستخدم `toFixed(2)`.
- **الوقت**: `formatDateTime` يعرض بمنطقة الشركة. حقول الإدخال تمرّ بـ
  `toZonedInput` / `fromZonedInput` من `utils/timezone.ts`.
- **الهاتف**: المكوّن `StbPhoneInput` (كود الدولة حسب دولة الشركة).
- **الدول**: `utils/countries.ts` مرآة لقائمة الباك إند.

## المكوّنات المشتركة (`components/global`)

| المكوّن | الغرض |
|---|---|
| `AppSidebar` `AppTopbar` `MobileTabBar` | هيكل لوحة التحكم |
| `ConfirmDialog` `ToastContainer` | التأكيد والتنبيهات |
| `StbPhoneInput` `StbNumberInput` `StbDateInput` | حقول الإدخال |
| `StbUploader` `FileViewerModal` | رفع ملف (`v-model` = `FileRef` أو قائمة؛ يُرسل للخادم `id` فقط) ومعاينته وتحميله برابطه الموقَّع المؤقت |
| `FeatureGate` `AccessState` | قفل ما هو خارج الباقة أو الصلاحية |
| `StockProductPicker` | اختيار أصناف في مستندات المخزون |
| `SalesInvoicePrint` | طباعة الفاتورة (A4 أو حراري) بعنوان الفرع |
| `SalesReturnModal` `PurchaseReturnModal` `PosReturnModal` | المرتجعات |
| `CustomerPaymentModal` `SupplierPaymentModal` | القبض والسداد |
| `DocPager` | ترقيم القوائم |
| `SupportBanner` `OwnerHome` | وضع الدعم وصفحة مالك النظام |
| `ConnectionBanner` | شريط انقطاع الاتصال في لوحة التحكم (`useConnection`) |
| `NotificationBell` `NotificationDetailDrawer` | جرس الإشعارات (عدّاد وبث لحظي وصوت) ودرج تفاصيل الإشعار المركّب في التخطيط — يفتحه `useNotificationsStore().openItem` |
| `NotificationComposeModal` `NotificationPreferencesModal` | رسالة الإدارة للموظفين (موظفون/فروع/أقسام/الجميع) وكتم أنواع الإشعارات |
| `FormDraftNotice` | «لديك نسخة لم تُحفظ» في النماذج الطويلة (`useFormDraft`) |
| `AccountSelect` `JournalEntryModal` `AccountingInactive` | اختيار حساب من الشجرة، عرض قيد وعكسه، ودعوة تفعيل المحاسبة |
| `ReportExport` | زرا تصدير Excel / PDF لمسار تصدير في الباك إند بفلاتر التقرير المعروض (يظهران لباقة فيها `reports_export`) |

رسوم الصفحة الرئيسية في `components/dashboard` (`ChartBox` `ChartCard`
`DonutChart` `StatTile`) على Apache ECharts، وألوانها من `utils/charts.ts`.

## التصميم

- الألوان والمسافات من متغيرات CSS في `assets/scss` — ثيمان: داكن وفاتح
  (`useTheme`). لا ألوان ثابتة داخل المكوّنات.
- أصناف جاهزة: `page-container`، `page-header`، `card`، `data-table`،
  `table-responsive`، `btn btn--primary`، `form-group`، `form-input`،
  `form-select`، `badge`، `modal`، وأصناف المستندات `doc-*` (`_documents.scss`).
- الجداول تتحول لبطاقات على الجوال تلقائياً (`plugins/table-labels.client.ts`).
- **شريط التمرير** (OverlayScrollbars، `plugins/scrollbars.client.ts`): الصفحة
  وكل عنصر `overflow: auto | scroll` يأخذه تلقائياً بلا تعديل في الصفحة. رفيع
  ويتّسع عند الاقتراب، وشكله في `_scrollbars.scss`. الشريط يُضاف **آخر أبناء**
  العنصر المتمرر: لعناصر قائمة تتمرر استخدم `:last-of-type` أو `& + &` بدل
  `:last-child`. شريط مخفي عمداً: `scrollbar-width: none`. عنصر يبقى بشريط
  المتصفح: `data-native-scroll`.
- الأيقونات من `lucide-vue-next`.

## شاشة الكاشير (`/pos`)

نوافذها مكوّنات `components/global/Pos*` (موافقة المشرف، المعلّقة، حركة الدرج،
العميل، الخصم، تقرير الوردية، الاختصارات، الطاولات، حالة المطبخ، بون المطبخ
المطبوع، ولوحة الأرقام العائمة `PosNumpad`)، وأنماطها المشتركة في
`assets/scss/_pos.scss`. منطقها في `app/pos/` (`promotions.ts` تسعير السلة
والعروض، `scale.ts` باركود الميزان، `display.ts` شاشة العميل،
`store/restaurant.ts` الطاولات والإرسال للمطبخ). مرجع الاستخدام:
`back-end/erp-sass/docs/pos-screen.md`.

مميزات الشاشة لكل شركة: `pos.features` (في `pos/store/state.ts`: إعداد الشركة ×
الباقة × ما تحتاجه كل ميزة) — كل زر واختصار في الشاشة يُشرط بميزته. القائمة
والقوالب يقرأها `/dashboard/pos/settings` من السيرفر (`GET /pos/screen-settings`)،
ومرآة المفاتيح والافتراضي في `pos/types.ts` و`state.ts`.

شاشة المطبخ `/kitchen` (`pages/kitchen.vue`) صفحة بجلسة مستخدم (صلاحية
`use_kitchen_display`) تسأل `/pos/kitchen/orders` كل 5 ثوانٍ — ليست جزءاً من
تطبيق الكاشير الذي يعمل بلا إنترنت.

تطبيق داخل التطبيق: يُرسم في المتصفح فقط (`ssr: false`)، هيكله يخزّنه الـ
service worker، وبياناته في IndexedDB (`app/pos/db.ts`). يعمل بهوية الجهاز لا
المستخدم. الشرح الكامل: `back-end/erp-sass/docs/pos-offline.md`.

## العمل بلا إنترنت

- **شاشات تعمل بلا إنترنت** (كلها `ssr: false` ويخزّن هيكلها `public/sw.js`،
  وتسجّله بـ `registerOfflineShell()`): الكاشير `/pos`، الطيار `/driver`
  (`app/driver/offline.ts` — طابور في localStorage)، والعدّ `/stocktake/[id]`
  (`app/stocktake/` — IndexedDB).
- **لوحة التحكم تتحمل الانقطاع** ولا تعمل بدونه: `useApi` يحوّل فشل الشبكة إلى
  `NetworkError` برسالة واضحة ويحدّث `useConnection` (الشريط)، ولا يُخرج
  المستخدم إلا إن رفض السيرفر الجلسة صراحة. النماذج الطويلة تحفظ مسودتها على
  الجهاز بـ `useFormDraft` — لنموذج طويل جديد: `draft.start()` عند الفتح،
  `draft.saved()` بعد الحفظ، و`<FormDraftNotice :draft="draft" />` في النافذة.
- الشرح الكامل: `back-end/erp-sass/docs/offline.md`.

## خريطة الصفحات ← الموديولات

| الصفحة | الموديول (في الباك إند) | المخزن |
|---|---|---|
| `/dashboard` | dashboard | — (الصفحة تطلب مباشرة) |
| `/dashboard/users` | users | `users` |
| `/dashboard/branches` | branches | `branches` |
| `/dashboard/roles` · `/permissions` | roles · permissions | `roles` · `permissions` |
| `/dashboard/companies` · `/plans` · `/admin/subscriptions` · `/subscription` | tenants · plans · subscriptions | `tenants` · `plans` · `subscription` |
| `/dashboard/notifications` · `/profile` | notifications · profile | `notifications` · `profile` |
| `/dashboard/products` · `/products/settings` | catalog | `catalog` |
| `/dashboard/inventory` · `/movements` · `/transfers` · `/stocktakes` · `/warehouses` · `/stocktake/[id]` (شاشة العدّ، بلا إنترنت) | inventory | `inventory` |
| `/dashboard/purchasing` · `/returns` · `/payments` · `/suppliers` | purchasing | `purchasing` |
| `/dashboard/sales` · `/returns` · `/payments` · `/customers` · `/settings` | sales | `sales` |
| `/pos` · `/pos/display` · `/kitchen` (شاشة المطبخ) · `/dashboard/pos/devices` · `/cashiers` · `/shifts` · `/promotions` · `/settings` (مميزات الشاشة) · `/restaurant` (الطاولات والمطبخ) · `/audit` | pos | `pos` · `posAdmin` |
| `/dashboard/delivery` · `/agents` · `/settlements` · `/driver` (شاشة الطيار على جواله، برابطه بلا تسجيل دخول) | delivery | `delivery` |
| `/dashboard/accounting` · `/chart` · `/journals` · `/expenses` · `/ledger` · `/trial-balance` · `/statements` · `/vat-return` | accounting | `accounting` |
| `/dashboard/quotations` | quotation | `quotations` |
| `/dashboard/employees` · `/employees/[id]` | employees | `employees` |
| `/dashboard/contracts` · `/salaries` · `/payroll` | contracts · salaries · payroll | بنفس الاسم |
| `/dashboard/advances` · `/loans` · `/bonuses` · `/deductions` | advances · loans · bonuses · deduction | `advances` · `loans` · `bonuses` · `deductions` |
| `/dashboard/leaves` · `/settlements` · `/resignations` · `/eos` | leaves · settlements · resignations · eos | بنفس الاسم |
| `/dashboard/attendance` · `/shifts` | attendance · shifts | `attendance` · `shifts` |

## إضافة صفحة لموديول جديد

1. الأنواع في `types/`، ثم مخزن في `stores/` (مع `reset()`).
2. الصفحة في `pages/dashboard/` — انسخ هيكل صفحة قريبة (مثل `branches.vue`
   لصفحة إدارة بسيطة).
3. عنصر في `utils/navigation.ts` بصلاحيته وميزته.
4. الصلاحيات والمميزات الجديدة في `utils/access.ts`.
5. أخفِ أزرار التعديل بـ `v-can`، وأزرار الإضافة المحدودة بـ `v-quota`.
6. سجّل الصفحة في الجدول أعلاه، وفي قسم «صفحات الواجهة» بملف الموديول في
   كتالوج الباك إند.
