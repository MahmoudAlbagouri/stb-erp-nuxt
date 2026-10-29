<!--
  كتم أنواع الإشعارات: ما يُكتم لا يصل المستخدم أصلاً. رسائل الإدارة والترحيب
  والاشتراك لا تُكتم (تظهر مقفولة).
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal doc-modal prefs-modal">
          <div class="modal__header">
            <h3>
              <Settings2 :size="20" class="doc-modal__icon" />
              ما يصلني من إشعارات
            </h3>
            <button class="btn btn--icon btn--ghost" aria-label="إغلاق" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div v-if="loading" class="prefs-loading"><span class="spinner" /></div>
          <div v-else class="prefs-groups">
            <section v-for="group in groups" :key="group.key" class="prefs-group">
              <h4>{{ group.label }}</h4>
              <label
                v-for="type in group.types"
                :key="type.key"
                class="prefs-row"
                :class="{ locked: !type.mutable }"
              >
                <component :is="notificationIcon(type.icon)" :size="16" />
                <span>{{ type.label }}</span>
                <small v-if="!type.mutable">يصل دائماً</small>
                <input
                  type="checkbox"
                  :checked="!muted.has(type.key)"
                  :disabled="!type.mutable"
                  @change="toggle(type.key)"
                />
              </label>
            </section>
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" @click="close">إلغاء</button>
            <button class="btn btn--primary" :disabled="saving || loading" @click="save">
              {{ saving ? "جارٍ الحفظ..." : "حفظ" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Settings2, X } from "lucide-vue-next";
import { useNotificationsStore } from "@/stores/notifications";
import { useToast } from "@/composables/useToast";
import { notificationIcon } from "@/utils/notifications";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const store = useNotificationsStore();
const toast = useToast();
const muted = ref(new Set<string>());
const loading = ref(false);
const saving = ref(false);

const groups = computed(() =>
  (store.catalog?.groups ?? [])
    .map((group) => ({
      ...group,
      types: (store.catalog?.types ?? []).filter((t) => t.group === group.key),
    }))
    .filter((group) => group.types.length),
);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    loading.value = true;
    try {
      await store.fetchCatalog();
      muted.value = new Set(await store.fetchPreferences());
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      loading.value = false;
    }
  },
);

const toggle = (key: string) => {
  const next = new Set(muted.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  muted.value = next;
};

const close = () => emit("update:modelValue", false);

const save = async () => {
  saving.value = true;
  try {
    await store.updatePreferences([...muted.value]);
    toast.success("حُفظت تفضيلات الإشعارات");
    close();
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use "~/assets/scss/variables" as *;
@use "~/assets/scss/mixins" as *;

.prefs-modal {
  max-width: 560px;
}
.prefs-loading {
  @include flex(row, center, center);
  padding: $space-8;
}
.prefs-groups {
  @include flex(column, stretch, flex-start, $space-4);
}
.prefs-group h4 {
  font-size: $font-size-sm;
  color: $stb-text-muted;
  margin: 0 0 $space-2;
}
.prefs-row {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-sm;
  &:hover {
    background: rgba($stb-primary, 0.05);
  }
  span {
    flex: 1;
  }
  small {
    color: $stb-text-muted;
    font-size: $font-size-xs;
  }
  &.locked {
    cursor: default;
    opacity: 0.7;
  }
}
</style>
