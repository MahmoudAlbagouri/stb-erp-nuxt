# STB ERP — Frontend (Nuxt 3 + Vue 3 + Pinia)

نظام إدارة الموارد المؤسسية (ERP) لشركة STB، مبني بـ Nuxt 3 مع بنية احترافية قابلة للتوسع.

---

## 🗂️ بنية المشروع

```
stb-erp/
├── assets/
│   └── scss/
│       ├── _variables.scss   # ألوان، مسافات، خطوط، متغيرات التصميم
│       ├── _mixins.scss      # مساعدات SCSS قابلة للإعادة
│       └── main.scss         # نقطة الدخول الرئيسية للـ CSS العالمي
│
├── components/
│   ├── common/
│   │   ├── ToastContainer.vue   # نظام الإشعارات العائمة
│   │   └── ConfirmDialog.vue    # نافذة تأكيد الحذف
│   └── layout/
│       ├── AppSidebar.vue       # الشريط الجانبي مع التنقل
│       └── AppTopbar.vue        # الشريط العلوي مع التنقل التفصيلي
│
├── composables/
│   ├── useApi.ts    # HTTP client مركزي (GET/POST/PATCH/DELETE)
│   └── useToast.ts  # واجهة بسيطة لنظام الإشعارات
│
├── layouts/
│   ├── default.vue  # تخطيط لوحة التحكم (sidebar + topbar)
│   └── auth.vue     # تخطيط صفحات المصادقة
│
├── middleware/
│   └── auth.ts      # حماية المسارات بـ JWT
│
├── pages/
│   ├── index.vue                    # إعادة توجيه للـ dashboard
│   ├── auth/
│   │   ├── login.vue                # تسجيل الدخول
│   │   ├── register.vue             # إنشاء حساب جديد
│   │   ├── forgot-password.vue      # طلب استعادة كلمة المرور
│   │   └── reset-password.vue       # تعيين كلمة مرور جديدة
│   └── dashboard/
│       ├── index.vue                # لوحة التحكم الرئيسية
│       ├── users.vue                # إدارة المستخدمين
│       ├── roles.vue                # إدارة الأدوار
│       ├── permissions.vue          # إدارة الصلاحيات
│       └── employees.vue            # إدارة الموظفين
│
├── stores/
│   ├── auth.ts          # حالة المصادقة (login/register/refresh/logout)
│   ├── ui.ts            # حالة الواجهة (sidebar، toasts)
│   ├── users.ts         # CRUD المستخدمين
│   ├── roles.ts         # CRUD الأدوار
│   ├── permissions.ts   # CRUD الصلاحيات
│   └── employees.ts     # CRUD الموظفين
│
├── types/
│   └── index.ts         # جميع TypeScript interfaces
│
├── app.vue              # مدخل التطبيق
└── nuxt.config.ts       # إعدادات Nuxt
```

---

## 🚀 تشغيل المشروع

```bash
# تثبيت الاعتماديات
npm install

# تشغيل بيئة التطوير
npm run dev

# بناء للإنتاج
npm run build
```

---

## 🔌 API Endpoints المُدمجة

| الوحدة | Endpoint | العمليات |
|--------|----------|----------|
| Auth | `/auth/login` | POST |
| Auth | `/auth/register` | POST |
| Auth | `/auth/refresh` | POST |
| Auth | `/auth/forgot-password` | POST |
| Auth | `/auth/reset-password` | POST |
| Users | `/users` | GET, POST |
| Users | `/users/:id` | GET, PATCH, DELETE |
| Roles | `/roles` | GET, POST |
| Roles | `/roles/:id` | GET, PATCH, DELETE |
| Permissions | `/permissions` | GET, POST |
| Permissions | `/permissions/:id` | GET, PATCH, DELETE |
| Employees | `/employees` | GET, POST |
| Employees | `/employees/:id` | GET, PATCH, DELETE |

---

## 🎨 هوية التصميم (STB Brand)

- **الألوان الأساسية:** أزرق ملكي عميق `#0a4fa8` + سماوي كهربائي `#00aaff`
- **الخلفية:** شبه أسود `#0d1117`
- **الخط:** Cairo (عربي/لاتيني)
- **الاتجاه:** RTL كامل
- **التأثيرات:** Glassmorphism + توهج أزرق خفيف على التفاعل

---

## 🏗️ مبادئ البنية

1. **Pinia Stores** — كل الـ state management وطلبات API تمر عبر الـ stores
2. **useApi composable** — HTTP client مركزي، جميع الصفحات تستدعيه بشكل غير مباشر عبر الـ stores
3. **Separation of Concerns** — الصفحات لا تتصل بـ API مباشرة أبداً
4. **TypeScript** — جميع الكيانات محددة في `types/index.ts`
5. **SCSS Tokens** — جميع القيم (ألوان، مسافات، ظلال) في `_variables.scss`

---

## ➕ إضافة وحدة جديدة

1. أضف الـ types في `types/index.ts`
2. أنشئ store في `stores/module-name.ts`
3. أنشئ الصفحة في `pages/dashboard/module-name.vue`
4. أضف رابط التنقل في `components/layout/AppSidebar.vue`
