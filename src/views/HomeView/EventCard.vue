<template>
  <div
    class="event-card"
    :class="{
      'is-selected': isSelected,
      'is-default-open': isDefaultOpen && !undated,
      'event-card--undated': undated,
      'is-tag-active': isTagActive,
      'event-card--minimized': minimized,
      'align-start': align === 'start',
      'align-end': align === 'end',
    }"
    :style="undated ? undefined : cardStyle"
    @mouseenter="setHovered(true)"
    @mouseleave="setHovered(false)"
    @focusin="setFocused(true)"
    @focusout="setFocused(false)"
  >
    <button :class="undated ? 'event-undated-trigger' : 'event-dot'" type="button" :aria-label="`Afficher l’événement ${displayLabel}`" :aria-pressed="isSelected" @click.stop="$emit('click', $event)">{{ undated ? displayLabel : '' }}</button>

    <!-- Ligne toujours ancrée sur le dot, indépendante du décalage du tooltip -->
    <div v-show="!minimized" class="event-vertical-line"></div>

    <!-- Bulle d'info décalée selon l'alignement -->
    <div class="event-info-box" :class="{ 'event-info-box--bounded': frameWidth && !undated }" :style="tooltipBounds" @click.stop="$emit('click', $event)">
      <button type="button" class="event-label" :aria-label="`${isSelected ? 'Libérer' : 'Figer'} l’infobulle de ${displayLabel}`" :aria-pressed="isSelected">{{ displayLabel }}</button>
      <div class="event-date">{{ displayDate }}</div>
      <div v-if="otherStoryCount" class="event-meta event-story-count">{{ otherStoryCount }} {{ otherStoryCount > 1 ? 'autres frises associées' : 'autre frise associée' }}</div>
      <!-- Au survol, une courte description ; le texte complet à la sélection. -->
      <p v-if="displayDescription" class="event-description" :class="{ 'event-description--clamped': !isSelected }">{{ displayDescription }}</p>
      <WikipediaLink :titles="event.wikipedia" :subject="displayLabel" display="text" class="event-wikipedia" />
      <div v-if="suggestionsLoading" class="event-meta" role="status">Chargement des frises…</div>
      <div v-else-if="suggestionsError" class="event-meta event-meta--error" role="alert">
        {{ suggestionsError }} <Button variant="tertiary" size="sm" type="button" @click.stop="$emit('retry-suggestions')">Réessayer</Button>
      </div>
      <!-- Autres frises contenant l'événement : listées directement, rien s'il n'y en a pas -->
      <section v-if="storySuggestions.length > 0" class="event-stories" aria-label="Autres frises associées à cet événement">
        <ul class="event-stories-list">
          <li v-for="s in storySuggestions" :key="s.id">
            <button class="event-story-item" type="button" @click.stop="$emit('story-select', s.id)">
              {{ s.title?.fr || s.title?.en }}
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import WikipediaLink from '@/components/WikipediaLink.vue';
import { computed, ref } from 'vue';
import type { ListEvent, StorySuggestion } from '@/types/database';
import { DateService } from '@/services/DateService';

const props = withDefaults(
  defineProps<{
    event: ListEvent;
    isSelected: boolean;
    /** Tooltip compact visible sans survol ; le survol et la sélection l'enrichissent. */
    isDefaultOpen?: boolean;
    isTagActive: boolean;
    align?: 'start' | 'center' | 'end';
    undated?: boolean;
    minimized?: boolean;
    /** Largeur mesurée de l’axe, pour garder le détail dans la frise aux petits écrans. */
    frameWidth?: number;
    cardStyle: {
      width: string;
      left: string;
    };
    storySuggestions?: StorySuggestion[];
    /** Autres frises lisibles contenant l'événement ; null tant que le nombre est inconnu. */
    otherStoryCount?: number | null;
    suggestionsLoading?: boolean;
    suggestionsError?: string | null;
  }>(),
  { isDefaultOpen: false, storySuggestions: () => [], otherStoryCount: null, suggestionsLoading: false, suggestionsError: null }
);

const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void;
  (e: 'story-select', storyId: string): void;
  (e: 'retry-suggestions'): void;
  /** Tooltip complet affiché par survol ou focus : la grille libère sa place. */
  (e: 'active-change', active: boolean): void;
}>();

const hovered = ref(false);
const focused = ref(false);
function setHovered(value: boolean) { hovered.value = value; emit('active-change', hovered.value || focused.value); }
function setFocused(value: boolean) { focused.value = value; emit('active-change', hovered.value || focused.value); }

// Les limites sont relatives au point : la carte reste dans son composant et son
// pont de survol suit le même ancrage, même lorsque son texte s’élargit.
const tooltipBounds = computed(() => {
  if (!props.frameWidth || props.undated) return;
  const x = parseFloat(props.cardStyle.left) / 100 * props.frameWidth;
  return {
    '--event-tooltip-left-limit': `${-6 - x}px`,
    '--event-tooltip-right-limit': `${props.frameWidth + 6 - x}px`,
    '--event-tooltip-frame-width': `${props.frameWidth + 12}px`,
  };
});

const displayLabel = computed(() => {
  const raw = props.event.label as unknown;
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object' && ('fr' in raw || 'en' in raw)) {
    const o = raw as { fr?: string; en?: string };
    return (o.fr || o.en || '').trim();
  }
  return '';
});

const displayDescription = computed(() => (props.event.description?.fr || props.event.description?.en || '').trim());

const displayDate = computed(() => {
  const d = props.event.date?.trim() || '';
  if (!d) return '';
  return DateService.format(DateService.parse(d));
});
</script>

<style scoped>
/* Deux tailles seulement : le titre (base, gras) et tout le reste (sm). */
.event-description {
  margin: var(--spacing-sm) 0 0;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-small);
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
/* Sous la description, dans la même taille que le reste de la bulle. */
.event-wikipedia.wikipedia-link { margin-top: var(--spacing-sm); font-size: var(--font-size-sm); }
.event-description--clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}
.event-card.event-card--undated { position: relative; top: auto; height: auto; width: auto; pointer-events: auto; margin-top: var(--spacing-sm); }
.event-undated-trigger { border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: var(--color-surface-default); color: var(--color-text-primary); padding: var(--spacing-xs) var(--spacing-sm); cursor: pointer; }
.event-card--undated .event-vertical-line { display: none; }
.event-card.event-card--undated .event-info-box { position: static; transform: none; display: none; opacity: 1; visibility: visible; pointer-events: auto; max-width: 100%; }
.event-card--undated.is-selected .event-info-box { display: block; }

.event-card {
  position: absolute;
  width: 0;
  height: 0;
  /* Centre de l’axe : marge basse + demi-épaisseur de la ligne. */
  top: calc(var(--spacing-xs) * -0.75);
  z-index: var(--z-index-timeline-item);
  overflow: visible;
  pointer-events: none;
  transition: left 0.18s ease;
}

/* L’ordre des cartes doit primer sur celui de leurs infobulles enfants. */
.event-card.is-selected {
  z-index: calc(var(--z-index-timeline-item) + var(--z-index-local-bump));
}

.event-card:focus-within {
  z-index: calc(var(--z-index-timeline-item) + var(--z-index-local-bump) * 2);
}

.event-card:hover {
  z-index: calc(var(--z-index-timeline-item) + var(--z-index-local-bump) * 3);
}

.event-dot {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0;
  width: calc(var(--font-size-base) - var(--spacing-xs) / 2);
  height: calc(var(--font-size-base) - var(--spacing-xs) / 2);
  background-color: var(--color-text-heading);
  border: 1.5px solid var(--color-surface-default);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  transition: background-color var(--transition-normal), transform var(--transition-normal), box-shadow var(--transition-normal);
}

.event-dot:hover {
  transform: translate(-50%, -50%) scale(1.4);
}

.is-selected .event-dot {
  padding: 0;
  border: 0;
  background-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
  transform: translate(-50%, -50%) scale(1.3);
}

.is-tag-active .event-dot {
  padding: 0;
  border: 0;
  background-color: var(--color-primary);
}

.event-vertical-line {
  position: absolute;
  top: var(--spacing-xs);
  left: calc(var(--spacing-xs) / -4);
  width: calc(var(--spacing-xs) / 2);
  height: var(--spacing-2xl);
  background-color: var(--color-primary);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--transition-normal), visibility var(--transition-normal);
  z-index: var(--z-index-tooltip);
}

/* Un détail fermé ne doit pas agrandir la pile, surtout dans une frise réduite.
   L'ouverture conserve le même élément et le pont de survol point → détail. */
.event-card:not(.event-card--undated, .is-default-open, .is-selected, :hover, :focus-within) .event-info-box {
  display: none;
}

.event-info-box {
  --event-tooltip-anchor: 50%;
  position: absolute;
  top: calc(var(--spacing-2xl) + var(--spacing-md) / 2);
  left: 0;
  transform: translateX(-50%);
  /* Fondu et léger glissement : les bulles se relaient sans à-coup. */
  translate: 0 calc(var(--spacing-xs) * -1);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--transition-normal), visibility var(--transition-normal), translate var(--transition-normal),
    background-color var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal);
  z-index: var(--z-index-tooltip);
  background-color: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  /* Marges et typographie de PeriodCard, identiques dans tous les états. */
  padding: var(--spacing-xs) var(--spacing-sm);
  box-shadow: var(--shadow-lg);
  width: max-content;
  max-width: calc(var(--spacing-xs) * 60);
  text-align: left;
  cursor: pointer;
}

.align-start .event-info-box {
  --event-tooltip-anchor: 6px;
  --event-tooltip-preferred-shift: -6px;
  transform: translateX(-6px);
}

.align-end .event-info-box {
  --event-tooltip-anchor: calc(100% - 6px);
  --event-tooltip-preferred-shift: calc(-100% + 6px);
  transform: translateX(calc(-100% + 6px));
}

/* Borner la carte enrichie sans changer la place des légendes au repos.
   Le pont utilise exactement la même translation que la carte. */
.event-card:is(:hover, :focus-within, .is-selected) .event-info-box--bounded {
  --event-tooltip-shift: clamp(var(--event-tooltip-left-limit), var(--event-tooltip-preferred-shift, -50%), calc(var(--event-tooltip-right-limit) - 100%));
  --event-tooltip-anchor: calc(-1 * var(--event-tooltip-shift));
  transform: translateX(var(--event-tooltip-shift));
  max-width: min(calc(var(--spacing-xs) * 60), var(--event-tooltip-frame-width));
}

.event-card:hover .event-vertical-line,
.event-card:hover .event-info-box,
.event-card:focus-within .event-vertical-line,
.event-card:focus-within .event-info-box {
  opacity: 1;
  visibility: visible;
  translate: 0 0;
}

.event-card:hover .event-info-box,
.event-card:focus-within .event-info-box,
.is-default-open .event-info-box {
  pointer-events: auto;
}

/* Passage du point vers toute la bulle, sans recouvrir les points voisins sur l'axe.
   Le sommet suit l'ancrage de la bulle, y compris aux extrémités de la frise. */
.event-card:not(.event-card--undated) .event-info-box::after {
  content: '';
  position: absolute;
  left: -1px;
  right: -1px;
  bottom: 100%;
  height: calc(var(--spacing-2xl) + var(--spacing-md) / 2 + 1px - (var(--font-size-base) - var(--spacing-xs) / 2) / 2);
  clip-path: polygon(
    calc(var(--event-tooltip-anchor) - var(--spacing-xs) / 2) 0,
    calc(var(--event-tooltip-anchor) + var(--spacing-xs) / 2) 0,
    100% 100%, 0 100%
  );
}

.is-selected .event-vertical-line,
.is-selected .event-info-box {
  opacity: 1;
  visibility: visible;
  translate: 0 0;
  pointer-events: auto;
}

/* Ouvert par défaut : titre et date seulement, sous la bulle survolée ou sélectionnée. */
.is-default-open .event-vertical-line,
.is-default-open .event-info-box {
  opacity: 1;
  visibility: visible;
  translate: 0 0;
}
/* Figé : texte nu sous un simple trait gris ; la bulle complète revient au survol. */
.event-card.is-default-open:not(:hover, :focus-within, .is-selected) .event-info-box {
  max-width: 160px;
  background-color: transparent;
  border-color: transparent;
  box-shadow: none;
}
/* Trait limité à la largeur du texte (padding de la bulle déduit), effacé quand la bulle revient. */
.event-info-box::before {
  content: '';
  position: absolute;
  top: -1px;
  left: var(--spacing-sm);
  right: var(--spacing-sm);
  height: 1px;
  background-color: color-mix(in srgb, var(--color-border-default) 60%, var(--color-border-strong));
  opacity: 0;
  transition: opacity var(--transition-normal);
}
.event-card.is-default-open:not(:hover, :focus-within, .is-selected) .event-info-box::before {
  opacity: 1;
}
.event-card.is-default-open:not(:hover, :focus-within, .is-selected) :is(.event-description, .event-wikipedia, .event-meta:not(.event-story-count)) {
  display: none;
}
/* Mêmes tailles qu'à l'état complet : seul le nombre de lignes change. */
.event-card.is-default-open:not(:hover, :focus-within, .is-selected) .event-label {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}
/* Frise compacte : le titre figé tient sur une ligne ; la bulle complète revient au survol. */
.period-grid--compact .event-card.is-default-open:not(:hover, :focus-within, .is-selected) .event-label {
  -webkit-line-clamp: 1;
  line-clamp: 1;
}
.event-card:hover,
.event-card:focus-within,
.event-card.is-selected {
  z-index: calc(var(--z-index-tooltip) + 1);
}

.event-label {
  display: block;
  padding: 0;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: inherit;
  font-family: inherit;
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: normal;
  overflow-wrap: break-word;
  line-height: var(--line-height-body);
}

.event-date,
.event-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-small);
}


.event-meta {
  margin-top: var(--spacing-xs);
}

.event-meta--error {
  color: var(--color-status-error-foreground);
}

.event-meta button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

/* ─── Autres frises ─────────────────────────────────────────────────────────── */

.event-stories {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border-default);
}

.event-stories-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 calc(var(--spacing-sm) * -1);
  padding: 0;
  list-style: none;
}

.event-story-item {
  display: block;
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: none;
  text-align: left;
  font-size: var(--font-size-sm);
  color: var(--color-text-link);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
}

.event-story-item:hover,
.event-story-item:focus-visible {
  background-color: var(--color-interaction-hover);
  color: var(--color-primary-dark);
}
</style>
