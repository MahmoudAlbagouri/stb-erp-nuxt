import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // هذا المجلد هو الجذر الجديد لكل شيء
  srcDir: "app/",

  modules: [
    // المسار هنا يجب أن يكون نسبياً من داخل app/
    ["@pinia/nuxt", { storesDirs: ["./stores/**"] }],
  ],

  // استخدام @ يشير تلقائياً إلى داخل مجلد app/
  css: ["@/assets/scss/main.scss"],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/assets/scss/_variables.scss" as *;`,
        },
      },
    },
    optimizeDeps: {
      include: ["@vue/devtools-core", "@vue/devtools-kit", "pinia"],
    },
  },

  // بقية الإعدادات (head, runtimeConfig) صحيحة ولا تحتاج تعديل
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "STB ERP - نظام إدارة المؤسسات",
      htmlAttrs: { lang: "ar", dir: "rtl" },
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap",
        },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE || "https://erp.api.stblink.com",
    },
  },
});
