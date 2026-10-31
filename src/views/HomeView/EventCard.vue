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
    <div class="event-info-box" @keydown="onStoriesKeydown">
      <div class="event-label">{{ displayLabel }}</div>
      <div class="event-date">{{ displayDate }}</div>
      <p v-if="isSelected && event.description" class="event-description">{{ event.description.fr || event.description.en }}</p>
      <div v-if="suggestionsLoading" role="status">Chargement des frises…</div>
      <div v-else-if="suggestionsError" role="alert">
        {{ suggestionsError }} <button type="button" @click.stop="$emit('retry-suggestions')">Réessayer</button>
      </div>
      <div v-else-if="isSelected && !storySuggestions.length" class="event-date">Aucune frise liée</div>

      <!-- Chevron stories : visible seulement si des suggestions existent -->
      <template v-if="storySuggestions.length > 0">
        <button
          class="event-stories-trigger"
          ref="storiesTrigger"
          type="button"
          :aria-expanded="storiesExpanded"
          :aria-controls="storiesExpanded ? storiesId : undefined"
          @click.stop="storiesExpanded = !storiesExpanded"
        >
          <span>{{ storySuggestions.length === 1 ? 'Continuer' : 'Explorer en détail' }}</span>
          <svg
            class="event-stories-chevron"
            :class="{ 'is-open': storiesExpanded }"
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            aria-hidden="true"
          >
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div v-if="storiesExpanded" :id="storiesId" class="event-stories-list">
          <button
            v-for="s in storySuggestions"
            :key="s.id"
            class="event-story-item"
            type="button"
            @click.stop="$emit('story-select', s.id)"
          >
            {{ s.title?.fr || s.title?.en }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useId } from 'vue';
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
    suggestionsLoading?: boolean;
    suggestionsError?: string | null;
  }>(),
  { storySuggestions: () => [], suggestionsLoading: false, suggestionsError: null }
);

defineEmits<{
  (e: 'click', ev: MouseEvent): void;
  (e: 'story-select', storyId: string): void;
  (e: 'retry-suggestions'): void;
}>();

const storiesExpanded = ref(false);
const storiesId = useId();
const storiesTrigger = ref<HTMLButtonElement>();
function onStoriesKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !storiesExpanded.value) return;
  event.preventDefault(); event.stopPropagation();
  storiesExpanded.value = false;
  storiesTrigger.value?.focus();
}

// Referme le panneau quand l'event est désélectionné
watch(() => props.isSelected, (val) => {
  if (!val) storiesExpanded.value = false;
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

const displayDate = computed(() => {
  const d = props.event.date?.trim() || '';
  if (!d) return '';
  return DateService.format(DateService.parse(d));
});
</script>

<style scoped>
.event-description { white-space: pre-wrap; overflow-wrap: anywhere; margin: var(--spacing-sm) 0; }
.event-card.event-card--undated { position: relative; top: auto; height: auto; width: auto; pointer-events: auto; margin-top: var(--spacing-sm); }
.event-undated-trigger { border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); padding: var(--spacing-xs) var(--spacing-sm); cursor: pointer; }
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
  border: 0;
  width: calc(var(--font-size-base) - var(--spacing-xs) / 2);
  height: calc(var(--font-size-base) - var(--spacing-xs) / 2);
  background-color: var(--color-neutral-900);
  border: 1.5px solid var(--color-surface);
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
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
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
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
  white-space: normal;
  overflow-wrap: break-word;
  line-height: var(--line-height-normal);
}

.event-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  margin-top: 0;
  line-height: var(--line-height-normal);
}

/* ─── Stories trigger ──────────────────────────────────────────────────────── */

.event-stories-trigger {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  width: 100%;
  text-align: left;
  border-top: 1px solid var(--color-border);
}

.event-stories-trigger:hover {
  color: var(--color-primary-dark);
}

.event-stories-chevron {
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.event-stories-chevron.is-open {
  transform: rotate(180deg);
}

.event-stories-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--spacing-xs);
}

.event-story-item {
  display: block;
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: none;
  text-align: left;
  font-size: var(--font-size-xs);
  color: var(--color-text);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
}

.event-story-item:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-primary);
}
</style>
