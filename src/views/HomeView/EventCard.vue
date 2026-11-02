<template>
  <div
    class="event-card"
    :class="{
      'is-selected': isSelected,
      'event-card--undated': undated,
      'is-category-active': isCategoryActive,
      'align-start': align === 'start',
      'align-end': align === 'end',
    }"
    :style="undated ? undefined : cardStyle"
  >
    <button :class="undated ? 'event-undated-trigger' : 'event-dot'" type="button" :aria-label="`Afficher l’événement ${displayLabel}`" :aria-pressed="isSelected" @click.stop="$emit('click', $event)">{{ undated ? displayLabel : '' }}</button>

    <!-- Ligne toujours ancrée sur le dot, indépendante du décalage du tooltip -->
    <div class="event-vertical-line"></div>

    <!-- Bulle d'info décalée selon l'alignement -->
    <div class="event-info-box">
      <div class="event-label">{{ displayLabel }}</div>
      <div class="event-date">{{ displayDate }}</div>
      <!-- Au survol seulement : la sélection liste directement ces frises -->
      <div v-if="!isSelected && otherStoryCount" class="event-meta">{{ otherStoryCount }} {{ otherStoryCount > 1 ? 'autres frises associées' : 'autre frise associée' }}</div>
      <p v-if="isSelected && event.description" class="event-description">{{ event.description.fr || event.description.en }}</p>
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
import { computed } from 'vue';
import type { ListEvent, StorySuggestion } from '@/types/database';
import { DateService } from '@/services/DateService';

const props = withDefaults(
  defineProps<{
    event: ListEvent;
    isSelected: boolean;
    isCategoryActive: boolean;
    align?: 'start' | 'center' | 'end';
    undated?: boolean;
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
  { storySuggestions: () => [], otherStoryCount: null, suggestionsLoading: false, suggestionsError: null }
);

defineEmits<{
  (e: 'click', ev: MouseEvent): void;
  (e: 'story-select', storyId: string): void;
  (e: 'retry-suggestions'): void;
}>();

const displayLabel = computed(() => {
  const raw = props.event.label as unknown;
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object' && ('fr' in raw || 'en' in raw)) {
    const o = raw as { fr?: string; en?: string };
    return (o.fr || o.en || '').trim();
  }
  return '';
});

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

.is-category-active .event-dot {
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
  transition: opacity var(--transition-fast), visibility var(--transition-fast);
  z-index: var(--z-index-tooltip);
}

.event-info-box {
  position: absolute;
  top: calc(var(--spacing-2xl) + var(--spacing-md) / 2);
  left: 0;
  transform: translateX(-50%);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--transition-fast), visibility var(--transition-fast);
  z-index: var(--z-index-tooltip);
  background-color: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: var(--shadow-lg);
  width: max-content;
  max-width: calc(var(--spacing-xs) * 60);
  text-align: left;
}

.align-start .event-info-box {
  transform: translateX(-6px);
}

.align-end .event-info-box {
  transform: translateX(calc(-100% + 6px));
}

.event-dot:hover ~ .event-vertical-line,
.event-dot:hover ~ .event-info-box,
.event-card:focus-within .event-vertical-line,
.event-card:focus-within .event-info-box {
  opacity: 1;
  visibility: visible;
}

.is-selected .event-vertical-line,
.is-selected .event-info-box {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.event-label {
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

.event-date {
  margin-top: 2px;
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
