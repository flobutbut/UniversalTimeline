<template>
  <nav v-if="items.length" ref="container" class="story-breadcrumb" :class="{ 'story-breadcrumb--compact': maxVisible != null }" :aria-label="uiText(label)" :aria-busy="loading || undefined">
    <ol class="story-breadcrumb__list">
      <li v-if="hiddenItems.length" class="story-breadcrumb__overflow">
        <SelectShell v-model:open="menuOpen" compact dropdown-class="story-breadcrumb__menu" dropdown-role="menu" :dropdown-id="menuId" :dropdown-label="overflowLabel" @escape="focusTrigger">
          <template #trigger>
            <Button :ref="triggerElement" variant="ghost" size="xs" icon-only :disabled="loading" :aria-label="uiText(overflowLabel)" :title="uiText(overflowLabel)"
              aria-haspopup="menu" :aria-expanded="menuOpen" :aria-controls="menuOpen ? menuId : undefined"
              @click="toggleMenu" @keydown.down.prevent="showMenu()" @keydown.up.prevent="showMenu(true)">
              <template #icon><Icon icon="mdi:dots-horizontal" width="18" height="18" aria-hidden="true" /></template>
            </Button>
          </template>
          <template #dropdown>
            <div ref="menu" @keydown="onMenuKeydown">
              <Button v-for="(item, i) in hiddenItems" :key="item.id" class="story-breadcrumb__menu-item" variant="ghost" size="sm" wrap
                role="menuitem" tabindex="-1" :disabled="loading" @click="event => navigateHidden(i, event)">
                <StoryMarker v-if="item.kind === 'story'" />{{ item.title }}
              </Button>
            </div>
          </template>
        </SelectShell>
      </li>
      <li v-for="(item, offset) in visibleItems" :key="item.id" class="story-breadcrumb__step">
        <span v-if="offset > 0 || hiddenItems.length" class="story-breadcrumb__sep" aria-hidden="true">/</span>
        <button
          v-if="offset < visibleItems.length - 1"
          type="button"
          class="story-breadcrumb__item story-breadcrumb__item--link"
          :title="uiText(item.title)"
          :disabled="loading"
          @click="navigate(hiddenItems.length + offset, $event)"
        ><StoryMarker v-if="item.kind === 'story'" />{{ item.title }}</button>
        <span
          v-else-if="$slots.current"
          ref="currentItem"
          class="story-breadcrumb__item story-breadcrumb__item--current story-breadcrumb__current-control"
          aria-current="location"
          tabindex="-1"
        ><slot name="current" :item="item" /></span>
        <button
          v-else-if="currentNavigable"
          ref="currentItem"
          type="button"
          class="story-breadcrumb__item story-breadcrumb__item--link story-breadcrumb__item--current"
          aria-current="location"
          :title="uiText(item.title)"
          :disabled="loading"
          @click="navigate(hiddenItems.length + offset, $event)"
        ><StoryMarker v-if="item.kind === 'story'" />{{ item.title }}</button>
        <span
          v-else
          ref="currentItem"
          class="story-breadcrumb__item story-breadcrumb__item--current"
          aria-current="location"
          tabindex="-1"
          :title="uiText(item.title)"
        ><StoryMarker v-if="item.kind === 'story'" />{{ item.title }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { computed, h, nextTick, onDeactivated, onScopeDispose, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import SelectShell from '@/components/base/SelectShell.vue';
import { elementRef } from '@/utils/elementRef';
import { generateDomUid } from '@/utils/generateDomUid';

/** `story` : entrée dans une frise, annoncée aux lecteurs d'écran sans repère visuel. */
export type StoryBreadcrumbItem = { id: string; title: string; kind?: 'story' | 'period' };

const StoryMarker = () => h('span', { class: 'sr-only' }, 'Frise : ');

const props = withDefaults(defineProps<{
  items: StoryBreadcrumbItem[];
  loading?: boolean;
  /** The current frise can return to its overview while its periods are explored. */
  currentNavigable?: boolean;
  label?: string;
  /** Keep the most recent steps visible; preceding steps remain selectable. */
  maxVisible?: number;
}>(), { label: 'Fil d’Ariane de la timeline' });

const container = ref<HTMLElement | null>(null);
const availableWidth = ref(0);
let observer: ResizeObserver | undefined;
watch([container, () => props.maxVisible], ([element, limit]) => {
  observer?.disconnect();
  if (!element || limit == null) return;
  availableWidth.value = element.getBoundingClientRect().width;
  if (typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver(entries => { availableWidth.value = entries[0]?.contentRect.width ?? 0; });
  observer.observe(element);
}, {flush:'post'});
onScopeDispose(() => observer?.disconnect());
const hiddenCount = computed(() => {
  const limit = Math.max(1, Math.trunc(props.maxVisible ?? props.items.length));
  const capacity = props.maxVisible != null && availableWidth.value > 0 ? Math.max(1, Math.floor(availableWidth.value / 200)) : limit;
  return Math.max(0, props.items.length - Math.min(limit, capacity));
});
const hiddenItems = computed(() => props.items.slice(0, hiddenCount.value));
const visibleItems = computed(() => props.items.slice(hiddenCount.value));
const overflowLabel = computed(() => hiddenItems.value.length === 1 ? 'Afficher l’étape précédente' : uiFormat`Afficher les ${hiddenItems.value.length} étapes précédentes`);
const menuOpen = ref(false);
const trigger = ref<HTMLElement | null>(null);
const triggerElement = elementRef(trigger);
const menu = ref<HTMLElement | null>(null);
const menuId = generateDomUid('breadcrumb-menu');
const menuItems = () => [...(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
function focusTrigger() { void nextTick(() => trigger.value?.focus()); }
async function showMenu(last = false) {
  if (props.loading || !hiddenItems.value.length) return;
  menuOpen.value = true;
  await nextTick();
  const options = menuItems();
  options[last ? options.length - 1 : 0]?.focus();
}
function toggleMenu() { if (menuOpen.value) menuOpen.value = false; else void showMenu(); }
function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') { trigger.value?.focus(); menuOpen.value = false; return; }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const options = menuItems();
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
  options[next]?.focus();
}
watch([() => props.items, () => props.loading, hiddenCount], () => { menuOpen.value = false; });
onDeactivated(() => { menuOpen.value = false; });

const emit = defineEmits<{
  navigate: [index: number];
}>();
// Une ref dans v-for est une liste, même pour l’unique étape courante.
const currentItem = ref<HTMLElement[]>([]);
let keyboardTrigger: HTMLElement | null = null;

function navigate(index: number, event: MouseEvent) {
  if (props.loading) return;
  keyboardTrigger = event.detail === 0 ? event.currentTarget as HTMLElement : null;
  emit('navigate', index);
}

function navigateHidden(index: number, event: MouseEvent) {
  if (props.loading) return;
  menuOpen.value = false;
  navigate(index, event);
}

watch([() => props.items, () => props.loading], async () => {
  if (props.loading || !keyboardTrigger) return;
  const trigger = keyboardTrigger;
  await nextTick();
  if (keyboardTrigger !== trigger || props.loading) return;
  keyboardTrigger = null;
  if (document.activeElement === trigger || document.activeElement === document.body) currentItem.value[0]?.focus();
}, { flush: 'post' });
</script>

<style scoped>
.story-breadcrumb {
  flex-shrink: 0;
  min-width: 0;
  padding: var(--spacing-sm) var(--spacing-md) 0;
  font-size: var(--font-size-sm);
}

.story-breadcrumb__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-breadcrumb--compact .story-breadcrumb__list { flex-wrap: nowrap; }
.story-breadcrumb--compact .story-breadcrumb__step { flex: 0 1 auto; align-items: center; }
.story-breadcrumb--compact .story-breadcrumb__item:not(.story-breadcrumb__current-control) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.story-breadcrumb__overflow { display: flex; flex: 0 0 auto; }
.story-breadcrumb__overflow :deep(.base-select__wrapper) { display: flex; }
.story-breadcrumb__overflow :deep(.story-breadcrumb__menu) { right: auto; width: min(320px, calc(100vw - 32px)); max-height: min(320px, 60dvh); padding: var(--spacing-xs); overflow-y: auto; }
.story-breadcrumb__menu-item { width: 100%; justify-content: flex-start; text-align: left; }

.story-breadcrumb__step {
  display: inline-flex;
  align-items: baseline;
  gap: var(--spacing-xs);
  min-width: 0;
  max-width: 100%;
}

.story-breadcrumb__sep {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.story-breadcrumb__item {
  min-width: 0;
  padding-block: var(--spacing-xs);
  color: var(--color-text-secondary);
  line-height: var(--line-height-body);
  overflow-wrap: anywhere;
  text-align: start;
}

.story-breadcrumb__item--link {
  background: none;
  border: none;
  padding-inline: 0;
  font: inherit;
  cursor: pointer;
  border-radius: var(--radius-sm);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
}

.story-breadcrumb__item--link:hover {
  color: var(--color-text-primary);
  text-decoration-color: currentColor;
}

.story-breadcrumb__item--current {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
}

.story-breadcrumb__current-control { display: inline-flex; align-items: center; }

.story-breadcrumb__item--current:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
</style>
