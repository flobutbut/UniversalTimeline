<template>
  <span v-if="otherStories.length || error || open" class="associated-stories" @click.stop @keydown.stop>
    <button ref="trigger" type="button" class="associated-stories__badge" :disabled="disabled"
      :aria-label="badgeLabel" :title="badgeLabel" aria-haspopup="dialog" :aria-expanded="open"
      :aria-controls="open ? panelId : undefined" @click="toggle">
      <span>{{ loading ? 'Frises…' : error ? 'Frises indisponibles' : `${otherStories.length} ${otherStories.length === 1 ? 'frise associée' : 'frises associées'}` }}</span>
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
          <button v-for="story in otherStories" v-else :key="story.id" type="button" class="associated-stories__item" @click="select(story.id)">
            <span><strong>{{ story.title.fr || story.title.en }}</strong><small v-if="story.description?.fr || story.description?.en">{{ story.description.fr || story.description.en }}</small></span>
            <span aria-hidden="true">→</span>
          </button>
        </PopoverSurface>
      </template>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import { elementRef } from '@/utils/elementRef';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import { computed, nextTick, onDeactivated, onScopeDispose, ref, watch } from 'vue';
import type { StorySuggestion } from '@/types/database';
import { generateDomUid } from '@/utils/generateDomUid';

const props = withDefaults(defineProps<{ storyId: string; periodId: string; periodLabel: string; stories: StorySuggestion[]; loading?: boolean; error?: string | null; disabled?: boolean }>(), { loading: false, error: null });
const otherStories = computed(() => props.stories.filter(story => String(story.id).trim() !== String(props.storyId).trim()));
const emit = defineEmits<{ select: [id: string]; retry: [] }>();
const retry = () => emit('retry');
const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const panelElement = elementRef(panel);
const panelId = generateDomUid('associated-stories');
const panelStyle = ref<{ top: string; left: string; width: string }>({ top: '0px', left: '0px', width: '360px' });
const badgeLabel = computed(() => props.loading ? 'Chargement des frises associées'
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
watch([otherStories, () => props.loading, () => props.error], async () => {
  if (!props.loading && !props.error && !otherStories.value.length) { close(false); return; }
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
.associated-stories__badge { display: inline-flex; align-items: center; gap: var(--spacing-xs); min-width: 0; max-width: 100%; height: 24px; padding: 2px 6px; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default); color: var(--color-text-primary); font-size: var(--font-size-xs); line-height: var(--line-height-small); white-space: nowrap; font-variant-numeric: tabular-nums; cursor: pointer; }
.associated-stories__badge > span { overflow: hidden; text-overflow: ellipsis; }
.associated-stories__badge:focus-visible { outline-offset: -2px; }
.associated-stories__badge:hover, .associated-stories__badge[aria-expanded="true"] { background: var(--color-interaction-hover); border-color: var(--color-primary); }
.associated-stories__badge:disabled { opacity: .5; cursor: default; }
.associated-stories__badge:focus-visible, .associated-stories__panel button:focus-visible { outline: 2px solid var(--color-border-focus); }
.associated-stories__panel button:focus-visible { outline-offset: 2px; }
.associated-stories__backdrop { position: fixed; inset: 0; z-index: var(--z-index-dropdown, 100); }
.associated-stories__panel { position: fixed; z-index: calc(var(--z-index-dropdown, 100) + 1); max-height: calc(100dvh - 24px); overflow-y: auto;  }
.associated-stories__item { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); width: 100%; padding: 10px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; }
.associated-stories__item:hover { background: var(--color-interaction-hover); }
.associated-stories__item strong { display: block; font-size: var(--font-size-base); font-weight: var(--font-weight-medium); overflow-wrap: anywhere; }
.associated-stories__item small { display: block; margin-top: var(--spacing-xs); color: var(--color-text-secondary); font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.associated-stories__status { margin: 0; padding: 10px; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
</style>
