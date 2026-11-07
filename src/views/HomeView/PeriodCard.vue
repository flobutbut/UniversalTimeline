<template>
  <div
    class="period-card"
    :class="[
      `period-card--${variant}`,
      {
        selected: isSelected,
        loading,
        'has-children': period.hasChildren,
        'period-card--expanded': expanded,
        'period-card--compact': compact,
        'period-card--wrap': wrapContent,
        'period-card--child': !!parentLabel,
        'period-card--continues-before': continuesBefore,
        'period-card--continues-after': continuesAfter,
      },
    ]"
    :data-period-id="period.id"
    :aria-description="parentLabel ? `Sous-période de ${parentLabel}` : undefined"
    :aria-disabled="loading || undefined"
    @click="handleClick"
    @keydown.enter.self.prevent="handleClick"
    @keydown.space.self.prevent="handleClick"
  >
    <div ref="mainRef" class="main-container">
      <div ref="contentRef" class="card-content">
        <div class="period-header">
          <h3 class="period-title" :aria-label="period.label.fr">
            <button type="button" class="period-card__title-action" :disabled="loading" :aria-label="variant === 'parent' ? `Revenir depuis ${period.label.fr}` : period.label.fr"
              :aria-describedby="typeof $attrs['aria-describedby'] === 'string' ? $attrs['aria-describedby'] : undefined" @click.stop="handleClick">{{ period.label.fr }}</button>
          </h3>
          <WikipediaLink :titles="period.wikipedia" :subject="period.label.fr || period.label.en" compact class="period-card__wikipedia" :class="{ 'period-card__wikipedia--hidden': !linkFits }" />
        </div>
        <div class="period-footer" v-if="period.startDate || period.endDate">
          <div class="period-info">{{ periodDateRange }}</div>
        </div>
      </div>
      <!-- Actions mesurables même masquées : l'agrandissement réserve leur largeur complète. -->
      <div ref="actionsRef" class="period-card__actions" :class="{ 'period-card__actions--hidden': !actionsFit }">
        <span v-if="variant === 'parent'" class="period-card__return" aria-hidden="true">Retour</span>
        <slot name="title-actions" />
      </div>
      <Button v-if="variant === 'timeline' && period.hasChildren" class="period-card__drill" variant="ghost" size="xs" icon-only
        :disabled="loading" :aria-label="`Explorer les sous-périodes de ${period.label.fr}`" @click.stop="handleClick">
        <template #icon><Icon icon="mdi:arrow-right" aria-hidden="true" /></template>
      </Button>
    </div>
    <div v-show="loading" class="loading-overlay">
      <LoadingSpinner />
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/base/LoadingSpinner.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import WikipediaLink from '@/components/WikipediaLink.vue';
import { formatPeriodDateRange } from '@/lib/formatTemporalBoundLabel';
import { measureTextWidth, periodTextExtent, periodTextWidths } from '@/lib/measureTextWidth';
import type { ListPeriod } from '@/types/database';

const props = withDefaults(
  defineProps<{
    period: ListPeriod;
    isSelected: boolean;
    loading?: boolean;
    /** `timeline` : segment sur la frise ; `parent` : barre de retour positionnée par le conteneur */
    variant?: 'timeline' | 'parent';
    expanded?: boolean;
    wrapContent?: boolean;
    parentLabel?: string;
    continuesBefore?: boolean;
    continuesAfter?: boolean;
    /** Nom et dates sur une seule ligne, avec les mêmes marges intérieures. */
    compact?: boolean;
  }>(),
  { variant: 'timeline' }
);

const emit = defineEmits<{
  (e: 'select', period: ListPeriod): void;
  (e: 'back'): void;
}>();

const periodDateRange = computed(() => formatPeriodDateRange(props.period));

// ─── Priorité au titre et à la date sur les actions (badge) ─────────────────

const mainRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const actionsRef = ref<HTMLElement | null>(null);
const actionsFit = ref(true);
/** Le nom passe avant le lien : sans place pour les deux, le lien attend l'agrandissement de la barre. */
const linkFits = ref(true);
let observer: ResizeObserver | undefined;

/** La mesure du texte ne dépend pas du badge : pas d'oscillation entre affiché et masqué. */
function measureActions() {
  const main = mainRef.value, content = contentRef.value, actions = actionsRef.value;
  if (!main || !content || !actions) return;
  measureLink(content);
  const actionsWidth = actions.offsetWidth;
  if (actionsWidth === 0 || props.wrapContent) { actionsFit.value = true; return; }
  const gap = parseFloat(getComputedStyle(main).columnGap) || 0;
  const needed = periodTextExtent(content, false);
  // Espace partagé par le texte et les actions : celui du texte, plus celui des actions quand elles sont dans le flux.
  const shared = content.clientWidth + (actionsFit.value ? actionsWidth + gap : 0);
  actionsFit.value = Math.ceil(needed) + gap + actionsWidth <= shared;
}

function measureLink(content: HTMLElement) {
  const title = content.querySelector<HTMLElement>('.period-card__title-action');
  const link = content.querySelector<HTMLElement>('.period-card__wikipedia');
  const header = content.querySelector<HTMLElement>('.period-header');
  if (!title || !link || !header || props.wrapContent) { linkFits.value = true; return; }
  const gap = parseFloat(getComputedStyle(header).columnGap) || 0;
  // Compacte : les dates partagent la ligne du nom et de son lien.
  const dates = props.compact ? Math.max(0, ...periodTextWidths(content, false).slice(1)) + (parseFloat(getComputedStyle(content).columnGap) || 0) : 0;
  linkFits.value = Math.ceil(measureTextWidth(title) + gap + link.offsetWidth + dates) <= content.clientWidth;
}

onMounted(() => {
  measureActions();
  if (typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver(measureActions);
  for (const el of [mainRef.value, actionsRef.value]) if (el) observer.observe(el);
});
onBeforeUnmount(() => observer?.disconnect());
watch(() => [props.period.label.fr, periodDateRange.value, props.wrapContent, props.compact], measureActions, { flush: 'post' });

const handleClick = () => {
  if (props.loading) return;
  if (props.variant === 'parent') emit('back');
  else emit('select', props.period);
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
  color: var(--color-text-primary);
  box-sizing: border-box;
  position: relative;
  border: none;
}

.main-container {
  position: relative;
  background: var(--color-surface-raised);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  height: 100%;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  transition: box-shadow var(--transition-normal), background-color var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

/* A clipped reference runs into the screen edge; a real temporal bound keeps its gutter. */
.period-card--continues-before .main-container { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.period-card--continues-after .main-container { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.period-card--continues-before .main-container::before,
.period-card--continues-after .main-container::after {
  content: '';
  position: absolute;
  inset-block: 0;
  width: calc(var(--spacing-md) + 1px);
  background: inherit;
  pointer-events: none;
}
.period-card--continues-before .main-container::before { right: 100%; }
.period-card--continues-after .main-container::after { left: 100%; }

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
  flex: 1;
  min-width: 0;
}

.period-card--parent .main-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-md);
}

.period-card__actions {
  display: flex;
  width: max-content;
  flex-shrink: 0;
  align-items: center;
}

.period-card__actions:empty {
  display: none;
}

.period-card__actions { gap: var(--spacing-sm); }
/* Juste après le nom : le titre se tronque avant le lien. */
.period-card__wikipedia.wikipedia-link { flex-shrink: 0; align-self: center; }
/* Révélé au survol ou au focus de la période ; toujours visible sur écran tactile, sans survol. */
.period-card__wikipedia.wikipedia-link { visibility: hidden; }
.period-card:hover .period-card__wikipedia.wikipedia-link,
.period-card:focus-within .period-card__wikipedia.wikipedia-link { visibility: visible; }
@media (hover: none) { .period-card__wikipedia.wikipedia-link { visibility: visible; } }
/* Hors du flux mais mesurable ; invisible aussi au clavier jusqu'à l'agrandissement. */
.period-card .period-card__wikipedia.period-card__wikipedia--hidden.wikipedia-link { position: absolute; visibility: hidden; pointer-events: none; }
.period-card--wrap .period-card__wikipedia.wikipedia-link { white-space: normal; }
.period-card.selected .period-card__wikipedia.wikipedia-link { color: var(--color-text-on-selected); }

/* Hors du flux mais mesurable ; invisible aussi au clavier et aux lecteurs d’écran. */
.period-card__actions--hidden {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}

.period-card--parent .card-content {
  flex: 1;
  height: auto;
  min-height: 0;
}

.period-card--timeline:hover .main-container {
  background: var(--color-surface-raised-hover);
  box-shadow: var(--shadow-md);
}

.period-card--parent .main-container { transition: transform var(--transition-fast), background-color var(--transition-normal), box-shadow var(--transition-normal); }
.period-card__return { display: inline-flex; align-items: center; gap: var(--spacing-xs); flex-shrink: 0; margin-left: auto; margin-right: var(--spacing-sm); font: var(--type-meta); color: var(--color-text-secondary); opacity: 0; transform: translateY(2px); transition: opacity var(--transition-fast), transform var(--transition-fast); }
.period-card--parent:hover .period-card__return,
.period-card--parent:focus-within .period-card__return { opacity: 1; transform: translateY(0); }
.period-card--parent:hover .main-container,
.period-card--parent:focus-within .main-container {
  transform: translateY(-2px);
  background: var(--color-surface-raised-hover);
  box-shadow: var(--shadow-md);
}
@media (prefers-reduced-motion: reduce) {
  .period-card--parent .main-container, .period-card__return { transition: none; transform: none; }
  .period-card--parent:hover .main-container, .period-card--parent:focus-within .main-container { transform: none; }
}

.period-card.selected .main-container {
  background: var(--color-interaction-selected);
  box-shadow: var(--shadow-md);
  color: var(--color-text-on-selected);
}

.period-header {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: var(--spacing-md);
  min-width: 0;
  flex-shrink: 0;
}

.period-title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--line-height-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.period-title { flex: 0 1 auto; }
.period-card__title-action { display: block; max-width: 100%; padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: inherit; font: inherit; line-height: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; cursor: pointer; }
.period-card__title-action:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

.period-card.selected .period-title {
  color: var(--color-text-on-selected);
}

.period-footer {
  flex-shrink: 0;
}

.period-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-small);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.period-card.selected .period-info {
  color: color-mix(in srgb, var(--color-text-on-selected) 92%, transparent);
}

/* Repli réservé aux textes dépassant toute la frise, après l'élargissement. */
.period-card--wrap {
  height: auto;
  min-height: calc(var(--spacing-2xl) + var(--spacing-lg) + var(--spacing-xs));
}

.period-card--wrap .main-container,
.period-card--wrap .card-content {
  height: auto;
}

.period-card--wrap .main-container {
  min-height: inherit;
}

.period-card--wrap .period-title,
.period-card--wrap .period-card__title-action,
.period-card--wrap .period-info {
  white-space: normal;
  overflow-wrap: anywhere;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--color-surface-raised) 88%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-local-bump);
  border-radius: var(--radius-sm);
  pointer-events: none;
}


</style>

<style scoped>
/* Compacte : nom et dates sur une seule ligne ; mêmes marges, la rangée ne garde que la hauteur d'une ligne. */
.period-card--compact.period-card--timeline { height: calc(var(--line-height-body) + var(--spacing-xs) * 2); }
.period-card--compact.period-card--parent { min-height: calc(var(--line-height-body) + var(--spacing-xs) * 2); }
.period-card--compact .card-content { flex-direction: row; align-items: baseline; justify-content: flex-start; gap: var(--spacing-sm); }
.period-card--compact .period-header { flex: 0 1 auto; }
/* Le nom passe avant les dates quand la place manque. */
.period-card--compact .period-footer { flex: 0 9999 auto; min-width: 0; overflow: hidden; }
.period-card--compact.period-card--wrap .card-content { flex-wrap: wrap; }
/* Badge des frises associées à la hauteur de la ligne compacte. */
.period-card--compact :deep(.associated-stories__badge) { min-height: var(--line-height-body); padding: 0 var(--spacing-xs) 0 var(--spacing-sm); gap: var(--spacing-xs); border-radius: var(--radius-sm); }
.period-card--compact :deep(.associated-stories__arrow) { width: 14px; height: 14px; }
.period-card--compact .period-card__actions { gap: var(--spacing-xs); }
.period-card--child .main-container { border-left: 2px solid var(--color-border-dark); padding-left: var(--spacing-lg); }
</style>
