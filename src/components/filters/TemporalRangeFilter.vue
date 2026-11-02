<template>
  <fieldset class="temporal-range__time">
    <legend>Dates</legend>
    <div class="temporal-range__range">
      <input
        class="temporal-range__slider" :class="{ 'temporal-range__slider--front': oldOnTop }" type="range" min="0" :max="STEPS" step="1" :value="oldStep"
        aria-label="Début de la plage" :aria-valuetext="labels.old" @input="onSlide('old', $event)"
      />
      <input
        class="temporal-range__slider" type="range" min="0" :max="STEPS" step="1" :value="recentStep"
        aria-label="Fin de la plage" :aria-valuetext="labels.recent" @input="onSlide('recent', $event)"
      />
      <div class="temporal-range__track" aria-hidden="true">
        <span class="temporal-range__fill" :style="{ left: `${oldStep / STEPS * 100}%`, right: `${100 - recentStep / STEPS * 100}%` }" />
      </div>
    </div>
    <div class="temporal-range__scale" aria-hidden="true">
      <span v-for="tick in ticks" :key="tick.label" :style="{ left: `${tick.position * 100}%` }">{{ tick.label }}</span>
    </div>
    <p class="temporal-range__summary" aria-live="polite">{{ modelValue ? `Plage : ${labels.old} → ${labels.recent}` : 'Toutes les époques' }}</p>
    <Button v-if="modelValue" variant="tertiary" size="xs" @click="clearTime">Toutes les époques</Button>
  </fieldset>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/base/Button.vue';
import { formatYearsBP, positionFromYearsBP, yearsBPFromPosition, type StoryTimeRange } from '@/lib/storyTimeFilter';
const props = defineProps<{ modelValue: StoryTimeRange | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: StoryTimeRange | null] }>();
const STEPS = 1000;
const oldStep = computed(() => props.modelValue ? Math.round(positionFromYearsBP(props.modelValue.oldBP) * STEPS) : 0);
const recentStep = computed(() => props.modelValue ? Math.round(positionFromYearsBP(props.modelValue.recentBP) * STEPS) : STEPS);
// Stacked handles: the one that can still move must be the one under the pointer.
const oldOnTop = computed(() => oldStep.value === recentStep.value && oldStep.value > STEPS / 2);
const labels = computed(() => ({
  old: formatYearsBP(props.modelValue?.oldBP ?? yearsBPFromPosition(0)),
  recent: formatYearsBP(props.modelValue?.recentBP ?? 0),
}));
const ticks = [{ bp: 1.38e10, label: '13,8 Ga' }, { bp: 1e6, label: '1 Ma' }, { bp: 1e3, label: '1 000 ans' }, { bp: 0, label: 'Auj.' }]
  .map(tick => ({ label: tick.label, position: positionFromYearsBP(tick.bp) }));
function onSlide(handle: 'old' | 'recent', event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  // Handles never cross: the oldest bound stays to the left of the most recent one.
  const old = handle === 'old' ? Math.min(value, recentStep.value) : oldStep.value;
  const recent = handle === 'recent' ? Math.max(value, oldStep.value) : recentStep.value;
  (event.target as HTMLInputElement).value = String(handle === 'old' ? old : recent);
  emit('update:modelValue', old === 0 && recent === STEPS ? null : {
    oldBP: old === 0 ? yearsBPFromPosition(0) : yearsBPFromPosition(old / STEPS),
    recentBP: recent === STEPS ? 0 : yearsBPFromPosition(recent / STEPS),
  });
}
function clearTime() { emit('update:modelValue', null); }
</script>
<style scoped>
.temporal-range__time { display: flex; flex-direction: column; gap: var(--spacing-sm); min-width: 0; margin: 0; padding: 0; border: 0; }
.temporal-range__time legend { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.temporal-range__range { position: relative; height: 24px; }
/* The chosen period name (with its dates) stays within the panel. */
.temporal-range__time :deep(.base-select__value) { min-width: 0; overflow: hidden; }
.temporal-range__time :deep(.period-select__summary) { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.temporal-range__track { position: absolute; left: 8px; right: 8px; top: 50%; height: 4px; transform: translateY(-50%); border-radius: 2px; background: var(--color-border-default); }
.temporal-range__fill { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: var(--color-text-link); }
.temporal-range__slider { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; pointer-events: none; appearance: none; -webkit-appearance: none; }
.temporal-range__slider--front { z-index: 2; }
/* base.css styles every input (border, fill, padding, and a darker fill on focus in dark mode):
   on these overlaid sliders that fill would hide the track and the other handle. */
.temporal-range__range .temporal-range__slider,
.temporal-range__range .temporal-range__slider:focus,
.temporal-range__range .temporal-range__slider:focus-visible { padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; outline: none; }
.temporal-range__slider::-webkit-slider-runnable-track { background: transparent; border: 0; }
.temporal-range__slider::-moz-range-track { background: transparent; border: 0; }
.temporal-range__slider::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--color-surface-raised); border: 2px solid var(--color-text-link); cursor: grab; }
.temporal-range__slider::-moz-range-thumb { pointer-events: auto; width: 14px; height: 14px; border-radius: 50%; background: var(--color-surface-raised); border: 2px solid var(--color-text-link); cursor: grab; }
/* The focus ring moves to the handle being driven. */
.temporal-range__slider:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--color-border-focus); }
.temporal-range__slider:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 3px var(--color-border-focus); }
.temporal-range__scale { position: relative; height: 14px; margin-inline: 8px; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.temporal-range__scale span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.temporal-range__scale span:first-child { transform: none; }
.temporal-range__scale span:last-child { transform: translateX(-100%); }
.temporal-range__summary { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-primary); }
.temporal-range__error { margin: 0; font-size: var(--font-size-sm); color: var(--color-status-error-foreground); }
</style>
