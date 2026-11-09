<template>
  <span v-if="otherStories.length || error || open" class="associated-stories" @click.stop @keydown.stop>
    <button ref="trigger" type="button" class="associated-stories__badge" :class="{ 'associated-stories__badge--title': triggerLabel }" :disabled="disabled"
      :aria-label="badgeLabel" :title="badgeLabel" aria-haspopup="dialog" :aria-expanded="open"
      :aria-controls="open ? panelId : undefined" @click="toggle">
      <span class="associated-stories__label">{{ triggerLabel || (loading ? 'Frises…' : error ? 'Frises indisponibles' : `${otherStories.length} ${otherStories.length === 1 ? 'frise associée' : 'frises associées'}`) }}</span>
      <DesignIcon name="down" class="associated-stories__arrow" :class="{ 'associated-stories__arrow--open': open }" />
    </button>
    <Teleport to="body">
      <template v-if="open">
        <div class="associated-stories__backdrop" aria-hidden="true" @mousedown.prevent @click.stop="close()" />
        <PopoverSurface padded :ref="panelElement" :id="panelId" class="associated-stories__panel" :style="panelStyle" role="dialog"
          :aria-label="`Frises associées à ${periodLabel}`" tabindex="-1" @click.stop @focusout="onFocusOut" @keydown="onPanelKeydown">
          <p v-if="loading" class="associated-stories__status" role="status">Chargement des frises…</p>
          <div v-else-if="error" class="associated-stories__status" role="alert">
            {{ error }} <Button variant="tertiary" size="sm" type="button" @click="retry">Réessayer</Button>
          </div>
          <p v-else-if="!otherStories.length" class="associated-stories__status">Aucune frise associée à cette période.</p>
          <template v-else>
            <button v-if="overviewLabel" type="button" class="associated-stories__item" @click="chooseOverview"><span><strong>{{ overviewLabel }}</strong></span></button>
            <div v-for="story in otherStories" :key="story.id" class="associated-stories__row">
              <button type="button" class="associated-stories__item" @click="select(story.id)">
                <span><strong>{{ story.title.fr || story.title.en }}</strong><small v-if="story.description?.fr || story.description?.en">{{ story.description.fr || story.description.en }}</small></span>
                <span aria-hidden="true">→</span>
              </button>
              <Button v-if="comparison?.ids.has(story.id)" variant="ghost" size="xs" icon-only type="button" :disabled="comparison.disabled"
                :aria-label="`Ajouter ${story.title.fr || story.title.en} sous cette frise`" title="Ajouter sous cette frise" @click="compare(story.id)">
                <template #icon><Icon icon="mdi:plus" aria-hidden="true" /></template>
              </Button>
            </div>
          </template>
        </PopoverSurface>
      </template>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import DesignIcon from '@/components/base/DesignIcon.vue';
import { Icon } from '@iconify/vue';
import { elementRef } from '@/utils/elementRef';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import { computed, nextTick, onDeactivated, onScopeDispose, ref, watch } from 'vue';
import type { StorySuggestion } from '@/types/database';
import type { StoryComparisonControl } from '@/lib/timelineComparison';
import { generateDomUid } from '@/utils/generateDomUid';

const props = withDefaults(defineProps<{ storyId: string; periodId: string; periodLabel: string; stories: Array<Pick<StorySuggestion, 'id' | 'title' | 'description'>>; loading?: boolean; error?: string | null; disabled?: boolean; comparison?: StoryComparisonControl; /** Déclencheur discret au libellé fixe, comme un titre de fil d’Ariane. */ triggerLabel?: string; /** Première ligne qui revient à la vue d’ensemble de la frise courante. */ overviewLabel?: string }>(), { loading: false, error: null });
const otherStories = computed(() => props.stories.filter(story => String(story.id).trim() !== String(props.storyId).trim()));
const emit = defineEmits<{ select: [id: string]; compare: [id: string]; overview: []; retry: []; 'open-change': [open: boolean] }>();
const retry = () => emit('retry');
const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const panelElement = elementRef(panel);
const panelId = generateDomUid('associated-stories');
const panelStyle = ref<{ top: string; left: string; width: string }>({ top: '0px', left: '0px', width: '360px' });
const badgeLabel = computed(() => props.triggerLabel ? `Frises liées à ${props.triggerLabel}` : props.loading ? 'Chargement des frises associées'
  : props.error ? 'Afficher l’erreur de chargement des frises associées'
  : `${otherStories.value.length} frise${otherStories.value.length === 1 ? '' : 's'} associée${otherStories.value.length === 1 ? '' : 's'} à ${props.periodLabel}`);

function position() {
  if (!open.value || !trigger.value) return;
  const rect = trigger.value.getBoundingClientRect();
  const width = Math.max(0, Math.min(360, window.innerWidth - 24));
  const height = panel.value?.getBoundingClientRect().height ?? 200;
  const below = rect.bottom + 8;
  const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8);
  panelStyle.value = { top: `${top}px`, left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`, width: `${width}px` };
}
function close(restoreFocus = true) {
  open.value = false;
  if (restoreFocus) void nextTick(() => trigger.value?.focus());
}
async function toggle() {
  if (props.disabled) return;
  if (open.value) { close(); return; }
  open.value = true;
  await nextTick(); position();
  const firstAction = panel.value?.querySelector<HTMLButtonElement>('button:not(:disabled)');
  (firstAction ?? panel.value)?.focus();
}
function select(id: string) { close(false); emit('select', id); }
function compare(id: string) { close(false); emit('compare', id); }
function chooseOverview() { close(false); emit('overview'); }
function onFocusOut(event: FocusEvent) {
  const target = event.relatedTarget as Node | null;
  if (!target || panel.value?.contains(target) || trigger.value?.contains(target)) return;
  close(false);
}
function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  // Les flèches vont de ligne en ligne ; Tab atteint l’ajout de chaque ligne.
  const buttons = [...(panel.value?.querySelectorAll<HTMLButtonElement>('.associated-stories__item:not(:disabled)') ?? [])];
  if (!buttons.length) return;
  event.preventDefault();
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
}
watch([() => props.storyId, () => props.periodId, () => props.disabled], () => close(false), { flush: 'sync' });
watch([otherStories, () => props.loading, () => props.error], async () => {
  if (!props.loading && !props.error && !otherStories.value.length) { close(false); return; }
  await nextTick(); position();
});
watch(open, value => {
  emit('open-change',value);
  if (value) { window.addEventListener('resize', position); window.addEventListener('scroll', position, true); }
  else { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); }
}, { flush: 'sync' });
onDeactivated(() => close(false));
onScopeDispose(() => { close(false); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); });
</script>

<style scoped>
.associated-stories { display: inline-flex; flex-shrink: 0; align-self: center; max-width: 100%; min-width: 0; overflow: hidden; }
.associated-stories__badge { display: inline-flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); min-width: 0; max-width: 100%; min-height: var(--field-height-sm); padding: 0 var(--spacing-sm); border: 1px solid transparent; border-radius: var(--radius-md); background: var(--color-action-primary-default); color: var(--color-text-on-accent); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); line-height: var(--line-height-small); white-space: nowrap; font-variant-numeric: tabular-nums; cursor: pointer; transition: background-color var(--transition-fast); }
.associated-stories__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.associated-stories__arrow { transition: transform var(--transition-fast); }
.associated-stories__arrow--open { transform: rotate(180deg); }
.associated-stories__badge:focus-visible { outline-offset: -3px; }
.associated-stories__badge:hover, .associated-stories__badge[aria-expanded="true"] { background: var(--color-action-primary-hover); }
.associated-stories__badge:disabled { opacity: .5; cursor: default; }
.associated-stories__badge:focus-visible, .associated-stories__panel button:focus-visible { outline: 2px solid var(--color-border-focus); }
.associated-stories__panel button:focus-visible { outline-offset: 2px; }
.associated-stories__backdrop { position: fixed; inset: 0; z-index: var(--z-index-dropdown, 100); }
.associated-stories__panel { position: fixed; z-index: calc(var(--z-index-dropdown, 100) + 1); max-height: calc(100dvh - 24px); overflow-y: auto; background: var(--color-surface-default); }
.associated-stories__item { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); width: 100%; padding: 10px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; }
.associated-stories__row { display: flex; align-items: center; gap: var(--spacing-xs); }
.associated-stories__row .associated-stories__item { flex: 1; min-width: 0; }
.associated-stories__badge--title { min-height: 0; padding: 0; background: transparent; color: var(--color-text-primary); font: inherit; font-weight: var(--font-weight-semibold); white-space: normal; text-align: left; }
.associated-stories__badge--title:hover, .associated-stories__badge--title[aria-expanded="true"] { background: transparent; }
.associated-stories__item:hover { background: var(--color-interaction-hover); }
.associated-stories__item strong { display: block; font-size: var(--font-size-base); font-weight: var(--font-weight-medium); overflow-wrap: anywhere; }
.associated-stories__item small { display: block; margin-top: var(--spacing-xs); color: var(--color-text-secondary); font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.associated-stories__status { margin: 0; padding: 10px; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
</style>
