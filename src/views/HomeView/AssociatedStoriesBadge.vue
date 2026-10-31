<template>
  <span v-if="stories.length || error || open" class="associated-stories" @click.stop @keydown.stop>
    <button ref="trigger" type="button" class="associated-stories__badge" :disabled="disabled"
      :aria-label="badgeLabel" :title="badgeLabel" aria-haspopup="dialog" :aria-expanded="open"
      :aria-controls="open ? panelId : undefined" @click="toggle">
      <span>{{ loading ? 'Frises…' : error ? 'Frises indisponibles' : `${stories.length} ${stories.length === 1 ? 'frise' : 'frises'}` }}</span>
    </button>
    <Teleport to="body">
      <template v-if="open">
        <div class="associated-stories__backdrop" aria-hidden="true" @mousedown.prevent @click.stop="close()" />
        <section ref="panel" :id="panelId" class="associated-stories__panel" :style="panelStyle" role="dialog"
          :aria-labelledby="`${panelId}-title`" @click.stop @focusout="onFocusOut" @keydown="onPanelKeydown">
          <header class="associated-stories__header">
            <div><h4 :id="`${panelId}-title`">Frises associées</h4><p>{{ periodLabel }}</p></div>
            <button type="button" class="associated-stories__close" aria-label="Fermer les frises associées" @click="close()">×</button>
          </header>
          <p v-if="loading" class="associated-stories__status" role="status">Chargement des frises…</p>
          <div v-else-if="error" class="associated-stories__status" role="alert">
            {{ error }} <button type="button" @click="retry">Réessayer</button>
          </div>
          <p v-else-if="!stories.length" class="associated-stories__status">Aucune frise associée à cette période.</p>
          <button v-for="story in stories" v-else :key="story.id" type="button" class="associated-stories__item" @click="select(story.id)">
            <span><strong>{{ story.title.fr || story.title.en }}</strong><small v-if="story.description?.fr || story.description?.en">{{ story.description.fr || story.description.en }}</small></span>
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </template>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onDeactivated, onScopeDispose, ref, watch } from 'vue';
import type { StorySuggestion } from '@/types/database';
import { generateDomUid } from '@/utils/generateDomUid';

const props = withDefaults(defineProps<{ storyId: string; periodId: string; periodLabel: string; stories: StorySuggestion[]; loading?: boolean; error?: string | null; disabled?: boolean }>(), { loading: false, error: null });
const emit = defineEmits<{ select: [id: string]; retry: [] }>();
const retry = () => emit('retry');
const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const panelId = generateDomUid('associated-stories');
const panelStyle = ref<{ top: string; left: string; width: string }>({ top: '0px', left: '0px', width: '360px' });
const badgeLabel = computed(() => props.loading ? 'Chargement des frises associées'
  : props.error ? 'Afficher l’erreur de chargement des frises associées'
  : `${props.stories.length} frise${props.stories.length === 1 ? '' : 's'} associée${props.stories.length === 1 ? '' : 's'} à ${props.periodLabel}`);

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
  panel.value?.querySelector<HTMLButtonElement>('.associated-stories__item, .associated-stories__close')?.focus();
}
function select(id: string) { close(false); emit('select', id); }
function onFocusOut(event: FocusEvent) {
  const target = event.relatedTarget as Node | null;
  if (!target || panel.value?.contains(target) || trigger.value?.contains(target)) return;
  close(false);
}
function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const buttons = [...(panel.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
  if (!buttons.length) return;
  event.preventDefault();
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
}
watch([() => props.storyId, () => props.periodId, () => props.disabled], () => close(false), { flush: 'sync' });
watch([() => props.stories, () => props.loading, () => props.error], async () => {
  if (!props.loading && !props.error && !props.stories.length) { close(false); return; }
  await nextTick(); position();
});
watch(open, value => {
  if (value) { window.addEventListener('resize', position); window.addEventListener('scroll', position, true); }
  else { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); }
}, { flush: 'sync' });
onDeactivated(() => close(false));
onScopeDispose(() => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); });
</script>

<style scoped>
.associated-stories { display: inline-flex; flex-shrink: 0; align-self: center; max-width: 100%; min-width: 0; overflow: hidden; }
.associated-stories__badge { display: inline-flex; align-items: center; gap: 4px; min-width: 0; max-width: 100%; height: 24px; padding: 2px 6px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font-size: var(--font-size-xs); line-height: 16px; white-space: nowrap; font-variant-numeric: tabular-nums; cursor: pointer; }
.associated-stories__badge > span { overflow: hidden; text-overflow: ellipsis; }
.associated-stories__badge:focus-visible { outline-offset: -2px; }
.associated-stories__badge:hover, .associated-stories__badge[aria-expanded="true"] { background: var(--color-surface-hover); border-color: var(--color-primary); }
.associated-stories__badge:disabled { opacity: .5; cursor: default; }
.associated-stories__badge:focus-visible, .associated-stories__panel button:focus-visible { outline: 2px solid var(--color-border-focus); }
.associated-stories__panel button:focus-visible { outline-offset: 2px; }
.associated-stories__backdrop { position: fixed; inset: 0; z-index: var(--z-index-dropdown, 100); }
.associated-stories__panel { position: fixed; z-index: calc(var(--z-index-dropdown, 100) + 1); max-height: calc(100dvh - 24px); overflow-y: auto; padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); box-shadow: var(--shadow-lg); }
.associated-stories__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 4px 4px 8px; }
.associated-stories__header h4 { margin: 0; font-size: var(--font-size-base); font-weight: 600; }
.associated-stories__header p { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); overflow-wrap: anywhere; }
.associated-stories__close { flex: 0 0 24px; height: 24px; padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: 18px; }
.associated-stories__item { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 10px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text); text-align: left; cursor: pointer; }
.associated-stories__item:hover, .associated-stories__close:hover { background: var(--color-surface-hover); }
.associated-stories__item strong { display: block; font-size: var(--font-size-base); font-weight: 500; overflow-wrap: anywhere; }
.associated-stories__item small { display: block; margin-top: 4px; color: var(--color-text-secondary); font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.associated-stories__status { margin: 0; padding: 10px; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
</style>
