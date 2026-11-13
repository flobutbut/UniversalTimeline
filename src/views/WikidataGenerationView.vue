<script setup lang="ts">
import { localizedText, uiFormat, uiText } from '@/i18n';
import { computed, nextTick, onScopeDispose, ref, watch, type ComponentPublicInstance } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import InfoTooltip from '@/components/base/InfoTooltip.vue';
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
import { WikidataQueryService } from '@/services/WikidataQueryService';
import { useToast } from '@/composables/useToast';
import { normalizeWikidataId } from '@/services/wikidataTransport';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { canUseWorkspace } from '@/router/access';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { formatSearchResultDateBound } from '@/lib/formatTemporalBoundLabel';
import { wikidataItemKey, type WikidataTimelineDraft, type WikidataTimelineItem, type ExistingWikidataStory } from '@/types/wikidataGeneration';
import { profiles, defaultSettings, propertyLabels, type Profile, type Status } from '@/lib/wikidataGenerationModel';
import { effectiveWikidataParent, wikidataDateWarnings, wikidataHierarchyError, wouldCreateWikidataCycle } from '@/lib/wikidataHierarchy';

const route = useRoute(); const router = useRouter(); const auth = useAuthStore(); const store = useDataStore();
const query = ref('');
const subjects = useDebouncedSearch(() => query.value, (q, signal) => SearchApiService.getInstance().searchWikidataEntityLabels(q, { signal }));
const draft = ref<WikidataTimelineDraft | null>(null);
const profile = ref<Profile | ''>('');
const generationSettings = ref({ ...defaultSettings });
const statusFilter = ref<Status | 'all'>('retained');
const visibleItems = computed(() => draft.value?.items.filter(item => statusFilter.value === 'all' || (item.status ?? 'retained') === statusFilter.value) ?? []);
const statusCounts = computed(() => (['retained','review','excluded'] as const).map(value => ({ value, label: ({retained:'Proposés',review:'À vérifier',excluded:'Écartés'})[value], count: draft.value?.items.filter(item => (item.status ?? 'retained') === value).length ?? 0 })));
function setProfile(value: unknown) { if (profiles.some(p => p.value === value)) { profile.value = value as Profile; void load(false); } }
function changeRules() { void load(false); }
function setLimit(value: unknown) { if (typeof value === 'number' && [20,40,80].includes(value)) { generationSettings.value.limit = value; void load(false); } }
const itemSourceUrl = (item: WikidataTimelineItem) => `${sourceUrl(item.source?.qid ?? item.qid)}${item.source?.statementId ? `#${encodeURIComponent(item.source.statementId)}` : ''}`;
const loading = ref(false); const error = ref<string | null>(null); const saving = ref(false); const saveError = ref<string | null>(null);
const savedId = ref<string | null>(null);
const toast = useToast();
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
const validSelected = computed(() => selected.value.filter(item => item.status !== 'excluded' && !wikidataTimelineItemError(item)));
const hierarchyError = computed(() => wikidataHierarchyError(validSelected.value));
const periods = computed(() => validSelected.value.filter(item => item.type === 'period').map(item => ({ id: wikidataItemKey(item), label: { fr: item.title, en: '' }, startDate: item.startDate, endDate: item.endDate, categories: [], storyParentId: hierarchyError.value ? null : effectiveWikidataParent(item, validSelected.value) })));
const events = computed(() => validSelected.value.filter(item => item.type === 'event').map(item => ({ id: wikidataItemKey(item), label: { fr: item.title, en: '' }, date: item.startDate })));
const itemsByQid = computed(() => new Map(draft.value?.items.map(item => [wikidataItemKey(item), item]) ?? []));
const canSave = computed(() => canUseWorkspace(auth) && auth.canCreateStories && !!draft.value?.title.trim() && draft.value.title.length <= 255 && draft.value.description.length <= 1000 && selected.value.length > 0 && selected.value.length <= 81 && validSelected.value.length === selected.value.length && !hierarchyError.value && checkedStoryKey.value === storyCheckKey.value && !checkingStories.value && !storyCheckError.value && (!existingStories.value.length || acknowledgeExistingStories.value) && !saving.value && !savedId.value && !saveUncertain.value);
const typeOptions = [{ value: 'period', label: 'Période' }, { value: 'event', label: 'Événement' }] as const;
const sourceUrl = (qid: string) => `https://www.wikidata.org/wiki/${qid}`;
const draftStorageKey = 'wikidata-generation-draft';
const isExistingItem = (item: WikidataTimelineItem) => existing.value.has(`${item.type}:${wikidataItemKey(item)}`);

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
  if (!visibleItems.value.some(item => wikidataItemKey(item) === qid)) statusFilter.value = 'all';
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
    .filter(parent => parent.type === 'period' && wikidataItemKey(parent) !== wikidataItemKey(item) && !wouldCreateWikidataCycle(wikidataItemKey(item), wikidataItemKey(parent), validSelected.value))
    .map(parent => ({ value: wikidataItemKey(parent), label: `${parent.title}${item.parentCandidates?.includes(wikidataItemKey(parent)) ? ' · Wikidata' : ''}`, disabled: false }))];
  if (item.parentQid && !options.some(option => option.value === item.parentQid)) {
    const parent = draft.value?.items.find(row => wikidataItemKey(row) === item.parentQid);
    options.push({ value: item.parentQid, label: `${parent?.title || item.parentQid} (indisponible)`, disabled: true });
  }
  return options;
}

function changeParent(item: WikidataTimelineItem, value: unknown) {
  if (saving.value || savedId.value) return;
  item.parentQid = typeof value === 'string' && parentOptions(item).some(option => option.value === value) ? value || null : null;
}

function parentHint(item: WikidataTimelineItem) {
  if (item.parentQid) return item.parentCandidates?.includes(item.parentQid) ? 'Lien déclaré dans Wikidata.' : 'Rattachement choisi pour cette frise.';
  if ((item.parentCandidates?.length ?? 0) > 1) return 'Plusieurs parents sont déclarés dans Wikidata : choisissez le plus pertinent, ou gardez cette période à la racine.';
  return undefined;
}

function hierarchyWarnings(item: WikidataTimelineItem) {
  if (item.type !== 'period') return [];
  const parent = validSelected.value.find(row => row.type === 'period' && wikidataItemKey(row) === item.parentQid);
  const warnings = item.parentQid && !parent ? ['Parent non sélectionné ou incomplet : cette période sera placée à la racine.'] : [];
  const reference = parent ?? validSelected.value.find(row => row.qid === draft.value?.qid && row.origin !== 'fact' && row.type === 'period' && wikidataItemKey(row) !== wikidataItemKey(item));
  if (reference) warnings.push(...wikidataDateWarnings(item, reference));
  return warnings;
}

function periodWarnings(qid: string) {
  const item = itemsByQid.value.get(qid);
  return item ? hierarchyWarnings(item) : [];
}

// Only a validity transition reselects a card; valid edits preserve a manual opt-out.
watch(
  () => draft.value?.items.map(item => ({ item, valid: item.status !== 'excluded' && !wikidataTimelineItemError(item) })) ?? [],
  (next, previous) => {
    const previousValidity = new Map(previous.map(({ item, valid }) => [item, valid]));
    for (const { item, valid } of next) {
      if (!valid) item.selected = false;
      else if (previousValidity.get(item) === false) item.selected = true;
    }
  },
);

function applyExistingItem(item: WikidataTimelineItem) {
  const local = existing.value.get(`${item.type}:${wikidataItemKey(item)}`);
  if (!local) return;
  item.title = localizedText(local.label);
  item.description = local.description ?? '';
  item.startDate = local.type === 'period' ? local.startDate || '' : local.date || '';
  item.endDate = local.type === 'period' ? local.endDate || '' : '';
  item.warning = undefined;
  if (wikidataTimelineItemError(item)) item.selected = false;
}

function changeType(item: WikidataTimelineItem, value: unknown) {
  if (saving.value || savedId.value || isExistingItem(item)) return;
  openEditors.value.add(wikidataItemKey(item));
  item.type = value === 'period' ? 'period' : 'event';
  if (item.type === 'event') item.parentQid = null;
  applyExistingItem(item);
}

// Only public Wikidata drafts, in this tab, to keep corrections across sign-in.
function preserveDraft() {
  if (!draft.value) return;
  try { sessionStorage.setItem(draftStorageKey, JSON.stringify(draft.value)); } catch { /* Storage may be unavailable. */ }
}

function restoreDraft(result: WikidataTimelineDraft) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(draftStorageKey) || 'null');
    if (cached?.qid !== result.qid || !Array.isArray(cached.items)) return;
    const sameRules = cached.profile === result.profile && JSON.stringify(cached.settings) === JSON.stringify(result.settings);
    if (cached.texts?.language !== result.texts?.language) return;
    if (typeof cached.title === 'string' && cached.title.length <= 255) result.title = cached.title;
    if (typeof cached.description === 'string' && cached.description.length <= 1000) result.description = cached.description;
    for (const item of result.items) {
      const previous = cached.items.find((row: { qid?: unknown }) => (row as WikidataTimelineItem | undefined) && wikidataItemKey(row as WikidataTimelineItem) === wikidataItemKey(item));
      if (sameRules && previous && typeof previous.selected === 'boolean') item.selected = item.status !== 'excluded' && previous.selected;
      if (previous && (previous.parentQid === null || (typeof previous.parentQid === 'string' && result.items.some(parent => wikidataItemKey(parent) === previous.parentQid)))) item.parentQid = previous.parentQid;
      if (existing.value.has(`${item.type}:${wikidataItemKey(item)}`)) continue;
      if (!previous || !['event', 'period'].includes(previous.type) || !['title', 'description', 'startDate', 'endDate'].every(key => typeof previous[key] === 'string' && previous[key].length <= 1000)) continue;
      Object.assign(item, { type: previous.type, title: previous.title, description: previous.description, startDate: previous.startDate, endDate: previous.endDate, selected: item.status !== 'excluded' && (sameRules ? previous.selected === true : item.selected) });
    }
  } catch { /* An unavailable or stale browser draft never prevents generation. */ }
}

async function choose(qid: string) {
  if (saving.value) return;
  query.value = '';
  await router.push({ name: 'wikidata-generation', query: { wikidata: qid } });
}

async function load(force = false) {
  if (draft.value?.qid === route.query.wikidata) preserveDraft();
  controller?.abort(); const active = new AbortController(); controller = active;
  const isCurrent = requests.begin();
  draft.value = null; error.value = null; saveError.value = null; savedId.value = null; saveUncertain.value = false; existing.value = new Map();
  openEditors.value.clear();
  activeItemQid.value = null;
  const raw = route.query.wikidata;
  if (raw === undefined) { loading.value = false; return; }
  loading.value = true;
  try {
    if (typeof raw !== 'string') throw new Error('Choisissez un seul sujet Wikidata.');
    const qid = normalizeWikidataId(raw);
    if (!profile.value) {
      try {
        const cached = JSON.parse(sessionStorage.getItem(draftStorageKey) || 'null');
        if (cached?.qid === qid && profiles.some(entry => entry.value === cached.profile)) {
          profile.value = cached.profile;
          for (const key of ['approximate', 'withinBounds', 'biography', 'works'] as const) if (typeof cached.settings?.[key] === 'boolean') generationSettings.value[key] = cached.settings[key];
          if ([20, 40, 80].includes(cached.settings?.limit)) generationSettings.value.limit = cached.settings.limit;
        }
      } catch { /* Invalid optional tab storage never prevents generation. */ }
    }
    const result = await generateWikidataTimeline(qid, { signal: active.signal, force, ...(profile.value ? { profile: profile.value } : {}), settings: generationSettings.value });
    if (!isCurrent()) return;
    profile.value = result.profile ?? profile.value;
    // Present the catalogue values that saving will actually reuse.
    const matches = (await Promise.all((['period', 'event'] as const).map(type => result.items.some(item => item.id) ? SearchApiService.getInstance().searchLocalByGenerationKeys(result.items.map(wikidataItemKey), type, active.signal) : SearchApiService.getInstance().searchLocalByWikidataIds(result.items.map(item => item.qid), type, active.signal)))).flat();
    if (!isCurrent()) return;
    existing.value = new Map(matches.flatMap(hit => hit.sourceKey || hit.wikidataId ? [[`${hit.type}:${hit.sourceKey ?? hit.wikidataId}`, hit] as const] : []));
    for (const item of result.items) {
      applyExistingItem(item);
      item.selected = (item.status === undefined || item.status === 'retained') && !wikidataTimelineItemError(item);
    }
    restoreDraft(result);
    result.items.forEach(applyExistingItem);
    draft.value = result;
  } catch (cause) {
    if (isCurrent() && !active.signal.aborted) error.value = cause instanceof Error ? cause.message : 'Impossible de générer cet aperçu.';
  } finally { if (isCurrent()) loading.value = false; }
}

watch(() => route.query.wikidata, () => { profile.value = ''; void load(); }, { immediate: true });
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
    // Lecture publique facultative : son échec n'empêche pas la création, il est signalé.
    const entityQids = selected.value.filter(item => item.origin !== 'fact').map(item => item.qid);
    const wikipedia = await WikidataQueryService.getInstance().getWikipediaTitles(entityQids).catch(() => null);
    if (identity !== auth.identityVersion) return;
    const items = wikipedia ? selected.value.map(item => ({ ...item, wikipedia: wikipedia.get(item.qid) })) : selected.value;
    const result = subject.texts
      ? await StoryApiService.getInstance().createFromWikidata(subject.qid, subject.title.trim(), items, false, subject.description, acknowledged, subject.texts)
      : acknowledged.length
      ? await StoryApiService.getInstance().createFromWikidata(subject.qid, subject.title.trim(), items, false, subject.description, acknowledged)
      : await StoryApiService.getInstance().createFromWikidata(subject.qid, subject.title.trim(), items, false, subject.description);
    if (identity !== auth.identityVersion) return;
    if (!wikipedia) toast.show('Frise créée sans liens Wikipédia : les articles n’ont pas pu être lus. Ils pourront être ajoutés depuis chaque fiche.', 'info');
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
          <h1>{{ uiText("Créer une frise depuis Wikidata") }}</h1>
          <p>{{ uiText("Choisissez un sujet, vérifiez les dates et sélectionnez les éléments à conserver.") }}</p>
        </div>
      </div>
      <div class="generation-heading-actions">
        <!-- Sans frise parente, la frise reste un brouillon privé (règle 1 du guide de création). -->
        <p class="generation-visibility">{{ uiText("Privée jusqu’à son rattachement à une frise parente") }}</p>
        <Button variant="tertiary" size="sm" :to="{ name: 'timeline' }" :disabled="saving" :title="uiText('Annuler la création et revenir à l’exploration')" @click="cancelDraft">{{ uiText("Annuler") }}</Button>
        <Button v-if="savedId" size="sm" :to="{ name: 'timeline', query: { story: savedId } }">{{ uiText("Ouvrir la frise créée") }}</Button>
        <Button v-else-if="!canUseWorkspace(auth)" size="sm" :disabled="!draft" :to="{ name: 'login', query: { redirect: route.fullPath } }" @click="preserveDraft">{{ uiText("Se connecter pour enregistrer") }}</Button>
        <Button v-else-if="!auth.canCreateStories" size="sm" :disabled="!draft" variant="secondary" :to="{ name: 'profile' }" @click="preserveDraft">{{ uiText("Choisir un nom d’utilisateur pour enregistrer") }}</Button>
        <Button v-else size="sm" :disabled="!canSave" @click="save">{{ uiText(saving ? 'Enregistrement…' : 'Enregistrer la frise') }}</Button>
      </div>
    </header>
    <div class="generation-workspace">
      <aside ref="navigationPane" class="generation-navigation" :aria-label="uiText('Structure de la frise')">
        <template v-if="draft">
          <section class="generation-rules" :aria-label="uiText('Règles de génération')">
            <Select :model-value="profile" :options="profiles" :label="uiText('Famille du sujet')" :searchable="false" :disabled="loading || saving || !!savedId" @update:model-value="setProfile" />
            <Select :model-value="generationSettings.limit" :options="[{value:20,label:'20 propositions'},{value:40,label:'40 propositions'},{value:80,label:'80 propositions'}]" :label="uiText('Propositions maximum')" :searchable="false" :disabled="loading || saving || !!savedId" @update:model-value="setLimit" />
            <label><input v-model="generationSettings.approximate" type="checkbox" :disabled="loading || saving || !!savedId" @change="changeRules" />{{ uiText("Conserver les dates approximatives") }}</label>
            <label><input v-model="generationSettings.withinBounds" type="checkbox" :disabled="loading || saving || !!savedId" @change="changeRules" />{{ uiText("Vérifier les bornes du sujet") }}</label>
            <template v-if="profile === 'person'"><label><input v-model="generationSettings.biography" type="checkbox" :disabled="loading || saving || !!savedId" @change="changeRules" />{{ uiText("Événements de vie") }}</label><label><input v-model="generationSettings.works" type="checkbox" :disabled="loading || saving || !!savedId" @change="changeRules" />{{ uiText("Œuvres majeures") }}</label></template>
          </section>
          <StoryPeriodTree class="generation-tree" :story-id="draft.qid" :periods="periods" :selected-id="activeItemQid" :scroll-selected-into-view="false" @select="showItem">
            <template #actions="{ period }">
              <Tag v-if="periodWarnings(period.id).length" variant="warning" :label="uiText('À vérifier')" :title="uiText(periodWarnings(period.id).join(' '))" />
            </template>
          </StoryPeriodTree>
          <section v-if="events.length" class="generation-event-navigation" :aria-label="uiText('Événements sélectionnés')">
            <h3>{{ uiText("Événements") }} <span>{{ events.length }}</span></h3>
            <ul>
              <li v-for="event in events" :key="event.id">
                <button type="button" class="generation-event-link" :class="{ 'is-active': activeItemQid === event.id }" :aria-current="activeItemQid === event.id ? 'true' : undefined" @click="showItem(event.id)">
                  <span>{{ localizedText(event.label) }}</span><small>{{ formatSearchResultDateBound(event.date) }}</small>
                </button>
              </li>
            </ul>
          </section>
        </template>
      </aside>
      <div ref="detailPane" class="generation-details" role="region" :aria-label="uiText('Détail des éléments proposés')">
    <section v-if="!route.query.wikidata" class="generation-search" :aria-label="uiText('Choix du sujet')">
      <SearchInput v-model="query" :placeholder="uiText('Ex. Révolution française, Apollo…')" :aria-label="uiText('Rechercher un sujet Wikidata')" :disabled="saving" />
      <FeedbackState v-if="subjects.loading.value" kind="loading" :message="uiText('Recherche Wikidata…')" />
      <FeedbackState v-else-if="subjects.error.value" kind="error" :message="uiText(subjects.error.value)" retryable @retry="subjects.retry" />
      <ul v-else-if="subjects.results.value.length" class="generation-subjects">
        <li v-for="subject in subjects.results.value" :key="subject.id"><Button variant="tertiary" :disabled="saving" @click="choose(subject.id)">{{ uiText(subject.label) }}<span v-if="subject.description"> — {{ subject.description }}</span></Button></li>
      </ul>
      <p v-else-if="query.trim().length >= 2" role="status">{{ uiText("Aucun sujet trouvé.") }}</p>
    </section>
        <FeedbackState v-if="loading" kind="loading" :message="uiText('Préparation de la frise depuis Wikidata…')" />
        <FeedbackState v-else-if="error" kind="error" :message="uiText(error)" retryable @retry="load(true)" />
        <template v-else-if="draft">
          <section class="generation-context" :aria-label="uiText('Source et validation de la frise')">
            <a class="generation-source-link" :href="sourceUrl(draft.qid)" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:open-in-new" aria-hidden="true" />{{ uiText("Voir le sujet sur Wikidata") }}<span class="sr-only"> {{ uiText("(nouvel onglet)") }}</span></a>
            <div v-if="draft.warnings.length" class="generation-warnings" role="status"><p v-for="warning in draft.warnings" :key="warning"><Icon icon="mdi:information-outline" aria-hidden="true" />{{ uiText(warning) }}</p></div>
            <span v-if="checkingStories" class="sr-only" role="status">{{ uiText("Vérification des frises existantes…") }}</span>
            <div v-if="storyCheckError || existingStories.length" class="generation-existing-stories" :aria-label="uiText('Vérification des frises existantes')">
              <p v-if="storyCheckError" role="alert">{{ uiText(storyCheckError) }} <Button variant="tertiary" size="sm" @click="checkExistingStories">{{ uiText("Réessayer") }}</Button></p>
              <template v-else>
                <p role="alert"><strong>{{ uiText(existingStories.length === 1 ? 'Une frise correspondante existe déjà.' : 'Des frises correspondantes existent déjà.') }}</strong></p>
                <div class="generation-duplicate-matches"><div v-for="story in existingStories" :key="story.id" class="generation-duplicate-match"><RouterLink :to="{ name: 'database', query: { story: story.id } }">{{ uiText("Ouvrir «") }} {{ story.title }} »</RouterLink><Tag variant="error" :label="uiText(story.reason === 'subject' ? 'Même source Wikidata' : 'Même titre')" /></div></div>
                <label class="generation-duplicate-choice"><input v-model="acknowledgeExistingStories" type="checkbox" :disabled="saving || !!savedId || saveUncertain" />{{ uiText("Créer tout de même une nouvelle frise") }}</label>
              </template>
            </div>
            <p v-if="saveError" class="generation-save-feedback" role="alert">{{ uiText(saveError) }} <RouterLink :to="{ name: 'database' }">{{ uiText("Vérifier mes frises") }}</RouterLink></p>
            <p v-if="hierarchyError" class="generation-item-error" role="alert">{{ uiText(hierarchyError) }}</p>
          </section>
          <StoryDraftPreview v-model:title="draft.title" v-model:description="draft.description" class="generation-overview" :disabled="saving || !!savedId" :periods="periods" :events="events" @select-period="showItem" @select-event="showItem" />
          <section class="generation-items" :aria-label="uiText('Éléments proposés')">
            <h2>{{ draft.items.length }} {{ uiText("éléments proposés ·") }} {{ selected.length }} {{ uiText("sélectionnés") }}</h2>
            <div class="generation-status-filters" :aria-label="uiText('Filtrer les propositions')"><Button v-for="entry in statusCounts" :key="entry.value" size="sm" variant="tertiary" :pressed="statusFilter === entry.value" @click="statusFilter=entry.value">{{ uiText(entry.label) }} {{ entry.count }}</Button><Button size="sm" variant="tertiary" :pressed="statusFilter==='all'" @click="statusFilter='all'">{{ uiText("Tous") }} {{ draft.items.length }}</Button></div>
            <p v-if="selected.length > 81" class="generation-item-error" role="alert">{{ uiText("Sélectionnez au maximum 81 faits pour enregistrer la frise.") }}</p>
            <div class="generation-selection-actions">
              <Button size="sm" variant="secondary" :disabled="saving || !!savedId" @click="draft.items.forEach(item => item.selected = (item.status === undefined || item.status === 'retained') && !wikidataTimelineItemError(item))">{{ uiText("Tout sélectionner avec une date valide") }}</Button>
              <Button size="sm" variant="tertiary" :disabled="saving || !!savedId" @click="draft.items.forEach(item => item.selected = false)">{{ uiText("Tout désélectionner") }}</Button>
            </div>
            <p v-if="!draft.items.length">{{ uiText("Aucun élément daté n’a été trouvé dans les relations directes de ce sujet. Essayez un sujet plus précis.") }}</p>
            <p v-else-if="!visibleItems.length" class="generation-note">{{ uiText("Aucun élément dans ce filtre. Consultez les autres propositions ou ajustez les règles.") }}</p>
        <article v-for="item in visibleItems" :id="`generation-item-${wikidataItemKey(item)}`" :ref="el => setItemElement(wikidataItemKey(item), el)" :key="wikidataItemKey(item)" class="generation-item" :class="{ 'generation-item--selected': item.selected, 'generation-item--active': activeItemQid === wikidataItemKey(item) }">
          <div class="generation-item-heading">
            <input class="generation-item-checkbox" :id="`generation-include-${wikidataItemKey(item)}`" v-model="item.selected" type="checkbox" :disabled="saving || !!savedId || item.status === 'excluded' || (!item.selected && !!wikidataTimelineItemError(item))" :aria-label="uiText(`Inclure ${item.title}`)" />
              <div class="generation-item-title-block">
                <div class="generation-item-title"><label :for="`generation-include-${wikidataItemKey(item)}`">{{ item.title }}</label> <a :href="itemSourceUrl(item)" target="_blank" rel="noopener noreferrer">{{ item.qid }}<span class="sr-only"> {{ uiText("sur Wikidata (nouvel onglet)") }}</span></a></div>
                <p class="generation-item-dates">{{ uiText(formatSearchResultDateBound(item.startDate) || 'Date à renseigner') }}<template v-if="item.type === 'period'"> → {{ uiText(formatSearchResultDateBound(item.endDate) || 'fin inconnue') }}</template></p>
              </div>
              <div class="generation-item-status">
                <Tag v-if="item.status" :variant="item.status==='retained' ? 'success' : item.status==='review' ? 'warning' : 'neutral'" :label="uiText(item.status==='retained' ? 'Proposé' : item.status==='review' ? 'À vérifier' : 'Écarté')" />
                <InfoTooltip v-if="item.source || item.reasons?.length" :label="uiText(`Pourquoi ce fait : ${item.title}`)">
                  <div class="generation-provenance">
                    <strong>{{ uiText("Pourquoi ce fait ?") }}<template v-if="item.category"> · {{ item.category }}</template></strong>
                    <ul v-if="item.reasons?.length"><li v-for="reason in item.reasons" :key="reason">{{ uiText(reason) }}</li></ul>
                    <p v-if="item.source">{{ item.source.qid }} · {{ item.source.property }} · {{ propertyLabels[item.source.property] }}</p>
                    <p v-if="item.source">{{ item.source.references }} {{ uiText("référence") }}{{ uiText(item.source.references===1 ? '' : 's') }} {{ uiText("dans la déclaration source.") }}</p>
                    <p v-if="item.origin==='fact'">{{ uiText("Fait daté extrait d’une déclaration du sujet.") }}</p>
                  </div>
                </InfoTooltip>
              </div>
          </div>
          <details :open="openEditors.has(wikidataItemKey(item)) || !!wikidataTimelineItemError(item)" class="generation-item-editor" @toggle="($event.target as HTMLDetailsElement).open ? openEditors.add(wikidataItemKey(item)) : openEditors.delete(wikidataItemKey(item))">
            <summary><Icon class="generation-editor-chevron" icon="mdi:chevron-down" aria-hidden="true" /><span>{{ uiText("Informations") }}<span class="sr-only"> {{ uiText("de") }} {{ item.title }}</span></span></summary>
            <div class="generation-type-toggle" role="radiogroup" :aria-label="uiText(uiFormat`Type de ${item.title}`)">
              <label v-for="option in typeOptions" :key="option.value">
                <input type="radio" :name="`generation-type-${wikidataItemKey(item)}`" :value="option.value" :checked="item.type === option.value" :disabled="saving || !!savedId || isExistingItem(item)" @change="changeType(item, option.value)" />
                <span>{{ uiText(option.label) }}</span>
              </label>
            </div>
            <div class="generation-item-fields">
              <Input v-model="item.title" :label="uiText('Titre')" :maxlength="255" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
              <DateInput v-model="item.startDate" :label="uiText(item.type === 'period' ? 'Début' : 'Date')" :placeholder="uiText('Ex. 1789 ou 1789-07-14')" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
              <DateInput v-if="item.type === 'period'" :id="`generation-end-${wikidataItemKey(item)}`" v-model="item.endDate" :label="uiText('Fin')" :placeholder="uiText('Date de fin connue')" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
            </div>
            <Input v-model="item.description" :label="uiText('Description')" type="textarea" :maxlength="1000" :readonly="isExistingItem(item)" :disabled="saving || !!savedId" />
            <Select v-if="item.type === 'period'" :id="`generation-parent-${wikidataItemKey(item)}`" :model-value="item.parentQid || ''" :options="parentOptions(item)" :label="uiText('Période parente')" :hint="parentHint(item)" :disabled="saving || !!savedId" @update:model-value="changeParent(item, $event)" />
          </details>
          <div v-if="isExistingItem(item) || hierarchyWarnings(item).length || item.warning || wikidataTimelineItemError(item)" class="generation-item-feedback">
            <p v-if="isExistingItem(item)" class="generation-note"><Icon icon="mdi:information-outline" aria-hidden="true" /><span>{{ uiText("Déjà dans le catalogue · Informations en lecture seule.") }}</span></p>
            <div v-if="hierarchyWarnings(item).length" class="generation-hierarchy-warnings"><p v-for="warning in hierarchyWarnings(item)" :key="warning"><Tag :label="uiText('À vérifier')" variant="warning" /><span>{{ uiText(warning) }}</span></p></div>
            <p v-if="item.warning" class="generation-note"><Icon icon="mdi:information-outline" aria-hidden="true" /><span>{{ item.warning }}</span></p>
            <p v-if="wikidataTimelineItemError(item)" class="generation-item-error"><Tag :label="uiText('Erreur')" variant="error" /><span>{{ uiText(wikidataTimelineItemError(item)) }}</span></p>
          </div>
        </article>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.generation-rules { display:flex; flex-direction:column; gap:var(--spacing-md); padding:var(--spacing-lg); border-bottom:1px solid var(--color-border-default); }
.generation-rules label { display:flex; align-items:flex-start; gap:var(--spacing-sm); font:var(--type-meta); }
.generation-rules input { accent-color:var(--color-primary); margin-top:3px; }
.generation-status-filters { display:flex; flex-wrap:wrap; gap:var(--spacing-sm); margin-block:var(--spacing-md); }
.generation-warnings { display:flex; flex-direction:column; gap:var(--spacing-sm); }
.generation-warnings p { display:flex; align-items:flex-start; gap:var(--spacing-sm); margin:0; font:var(--type-meta); color:var(--color-text-secondary); }
.generation-warnings svg { width:16px; height:16px; flex-shrink:0; }
.generation-provenance { display:flex; flex-direction:column; gap:var(--spacing-sm); }
.generation-provenance ul { display:flex; flex-direction:column; gap:var(--spacing-xs); margin:0; padding:0; list-style:none; }
.generation-provenance p { margin:0; }
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
.generation-item-heading { display:grid; grid-template-columns:16px minmax(0, 1fr) auto; column-gap:var(--spacing-sm); align-items:start; }
.generation-item-status { display:flex; align-items:center; gap:var(--spacing-xs); }
.generation-item-title-block { display:flex; flex-direction:column; gap:0; min-width:0; }
.generation-item-title { font-weight:var(--font-weight-semibold); overflow-wrap:anywhere; }
.generation-item-title a { margin-left:var(--spacing-xs); font:var(--type-meta); color:var(--color-text-link); white-space:nowrap; }
.generation-item-checkbox { accent-color:var(--color-primary); width:16px; height:16px; margin:3px 0 0; }
.generation-item-dates { font:var(--type-meta); color:var(--color-text-secondary); }
.generation-item-fields { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: var(--spacing-md); }
.generation-selection-actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.generation-visibility { margin: 0; max-width: 16rem; font: var(--type-compact); color: var(--color-text-secondary); }
.generation-type-toggle, .generation-segmented { display: flex; width: fit-content; padding: var(--spacing-xs); gap: var(--spacing-xs); border-radius: var(--radius-lg); background: var(--color-background-default); }
:is(.generation-type-toggle, .generation-segmented) label { position: relative; display: flex; }
:is(.generation-type-toggle, .generation-segmented) input { position: absolute; width: 1px; height: 1px; opacity: 0; }
:is(.generation-type-toggle, .generation-segmented) span { display: block; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); font: var(--type-compact); color: var(--color-text-secondary); cursor: pointer; }
:is(.generation-type-toggle, .generation-segmented) input:checked + span { color: var(--color-text-link); background: var(--color-surface-default); }
:is(.generation-type-toggle, .generation-segmented) input:focus-visible + span { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
:is(.generation-type-toggle, .generation-segmented) input:disabled + span { opacity: .5; cursor: not-allowed; }
.generation-visibility { height: var(--field-height-md); box-sizing: border-box; padding: 2px; gap: 2px; border-radius: var(--radius-md); }
.generation-visibility span { display: flex; align-items: center; height: 100%; padding: 0 var(--spacing-md); box-sizing: border-box; }
.generation-item-editor { padding-top:var(--spacing-md); border-top:1px solid var(--color-border-default); }
.generation-item-editor summary { display: flex; align-items: center; gap: var(--spacing-xs); min-height: var(--field-height-sm); list-style: none; cursor: pointer; color: var(--color-text-secondary); }
.generation-item-editor summary::-webkit-details-marker { display: none; }
.generation-item-editor summary:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; border-radius: var(--radius-sm); }
.generation-editor-chevron { flex-shrink: 0; width: 20px; height: 20px; }
.generation-item-editor[open] > summary .generation-editor-chevron { transform: rotate(180deg); }
.generation-item-editor[open] > :not(summary) { margin-top: var(--spacing-md); }
.generation-item-heading a { flex-shrink: 0; }
.generation-search :deep(.base-button__text) { white-space: normal; text-align: left; }
.generation-item-error { color: var(--color-status-error-foreground); }
.generation-item p { margin: 0; }
.generation-items h2 { font-size: var(--font-size-lg); margin: 0; }
.generation-item-feedback { display: flex; flex-direction: column; gap: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-default); font: var(--type-compact); }
.generation-item-feedback p { display: flex; align-items: flex-start; gap: var(--spacing-sm); }
.generation-item-feedback .generation-item-error, .generation-hierarchy-warnings p { align-items:baseline; }
.generation-item-feedback .generation-note { display:grid; grid-template-columns:18px minmax(0, 1fr); align-items:start; }
.generation-item-feedback .generation-note > svg { display:block; width:18px; height:18px; margin-top:calc((1lh - 18px) / 2); }
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
