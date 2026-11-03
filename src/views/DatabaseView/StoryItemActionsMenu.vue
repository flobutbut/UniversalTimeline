<template>
  <span class="story-item-actions" @click.stop @keydown.stop>
    <Button ref="triggerComponent" class="story-item-actions__trigger" variant="ghost" size="sm" icon-only
      :disabled="disabled" :aria-label="`Actions pour ${label}`" :title="`Actions pour ${label}`"
      aria-haspopup="menu" :aria-expanded="open" :aria-controls="open ? menuId : undefined"
      @click="toggle" @keydown="onTriggerKeydown">
      <template #icon><Icon icon="mdi:dots-vertical" width="16" height="16" aria-hidden="true" /></template>
    </Button>
    <Teleport to="body">
      <div v-if="open" ref="menu" :id="menuId" class="story-item-actions__menu" :style="positionStyle"
        role="menu" :aria-label="`Actions pour ${label}`" @click.stop @keydown="onMenuKeydown" @focusout="onFocusOut">
        <button type="button" role="menuitem" tabindex="-1" @click="choose('edit')">
          <Icon icon="mdi:pencil-outline" width="16" height="16" aria-hidden="true" />Modifier
        </button>
        <button v-if="movable" type="button" role="menuitem" tabindex="-1" @click="choose('move')">
          <Icon icon="mdi:folder-move-outline" width="16" height="16" aria-hidden="true" />Déplacer dans la frise
        </button>
        <button v-if="createStory" type="button" role="menuitem" tabindex="-1" @click="choose('create-story')">
          <Icon :icon="promote ? 'mdi:arrow-up-bold-box-outline' : 'mdi:book-plus-outline'" width="16" height="16" aria-hidden="true" />{{ promote ? 'Promouvoir en sous-frise' : 'Créer une frise' }}
        </button>
        <button v-if="convertTo" type="button" role="menuitem" tabindex="-1" @click="choose('convert')">
          <Icon icon="mdi:swap-horizontal" width="16" height="16" aria-hidden="true" />{{ convertTo === 'event' ? 'Convertir en événement' : 'Convertir en période' }}
        </button>
        <button type="button" role="menuitem" tabindex="-1" class="story-item-actions__delete"
          title="Supprimer de cette frise" @click="choose('remove')">
          <Icon icon="mdi:trash-can-outline" width="16" height="16" aria-hidden="true" />Supprimer
        </button>
      </div>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onDeactivated, onScopeDispose, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import { generateDomUid } from '@/utils/generateDomUid';

const props = defineProps<{
  label: string; disabled?: boolean; movable?: boolean;
  /** Périodes : proposer une frise créée depuis cet élément. */ createStory?: boolean;
  /** La période remplit les critères d’une sous-frise (règle 3) : l’action est présentée comme une promotion. */ promote?: boolean;
  /** Type vers lequel la fiche du catalogue peut être convertie. */ convertTo?: 'period' | 'event';
}>();
const emit = defineEmits<{ edit: []; remove: []; move: []; 'create-story': []; convert: [] }>();
const open = ref(false);
const triggerComponent = ref<InstanceType<typeof Button> | null>(null);
const trigger = computed(() => triggerComponent.value?.$el as HTMLButtonElement | undefined);
const menu = ref<HTMLElement | null>(null);
const menuId = generateDomUid('story-item-actions');
const positionStyle = ref({ top: '0px', left: '0px' });
const items = () => [...(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];

function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) void nextTick(() => trigger.value?.focus());
}
async function show(last = false) {
  if (props.disabled) return;
  open.value = true;
  await nextTick();
  if (!open.value || !trigger.value || !menu.value) return;
  const anchor = trigger.value.getBoundingClientRect();
  const bounds = menu.value.getBoundingClientRect();
  positionStyle.value = {
    top: `${Math.max(8, anchor.bottom + bounds.height + 4 <= window.innerHeight - 8 ? anchor.bottom + 4 : anchor.top - bounds.height - 4)}px`,
    left: `${Math.max(8, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8))}px`,
  };
  const options = items(); options[last ? options.length - 1 : 0]?.focus();
}
function toggle() { if (open.value) close(true); else void show(); }
function choose(action: 'edit' | 'remove' | 'create-story' | 'move' | 'convert') {
  if (props.disabled) return;
  close(action === 'remove');
  if (action === 'move') emit('move'); else if (action === 'edit') emit('edit'); else if (action === 'create-story') emit('create-story');
  else if (action === 'convert') emit('convert'); else emit('remove');
}
function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); void show(event.key === 'ArrowUp');
  }
}
function onMenuKeydown(event: KeyboardEvent) {
  event.stopPropagation();
  if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
  if (event.key === 'Tab') { trigger.value?.focus(); close(); return; }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const options = items();
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
  options[next]?.focus();
}
function outside(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && !menu.value?.contains(target) && !trigger.value?.contains(target)) close();
}
function onFocusOut(event: FocusEvent) {
  const target = event.relatedTarget as Node | null;
  if (target && !menu.value?.contains(target) && !trigger.value?.contains(target)) close();
}
const dismiss = () => close();
function removeListeners() {
  document.removeEventListener('pointerdown', outside, true);
  window.removeEventListener('scroll', dismiss, true);
  window.removeEventListener('resize', dismiss);
}
watch(open, value => {
  if (value) {
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
  } else removeListeners();
}, { flush: 'sync' });
watch(() => props.disabled, disabled => { if (disabled) close(); }, { flush: 'sync' });
onDeactivated(dismiss);
onScopeDispose(removeListeners);
</script>

<style scoped>
.story-item-actions { display: inline-flex; align-items: center; }
:global(.finder-item.selected) .story-item-actions__trigger { color: var(--color-text-on-selected); }
.story-item-actions__menu {
  position: fixed; z-index: 1100; width: 176px; max-width: calc(100vw - 16px); box-sizing: border-box;
  padding: var(--spacing-xs); border: 1px solid var(--color-border-default); border-radius: var(--radius-md);
  background: var(--color-surface-default); box-shadow: var(--shadow-lg);
}
.story-item-actions__menu button {
  display: flex; align-items: center; gap: var(--spacing-sm); width: 100%; padding: var(--spacing-sm);
  border: 0; border-radius: var(--radius-sm); background: transparent;
  color: var(--color-text-primary); font: inherit; font-size: var(--font-size-sm); text-align: left; cursor: pointer;
}
.story-item-actions__menu button:hover, .story-item-actions__menu button:focus-visible { background: var(--color-interaction-hover); }
.story-item-actions__menu button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.story-item-actions__menu .story-item-actions__delete { color: var(--color-status-error-foreground); }
</style>
