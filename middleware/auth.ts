import { defineNuxtRouteMiddleware, navigateTo } from "nuxt/app";

// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return;

  const token = localStorage.getItem("stb_access_token");
  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];

  if (!token && !publicRoutes.includes(to.path)) {
    return navigateTo("/auth/login");
  }

  if (token && to.path.startsWith("/auth")) {
    return navigateTo("/dashboard");
  }
});
