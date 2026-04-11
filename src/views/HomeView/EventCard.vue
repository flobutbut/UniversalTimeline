<template>
  <div
    class="event-card"
    :class="{
      'is-selected': isSelected,
      'is-category-active': isCategoryActive,
      'align-start': align === 'start',
      'align-end': align === 'end',
    }"
    :style="cardStyle"
  >
    <div class="event-dot" @click.stop="$emit('click')"></div>

    <!-- Ligne toujours ancrée sur le dot, indépendante du décalage du tooltip -->
    <div class="event-vertical-line"></div>

    <!-- Bulle d'info décalée selon l'alignement -->
    <div class="event-info-box">
      <div class="event-label">{{ displayLabel }}</div>
      <div class="event-date">{{ displayDate }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ListEvent } from '@/types/database';
import { DateService } from '@/services/DateService';

const props = defineProps<{
  event: ListEvent;
  isSelected: boolean;
  isCategoryActive: boolean;
  align?: 'start' | 'center' | 'end';
  cardStyle: {
    width: string;
    left: string;
  };
}>();

defineEmits<{ (e: 'click'): void }>();

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
.event-card {
  position: absolute;
  width: 0;
  height: 0;
  top: calc(var(--spacing-xs) * -1);
  z-index: var(--z-index-timeline-item);
  overflow: visible;
  /* Seul le dot est cliquable — le container ne capte aucun événement pointer */
  pointer-events: none;
  transition: left 0.18s ease;
}

.event-dot {
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

/* Sélectionné */
.is-selected .event-dot {
  background-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
  transform: translate(-50%, -50%) scale(1.3);
}

/* Même catégorie que l'événement sélectionné */
.is-category-active .event-dot {
  background-color: var(--color-primary);
  opacity: 0.55;
}

/* ─── Ligne verticale — toujours ancrée sur le dot ───────────────────────── */

.event-vertical-line {
  position: absolute;
  top: var(--spacing-xs);
  left: calc(var(--spacing-xs) / -4); /* centré sur le dot (width: 2px) */
  width: calc(var(--spacing-xs) / 2);
  height: var(--spacing-2xl);
  background-color: var(--color-primary);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--transition-fast), visibility var(--transition-fast);
  z-index: var(--z-index-tooltip);
}

/* ─── Bulle d'info — décalée selon l'alignement ──────────────────────────── */

.event-info-box {
  position: absolute;
  top: calc(var(--spacing-2xl) + var(--spacing-md) / 2); /* en dessous de la ligne */
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

/* Près du bord gauche : la bulle part vers la droite */
.align-start .event-info-box {
  transform: translateX(-6px);
}

/* Près du bord droit : la bulle s'aligne à droite du dot */
.align-end .event-info-box {
  transform: translateX(calc(-100% + 6px));
}

/* Affiché au survol du dot */
.event-dot:hover ~ .event-vertical-line,
.event-dot:hover ~ .event-info-box {
  opacity: 1;
  visibility: visible;
}

/* Toujours affiché quand sélectionné */
.is-selected .event-vertical-line,
.is-selected .event-info-box {
  opacity: 1;
  visibility: visible;
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
</style>
