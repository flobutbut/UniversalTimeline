<template>
  <section class="story-membership" aria-labelledby="story-membership-title">
    <h3 id="story-membership-title" class="story-membership__title">Frises</h3>
    <p id="story-membership-hint" class="story-membership__hint">Chaque ajout ou retrait est enregistré immédiatement, indépendamment du formulaire.</p>
    <p v-if="loading" role="status" class="story-membership__hint">Chargement des frises…</p>
    <p v-else-if="loadError" role="alert" class="story-membership__error">
      {{ loadError }} <button type="button" class="story-membership__link-button" @click="$emit('retry')">Réessayer</button>
    </p>
    <template v-else>
      <ul v-if="linked.length" class="story-membership__list">
        <li v-for="story in linked" :key="story.id" class="story-membership__item">
          <RouterLink :to="{ path: '/timeline', query: { story: story.id } }" class="story-membership__story">{{ story.title }}</RouterLink>
          <button
            v-if="story.owned"
            type="button"
            class="story-membership__remove"
            :disabled="!!pending"
            :aria-label="`Retirer de la frise ${story.title}`"
            @click="$emit('remove', story.id)"
          >
            <Icon icon="mdi:close" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p v-else class="story-membership__hint">{{ emptyText }}</p>
      <div v-if="addable.length" class="story-membership__add">
        <Select
          id="story-membership-add"
          v-model="selected"
          :options="addable"
          label="Ajouter à une de mes frises"
          placeholder="Choisir une frise"
          :searchable="addable.length > 8"
          :disabled="!!pending"
        />
        <Button variant="secondary" type="button" :disabled="!selected || !!pending" @click="add">
          {{ pending ? 'Enregistrement…' : 'Ajouter' }}
        </Button>
      </div>
      <p v-if="changeError" role="alert" class="story-membership__error">{{ changeError }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import type { StorySummary } from '@/types/database';

const props = defineProps<{
  storyIds: string[];
  stories: StorySummary[];
  ownsStory: (story: StorySummary) => boolean;
  emptyText: string;
  loading?: boolean;
  loadError?: string | null;
  pending?: string | null;
  changeError?: string | null;
}>();
const emit = defineEmits<{ (e: 'add', storyId: string): void; (e: 'remove', storyId: string): void; (e: 'retry'): void }>();

const selected = ref('');
const byId = computed(() => new Map(props.stories.map(story => [story.id, story])));
const linked = computed(() => props.storyIds.map(id => {
  const story = byId.value.get(id);
  return { id, title: story?.title.fr || `Frise ${id}`, owned: !!story && props.ownsStory(story) };
}));
const addable = computed(() => props.stories
  .filter(story => props.ownsStory(story) && !props.storyIds.includes(story.id))
  .map(story => ({ value: story.id, label: story.title.fr }))
  .sort((a, b) => a.label.localeCompare(b.label, 'fr')));
function add() {
  if (!selected.value) return;
  emit('add', selected.value);
  selected.value = '';
}
</script>

<style scoped>
.story-membership {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}
.story-membership__title { margin: 0; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.story-membership__hint { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-light); }
.story-membership__error { margin: 0; font-size: var(--font-size-xs); color: var(--color-error); }
.story-membership__list { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin: 0; padding: 0; list-style: none; }
.story-membership__item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  font-size: var(--font-size-xs);
}
.story-membership__story { color: var(--color-primary); text-decoration: none; }
.story-membership__story:hover, .story-membership__story:focus-visible { text-decoration: underline; }
.story-membership__remove, .story-membership__link-button {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-light);
  cursor: pointer;
  font: inherit;
}
.story-membership__link-button { text-decoration: underline; }
.story-membership__remove:hover, .story-membership__remove:focus-visible { color: var(--color-text); }
.story-membership__remove:disabled { cursor: default; opacity: 0.5; }
.story-membership__add { display: flex; gap: var(--spacing-sm); align-items: flex-end; flex-wrap: wrap; }
.story-membership__add > :first-child { flex: 1 1 220px; min-width: 0; }
</style>
