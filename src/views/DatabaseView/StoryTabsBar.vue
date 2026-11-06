<template>
  <nav class="story-tabs" aria-label="Frises ouvertes">
    <button
      type="button"
      class="story-tabs__home"
      :class="{ 'story-tabs__item--active': activeId === null }"
      :aria-current="activeId === null ? 'page' : undefined"
      aria-label="Toutes les frises"
      title="Toutes les frises"
      @click="$emit('select', null)"
    >
      <DesignIcon name="account" />
    </button>
    <div ref="scrollArea" class="story-tabs__scroll" @dragover="onScrollDragOver" @dragleave="onDragLeave" @drop="onDrop">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="story-tabs__item"
        :class="{
          'story-tabs__item--active': tab.id === activeId,
          'story-tabs__item--dragging': tab.id === draggedId,
          'story-tabs__item--drop-before': dropTarget?.id === tab.id && dropTarget.position === 'before',
          'story-tabs__item--drop-after': dropTarget?.id === tab.id && dropTarget.position === 'after',
        }"
        @dragover="onTabDragOver($event, tab.id)"
        @auxclick.middle.prevent="$emit('close', tab.id)"
      >
        <button
          type="button" class="story-tabs__open" draggable="true"
          :title="`${tab.label} — Glisser pour réordonner (Alt + ← / →)`"
          :aria-current="tab.id === activeId ? 'page' : undefined"
          aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
          @dragstart="onDragStart($event, tab.id)" @dragend="endDrag"
          @keydown="onKeydown($event, tab.id)" @click="$emit('select', tab.id)"
        >{{ tab.label }}</button>
        <button type="button" class="story-tabs__close" :aria-label="`Fermer ${tab.label}`" @click="$emit('close', tab.id)"><DesignIcon name="tab-close" /></button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue';
import DesignIcon from '@/components/base/DesignIcon.vue';

const props = defineProps<{ tabs: { id: string; label: string }[]; activeId: string | null }>();
const emit = defineEmits<{ select: [id: string | null]; close: [id: string]; reorder: [id: string, targetId: string, position: 'before' | 'after'] }>();
const scrollArea = ref<HTMLDivElement>();
const draggedId = ref<string | null>(null);
const dropTarget = ref<{ id: string; position: 'before' | 'after' } | null>(null);
let scrollSpeed = 0;
let scrollFrame: number | undefined;

function stopScrolling() {
  if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
  scrollFrame = undefined;
  scrollSpeed = 0;
}

function endDrag() {
  draggedId.value = null;
  dropTarget.value = null;
  stopScrolling();
}

function onDragStart(event: DragEvent, id: string) {
  draggedId.value = id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  }
}

function onTabDragOver(event: DragEvent, id: string) {
  if (!draggedId.value) return;
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  dropTarget.value = id === draggedId.value ? null : { id, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' };
}

function autoScroll() {
  if (!scrollSpeed || !scrollArea.value) { scrollFrame = undefined; return; }
  scrollArea.value.scrollLeft += scrollSpeed;
  scrollFrame = requestAnimationFrame(autoScroll);
}

function onScrollDragOver(event: DragEvent) {
  if (!draggedId.value || !scrollArea.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  if (event.target === scrollArea.value) {
    const last = props.tabs[props.tabs.length - 1];
    dropTarget.value = last && last.id !== draggedId.value ? { id: last.id, position: 'after' } : null;
  }
  const bounds = scrollArea.value.getBoundingClientRect();
  const edge = Math.min(40, bounds.width / 3);
  scrollSpeed = event.clientX < bounds.left + edge ? -8 : event.clientX > bounds.right - edge ? 8 : 0;
  if (scrollSpeed && scrollFrame === undefined) scrollFrame = requestAnimationFrame(autoScroll);
}

function onDragLeave(event: DragEvent) {
  if (event.relatedTarget instanceof Node && scrollArea.value?.contains(event.relatedTarget)) return;
  dropTarget.value = null;
  stopScrolling();
}

function onDrop(event: DragEvent) {
  if (!draggedId.value) return;
  event.preventDefault();
  if (dropTarget.value) emit('reorder', draggedId.value, dropTarget.value.id, dropTarget.value.position);
  endDrag();
}

function onKeydown(event: KeyboardEvent, id: string) {
  if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
  event.preventDefault();
  const direction = event.key === 'ArrowLeft' ? -1 : 1;
  const target = props.tabs[props.tabs.findIndex(tab => tab.id === id) + direction];
  if (!target) return;
  const button = event.currentTarget as HTMLButtonElement;
  emit('reorder', id, target.id, direction === -1 ? 'before' : 'after');
  void nextTick(() => { button.focus(); button.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); });
}

onBeforeUnmount(endDrag);
</script>

<style scoped>
.story-tabs { display: flex; flex-shrink: 0; align-items: stretch; min-width: 0; min-height: 43px; overflow: hidden; background: var(--color-surface-default); border-bottom: 1px solid var(--color-border-default); }
.story-tabs__scroll { display: flex; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: thin; }
.story-tabs__home, .story-tabs__item { display: flex; flex-shrink: 0; align-items: center; border-right: 1px solid var(--color-border-default); color: var(--color-text-primary); transition: background-color var(--transition-fast); }
.story-tabs__home { justify-content: center; padding: var(--spacing-sm) var(--spacing-xl); background: none; border-block: 0; border-left: 0; cursor: pointer; }
.story-tabs__item { position: relative; gap: var(--spacing-lg); max-width: 260px; padding: 0 var(--spacing-sm) 0 0; }
.story-tabs__item--dragging { opacity: .5; }
.story-tabs__item--drop-before::before, .story-tabs__item--drop-after::after { content: ''; position: absolute; top: 0; bottom: 0; width: 3px; background: var(--color-border-focus); pointer-events: none; }
.story-tabs__item--drop-before::before { left: 0; }
.story-tabs__item--drop-after::after { right: 0; }
.story-tabs__home:hover, .story-tabs__item:hover { background: var(--color-interaction-hover); }
.story-tabs__item--active, .story-tabs__item--active:hover { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.story-tabs__open { flex: 1; min-width: 0; align-self: stretch; padding: var(--spacing-md) 0 var(--spacing-md) var(--spacing-lg); border: 0; background: none; color: inherit; font-size: var(--font-size-sm); line-height: var(--line-height-small); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.story-tabs__item--dragging .story-tabs__open { cursor: grabbing; }
.story-tabs__close { display: inline-flex; flex-shrink: 0; padding: 2px; border: 0; border-radius: var(--radius-sm); background: none; color: inherit; cursor: pointer; }
.story-tabs__close:hover { background: var(--color-interaction-hover); }
.story-tabs__home:focus-visible, .story-tabs__open:focus-visible, .story-tabs__close:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
</style>
