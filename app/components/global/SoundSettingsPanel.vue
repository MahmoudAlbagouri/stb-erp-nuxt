<!--
  SoundSettingsPanel — تشغيل أصوات التنبيه ومستواها لهذا الجهاز، مع تجربة كل صوت.
  الإعداد يُحفظ على الجهاز نفسه (utils/sounds)، لكل نطاق على حدة:
    <SoundSettingsPanel scope="pos" :sounds="['scan', 'error', ...]" />
-->
<template>
  <div class="sound-panel" :class="{ 'sound-panel--compact': compact }">
    <label class="checkbox-label">
      <input
        type="checkbox"
        :checked="settings.enabled"
        @change="toggle(($event.target as HTMLInputElement).checked)"
      />
      <span>{{ label }}</span>
    </label>

    <template v-if="settings.enabled">
      <div class="sound-panel__volume">
        <VolumeX :size="15" class="sound-panel__icon" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="settings.volume"
          aria-label="مستوى الصوت"
          @input="setVolume(($event.target as HTMLInputElement).value)"
          @change="preview"
        />
        <Volume2 :size="15" class="sound-panel__icon" />
      </div>

      <div v-if="!compact" class="sound-panel__tests">
        <button
          v-for="name in sounds"
          :key="name"
          type="button"
          class="btn btn--sm btn--ghost"
          @click="playSound(name, scope)"
        >
          <Play :size="12" /> {{ SOUND_LABELS[name] }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Play, Volume2, VolumeX } from "lucide-vue-next";
import {
  playSound,
  setSoundSettings,
  SOUND_LABELS,
  soundSettings,
  type SoundName,
  type SoundScope,
} from "@/utils/sounds";

const props = withDefaults(
  defineProps<{
    scope: SoundScope;
    /** الأصوات التي تظهر لها أزرار تجربة */
    sounds?: SoundName[];
    label?: string;
    /** سطر واحد بلا أزرار تجربة (قائمة الإشعارات) */
    compact?: boolean;
  }>(),
  { sounds: () => [], label: "تشغيل أصوات التنبيه", compact: false },
);

const settings = computed(() => soundSettings[props.scope]);

/** صوت يُسمع عند التشغيل وعند تغيير المستوى: ليعرف المستخدم كيف سيكون */
const preview = () =>
  playSound(props.sounds[0] ?? "notification", props.scope);

const toggle = (enabled: boolean) => {
  setSoundSettings(props.scope, { enabled });
  if (enabled) preview();
};

const setVolume = (value: string) =>
  setSoundSettings(props.scope, { volume: Number(value) });
</script>

<style lang="scss" scoped>
.sound-panel {
  display: flex;
  flex-direction: column;
  gap: $space-3;

  &--compact {
    gap: $space-2;
  }
}

.sound-panel__volume {
  display: flex;
  align-items: center;
  gap: $space-2;

  input[type="range"] {
    flex: 1;
    accent-color: $stb-accent;
  }
}

.sound-panel__icon {
  color: $stb-text-muted;
  flex-shrink: 0;
}

.sound-panel__tests {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}
</style>
