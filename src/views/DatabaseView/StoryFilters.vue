<template>
  <div ref="root" class="story-filters" @keydown.esc.stop="close">
    <Button ref="trigger" variant="tertiary" size="sm" icon-only :pressed="open || modelValue !== 'all' || !!timeRange" aria-label="Filtrer les frises" :aria-expanded="open" @click="open = !open"><template #icon><DesignIcon name="filter" /></template></Button>
    <div v-if="open" class="story-filters__panel">
      <div class="story-filters__group story-filters__visibility">
        <Select
          :id="id"
          :model-value="modelValue"
          :options="[...options]"
          label="Visibilité"
          :searchable="false"
          size="sm"
          @update:model-value="value => $emit('update:modelValue', value as 'all' | 'public' | 'private')"
        />
      </div>
      <fieldset class="story-filters__group story-filters__time">
        <legend>Période couverte</legend>
        <PeriodSelect v-model="periodId" compact search-remote placeholder="Choisir une période…" />
        <p v-if="periodError" class="story-filters__error" role="alert">{{ periodError }}</p>
        <div class="story-filters__range">
          <input
            class="story-filters__slider" :class="{ 'story-filters__slider--front': oldOnTop }" type="range" min="0" :max="STEPS" step="1" :value="oldStep"
            aria-label="Début de la plage" :aria-valuetext="labels.old" @input="onSlide('old', $event)"
          />
          <input
            class="story-filters__slider" type="range" min="0" :max="STEPS" step="1" :value="recentStep"
            aria-label="Fin de la plage" :aria-valuetext="labels.recent" @input="onSlide('recent', $event)"
          />
          <div class="story-filters__track" aria-hidden="true">
            <span class="story-filters__fill" :style="{ left: `${oldStep / STEPS * 100}%`, right: `${100 - recentStep / STEPS * 100}%` }" />
          </div>
        </div>
        <div class="story-filters__scale" aria-hidden="true">
          <span v-for="tick in ticks" :key="tick.label" :style="{ left: `${tick.position * 100}%` }">{{ tick.label }}</span>
        </div>
        <p class="story-filters__summary" aria-live="polite">{{ timeRange ? `Frises qui recoupent ${labels.old} → ${labels.recent}` : 'Toutes les époques' }}</p>
        <Button v-if="timeRange" variant="tertiary" size="xs" @click="clearTime">Toutes les époques</Button>
      </fieldset>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Button from '@/components/base/Button.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
import PeriodSelect from '@/components/PeriodSelect.vue';
import Select from '@/components/base/Select.vue';
import { generateDomUid } from '@/utils/generateDomUid';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { formatYearsBP, positionFromYearsBP, rangeFromPeriod, yearsBPFromPosition, type StoryTimeRange } from '@/lib/storyTimeFilter';

const props = defineProps<{ modelValue: 'all' | 'public' | 'private'; timeRange?: StoryTimeRange | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: 'all' | 'public' | 'private']; 'update:timeRange': [value: StoryTimeRange | null] }>();
const id = generateDomUid('story-filter');
const root = ref<HTMLElement>();
const trigger = ref<{ $el: HTMLButtonElement }>();
const open = ref(false);
const options = [{ value: 'all', label: 'Toutes les frises' }, { value: 'public', label: 'Frises publiques' }, { value: 'private', label: 'Frises privées' }] as const;

// ─── Filtre temporel : échelle logarithmique, la plus ancienne à gauche ───
const STEPS = 1000;
const oldStep = computed(() => props.timeRange ? Math.round(positionFromYearsBP(props.timeRange.oldBP) * STEPS) : 0);
const recentStep = computed(() => props.timeRange ? Math.round(positionFromYearsBP(props.timeRange.recentBP) * STEPS) : STEPS);
// Stacked handles: the one that can still move must be the one under the pointer.
const oldOnTop = computed(() => oldStep.value === recentStep.value && oldStep.value > STEPS / 2);
const labels = computed(() => ({
  old: formatYearsBP(props.timeRange?.oldBP ?? yearsBPFromPosition(0)),
  recent: formatYearsBP(props.timeRange?.recentBP ?? 0),
}));
const ticks = [{ bp: 1.38e10, label: '13,8 Ga' }, { bp: 1e6, label: '1 Ma' }, { bp: 1e3, label: '1 000 ans' }, { bp: 0, label: 'Auj.' }]
  .map(tick => ({ label: tick.label, position: positionFromYearsBP(tick.bp) }));
const periodId = ref<string | null>(null);
const periodError = ref('');
const periodRequests = useLatestRequest();
const dataStore = useDataStore();

function onSlide(handle: 'old' | 'recent', event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  // Handles never cross: the oldest bound stays to the left of the most recent one.
  const old = handle === 'old' ? Math.min(value, recentStep.value) : oldStep.value;
  const recent = handle === 'recent' ? Math.max(value, oldStep.value) : recentStep.value;
  (event.target as HTMLInputElement).value = String(handle === 'old' ? old : recent);
  periodId.value = null;
  emit('update:timeRange', old === 0 && recent === STEPS ? null : {
    oldBP: old === 0 ? yearsBPFromPosition(0) : yearsBPFromPosition(old / STEPS),
    recentBP: recent === STEPS ? 0 : yearsBPFromPosition(recent / STEPS),
  });
}
watch(periodId, async id => {
  periodError.value = '';
  if (!id) return;
  const isCurrent = periodRequests.begin();
  try {
    const period = dataStore.periodById(id) ?? await PeriodApiService.getInstance().getPeriod(id);
    if (!isCurrent()) return;
    const range = rangeFromPeriod(period);
    if (range) emit('update:timeRange', range);
    else periodError.value = 'Les dates de cette période ne sont pas connues.';
  } catch {
    if (isCurrent()) periodError.value = 'Impossible de lire les dates de cette période.';
  }
});
function clearTime() { periodId.value = null; periodError.value = ''; emit('update:timeRange', null); }
watch(() => props.timeRange, range => { if (!range) periodId.value = null; });

function close() { open.value = false; trigger.value?.$el.focus(); }
function onPointer(event: PointerEvent) { if (event.target instanceof Node && !root.value?.contains(event.target)) open.value = false; }
onMounted(() => document.addEventListener('pointerdown', onPointer));
onUnmounted(() => document.removeEventListener('pointerdown', onPointer));
</script>
<style scoped>
.story-filters { position: relative; flex-shrink: 0; }
.story-filters__panel { position: absolute; top: calc(100% + 8px); left: 0; z-index: var(--z-index-dropdown); width: min(320px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: var(--spacing-sm); background: var(--color-surface-raised); padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-md); }
.story-filters__group { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; border: 0; min-width: 0; }
/* Same look as the select label above: one heading style in the panel. */
.story-filters__group legend { padding: 4px 0; font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text); }
.story-filters__visibility { padding: 8px 8px 0; }
.story-filters__time { gap: var(--spacing-sm); padding: 0 8px 8px; border-top: 1px solid var(--color-border); }
.story-filters__time legend { padding-inline: 0; padding-top: 8px; }
.story-filters__range { position: relative; height: 24px; }
/* The chosen period name (with its dates) stays within the panel. */
.story-filters__time :deep(.base-select__value) { min-width: 0; overflow: hidden; }
.story-filters__time :deep(.period-select__summary) { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.story-filters__track { position: absolute; left: 8px; right: 8px; top: 50%; height: 4px; transform: translateY(-50%); border-radius: 2px; background: var(--color-border); }
.story-filters__fill { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: var(--color-text-link); }
.story-filters__slider { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; pointer-events: none; appearance: none; -webkit-appearance: none; }
.story-filters__slider--front { z-index: 2; }
/* base.css styles every input (border, fill, padding, and a darker fill on focus in dark mode):
   on these overlaid sliders that fill would hide the track and the other handle. */
.story-filters__range .story-filters__slider,
.story-filters__range .story-filters__slider:focus,
.story-filters__range .story-filters__slider:focus-visible { padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; outline: none; }
.story-filters__slider::-webkit-slider-runnable-track { background: transparent; border: 0; }
.story-filters__slider::-moz-range-track { background: transparent; border: 0; }
.story-filters__slider::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--color-surface-raised); border: 2px solid var(--color-text-link); cursor: grab; }
.story-filters__slider::-moz-range-thumb { pointer-events: auto; width: 14px; height: 14px; border-radius: 50%; background: var(--color-surface-raised); border: 2px solid var(--color-text-link); cursor: grab; }
/* The focus ring moves to the handle being driven. */
.story-filters__slider:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--color-border-focus); }
.story-filters__slider:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 3px var(--color-border-focus); }
.story-filters__scale { position: relative; height: 14px; margin-inline: 8px; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.story-filters__scale span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.story-filters__scale span:first-child { transform: none; }
.story-filters__scale span:last-child { transform: translateX(-100%); }
.story-filters__summary { margin: 0; font-size: var(--font-size-sm); color: var(--color-text); }
.story-filters__error { margin: 0; font-size: var(--font-size-sm); color: var(--color-status-error-foreground); }
</style>
