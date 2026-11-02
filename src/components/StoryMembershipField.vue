<template>
  <section class="story-membership" aria-labelledby="story-membership-title">
    <h3 id="story-membership-title" class="story-membership__title">Frises</h3>
    <p id="story-membership-hint" class="story-membership__hint">Chaque ajout ou retrait est enregistré immédiatement, indépendamment du formulaire.</p>
    <p v-if="loading" role="status" class="story-membership__hint">Chargement des frises…</p>
    <p v-else-if="loadError" role="alert" class="story-membership__error">
      {{ loadError }} <Button variant="tertiary" size="sm" type="button" class="story-membership__link-button" @click="$emit('retry')">Réessayer</Button>
    </p>
    <template v-else>
      <ul v-if="linked.length" class="story-membership__list">
        <li v-for="story in linked" :key="story.id" class="story-membership__item">
          <Tag :label="story.title" :to="{ path: '/timeline', query: { story: story.id } }" variant="accent"
            :removable="story.owned" :disabled="!!pending" :remove-label="`Retirer de la frise ${story.title}`" @remove="$emit('remove', story.id)" />
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
import Tag from '@/components/base/Tag.vue';
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
  border-top: 1px solid var(--color-border-default);
}
.story-membership__title { margin: 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); }
.story-membership__hint { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.story-membership__error { margin: 0; font-size: var(--font-size-xs); color: var(--color-status-error-foreground); }
.story-membership__list { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin: 0; padding: 0; list-style: none; }




.story-membership__link-button { color: var(--color-text-link); text-decoration: underline; }


.story-membership__add { display: flex; gap: var(--spacing-sm); align-items: flex-end; flex-wrap: wrap; }
.story-membership__add > :first-child { flex: 1 1 220px; min-width: 0; }
</style>
