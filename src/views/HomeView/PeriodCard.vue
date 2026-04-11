<template>
  <div
    class="period-card"
    :class="[
      `period-card--${variant}`,
      {
        selected: isSelected,
        loading,
        'has-children': period.hasChildren,
        'period-card--leaf': variant === 'timeline' && !period.hasChildren,
      },
    ]"
    :data-period-id="period.id"
    @click="handleClick"
  >
    <div class="main-container">
      <span v-if="variant === 'parent'" class="period-card__parent-arrow" aria-hidden="true">←</span>
      <div class="card-content">
        <div class="period-header">
          <h3 class="period-title" :title="period.label.fr">{{ period.label.fr }}</h3>
          <span
            v-if="variant === 'timeline' && !period.hasChildren"
            class="period-info period-header__no-children"
          >no childs</span>
        </div>
        <div class="period-footer" v-if="period.startDate || period.endDate">
          <div class="period-info">{{ periodDateRange }}</div>
        </div>
      </div>
    </div>
    <div v-show="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatTemporalBoundLabel } from '@/lib/formatTemporalBoundLabel';
import { getPeriodCardClickIntent } from '@/lib/periodCardClickIntent';
import type { ListPeriod } from '@/types/database';

const props = withDefaults(
  defineProps<{
    period: ListPeriod;
    isSelected: boolean;
    loading?: boolean;
    /** `timeline` : segment sur la frise ; `parent` : barre pleine largeur (retour niveau supérieur) */
    variant?: 'timeline' | 'parent';
  }>(),
  { variant: 'timeline' }
);

const emit = defineEmits<{
  (e: 'select', period: ListPeriod): void;
  (e: 'back'): void;
}>();

const periodDateRange = computed(() => {
  const s = props.period.startDate ? formatTemporalBoundLabel(props.period.startDate) : null;
  const e = props.period.endDate ? formatTemporalBoundLabel(props.period.endDate) : null;
  if (s && e) return `de ${s} à ${e}`;
  if (s) return `à partir de ${s}`;
  if (e) return `jusqu'à ${e}`;
  return '';
});

const handleClick = () => {
  const intent = getPeriodCardClickIntent(props.variant, props.period);
  if (intent === 'back') emit('back');
  else if (intent === 'select') emit('select', props.period);
};
</script>

<style scoped>
/* timeline : boîte de layout (left / width % inchangés), transparente, gouttière 1px + 1px */
.period-card--timeline {
  background: transparent;
  padding-block: 0;
  padding-inline: 1px;
  height: calc(var(--spacing-2xl) + var(--spacing-lg) + var(--spacing-xs));
  flex: 0 0 auto;
}

/* parent : même principe que timeline — enveloppe transparente, 1px de gouttière latérale */
.period-card--parent {
  width: 100%;
  height: auto;
  min-height: calc(var(--spacing-2xl) + var(--spacing-lg) + var(--spacing-xs));
  background: transparent;
  padding-block: 0;
  padding-inline: 1px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.period-card {
  cursor: pointer;
  color: var(--color-text);
  box-sizing: border-box;
  position: relative;
  border: none;
}

.period-card--timeline.period-card--leaf {
  cursor: default;
}

.period-card--timeline.period-card--leaf:hover .main-container {
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.main-container {
  background: var(--color-card);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  height: 100%;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  transition: box-shadow var(--transition-normal), background-color var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

@media (min-width: 769px) {
  .period-card--timeline {
    min-width: var(--spacing-xs);
    max-width: 100%;
  }
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  min-width: 0;
}

.period-card--parent .main-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-md);
}

.period-card--parent .card-content {
  flex: 1;
  height: auto;
  min-height: 0;
}

.period-card__parent-arrow {
  font-size: var(--font-size-lg);
  color: var(--color-text-light);
  flex-shrink: 0;
  line-height: 1;
}

.period-card--timeline:hover .main-container {
  background: var(--color-card-hover);
  box-shadow: var(--shadow-md);
}

.period-card--parent:hover .main-container {
  background: var(--color-card-hover);
  box-shadow: var(--shadow-md);
}

.period-card.selected .main-container {
  background: var(--color-primary);
  box-shadow: var(--shadow-md);
  color: var(--color-text-white);
}

.period-header {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: var(--spacing-xs);
  min-width: 0;
  flex-shrink: 0;
}

.period-title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  line-height: var(--line-height-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.period-header__no-children {
  flex-shrink: 0;
  font-weight: 400;
}

.period-card.selected .period-title {
  color: var(--color-text-white);
}

.period-footer {
  flex-shrink: 0;
}

.period-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  line-height: var(--line-height-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.period-card.selected .period-info {
  color: color-mix(in srgb, var(--color-text-white) 92%, transparent);
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--color-card) 88%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-local-bump);
  border-radius: var(--radius-sm);
  pointer-events: none;
}

.spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border: 3px solid color-mix(in srgb, var(--color-primary) 14%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
</style>
