<script setup lang="ts">
import { language, uiText } from '@/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Button from '@/components/base/Button.vue';
import Tabs from '@/components/base/Tabs.vue';
import { track as trackEvent } from '@/lib/analytics';
import { createIntroScales, HUMAN_AGE, introBandLayout, introLandmarks, type IntroScaleId } from '@/lib/landingTimeline';

const mode = ref<IntroScaleId>('universe');
const selectedId = ref('universe');
const year = ref(new Date().getFullYear());
const track = ref<HTMLElement>();
const trackWidth = ref<number | null>(null);
const scales = computed(() => createIntroScales(year.value));
const scale = computed(() => scales.value.find(item => item.id === mode.value)!);
const scaleTabs = computed(() => scales.value.map(item => ({ value: item.id, label: item.label })));
const landmarks = computed(() => introLandmarks.filter(item => scale.value.landmarks.includes(item.id)));
const selected = computed(() => landmarks.value.find(item => item.id === selectedId.value) ?? landmarks.value[0]);
const humanPixels = computed(() => trackWidth.value === null ? null : trackWidth.value * HUMAN_AGE / scale.value.span);
const humanPercent = computed(() => (HUMAN_AGE / scale.value.span * 100).toLocaleString('fr-FR', { maximumFractionDigits: 4 }));
const chartBands = computed(() => scale.value.bands.map(band => {
  const layout = introBandLayout(band, scale.value.span);
  return { ...band, ...layout, subpixel: trackWidth.value !== null && trackWidth.value * layout.width / 100 < 1 };
}));
let observer: ResizeObserver | undefined;

function changeScale(value: IntroScaleId) {
  if (value !== mode.value) trackEvent('landing_demo_scale_changed', { scale: value });
  mode.value = value;
  if (!scale.value.landmarks.includes(selectedId.value)) selectedId.value = scale.value.landmarks[0];
}
function nextScale() {
  const index = scales.value.findIndex(item => item.id === mode.value);
  changeScale(scales.value[(index + 1) % scales.value.length].id);
}
function refreshYear() { year.value = new Date().getFullYear(); }
onMounted(() => {
  if (track.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(entries => { trackWidth.value = entries[0]?.contentRect.width ?? null; });
    observer.observe(track.value);
  }
  document.addEventListener('visibilitychange', refreshYear);
  window.addEventListener('focus', refreshYear);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  document.removeEventListener('visibilitychange', refreshYear);
  window.removeEventListener('focus', refreshYear);
});
</script>

<template>
  <div class="time-demo">
    <div class="demo-toolbar">
      <span class="toolbar-label">{{ uiText("UNE MÊME LIGNE · CINQ ÉCHELLES") }}</span>
      <Tabs :model-value="mode" :tabs="scaleTabs" :aria-label="uiText('Échelle de la frise')" @update:model-value="changeScale" />
    </div>
    <figure class="time-figure" :aria-label="uiText('Des durées représentées sur une échelle linéaire commune')">
      <figcaption>
        <span>{{ uiText(mode === 'universe' ? 'Du Big Bang à aujourd’hui : l’Univers entier' : mode === 'earth' ? 'De la formation de la Terre à aujourd’hui' : `Zoom : ${scale.label.toLocaleLowerCase(language)}`) }}</span>
        <span class="figure-unit">{{ uiText(mode === 'universe' || mode === 'earth' ? 'Ga = milliards d’années' : mode === 'dinosaurs' ? 'Ma = millions d’années' : 'Échelle linéaire') }}</span>
      </figcaption>
      <div class="plot">
        <div class="plot-label axis-label">{{ uiText("LE TEMPS") }}</div>
        <div ref="track" class="plot-axis">
          <span v-for="(tick, index) in scale.ticks" :key="index" class="axis-tick" :class="{ 'axis-tick--first': index === 0, 'axis-tick--last': index === scale.ticks.length - 1 }" :style="{ left: `${(1 - tick.age / scale.span) * 100}%` }">{{ uiText(tick.label) }}</span>
        </div>
        <template v-for="band in chartBands" :key="band.id">
          <div class="plot-label" :class="`tone-${band.color}`">{{ uiText(band.label) }}</div>
          <div class="plot-lane" :class="`tone-${band.color}`" :aria-label="uiText(`${band.label} : ${band.dateLabel}`)">
            <span v-for="(tick, index) in scale.ticks" :key="index" class="lane-guide" :style="{ left: `${(1 - tick.age / scale.span) * 100}%` }" aria-hidden="true" />
            <div class="duration-band" :data-band="band.id" :style="{ left: `${band.left}%`, width: `${band.width}%` }" aria-hidden="true" />
            <span v-if="band.subpixel" class="subpixel-marker" :style="{ left: `min(${band.left}%, calc(100% - 1px))` }" aria-hidden="true" />
          </div>
        </template>
      </div>
      <div class="plot-caption">
        <span>{{ uiText("Même échelle pour toutes les lignes. Dates approximatives.") }}</span>
        <span v-if="mode === 'universe' || mode === 'earth'" class="human-measure">{{ uiText("Homo sapiens :") }} {{ humanPercent }} {{ uiText("% de la ligne") }}<span v-if="humanPixels !== null"> · {{ uiText(humanPixels.toLocaleString('fr-FR', { maximumFractionDigits: 3 })) }} {{ uiText("px sur cet écran") }}</span></span>
      </div>
      <p class="marker-note">{{ uiText("Les durées inférieures au pixel sont signalées par un trait de repérage de 1 px, sans agrandir la barre de durée.") }}</p>
    </figure>
    <div class="demo-insight">
      <div aria-live="polite" aria-atomic="true">
        <h2>{{ uiText(scale.thought) }}</h2>
        <p>{{ uiText(scale.explanation) }}</p>
      </div>
      <Button size="sm" @click="nextScale">{{ uiText(scale.nextLabel) }}</Button>
    </div>
    <div class="landmark-list" role="group" :aria-label="uiText('Examiner les repères historiques')">
      <button v-for="(landmark, index) in landmarks" :key="landmark.id" type="button" :aria-pressed="selected.id === landmark.id" @click="selectedId = landmark.id">
        <span class="landmark-index">{{ uiText(String(index + 1).padStart(2, '0')) }}</span>
        <strong>{{ uiText(landmark.title) }}</strong>
        <span>{{ uiText(landmark.date) }}</span>
      </button>
    </div>
    <div class="landmark-detail" aria-live="polite" aria-atomic="true">
      <p><strong>{{ uiText(selected.title) }}.</strong> {{ uiText(selected.description) }}</p>
      <a :href="selected.source" target="_blank" rel="noopener noreferrer">{{ uiText("Source :") }} {{ selected.sourceName }}<span class="sr-only"> {{ uiText("(nouvel onglet)") }}</span></a>
    </div>
  </div>
</template>

<style scoped>
.time-demo { border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-surface-default); overflow: hidden; }
.demo-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-lg); padding: var(--spacing-md) var(--spacing-xl); border-bottom: 1px solid var(--color-border-default); }
.toolbar-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); letter-spacing: .08em; }
.time-figure { margin: 0; padding: var(--spacing-xl); }
figcaption { display: flex; justify-content: space-between; gap: var(--spacing-lg); margin-bottom: var(--spacing-2xl); color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.figure-unit { color: var(--color-text-secondary); font-family: var(--font-family-mono); white-space: nowrap; }
.plot { display: grid; grid-template-columns: 140px minmax(0, 1fr); align-items: stretch; align-content: start; min-height: 274px; }
.plot-label { display: flex; align-items: center; padding-right: var(--spacing-lg); font-size: var(--font-size-sm); line-height: var(--line-height-control); }
.axis-label { font-size: var(--font-size-xs); letter-spacing: .1em; color: var(--color-text-secondary); align-items: start; }
.plot-axis { position: relative; height: 42px; }
.axis-tick { position: absolute; transform: translateX(-50%); top: 0; white-space: nowrap; font-size: var(--font-size-xs); font-family: var(--font-family-mono); color: var(--color-text-secondary); }
.axis-tick--first { transform: none; }.axis-tick--last { transform: translateX(-100%); }
.plot-lane { position: relative; height: 58px; border-bottom: 1px solid var(--color-border-light); }
.lane-guide { position: absolute; top: -9px; bottom: 0; width: 1px; background: var(--color-border-light); }
.tone-period { --band-color: var(--color-data-period); }.tone-period-root { --band-color: var(--color-data-period-root); }.tone-event { --band-color: var(--color-data-event); }.tone-story { --band-color: var(--color-data-frise); }
.plot-label:not(.axis-label)::before { content: ''; width: 4px; height: 16px; margin-right: var(--spacing-sm); flex-shrink: 0; background: var(--band-color); border-radius: var(--radius-sm); }
.duration-band { position: absolute; top: 16px; height: 26px; background: color-mix(in srgb, var(--band-color) 28%, var(--color-surface-default)); border-block: 1px solid var(--band-color); transition: width var(--transition-slow), left var(--transition-slow); }
.duration-band::before,.duration-band::after { content: ''; position: absolute; top: -1px; bottom: -1px; width: 1px; background: var(--band-color); }.duration-band::after { right: 0; }
.subpixel-marker { position: absolute; top: 11px; width: 1px; height: 36px; background: var(--band-color); }
.plot-caption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--spacing-sm); margin: var(--spacing-xl) 0 var(--spacing-xs); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.human-measure { color: var(--color-text-link); }.marker-note { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.demo-insight { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-xl); padding: var(--spacing-xl); background: var(--color-background-default); border-block: 1px solid var(--color-border-default); }
.demo-insight h2 { font-family: var(--font-family-heading); font-size: var(--font-size-2xl); font-weight: var(--font-weight-normal); line-height: var(--line-height-loose); margin: 0 0 var(--spacing-sm); }
.demo-insight p { font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: var(--line-height-control); margin: 0; max-width: 620px; }
.demo-insight :deep(.base-button) { flex-shrink: 0; }.demo-insight :deep(.base-button__text) { white-space: normal; }
.landmark-list { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
.landmark-list button { position: relative; display: flex; flex-direction: column; align-items: flex-start; text-align: left; gap: var(--spacing-xs); padding: var(--spacing-lg); border-right: 1px solid var(--color-border-light); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.landmark-list button:last-child { border-right: 0; }.landmark-list button:hover { background: var(--color-interaction-hover); }.landmark-list button[aria-pressed='true'] { background: var(--color-primary-light); color: var(--color-text-primary); }
.landmark-list button[aria-pressed='true']::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--color-primary); }
.landmark-list strong { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); line-height: var(--line-height-control); }.landmark-index { font-family: var(--font-family-mono); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.landmark-detail { display: flex; align-items: start; justify-content: space-between; gap: var(--spacing-xl); border-top: 1px solid var(--color-border-default); padding: var(--spacing-lg) var(--spacing-xl); min-height: 90px; }
.landmark-detail p { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: var(--line-height-control); max-width: 740px; }.landmark-detail strong { font-weight: var(--font-weight-medium); color: var(--color-text-primary); }.landmark-detail a { font-size: var(--font-size-xs); flex-shrink: 0; max-width: 200px; }
@media (max-width: 850px) {
  .demo-toolbar { align-items: stretch; flex-direction: column; gap: var(--spacing-sm); }.demo-insight { align-items: start; flex-direction: column; }.landmark-detail { flex-direction: column; gap: var(--spacing-sm); }.landmark-list { grid-auto-flow: row; grid-template-columns: repeat(3, minmax(0, 1fr)); }.landmark-list button { border-bottom: 1px solid var(--color-border-light); }
}
@media (max-width: 540px) {
  .demo-toolbar,.time-figure,.demo-insight { padding: var(--spacing-lg); }.demo-toolbar :deep(.tabs) { justify-content: space-between; }.demo-toolbar :deep(.tab-button) { padding-inline: var(--spacing-xs); }.demo-toolbar :deep(.tab-button__label) { white-space: normal; }
  figcaption { flex-direction: column; gap: var(--spacing-xs); margin-bottom: var(--spacing-xl); }.plot { grid-template-columns: 80px minmax(0, 1fr); }.plot-label { font-size: var(--font-size-xs); padding-right: var(--spacing-sm); }.plot-label:not(.axis-label)::before { width: 3px; margin-right: var(--spacing-xs); }.plot-lane { height: 56px; }.axis-tick:nth-child(even):not(.axis-tick--last) { display: none; }.axis-tick--last { top: 16px; }.plot-axis { height: 47px; }
  .demo-insight h2 { font-size: var(--font-size-xl); line-height: var(--line-height-relaxed); }.landmark-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }.landmark-list button { padding: var(--spacing-md); }.landmark-detail { padding: var(--spacing-lg); }.marker-note { line-height: var(--line-height-control); }
}
</style>
