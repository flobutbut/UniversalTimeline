<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, watch, type ComponentPublicInstance } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import { Icon } from '@iconify/vue';
import Input from '@/components/base/Input.vue';
import DateInput from '@/components/base/DateInput.vue';
import Select from '@/components/base/Select.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import StoryDraftPreview from '@/components/StoryDraftPreview.vue';
import StoryPeriodTree from '@/views/DatabaseView/StoryPeriodTree.vue';
import { generateWikidataTimeline, wikidataTimelineItemError } from '@/services/WikidataGenerationService';
import { SearchApiService, type LocalSearchResult } from '@/services/SearchApiService';
import { StoryApiService } from '@/services/StoryApiService';
import { normalizeWikidataId } from '@/services/wikidataTransport';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { canUseWorkspace } from '@/router/access';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { formatSearchResultDateBound } from '@/lib/formatTemporalBoundLabel';
import type { WikidataTimelineDraft, WikidataTimelineItem, ExistingWikidataStory } from '@/types/wikidataGeneration';
import { effectiveWikidataParent, wikidataDateWarnings, wikidataHierarchyError, wouldCreateWikidataCycle } from '@/lib/wikidataHierarchy';

const route = useRoute(); const router = useRouter(); const auth = useAuthStore(); const store = useDataStore();
const query = ref('');
const subjects = useDebouncedSearch(() => query.value, (q, signal) => SearchApiService.getInstance().searchWikidataEntityLabels(q, { signal }));
const draft = ref<WikidataTimelineDraft | null>(null);
const loading = ref(false); const error = ref<string | null>(null); const saving = ref(false); const saveError = ref<string | null>(null);
const savedId = ref<string | null>(null);
const isPublic = ref(false);
const activeItemQid = ref<string | null>(null);
const detailPane = ref<HTMLElement | null>(null);
const navigationPane = ref<HTMLElement | null>(null);
const itemElements = new Map<string, HTMLElement>();
const saveUncertain = ref(false);
const existing = ref(new Map<string, LocalSearchResult>());
const openEditors = ref(new Set<string>());
const existingStories = ref<ExistingWikidataStory[]>([]);
const checkingStories = ref(false);
const storyCheckError = ref<string | null>(null);
const checkedStoryKey = ref<string | null>(null);
const acknowledgeExistingStories = ref(false);
const duplicateRequests = useLatestRequest(); let duplicateController: AbortController | undefined;
const storyCheckKey = computed(() => draft.value ? `${draft.value.qid}:${draft.value.title.trim()}` : null);
const requests = useLatestRequest(); let controller: AbortController | undefined;
const selected = computed(() => draft.value?.items.filter(item => item.selected) ?? []);
const validSelected = computed(() => selected.value.filter(item => !wikidataTimelineItemError(item)));
const hierarchyError = computed(() => wikidataHierarchyError(validSelected.value));
const periods = computed(() => validSelected.value.filter(item => item.type === 'period').map(item => ({ id: item.qid, label: { fr: item.title, en: '' }, startDate: item.startDate, endDate: item.endDate, categories: [], storyParentId: hierarchyError.value ? null : effectiveWikidataParent(item, validSelected.value) })));
const events = computed(() => validSelected.value.filter(item => item.type === 'event').map(item => ({ id: item.qid, label: { fr: item.title, en: '' }, date: item.startDate })));
const itemsByQid = computed(() => new Map(draft.value?.items.map(item => [item.qid, item]) ?? []));
const canSave = computed(() => canUseWorkspace(auth) && auth.canCreateStories && !!draft.value?.title.trim() && draft.value.title.length <= 255 && draft.value.description.length <= 1000 && selected.value.length > 0 && validSelected.value.length === selected.value.length && !hierarchyError.value && checkedStoryKey.value === storyCheckKey.value && !checkingStories.value && !storyCheckError.value && (!existingStories.value.length || acknowledgeExistingStories.value) && !saving.value && !savedId.value && !saveUncertain.value);
const typeOptions = [{ value: 'period', label: 'Période' }, { value: 'event', label: 'Événement' }] as const;
const sourceUrl = (qid: string) => `https://www.wikidata.org/wiki/${qid}`;
const draftStorageKey = 'wikidata-generation-draft';
const isExistingItem = (item: WikidataTimelineItem) => existing.value.has(`${item.type}:${item.qid}`);

async function checkExistingStories() {
  duplicateController?.abort(); const active = new AbortController(); duplicateController = active;
  const isCurrent = duplicateRequests.begin();
  const subject = draft.value, key = storyCheckKey.value;
  checkedStoryKey.value = null; storyCheckError.value = null; acknowledgeExistingStories.value = false;
  existingStories.value = [];
  if (!subject || !subject.title.trim() || subject.title.length > 255) { checkingStories.value = false; return; }
  checkingStories.value = true;
  try {
    const matches = await StoryApiService.getInstance().findWikidataStories(subject.qid, subject.title.trim(), active.signal);
    if (!isCurrent() || active.signal.aborted) return;
    existingStories.value = matches; checkedStoryKey.value = key;
  } catch {
    if (isCurrent() && !active.signal.aborted) storyCheckError.value = 'Impossible de vérifier si une frise existe déjà. Réessayez avant d’enregistrer.';
  } finally { if (isCurrent()) checkingStories.value = false; }
}

watch([storyCheckKey, () => auth.identityVersion, () => auth.account?.id], () => { void checkExistingStories(); }, { immediate: true });

function setItemElement(qid: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) itemElements.set(qid, element);
  else itemElements.delete(qid);
}

async function showItem(qid: string) {
  activeItemQid.value = qid;
  await nextTick();
  const pane = detailPane.value, item = itemElements.get(qid);
  // scrollIntoView also scrolls overflow:hidden ancestors and can move both
  // headers out of view. Move only the dedicated content column instead.
  if (pane && item) pane.scrollTo?.({ top: Math.max(0, pane.scrollTop + item.getBoundingClientRect().top - pane.getBoundingClientRect().top - 16), behavior: 'auto' });
  const navigation = navigationPane.value;
  const row = navigation?.querySelector<HTMLElement>(`[data-period-id="${qid}"]`);
  if (navigation && row) {
    const bounds = navigation.getBoundingClientRect(), target = row.getBoundingClientRect();
    if (target.top < bounds.top || target.bottom > bounds.bottom) navigation.scrollTo?.({ top: Math.max(0, navigation.scrollTop + target.top - bounds.top), behavior: 'auto' });
  }
}

function cancelDraft() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(draftStorageKey) || 'null');
    if (cached?.qid === draft.value?.qid) sessionStorage.removeItem(draftStorageKey);
  } catch { /* Cancelling does not depend on optional tab storage. */ }
}

function parentOptions(item: WikidataTimelineItem) {
  const options = [{ value: '', label: 'À la racine', disabled: false }, ...validSelected.value
    .filter(parent => parent.type === 'period' && parent.qid !== item.qid && !wouldCreateWikidataCycle(item.qid, parent.qid, validSelected.value))
    .map(parent => ({ value: parent.qid, label: `${parent.title}${item.parentCandidates?.includes(parent.qid) ? ' · Wikidata' : ''}`, disabled: false }))];
  if (item.parentQid && !options.some(option => option.value === item.parentQid)) {
    const parent = draft.value?.items.find(row => row.qid === item.parentQid);
    options.push({ value: item.parentQid, label: `${parent?.title || item.parentQid} (indisponible)`, disabled: true });
  }
  return options;
}

function changeParent(item: WikidataTimelineItem, value: unknown) {
  if (saving.value || savedId.value) return;
  item.parentQid = typeof value === 'string' && /^Q[1-9]\d*$/.test(value) ? value : null;
}

function parentHint(item: WikidataTimelineItem) {
  if (item.parentQid) return item.parentCandidates?.includes(item.parentQid) ? 'Lien déclaré dans Wikidata.' : 'Rattachement choisi pour cette frise.';
  if ((item.parentCandidates?.length ?? 0) > 1) return 'Plusieurs parents sont déclarés dans Wikidata : choisissez le plus pertinent, ou gardez cette période à la racine.';
  return undefined;
}

function hierarchyWarnings(item: WikidataTimelineItem) {
  if (item.type !== 'period') return [];
  const parent = validSelected.value.find(row => row.type === 'period' && row.qid === item.parentQid);
  const warnings = item.parentQid && !parent ? ['Parent non sélectionné ou incomplet : cette période sera placée à la racine.'] : [];
  const reference = parent ?? validSelected.value.find(row => row.qid === draft.value?.qid && row.type === 'period' && row.qid !== item.qid);
  if (reference) warnings.push(...wikidataDateWarnings(item, reference));
  return warnings;
}

function periodWarnings(qid: string) {
  const item = itemsByQid.value.get(qid);
  return item ? hierarchyWarnings(item) : [];
}

// Only a validity transition reselects a card; valid edits preserve a manual opt-out.
watch(
  () => draft.value?.items.map(item => ({ item, valid: !wikidataTimelineItemError(item) })) ?? [],
  (next, previous) => {
    const previousValidity = new Map(previous.map(({ item, valid }) => [item, valid]));
    for (const { item, valid } of next) {
      if (!valid) item.selected = false;
      else if (previousValidity.get(item) === false) item.selected = true;
    }
  },
);

function applyExistingItem(item: WikidataTimelineItem) {
  const local = existing.value.get(`${item.type}:${item.qid}`);
  if (!local) return;
  item.title = local.label.fr || local.label.en;
  item.description = local.description ?? '';
  item.startDate = local.type === 'period' ? local.startDate || '' : local.date || '';
  item.endDate = local.type === 'period' ? local.endDate || '' : '';
  item.warning = undefined;
  if (wikidataTimelineItemError(item)) item.selected = false;
}

function changeType(item: WikidataTimelineItem, value: unknown) {
  if (saving.value || savedId.value || isExistingItem(item)) return;
  openEditors.value.add(item.qid);
  item.type = value === 'period' ? 'period' : 'event';
  if (item.type === 'event') item.parentQid = null;
  applyExistingItem(item);
}

// Only public Wikidata drafts, in this tab, to keep corrections across sign-in.
function preserveDraft() {
  if (!draft.value) return;
  try { sessionStorage.setItem(draftStorageKey, JSON.stringify({ ...draft.value, isPublic: isPublic.value })); } catch { /* Storage may be unavailable. */ }
}

function restoreDraft(result: WikidataTimelineDraft) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(draftStorageKey) || 'null');
    if (cached?.qid !== result.qid || !Array.isArray(cached.items)) return;
    if (typeof cached.isPublic === 'boolean') isPublic.value = cached.isPublic;
    if (typeof cached.title === 'string' && cached.title.length <= 255) result.title = cached.title;
    if (typeof cached.description === 'string' && cached.description.length <= 1000) result.description = cached.description;
    for (const item of result.items) {
      const previous = cached.items.find((row: { qid?: unknown }) => row?.qid === item.qid);
      if (previous && typeof previous.selected === 'boolean') item.selected = previous.selected;
      if (previous && (previous.parentQid === null || (typeof previous.parentQid === 'string' && /^Q[1-9]\d*$/.test(previous.parentQid)))) item.parentQid = previous.parentQid;
      if (existing.value.has(`${item.type}:${item.qid}`)) continue;
      if (!previous || !['event', 'period'].includes(previous.type) || !['title', 'description', 'startDate', 'endDate'].every(key => typeof previous[key] === 'string' && previous[key].length <= 1000)) continue;
      Object.assign(item, { type: previous.type, title: previous.title, description: previous.description, startDate: previous.startDate, endDate: previous.endDate, selected: previous.selected === true });
    }
  } catch { /* An unavailable or stale browser draft never prevents generation. */ }
}

async function choose(qid: string) {
  if (saving.value) return;
  query.value = '';
  await router.push({ name: 'wikidata-generation', query: { wikidata: qid } });
}

async function load(force = false) {
  controller?.abort(); const active = new AbortController(); controller = active;
  const isCurrent = requests.begin();
  draft.value = null; error.value = null; saveError.value = null; savedId.value = null; saveUncertain.value = false; existing.value = new Map();
  openEditors.value.clear();
  activeItemQid.value = null; isPublic.value = false;
  const raw = route.query.wikidata;
  if (raw === undefined) { loading.value = false; return; }
  loading.value = true;
  try {
    if (typeof raw !== 'string') throw new Error('Choisissez un seul sujet Wikidata.');
    const qid = normalizeWikidataId(raw);
    const result = await generateWikidataTimeline(qid, { signal: active.signal, force });
    // Present the catalogue values that saving will actually reuse.
    const matches = (await Promise.all((['period', 'event'] as const).map(type => SearchApiService.getInstance().searchLocalByWikidataIds(result.items.map(item => item.qid), type, active.signal)))).flat();
    if (!isCurrent()) return;
    existing.value = new Map(matches.flatMap(hit => hit.wikidataId ? [[`${hit.type}:${hit.wikidataId}`, hit] as const] : []));
    for (const item of result.items) {
      applyExistingItem(item);
      item.selected = !wikidataTimelineItemError(item);
    }
    restoreDraft(result);
    result.items.forEach(applyExistingItem);
    draft.value = result;
  } catch (cause) {
    if (isCurrent() && !active.signal.aborted) error.value = cause instanceof Error ? cause.message : 'Impossible de générer cet aperçu.';
  } finally { if (isCurrent()) loading.value = false; }
}

watch(() => route.query.wikidata, () => { void load(); }, { immediate: true });
watch(() => auth.account?.id, () => { if (auth.account) void auth.ensureProfile(); }, { immediate: true });
onScopeDispose(() => { controller?.abort(); duplicateController?.abort(); });
onBeforeRouteLeave(() => !saving.value);
onBeforeRouteUpdate(() => !saving.value);

async function save() {
  if (!canSave.value || !draft.value) return;
  saving.value = true; saveError.value = null;
  const identity = auth.identityVersion; const subject = draft.value;
  try {
    const acknowledged = acknowledgeExistingStories.value ? existingStories.value.map(story => story.id) : [];
    const result = acknowledged.length
      ? await StoryApiService.getInstance().createFromWikidata(subject.qid, subject.title.trim(), selected.value, isPublic.value, subject.description, acknowledged)
      : await StoryApiService.getInstance().createFromWikidata(subject.qid, subject.title.trim(), selected.value, isPublic.value, subject.description);
    if (identity !== auth.identityVersion) return;
    savedId.value = result.id;
    try { sessionStorage.removeItem(draftStorageKey); } catch { /* Optional tab storage. */ }
    store.invalidateStories(); store.invalidateStory(result.id);
  } catch (cause) {
    if (identity === auth.identityVersion) {
      const conflict = cause as { response?: { status?: number; data?: { existingStories?: ExistingWikidataStory[] } } };
      if (conflict.response?.status === 409 && Array.isArray(conflict.response.data?.existingStories) && conflict.response.data.existingStories.length) {
        existingStories.value = conflict.response.data.existingStories;
        acknowledgeExistingStories.value = false;
        saveError.value = null;
      } else {
        saveError.value = mutationErrorMessage(cause, 'Impossible d’enregistrer cette frise.');
      }
      saveUncertain.value = saveError.value?.startsWith('L’enregistrement n’a pas pu être confirmé.') ?? false;
      await nextTick();
      detailPane.value?.scrollTo?.({ top: 0, behavior: 'auto' });
    }
  } finally { saving.value = false; }
  if (savedId.value) await router.push({ name: 'timeline', query: { story: savedId.value } });
}
</script>

<template>
  <div class="wikidata-generation">
    <header class="generation-heading">
      <div class="generation-heading-main">
        <div class="generation-heading-copy">
          <h1>Créer une frise depuis Wikidata</h1>
          <p>Choisissez un sujet, vérifiez les dates et sélectionnez les éléments à conserver.</p>
        </div>
      </div>
      <div class="generation-heading-actions">
        <div class="generation-segmented generation-visibility" role="radiogroup" aria-label="Visibilité de la frise">
          <label><input type="radio" name="generation-visibility" value="private" :checked="!isPublic" :disabled="!draft || saving || !!savedId || saveUncertain" @change="isPublic = false" /><span>Privé</span></label>
          <label><input type="radio" name="generation-visibility" value="public" :checked="isPublic" :disabled="!draft || saving || !!savedId || saveUncertain" @change="isPublic = true" /><span>Public</span></label>
        </div>
        <Button variant="tertiary" size="sm" :to="{ name: 'timeline' }" :disabled="saving" title="Annuler la création et revenir à l’exploration" @click="cancelDraft">Annuler</Button>
        <Button v-if="savedId" size="sm" :to="{ name: 'timeline', query: { story: savedId } }">Ouvrir la frise créée</Button>
        <Button v-else-if="!canUseWorkspace(auth)" size="sm" :disabled="!draft" :to="{ name: 'login', query: { redirect: route.fullPath } }" @click="preserveDraft">Se connecter pour enregistrer</Button>
        <Button v-else-if="!auth.canCreateStories" size="sm" :disabled="!draft" variant="secondary" :to="{ name: 'profile' }" @click="preserveDraft">Choisir un nom d’utilisateur pour enregistrer</Button>
        <Button v-else size="sm" :disabled="!canSave" @click="save">{{ saving ? 'Enregistrement…' : 'Enregistrer la frise' }}</Button>
      </div>
    </header>
    <div class="generation-workspace">
      <aside ref="navigationPane" class="generation-navigation" aria-label="Structure de la frise">
        <template v-if="draft">
          <StoryPeriodTree class="generation-tree" :story-id="draft.qid" :periods="periods" :selected-id="activeItemQid" :scroll-selected-into-view="false" @select="showItem">
            <template #actions="{ period }">
              <Tag v-if="periodWarnings(period.id).length" variant="warning" label="À vérifier" :title="periodWarnings(period.id).join(' ')" />
            </template>
          </StoryPeriodTree>
          <section v-if="events.length" class="generation-event-navigation" aria-label="Événements sélectionnés">
            <h3>Événements <span>{{ events.length }}</span></h3>
            <ul>
              <li v-for="event in events" :key="event.id">
                <button type="button" class="generation-event-link" :class="{ 'is-active': activeItemQid === event.id }" :aria-current="activeItemQid === event.id ? 'true' : undefined" @click="showItem(event.id)">
                  <span>{{ event.label.fr }}</span><small>{{ formatSearchResultDateBound(event.date) }}</small>
                </button>
              </li>
            </ul>
          </section>
        </template>
      </aside>
      <div ref="detailPane" class="generation-details" role="region" aria-label="Détail des éléments proposés">
    <section v-if="!route.query.wikidata" class="generation-search" aria-label="Choix du sujet">
      <SearchInput v-model="query" placeholder="Ex. Révolution française, Apollo…" aria-label="Rechercher un sujet Wikidata" :disabled="saving" />
      <FeedbackState v-if="subjects.loading.value" kind="loading" message="Recherche Wikidata…" />
      <FeedbackState v-else-if="subjects.error.value" kind="error" :message="subjects.error.value" retryable @retry="subjects.retry" />
      <ul v-else-if="subjects.results.value.length" class="generation-subjects">
        <li v-for="subject in subjects.results.value" :key="subject.id"><Button variant="tertiary" :disabled="saving" @click="choose(subject.id)">{{ subject.label }}<span v-if="subject.description"> — {{ subject.description }}</span></Button></li>
      </ul>
      <p v-else-if="query.trim().length >= 2" role="status">Aucun sujet trouvé.</p>
    </section>
        <FeedbackState v-if="loading" kind="loading" message="Préparation de la frise depuis Wikidata…" />
        <FeedbackState v-else-if="error" kind="error" :message="error" retryable @retry="load(true)" />
        <template v-else-if="draft">
          <section class="generation-context" aria-label="Source et validation de la frise">
            <a class="generation-source-link" :href="sourceUrl(draft.qid)" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:open-in-new" aria-hidden="true" />Voir le sujet sur Wikidata<span class="sr-only"> (nouvel onglet)</span></a>
            <span v-if="checkingStories" class="sr-only" role="status">Vérification des frises existantes…</span>
            <div v-if="storyCheckError || existingStories.length" class="generation-existing-stories" aria-label="Vérification des frises existantes">
              <p v-if="storyCheckError" role="alert">{{ storyCheckError }} <Button variant="tertiary" size="sm" @click="checkExistingStories">Réessayer</Button></p>
              <template v-else>
                <p role="alert"><strong>{{ existingStories.length === 1 ? 'Une frise correspondante existe déjà.' : 'Des frises correspondantes existent déjà.' }}</strong></p>
                <div class="generation-duplicate-matches"><div v-for="story in existingStories" :key="story.id" class="generation-duplicate-match"><RouterLink :to="{ name: 'database', query: { story: story.id } }">Ouvrir « {{ story.title }} »</RouterLink><Tag variant="error" :label="story.reason === 'subject' ? 'Même source Wikidata' : 'Même titre'" /></div></div>
                <label class="generation-duplicate-choice"><input v-model="acknowledgeExistingStories" type="checkbox" :disabled="saving || !!savedId || saveUncertain" />Créer tout de même une nouvelle frise</label>
              </template>
            </div>
            <p v-if="saveError" class="generation-save-feedback" role="alert">{{ saveError }} <RouterLink :to="{ name: 'database' }">Vérifier mes frises</RouterLink></p>
            <p v-if="hierarchyError" class="generation-item-error" role="alert">{{ hierarchyError }}</p>
          </section>
          <StoryDraftPreview v-model:title="draft.title" v-model:description="draft.description" class="generation-overview" :disabled="saving || !!savedId" :periods="periods" :events="events" @select-period="showItem" @select-event="showItem" />
          <section class="generation-items" aria-label="Éléments proposés">
            <h2>{{ draft.items.length }} éléments proposés · {{ selected.length }} sélectionnés</h2>
            <div class="generation-selection-actions">
              <Button size="sm" variant="secondary" :disabled="saving || !!savedId" @click="draft.items.forEach(item => item.selected = !wikidataTimelineItemError(item))">Tout sélectionner avec une date valide</Button>
              <Button size="sm" variant="tertiary" :disabled="saving || !!savedId" @click="draft.items.forEach(item => item.selected = false)">Tout désélectionner</Button>
            </div>
            <p v-if="!draft.items.length">Aucun élément daté n’a été trouvé dans les relations directes de ce sujet. Essayez un sujet plus précis.</p>
        <article v-for="item in draft.items" :id="`generation-item-${item.qid}`" :ref="el => setItemElement(item.qid, el)" :key="item.qid" class="generation-item" :class="{ 'generation-item--selected': item.selected, 'generation-item--active': activeItemQid === item.qid }">
          <div class="generation-item-heading">
            <label><input v-model="item.selected" type="checkbox" :disabled="saving || !!savedId || (!item.selected && !!wikidataTimelineItemError(item))" :aria-label="`Inclure ${item.title}`" /> {{ item.title }}</label>
            <a :href="sourceUrl(item.qid)" target="_blank" rel="noopener noreferrer">{{ item.qid }}<span class="sr-only"> sur Wikidata (nouvel onglet)</span></a>
          </div>
          <details :open="openEditors.has(item.qid) || !!wikidataTimelineItemError(item)" class="generation-item-editor" @toggle="($event.target as HTMLDetailsElement).open ? openEditors.add(item.qid) : openEditors.delete(item.qid)">
            <summary><Icon class="generation-editor-chevron" icon="mdi:chevron-right" aria-hidden="true" /><span>{{ formatSearchResultDateBound(item.startDate) || 'Date à renseigner' }}<template v-if="item.type === 'period'"> → {{ formatSearchResultDateBound(item.endDate) || 'fin inconnue' }}</template> · {{ isExistingItem(item) ? 'Consulter les informations' : 'Modifier les informations' }}</span></summary>
            <div class="generation-type-toggle" role="radiogroup" :aria-label="`Type de ${item.title}`">
              <label v-for="option in typeOptions" :key="option.value">
                <input type="radio" :name="`generation-type-${item.qid}`" :value="option.value" :checked="item.type === option.value" :disabled="saving || !!savedId || isExistingItem(item)" @change="changeType(item, option.value)" />
                <span>{{ option.label }}</span>
              </label>
            </div>
            <div class="generation-item-fields">
              <Input v-model="item.title" label="Titre" :maxlength="255" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
              <DateInput v-model="item.startDate" :label="item.type === 'period' ? 'Début' : 'Date'" placeholder="Ex. 1789 ou 1789-07-14" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
              <DateInput v-if="item.type === 'period'" :id="`generation-end-${item.qid}`" v-model="item.endDate" label="Fin" placeholder="Date de fin connue" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
            </div>
            <Input v-model="item.description" label="Description" type="textarea" :maxlength="1000" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
          </details>
          <Select v-if="item.type === 'period'" :id="`generation-parent-${item.qid}`" :model-value="item.parentQid || ''" :options="parentOptions(item)" label="Période parente" :hint="parentHint(item)" :disabled="saving || !!savedId" @update:model-value="changeParent(item, $event)" />
          <div v-if="isExistingItem(item) || hierarchyWarnings(item).length || item.warning || wikidataTimelineItemError(item)" class="generation-item-feedback">
            <p v-if="isExistingItem(item)" class="generation-note"><Icon icon="mdi:information-outline" aria-hidden="true" /><span>Déjà dans le catalogue · Informations en lecture seule.</span></p>
            <div v-if="hierarchyWarnings(item).length" class="generation-hierarchy-warnings"><p v-for="warning in hierarchyWarnings(item)" :key="warning"><Tag label="À vérifier" variant="warning" /><span>{{ warning }}</span></p></div>
            <p v-if="item.warning" class="generation-note"><Icon icon="mdi:information-outline" aria-hidden="true" /><span>{{ item.warning }}</span></p>
            <p v-if="wikidataTimelineItemError(item)" class="generation-item-error"><Tag label="Erreur" variant="error" /><span>{{ wikidataTimelineItemError(item) }}</span></p>
          </div>
        </article>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikidata-generation { width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.generation-heading { position: sticky; top: 0; z-index: var(--z-index-sticky); flex-shrink: 0; display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-md) var(--spacing-xl); width: 100%; box-sizing: border-box; padding: var(--spacing-lg) var(--spacing-xl); border-bottom: 1px solid var(--color-border-default); background: var(--color-surface-default); }
.generation-heading-main { display: flex; align-items: center; flex: 1; min-width: 240px; gap: var(--spacing-lg); }
.generation-heading-copy { min-width: 0; }
.generation-heading h1 { margin: 0; font-size: var(--font-size-xl); }
.generation-heading p { margin: var(--spacing-xs) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.generation-heading-actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-md); }
.generation-heading-actions :deep(.base-button__text) { white-space: normal; }
.generation-context { display: flex; flex-direction: column; gap: var(--spacing-md); font: var(--type-compact); }
.generation-context p { margin: 0; }
.generation-source-link { display: inline-flex; align-items: center; gap: var(--spacing-sm); align-self: flex-start; }
.generation-save-feedback, .generation-existing-stories { padding: var(--spacing-md); border-radius: var(--radius-md); background: var(--color-status-error-background); color: var(--color-status-error-foreground); }
.generation-existing-stories { display: flex; flex-direction: column; gap: var(--spacing-md); }
.generation-duplicate-matches { display: flex; flex-direction: column; gap: var(--spacing-sm); max-height: 160px; overflow-y: auto; }
.generation-duplicate-match { display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-sm); }
.generation-duplicate-choice { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-sm); }
.generation-duplicate-choice input { accent-color: var(--color-primary); }
.generation-workspace { display: grid; grid-template-columns: clamp(260px, 30%, 360px) minmax(0, 1fr); flex: 1; min-height: 0; overflow: hidden; }
.generation-navigation { min-width: 0; min-height: 0; overflow-y: auto; border-right: 1px solid var(--color-border-default); background: var(--color-surface-default); scrollbar-gutter: stable; }
.generation-event-navigation h3 { display: flex; align-items: center; gap: var(--spacing-sm); margin: 0; padding: var(--spacing-md) var(--spacing-lg); border-block: 1px solid var(--color-border-default); font: var(--type-label); }
.generation-event-navigation h3 span { color: var(--color-text-secondary); font: var(--type-meta); }
.generation-event-navigation ul { list-style: none; margin: 0; padding: var(--spacing-sm) 0; }
.generation-event-link { display: flex; flex-direction: column; gap: var(--spacing-xs); width: 100%; min-width: 0; padding: var(--spacing-sm) var(--spacing-lg); border: 0; background: transparent; text-align: left; color: var(--color-text-primary); font: var(--type-body); cursor: pointer; }
.generation-event-link span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%; }
.generation-event-link small { color: var(--color-text-secondary); font: var(--type-meta); }
.generation-event-link:hover { background: var(--color-interaction-hover); }
.generation-event-link.is-active { background: var(--color-interaction-selected); color: var(--color-text-on-selected); }
.generation-event-link.is-active small { color: inherit; }
.generation-event-link:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
.generation-details { display: flex; flex-direction: column; gap: var(--spacing-xl); min-width: 0; min-height: 0; overflow-y: auto; padding: var(--spacing-xl); scrollbar-gutter: stable; }
.generation-details > * { flex-shrink: 0; }
.generation-search { padding-bottom: var(--spacing-lg); border-bottom: 1px solid var(--color-border-default); }
.generation-items, .generation-item { display: flex; flex-direction: column; gap: var(--spacing-md); }
.generation-overview { padding-bottom: var(--spacing-xl); border-bottom: 1px solid var(--color-border-default); }
.generation-overview p { margin: 0; }
.generation-note { color: var(--color-text-secondary); }
.generation-subjects { list-style: none; margin: var(--spacing-sm) 0 0; padding: 0; }
.generation-subjects li { border-top: 1px solid var(--color-border-light); }
.generation-item { padding: var(--spacing-lg); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-surface-default); scroll-margin-top: var(--spacing-lg); }
.generation-item--selected { border-color: var(--color-border-focus); }
.generation-item--active { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.generation-item-heading { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
.generation-item-heading label { display: flex; gap: var(--spacing-sm); align-items: center; font-weight: var(--font-weight-semibold); min-width: 0; overflow-wrap: anywhere; }
.generation-item-heading input { accent-color: var(--color-primary); }
.generation-item-fields { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: var(--spacing-md); }
.generation-selection-actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.generation-type-toggle, .generation-segmented { display: flex; width: fit-content; padding: var(--spacing-xs); gap: var(--spacing-xs); border-radius: var(--radius-lg); background: var(--color-background-default); }
:is(.generation-type-toggle, .generation-segmented) label { position: relative; display: flex; }
:is(.generation-type-toggle, .generation-segmented) input { position: absolute; width: 1px; height: 1px; opacity: 0; }
:is(.generation-type-toggle, .generation-segmented) span { display: block; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); font: var(--type-compact); color: var(--color-text-secondary); cursor: pointer; }
:is(.generation-type-toggle, .generation-segmented) input:checked + span { color: var(--color-text-link); background: var(--color-surface-default); }
:is(.generation-type-toggle, .generation-segmented) input:focus-visible + span { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
:is(.generation-type-toggle, .generation-segmented) input:disabled + span { opacity: .5; cursor: not-allowed; }
.generation-visibility { height: var(--field-height-md); box-sizing: border-box; padding: 2px; gap: 2px; border-radius: var(--radius-md); }
.generation-visibility span { display: flex; align-items: center; height: 100%; padding: 0 var(--spacing-md); box-sizing: border-box; }
.generation-item-editor summary { display: flex; align-items: center; gap: var(--spacing-xs); min-height: var(--field-height-sm); list-style: none; cursor: pointer; color: var(--color-text-secondary); }
.generation-item-editor summary::-webkit-details-marker { display: none; }
.generation-item-editor summary:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; border-radius: var(--radius-sm); }
.generation-editor-chevron { flex-shrink: 0; width: 20px; height: 20px; }
.generation-item-editor[open] > summary .generation-editor-chevron { transform: rotate(90deg); }
.generation-item-editor[open] > :not(summary) { margin-top: var(--spacing-md); }
.generation-item-heading a { flex-shrink: 0; }
.generation-search :deep(.base-button__text) { white-space: normal; text-align: left; }
.generation-item-error { color: var(--color-status-error-foreground); }
.generation-item p { margin: 0; }
.generation-items h2 { font-size: var(--font-size-lg); margin: 0; }
.generation-item-feedback { display: flex; flex-direction: column; gap: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-default); font: var(--type-compact); }
.generation-item-feedback p { display: flex; align-items: flex-start; gap: var(--spacing-sm); }
.generation-item-feedback .generation-note > svg { flex-shrink: 0; width: 18px; height: 18px; margin-top: 2px; }
.generation-hierarchy-warnings { display: flex; flex-direction: column; gap: var(--spacing-sm); color: var(--color-text-secondary); }
@media (max-width: 700px) {
  .generation-heading { padding: var(--spacing-md); gap: var(--spacing-md); }
  .generation-heading-main { flex-basis: 100%; gap: var(--spacing-md); }
  .generation-heading-actions { flex: 1; gap: var(--spacing-sm); }
  .generation-heading-actions > .base-button { flex: 1; }
  .generation-workspace { display: flex; flex-direction: column; }
  .generation-navigation { flex-shrink: 0; max-height: 30dvh; border-right: 0; border-bottom: 1px solid var(--color-border-default); }
  .generation-details { flex: 1; padding: var(--spacing-md); }
  .generation-item-fields { grid-template-columns: minmax(0, 1fr); }
}
</style>
