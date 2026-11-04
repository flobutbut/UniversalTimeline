<template>
  <section class="story-relations" aria-labelledby="story-relations-title">
    <div class="story-relations__parent">
      <div class="story-relations__source-header">
        <div>
          <span class="story-relations__caption">Frise parente</span>
          <h4>{{ parentStory ? parentStory.title.fr || parentStory.title.en : treeRoot ? 'Racine de l’arbre des frises' : 'Aucune : brouillon privé' }}</h4>
          <p class="story-relations__description">{{ parentAnchorsLabel }}</p>
        </div>
        <Button v-if="auth.ownsStory(story)" variant="tertiary" size="sm" :disabled="busy || loading" @click="openParentPicker">{{ story.parentStoryId ? 'Changer de frise parente' : 'Choisir la frise parente' }}</Button>
      </div>
    </div>
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
        <div v-if="parent.atRoot || !parent.anchors.length" class="story-relations__location">
          <span class="story-relations__description">Depuis la racine de cette frise</span>
          <Button v-if="editable && auth.canEditStory(parent)" variant="ghost" size="xs" :disabled="busy" @click="emit('remove-parent', parent.id, null)">Retirer</Button>
        </div>
      </li>
    </ul>
    <ParentStoryPickerModal v-if="showPicker" :candidates="candidates" :existing-parents="parents" :busy="busy" :error="error"
      @close="showPicker = false" @confirm="add" />
    <ParentStoryPickerModal v-if="showParentPicker" mode="parent" :candidates="parentCandidates" :subject="subject" :busy="busy" :error="error"
      @close="showParentPicker = false" @confirm="setParent" />
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
import { contentRange, isTreeRoot } from '@/lib/storyArchitecture';
const props = defineProps<{ story: Story; busy?: boolean; error?: string | null }>();
const emit = defineEmits<{ 'add-parent': [sourceId: string, periodId: string | null]; 'remove-parent': [sourceId: string, anchor?: StoryAnchor | null]; 'set-parent': [parentId: string, periodId: string | null] }>();
const auth = useAuthStore();
const store = useDataStore();
const editable = computed(() => auth.canEditStory(props.story));
const parents = computed(() => props.story.parentStories ?? []);
const candidates = computed(() => store.stories.filter(story => story.id !== props.story.id && auth.canEditStory(story))
  .sort((a, b) => a.title.fr.localeCompare(b.title.fr, 'fr')));
const showPicker = ref(false);
// ─── Frise parente (règle 1) : rattachement avec une ancre proposée d’après les dates de la frise ───
const parentStory = computed(() => parents.value.find(parent => parent.id === props.story.parentStoryId)
  ?? store.stories.find(story => story.id === props.story.parentStoryId) ?? null);
const treeRoot = computed(() => !props.story.parentStoryId && isTreeRoot(props.story.id, store.stories));
const parentAnchorsLabel = computed(() => {
  if (!props.story.parentStoryId) return treeRoot.value ? 'Seule la racine n’a pas de frise parente.' : 'Sans frise parente, la frise reste privée.';
  const anchors = parents.value.find(parent => parent.id === props.story.parentStoryId)?.anchors ?? [];
  return anchors.length ? `Ancre : ${anchors.map(anchor => anchor.label.fr || anchor.label.en || anchor.id).join(', ')}` : 'Accès depuis la racine de la frise parente.';
});
const subject = computed(() => contentRange(props.story.periods ?? [], props.story.events ?? [], Date.now()));
/** Ni la frise ni ses descendantes : le rattachement créerait un cycle. */
const parentCandidates = computed(() => {
  const parentOf = new Map(store.stories.map(story => [story.id, story.parentStoryId ?? null]));
  const descends = (id: string) => { for (let current: string | null = id, seen = new Set<string>(); current && !seen.has(current); current = parentOf.get(current) ?? null) { if (current === props.story.id) return true; seen.add(current); } return false; };
  return candidates.value.filter(story => !descends(story.id));
});
const showParentPicker = ref(false);
const pendingParent = ref<string | null>(null);
async function openParentPicker() {
  if (props.busy) return;
  await loadCandidates();
  if (!loadError.value) showParentPicker.value = true;
}
function setParent(parentId: string, periodId: string | null) {
  pendingParent.value = parentId;
  emit('set-parent', parentId, periodId);
}
const pending = ref<{ sourceId: string; periodId: string | null } | null>(null);
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
function add(sourceId: string, periodId: string | null) {
  pending.value = { sourceId, periodId };
  emit('add-parent', sourceId, periodId);
}
watch(() => props.story, () => {
  if (pendingParent.value && props.story.parentStoryId === pendingParent.value) { pendingParent.value = null; showParentPicker.value = false; }
  const saved = pending.value;
  if (saved && parents.value.some(parent => parent.id === saved.sourceId && (saved.periodId === null ? parent.atRoot : parent.anchors.some(anchor => anchor.type === 'period' && anchor.id === saved.periodId)))) {
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
.story-relations__source, .story-relations__parent { border: 1px solid var(--color-border-default); border-radius: var(--radius-md); overflow: hidden; }
.story-relations__source-header { padding: var(--spacing-md); background: var(--color-background-default); }
.story-relations__location { padding: var(--spacing-sm) var(--spacing-md); border-top: 1px solid var(--color-border-default); font-size: var(--font-size-sm); }
.story-relations__location > div { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
.story-relations__caption { display: block; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.story-relations__error { color: var(--color-status-error-foreground); }
.story-relations__parent .story-relations__description { margin-top: var(--spacing-xs); }
@media (max-width: 640px) { .story-relations__header { align-items: flex-start; flex-direction: column; } .story-relations__source-header { align-items: flex-start; } }
</style>
