<template>
  <section class="story-navigation" aria-labelledby="story-navigation-title">
    <h3 id="story-navigation-title">Parcours chronologique</h3>
    <p>Reliez une période de cette frise à un parcours pour continuer vers les périodes précédentes et suivantes. L’ordre suit les dates de début.</p>
    <ul v-if="memberships.length" class="story-navigation__list">
      <li v-for="item in memberships" :key="`${item.context.id}:${item.periodId}`">
        <span>{{ item.context.title.fr || item.context.title.en }} · {{ periodLabel(item.periodId) }}</span>
        <Button variant="ghost" size="xs" :to="{ name: 'timeline', query: { story: story.id, period: item.periodId, context: item.context.id, entry: 'universe' } }">Voir le parcours</Button>
        <Button v-if="editable && canEditContext(item.context.id)" variant="ghost" size="xs" :disabled="busy || saving" @click="save(item.context.id, item.periodId, true)">Dissocier cette frise</Button>
      </li>
    </ul>
    <p v-else>Cette frise n’est rattachée à aucun parcours.</p>
    <template v-if="editable">
      <Button v-if="!adding" variant="tertiary" size="sm" :disabled="busy || saving" @click="open">Ajouter à un parcours</Button>
      <form v-else class="story-navigation__form" @submit.prevent="save(contextId, periodId, false)">
        <Select v-model="contextId" label="Frise de référence" placeholder="Choisir le parcours" :options="candidates" searchable :disabled="saving" />
        <Select v-model="periodId" label="Période présentée par cette frise" placeholder="Choisir la période" :options="story.periods.map(period => ({ value: period.id, label: period.label.fr || period.label.en }))" searchable :disabled="saving" />
        <div class="story-navigation__actions">
          <Button type="submit" size="sm" :disabled="!contextId || !periodId || saving">Ajouter au parcours</Button>
          <Button variant="ghost" size="sm" :disabled="saving" @click="adding = false">Annuler</Button>
        </div>
      </form>
    </template>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { StoryApiService } from '@/services/StoryApiService';
import type { Story } from '@/types/database';
const props = defineProps<{ story: Story; busy?: boolean }>();
const emit = defineEmits<{ saved: [] }>();
const auth = useAuthStore(), store = useDataStore();
const editable = computed(() => auth.ownsStory(props.story));
const adding = ref(false), saving = ref(false), error = ref('');
const contextId = ref<string | null>(null), periodId = ref<string | null>(null);
const memberships = computed(() => (props.story.navigationContexts ?? []).flatMap(context => context.presentations
  .filter(view => view.storyId === props.story.id).map(view => ({ context, periodId: view.periodId }))));
const candidates = computed(() => store.stories.filter(s => s.id !== props.story.id && auth.ownsStory(s))
  .map(s => ({ value: s.id, label: s.title.fr || s.title.en })));
const periodLabel = (id: string) => props.story.periods.find(p => p.id === id)?.label.fr || id;
const canEditContext = (id: string) => !!store.stories.find(s => s.id === id && auth.ownsStory(s));
async function open() {
  saving.value = true; error.value = '';
  try { await store.ensureStoriesLoaded(); adding.value = true; }
  catch { error.value = 'Impossible de charger les parcours disponibles.'; }
  finally { saving.value = false; }
}
async function save(context: string | null, period: string | null, remove: boolean) {
  if (!context || !period || saving.value || props.busy) return;
  saving.value = true; error.value = '';
  try {
    await StoryApiService.getInstance().changePresentation(context, period, props.story.id, remove);
    store.invalidateStories();
    adding.value = false;
    emit('saved');
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Impossible de modifier le parcours.'; }
  finally { saving.value = false; }
}
</script>

<style scoped>
.story-navigation { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-md); max-width: 960px; padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-default); }
.story-navigation h3 { margin: 0; font-size: var(--font-size-lg); }
.story-navigation p { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.story-navigation__list { margin: 0; padding: 0; list-style: none; width: 100%; }
.story-navigation__list li, .story-navigation__actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-sm); }
.story-navigation__form { display: flex; flex-direction: column; gap: var(--spacing-md); width: 100%; }
</style>
