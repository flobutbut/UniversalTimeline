<template>
  <nav v-if="items.length" class="story-breadcrumb" aria-label="Fil d’Ariane de la timeline" :aria-busy="loading || undefined">
    <ol class="story-breadcrumb__list">
      <li v-for="(item, i) in items" :key="item.id" class="story-breadcrumb__step">
        <span v-if="i > 0" class="story-breadcrumb__sep" aria-hidden="true">/</span>
        <button
          v-if="i < items.length - 1"
          type="button"
          class="story-breadcrumb__item story-breadcrumb__item--link"
          @click="navigate(i, $event)"
        ><StoryMarker v-if="item.kind === 'story'" />{{ item.title }}</button>
        <span
          v-else
          ref="currentItem"
          class="story-breadcrumb__item story-breadcrumb__item--current"
          aria-current="location"
          tabindex="-1"
        ><StoryMarker v-if="item.kind === 'story'" />{{ item.title }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { h, nextTick, ref, watch } from 'vue';

/** `story` : entrée dans une frise, annoncée aux lecteurs d'écran sans repère visuel. */
export type StoryBreadcrumbItem = { id: string; title: string; kind?: 'story' | 'period' };

const StoryMarker = () => h('span', { class: 'sr-only' }, 'Frise : ');

const props = defineProps<{
  items: StoryBreadcrumbItem[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  navigate: [index: number];
}>();
// Une ref dans v-for est une liste, même pour l’unique étape courante.
const currentItem = ref<HTMLElement[]>([]);
let keyboardTrigger: HTMLElement | null = null;

function navigate(index: number, event: MouseEvent) {
  keyboardTrigger = event.detail === 0 ? event.currentTarget as HTMLElement : null;
  emit('navigate', index);
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
  line-height: var(--line-height-normal);
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
  color: var(--color-text);
  text-decoration-color: currentColor;
}

.story-breadcrumb__item--current {
  color: var(--color-text);
  font-weight: 600;
}

.story-breadcrumb__item--current:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
</style>
