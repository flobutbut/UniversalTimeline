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
    <div
      v-for="tab in tabs"
      :key="tab.id"
      class="story-tabs__item"
      :class="{ 'story-tabs__item--active': tab.id === activeId }"
      @auxclick.middle.prevent="$emit('close', tab.id)"
    >
      <button type="button" class="story-tabs__open" :title="tab.label" :aria-current="tab.id === activeId ? 'page' : undefined" @click="$emit('select', tab.id)">{{ tab.label }}</button>
      <button type="button" class="story-tabs__close" :aria-label="`Fermer ${tab.label}`" @click="$emit('close', tab.id)"><DesignIcon name="tab-close" /></button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import DesignIcon from '@/components/base/DesignIcon.vue';

defineProps<{ tabs: { id: string; label: string }[]; activeId: string | null }>();
defineEmits<{ select: [id: string | null]; close: [id: string] }>();
</script>

<style scoped>
.story-tabs { display: flex; flex-shrink: 0; align-items: stretch; min-height: 43px; overflow-x: auto; background: var(--color-surface); border-bottom: 1px solid var(--color-border); scrollbar-width: thin; }
.story-tabs__home, .story-tabs__item { display: flex; flex-shrink: 0; align-items: center; border-right: 1px solid var(--color-border); color: var(--color-text-primary); transition: background-color var(--transition-fast); }
.story-tabs__home { justify-content: center; padding: var(--spacing-sm) 24px; background: none; border-block: 0; border-left: 0; cursor: pointer; }
.story-tabs__item { gap: var(--spacing-lg); max-width: 260px; padding: 0 var(--spacing-sm) 0 0; }
.story-tabs__home:hover, .story-tabs__item:hover { background: var(--color-interaction-hover); }
.story-tabs__item--active, .story-tabs__item--active:hover { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.story-tabs__open { flex: 1; min-width: 0; align-self: stretch; padding: var(--spacing-md) 0 var(--spacing-md) var(--spacing-lg); border: 0; background: none; color: inherit; font-size: var(--font-size-base); line-height: 18px; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.story-tabs__close { display: inline-flex; flex-shrink: 0; padding: 2px; border: 0; border-radius: var(--radius-sm); background: none; color: inherit; cursor: pointer; }
.story-tabs__close:hover { background: var(--color-interaction-hover); }
.story-tabs__home:focus-visible, .story-tabs__open:focus-visible, .story-tabs__close:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
</style>
