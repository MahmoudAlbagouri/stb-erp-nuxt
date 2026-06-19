// composables/useApi.ts
// Central HTTP client - all API calls go through here

import { useRuntimeConfig } from "nuxt/app";
import type { ApiResponse } from "../types";

export const useApi = () => {
  const config = useRuntimeConfig();
  const BASE_URL = config.public.apiBase as string;

  // تعديل: إضافة فحص لـ FormData لعدم وضع Content-Type يدوياً
  const getHeaders = (
    withAuth = true,
    isFormData = false,
  ): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    if (withAuth && import.meta.client) {
      const token = localStorage.getItem("stb_access_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleResponse = async <T>(
    response: Response,
  ): Promise<ApiResponse<T>> => {
    // التعامل المرن مع الاستجابة (JSON أو نص)
    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        typeof data === "object"
          ? data.message
          : data || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    // ضمان إرجاع الهيكلية الموحدة حتى لو كان الرد نصاً بسيطاً
    if (typeof data !== "object") {
      return {
        success: true,
        message: "Success",
        statusCode: response.status,
        data: data as unknown as T,
      };
    }

    return data as ApiResponse<T>;
  };

  const get = async <T>(path: string, auth = true): Promise<ApiResponse<T>> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: getHeaders(auth),
    });
    return handleResponse<T>(res);
  };

  // تعديل: دعم FormData في دالة POST
  const post = async <T>(
    path: string,
    body?: unknown,
    auth = true,
  ): Promise<ApiResponse<T>> => {
    const isFormData = body instanceof FormData;

    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: getHeaders(auth, isFormData),
      // إذا كان FormData نرسله كما هو، وإلا نحوله لـ JSON
      body: isFormData
        ? (body as FormData)
        : body
          ? JSON.stringify(body)
          : undefined,
    });
    return handleResponse<T>(res);
  };

  const patch = async <T>(
    path: string,
    body?: unknown,
    auth = true,
  ): Promise<ApiResponse<T>> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PATCH",
      headers: getHeaders(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  };

  const del = async <T>(path: string, auth = true): Promise<ApiResponse<T>> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      headers: getHeaders(auth),
    });
    return handleResponse<T>(res);
  };

  return { get, post, patch, del };
};
