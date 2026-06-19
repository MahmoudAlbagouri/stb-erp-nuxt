// stores/users.ts
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import type { User, CreateUserPayload, UpdateUserPayload } from "../types";
import { ref } from "vue";

export const useUsersStore = defineStore("users", () => {
  const api = useApi();

  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get<User[]>("/users");
      users.value = res.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const getById = async (id: string) => {
    const res = await api.get<User>(`/users/${id}`);
    return res.data;
  };

  const create = async (payload: CreateUserPayload) => {
    const res = await api.post<User>("/users", payload);
    users.value.unshift(res.data);
    return res.data;
  };

  const update = async (id: string, payload: UpdateUserPayload) => {
    const res = await api.patch<User>(`/users/${id}`, payload);
    const idx = users.value.findIndex((u) => u.id === id);
    if (idx !== -1) users.value[idx] = res.data;
    return res.data;
  };

  const remove = async (id: string) => {
    await api.del(`/users/${id}`);
    users.value = users.value.filter((u) => u.id !== id);
  };

  return { users, loading, error, fetchAll, getById, create, update, remove };
});
