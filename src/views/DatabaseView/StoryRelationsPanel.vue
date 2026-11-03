<template>
  <section class="story-relations" aria-labelledby="story-relations-title">
    <div class="story-relations__header">
      <div>
        <h3 id="story-relations-title">Points d’entrée vers cette frise</h3>
        <p class="story-relations__description">Cette frise peut être accessible depuis plusieurs périodes de différentes frises.</p>
      </div>
      <Button v-if="editable" variant="tertiary" size="sm" :disabled="busy || loading" @click="openPicker">Ajouter un point d’entrée</Button>
    </div>
    <p v-if="loading" role="status">Chargement des frises…</p>
    <p v-if="loadError" role="alert" class="story-relations__error">{{ loadError }} <Button variant="tertiary" size="sm" type="button" @click="loadCandidates">Réessayer</Button></p>
    <div v-if="!parents.length" class="story-relations__empty">
      <h4>Aucun point d’entrée</h4>
      <p>Ajoutez une frise source et une période de rattachement pour y proposer cette frise.</p>
    </div>
    <ul v-else class="story-relations__list" aria-label="Frises sources">
      <li v-for="parent in parents" :key="parent.id" class="story-relations__source">
        <div class="story-relations__source-header">
          <div>
            <span class="story-relations__caption">Frise source</span>
            <h4>{{ parent.title.fr || parent.title.en }}</h4>
          </div>
          <Button variant="ghost" size="sm" :to="{ path: '/database', query: { story: parent.id } }">Ouvrir la frise</Button>
        </div>
        <ul v-if="parent.anchors.length" class="story-relations__locations" aria-label="Points de rattachement">
          <li v-for="anchor in parent.anchors" :key="`${anchor.type}:${anchor.id}`" class="story-relations__location">
            <div><span class="story-relations__caption">{{ anchor.type === 'period' ? 'Période' : 'Événement' }}</span><span>{{ anchor.label.fr || anchor.label.en || anchor.id }}</span></div>
            <Button v-if="editable && auth.canEditStory(parent)" variant="ghost" size="xs" :disabled="busy"
              :aria-label="`Retirer le point d’entrée ${anchor.label.fr || anchor.id} depuis ${parent.title.fr}`" @click="emit('remove-parent', parent.id, { type: anchor.type, id: anchor.id })">Retirer</Button>
          </li>
        </ul>
        <div v-else class="story-relations__location">
          <span class="story-relations__description">Depuis les périodes racines de cette frise</span>
          <Button v-if="editable && auth.canEditStory(parent)" variant="ghost" size="xs" :disabled="busy" @click="emit('remove-parent', parent.id)">Retirer</Button>
        </div>
      </li>
    </ul>
    <ParentStoryPickerModal v-if="showPicker" :candidates="candidates" :existing-parents="parents" :busy="busy" :error="error"
      @close="showPicker = false" @confirm="add" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from '@/components/base/Button.vue';
import ParentStoryPickerModal from './ParentStoryPickerModal.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { useLatestRequest } from '@/composables/useLatestRequest';
import type { Story, StoryAnchor } from '@/types/database';
const props = defineProps<{ story: Story; busy?: boolean; error?: string | null }>();
const emit = defineEmits<{ 'add-parent': [sourceId: string, periodId: string]; 'remove-parent': [sourceId: string, anchor?: StoryAnchor] }>();
const auth = useAuthStore();
const store = useDataStore();
const editable = computed(() => auth.canEditStory(props.story));
const parents = computed(() => props.story.parentStories ?? []);
const candidates = computed(() => store.stories.filter(story => story.id !== props.story.id && auth.canEditStory(story))
  .sort((a, b) => a.title.fr.localeCompare(b.title.fr, 'fr')));
const showPicker = ref(false);
const pending = ref<{ sourceId: string; periodId: string } | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const requests = useLatestRequest();
async function loadCandidates() {
  const current = requests.begin();
  loading.value = true;
  loadError.value = null;
  try { await store.ensureStoriesLoaded(); }
  catch { if (current()) loadError.value = 'Impossible de charger les frises disponibles.'; }
  finally { if (current()) loading.value = false; }
}
async function openPicker() {
  if (props.busy) return;
  await loadCandidates();
  if (!loadError.value) showPicker.value = true;
}
function add(sourceId: string, periodId: string) {
  pending.value = { sourceId, periodId };
  emit('add-parent', sourceId, periodId);
}
watch(() => props.story, () => {
  const saved = pending.value;
  if (saved && parents.value.some(parent => parent.id === saved.sourceId && parent.anchors.some(anchor => anchor.type === 'period' && anchor.id === saved.periodId))) {
    pending.value = null;
    showPicker.value = false;
  }
});
</script>

<style scoped>
.story-relations { display: flex; flex-direction: column; gap: var(--spacing-lg); max-width: 960px; }
.story-relations__header, .story-relations__source-header, .story-relations__location { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); }
.story-relations h3 { font-size: var(--font-size-lg); margin: 0 0 var(--spacing-xs); }
.story-relations h4 { font-size: var(--font-size-base); margin: 0; overflow-wrap: anywhere; }
.story-relations__description, .story-relations__empty p { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: var(--line-height-body); }
.story-relations__header > .base-button, .story-relations__source-header > .base-button { flex-shrink: 0; }
.story-relations__empty { padding: var(--spacing-xl); border: 1px dashed var(--color-border-default); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: var(--spacing-sm); }
.story-relations__list, .story-relations__locations { margin: 0; padding: 0; list-style: none; }
.story-relations__list { display: flex; flex-direction: column; gap: var(--spacing-md); }
.story-relations__source { border: 1px solid var(--color-border-default); border-radius: var(--radius-md); overflow: hidden; }
.story-relations__source-header { padding: var(--spacing-md); background: var(--color-background-default); }
.story-relations__location { padding: var(--spacing-sm) var(--spacing-md); border-top: 1px solid var(--color-border-default); font-size: var(--font-size-sm); }
.story-relations__location > div { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
.story-relations__caption { display: block; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.story-relations__error { color: var(--color-status-error-foreground); }
@media (max-width: 640px) { .story-relations__header { align-items: flex-start; flex-direction: column; } .story-relations__source-header { align-items: flex-start; } }
</style>
