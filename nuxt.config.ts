import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [["@pinia/nuxt", { storesDir: ["./stores/**"] }]],

  css: ["~/assets/scss/main.scss"],

  // vite: {
  //   css: {
  //     preprocessorOptions: {
  //       scss: {
  //         additionalData: `@use "~/assets/scss/_variables.scss" as *;`,
  //       },
  //     },
  //   },
  // },

  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "STB ERP - نظام إدارة المؤسسات",
      htmlAttrs: { lang: "ar", dir: "rtl" },
      link: [
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
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
        (globalThis as any).process?.env?.NUXT_PUBLIC_API_BASE ||
        "https://erp.api.stblink.com",
    },
  },
});
