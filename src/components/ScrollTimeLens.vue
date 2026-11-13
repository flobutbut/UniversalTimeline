<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { computed } from 'vue';
import { journeyChapters, journeyDuration, journeyTickLabel } from '@/lib/scrollJourney';

const props = defineProps<{ duration: number; chapterIndex: number }>();
const measurement = computed(() => journeyDuration(props.duration));
const chapter = computed(() => journeyChapters[props.chapterIndex]);
const next = computed(() => journeyChapters[props.chapterIndex + 1]);
const nextWidth = computed(() => next.value ? Math.min(1, next.value.duration / props.duration) * 640 : 0);
const points = computed(() => journeyChapters.filter(item => !item.example && item.duration <= props.duration * 1.000001));
const ticks = [0, .25, .5, .75, 1];
const subdivisions = Array.from({ length: 41 }, (_, index) => index);
const zoom = computed(() => {
  const ratio = journeyChapters[0].duration / props.duration;
  if (ratio < 10000) return `× ${ratio.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`;
  const exponent = Math.floor(Math.log10(ratio));
  return `× ${(ratio / 10 ** exponent).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} · 10${String(exponent).split('').map(char => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(char)]).join('')}`;
});
</script>

<template>
  <div class="time-lens" :class="`lens-${chapter.color}`">
    <div class="lens-meta"><span>{{ uiText("DURÉE DANS LE CADRE") }}</span><span>{{ zoom }} {{ uiText("depuis le départ") }}</span></div>
    <div class="lens-measure" aria-hidden="true"><span class="measure-value">{{ measurement.value }}</span><span class="measure-unit">{{ measurement.unit }}</span></div>
    <span class="sr-only">{{ uiText("Fenêtre visible :") }} {{ measurement.value }} {{ measurement.unit }}.</span>
    <svg class="lens-drawing" viewBox="0 0 720 330" role="img" :aria-label="uiText(uiFormat`Frise linéaire : ${measurement.value} ${measurement.unit}, jusqu’au présent. ${next ? 'La zone encadrée montre la prochaine échelle.' : 'Le voyage atteint une seconde.'}`)">
      <defs><clipPath id="journey-ruler-clip"><rect x="40" y="15" width="642" height="290" /></clipPath></defs>
      <g class="ruler-grid" aria-hidden="true">
        <line v-for="tick in ticks" :key="tick" :x1="40 + tick * 640" :x2="40 + tick * 640" y1="26" y2="204" />
        <line x1="40" x2="680" y1="146" y2="146" />
      </g>
      <g aria-hidden="true">
        <text x="40" y="17" class="axis-heading">{{ uiText("PASSÉ") }}</text>
        <text x="680" y="17" text-anchor="end" class="axis-heading">{{ uiText("PRÉSENT") }}</text>
        <rect x="40" y="103" width="640" height="43" class="ruler-fill" />
        <line v-for="index in subdivisions" :key="index" :x1="40 + index * 16" :x2="40 + index * 16" y1="146" :y2="index % 5 === 0 ? 164 : 155" class="ruler-tick" />
        <g clip-path="url(#journey-ruler-clip)">
          <circle v-for="point in points" :key="point.id" :cx="40 + (1 - point.duration / duration) * 640" cy="124" :r="point.id === chapter.id ? 5 : 2.5" class="ruler-point" :class="{ 'ruler-point--active': point.id === chapter.id }" />
        </g>
        <line x1="680" x2="680" y1="64" y2="205" class="present-line" />
        <text v-for="tick in ticks" :key="tick" :x="40 + tick * 640" y="190" :text-anchor="tick === 0 ? 'start' : tick === 1 ? 'end' : 'middle'" class="tick-label" :class="{ 'tick-label--intermediate': tick === .25 || tick === .75 }">{{ uiText(journeyTickLabel((1 - tick) * duration, duration)) }}</text>
      </g>
      <g v-if="next" aria-hidden="true">
        <rect :x="680 - nextWidth" y="96" :width="nextWidth" height="57" class="next-window" />
        <path :d="`M ${680 - nextWidth} 153 L 40 257 M 680 153 L 680 257`" class="zoom-guides" />
        <line x1="40" x2="680" y1="257" y2="257" class="next-ruler" />
        <line x1="40" x2="40" y1="250" y2="264" class="next-ruler" />
        <line x1="680" x2="680" y1="250" y2="264" class="next-ruler" />
        <text x="40" y="294" class="next-caption">{{ uiText("PROCHAIN CADRE") }}</text>
        <text x="680" y="294" text-anchor="end" class="next-name">{{ uiText(next.label) }}</text>
      </g>
      <g v-else aria-hidden="true">
        <text x="360" y="264" text-anchor="middle" class="last-caption">{{ uiText("Le même temps. Une autre perspective.") }}</text>
      </g>
    </svg>
    <div class="lens-footnote"><span>{{ uiText("Axe linéaire · repères arrondis") }}</span><span>{{ uiText(chapter.example ? 'Durée illustrative' : 'Le présent reste à droite') }}</span></div>
  </div>
</template>

<style scoped>
.time-lens { min-width: 0; --lens-accent: var(--color-data-period); }
.lens-period { --lens-accent: var(--color-data-period); }.lens-period-root { --lens-accent: var(--color-data-period-root); }.lens-event { --lens-accent: var(--color-data-event); }.lens-story { --lens-accent: var(--color-data-frise); }
.lens-meta,.lens-footnote { display: flex; justify-content: space-between; gap: var(--spacing-lg); color: var(--color-text-secondary); font-size: var(--font-size-xs); }
.lens-meta>span:first-child { letter-spacing: .1em; }.lens-meta>span:last-child { font-family: var(--font-family-mono); }
.lens-measure { display: flex; flex-direction: column; padding-block: var(--spacing-xl); }
.measure-value { font-family: var(--font-family-heading); font-size: clamp(60px, 8.5vw, 128px); line-height: 1.05; letter-spacing: -.06em; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.measure-unit { font-family: var(--font-family-heading); font-size: clamp(18px, 2.3vw, 30px); color: var(--color-text-link); margin-top: var(--spacing-sm); }
.lens-drawing { display: block; width: 100%; overflow: visible; }
.ruler-grid { stroke: var(--color-border-light); stroke-width: 1; }
.axis-heading,.next-caption { fill: var(--color-text-secondary); font-family: var(--font-family-base); font-size: 12px; letter-spacing: 1.5px; }
.ruler-fill { fill: color-mix(in srgb, var(--lens-accent) 10%, transparent); }
.ruler-tick { stroke: var(--color-text-secondary); stroke-width: 1; }
.present-line,.next-ruler { stroke: var(--lens-accent); stroke-width: 1; }
.ruler-point { fill: var(--color-text-secondary); }.ruler-point--active { fill: var(--lens-accent); }
.tick-label { fill: var(--color-text-secondary); font-family: var(--font-family-mono); font-size: 14px; }
.next-window { fill: color-mix(in srgb, var(--lens-accent) 10%, transparent); stroke: var(--lens-accent); stroke-width: 1; }
.zoom-guides { fill: none; stroke: var(--lens-accent); stroke-opacity: .4; stroke-dasharray: 3 5; }
.next-name { fill: var(--color-text-link); font-family: var(--font-family-heading); font-size: 20px; }
.last-caption { fill: var(--color-text-link); font-family: var(--font-family-heading); font-size: 23px; }
@media (max-width: 700px) {
  .lens-measure { padding-block: var(--spacing-md); }.measure-value { font-size: clamp(42px, 13vw, 70px); }.measure-unit { font-size: var(--font-size-xl); margin-top: var(--spacing-xs); }.lens-meta { font-size: var(--font-size-xs); }.lens-meta>span:last-child { display: none; }.lens-footnote { font-size: var(--font-size-xs); }.lens-footnote>span:last-child { display: none; }
  .tick-label { font-size: 24px; }.tick-label--intermediate { visibility: hidden; }.axis-heading,.next-caption { font-size: 22px; }.next-name { font-size: 28px; }
}
</style>
