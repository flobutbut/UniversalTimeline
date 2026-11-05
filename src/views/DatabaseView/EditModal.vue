<template>
  <ModalShell :title="modalTitle" height="auto" :busy="loading" @close="closeModal">
    <FeedbackState kind="error" layout="inline" v-if="error" role="alert" >{{ error }}</FeedbackState>
    <FeedbackState kind="error" layout="inline" v-if="editState.categoriesError"  role="alert">
      {{ editState.categoriesError }} <Button variant="tertiary" size="sm" type="button" :disabled="loading || editState.categoriesLoading" @click="loadCategories">Réessayer</Button>
    </FeedbackState>
    <template
      v-if="mode === 'create' && !convertFrom && (type === 'period' || type === 'event')"
      #header-bottom
    >
      <div
        class="edit-modal__wikidata-header"
        ref="wikidataSearchWrapRef"
        @focusin="wikidataPanelOpen = true"
        @focusout="onWikidataSearchFocusOut"
        @keydown.esc="onWikidataEscape"
      >
        <SearchInput
          ref="wikidataSearchInputRef"
          v-model="wikidataSearchQuery"
          :placeholder="wikidataSearchPlaceholder"
          autocomplete="off"
          :disabled="loading || wikidataApplyLoading"
          :aria-label="creationSearchLabel"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="wikidataOptionsVisible"
          :aria-controls="wikidataOptionsVisible ? wikidataListId : undefined"
          :aria-activedescendant="wikidataActiveId"
          @keydown.down.prevent="moveWikidataSuggestion(1)"
          @keydown.up.prevent="moveWikidataSuggestion(-1)"
          @keydown.enter.prevent="confirmWikidataSuggestion"
        />
        <span v-if="creationSearchLoading" class="edit-modal__wikidata-loading" aria-hidden="true">⏳</span>
        <div
          v-if="wikidataDropdownVisible"
          ref="wikidataDropdownRef"
          class="edit-modal-wd-dd"
          @keydown.esc="onWikidataEscape"
          @focusout="onWikidataSearchFocusOut"
        >
          <template v-if="creationSearchLoading">
            <div class="edit-modal-wd-dd__status" role="status">Recherche en cours…</div>
          </template>
          <div v-if="keywordErrorVisible" class="edit-modal-wd-dd__status" role="alert">
            {{ wikidataSearchError }}
            <Button variant="tertiary" size="sm" type="button" @mousedown.prevent @click="retryWikidataSuggestions">Réessayer la recherche</Button>
          </div>
          <div v-if="existingSearch.error.value" class="edit-modal-wd-dd__status" role="alert">
            {{ existingSearch.error.value }} <button type="button" @mousedown.prevent @click="existingSearch.retry">{{ type === 'period' ? 'Réessayer les périodes existantes' : 'Réessayer les événements existants' }}</button>
          </div>
          <div v-if="meaningSearch.error.value" class="edit-modal-wd-dd__status" role="alert">
            {{ meaningSearch.error.value }} <Button variant="tertiary" size="sm" type="button" @mousedown.prevent @click="meaningSearch.retry">Réessayer la recherche par sens</Button>
          </div>
          <template v-if="!meaningSearch.error.value && !creationSearchLoading && !keywordErrorVisible && !existingSearch.error.value && !creationSearchHits.length">
            <div class="edit-modal-wd-dd__status" role="status">Aucun résultat</div>
          </template>
          <div v-if="creationSearchHits.length" :id="wikidataListId" role="listbox" :aria-label="creationResultsLabel">
            <button
              v-for="(h, index) in creationSearchHits"
              :key="`${h.source}:${h.id}`"
              :id="wikidataOptionId(index)"
              type="button"
              role="option"
              tabindex="-1"
              :aria-selected="wikidataCursor === index"
              class="edit-modal-wd-dd__item"
              :class="{ 'edit-modal-wd-dd__item--active': wikidataCursor === index }"
              :disabled="loading || wikidataApplyLoading"
              @mousedown.prevent
              @click="onPickWikidataSearchHit(h)"
            >
              <span class="edit-modal-wd-dd__title">{{ h.label }}</span>
              <span class="edit-modal-wd-dd__id">{{ h.source === 'local' ? existingEntityLabel : `Wikidata${h.searchOrigin === 'semantic' ? ' · Recherche par sens' : ''} · ${h.id}` }}</span>
              <span v-if="h.dateLabel" class="edit-modal-wd-dd__date">{{ h.dateLabel }}</span>
              <span v-if="h.description" class="edit-modal-wd-dd__desc">{{ h.description }}</span>
            </button>
          </div>
          <span class="sr-only" role="status">{{ wikidataOptionsVisible ? `${creationSearchHits.length} résultats. Utilisez les flèches puis Entrée pour choisir.` : '' }}</span>
        </div>
      </div>
    </template>

    <FeedbackState kind="error" layout="inline" v-if="wikidataImportError"  role="alert">
      {{ wikidataImportError }}
      <Button variant="tertiary" size="sm" type="button" :disabled="loading || wikidataApplyLoading" @click="retryWikidataImport">Réessayer l’import</Button>
    </FeedbackState>
    <p v-if="convertFrom" class="edit-modal__existing-notice">{{ conversionNotice }}</p>
    <p v-if="existingQidNotice" class="edit-modal__existing-notice" role="status">{{ existingQidNotice }}</p>
    <p v-if="wikidataApplyLoading" role="status">Chargement depuis Wikidata…</p>
    <p v-else-if="wikidataNotice" role="status">
      {{ wikidataNotice }}
      <Button variant="tertiary" size="sm" v-if="wikidataRetryAvailable" type="button" :disabled="loading || wikidataApplyLoading" @click="retryWikidataImport">Réessayer les compléments</Button>
    </p>
    <FeedbackState v-if="editState.loading" kind="loading" message="Chargement des données…" />
    <FeedbackState kind="error" layout="inline" v-else-if="editState.error" >
      <Icon icon="mdi:alert-circle" />
      <span>{{ editState.error }}</span>
      <Button variant="secondary" @click="closeModal">Fermer</Button>
    </FeedbackState>
    <div v-else-if="selectedExistingEntity" class="edit-modal__existing-entity">
      <p>{{ existingEntityLabel }}</p>
      <h3>{{ selectedExistingEntity.label }}</h3>
      <p v-if="selectedExistingEntity.dateLabel" class="edit-modal__existing-date">{{ selectedExistingEntity.dateLabel }}</p>
      <p v-if="selectedExistingEntity.description">{{ selectedExistingEntity.description }}</p>
      <Button variant="tertiary" size="sm" :disabled="loading" @click="selectedExistingEntity = null">{{ type === 'period' ? 'Créer une nouvelle période' : 'Créer un nouvel événement' }}</Button>
    </div>
    <form v-else ref="formEl" @submit.prevent="handleSubmit" class="modal-form">
      <fieldset class="form-content" :disabled="loading">
        <div class="form-row" v-if="type !== 'story'">
          <div class="form-group">
            <Input
              v-if="!form.sourceKey?.startsWith('fact:')"
              v-model="form.qid"
              label="Q-id Wikidata"
              placeholder="Q12345"
              :error="editState.qidError || fieldError('qid')"
              @blur="touch('qid'); validateQid()"
            />
            <p v-else class="generation-source-note">Fait daté issu d’une déclaration Wikidata. Son identité est conservée lors des modifications.</p>
            <Button
              v-if="canOfferExisting && editState.qidExistsInBase && editState.existingItem"
              class="edit-modal__use-existing"
              variant="secondary"
              size="sm"
              type="button"
              :disabled="loading"
              @click="offerExisting(editState.existingItem)"
            >
              {{ type === 'period' ? 'Utiliser la période existante' : 'Utiliser l’événement existant' }}
            </Button>
          </div>
          <div class="form-group">
            <BaseSelect
              v-model="form.categories"
              :error="fieldError('categories')"
              :options="editState.categories.map(cat => ({ value: cat.id, label: cat.label }))"
              label="Catégories"
              placeholder="Sélectionner des catégories"
              :multiple="true"
              :loading="editState.categoriesLoading"
              :disabled="loading || editState.categoriesLoading"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <Input
              v-model="form.title.fr"
              label="Titre (Français)"
              placeholder="Titre en français"
              :error="fieldError('title.fr')"
              @blur="touch('title.fr')"
              required
            />
          </div>
          <div class="form-group">
            <Input
              v-model="form.title.en"
              label="Titre (Anglais)"
              placeholder="Title in English"
              :error="fieldError('title.en')"
              @blur="touch('title.en')"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <Input
              v-model="form.description.fr"
              label="Description (Français)"
              placeholder="Description en français"
              :error="fieldError('description.fr')"
              @blur="touch('description.fr')"
              type="textarea"
            />
          </div>
          <div class="form-group">
            <Input
              v-model="form.description.en"
              label="Description (Anglais)"
              placeholder="Description in English"
              :error="fieldError('description.en')"
              @blur="touch('description.en')"
              type="textarea"
            />
          </div>
        </div>

        <div class="form-row" v-if="type === 'period'">
          <div class="form-group">
            <DateInput
              v-model="form.startDate"
              :disabled="loading"
              label="Date de début"
              placeholder="G4.6 · M65 · K11.7 · A230 · 1944-06-06T14:32"
              required
              :error="fieldError('startDate')"
              @blur="touch('startDate')"
            />
            <span class="date-preview">{{ displayStart }}</span>
          </div>
          <div class="form-group">
            <DateInput
              v-model="form.endDate"
              :disabled="loading"
              label="Date de fin (vide = aujourd'hui)"
              placeholder="G4.6 · M65 · K11.7 · A230 · 1944-06-06T14:32 · NOW"
              :error="fieldError('endDate')"
              @blur="touch('endDate')"
            />
            <span class="date-preview">{{ displayEnd }}</span>
          </div>
        </div>

        <div class="form-row" v-if="type === 'event'">
          <div class="form-group full-width">
            <DateInput
              v-model="form.date"
              :disabled="loading"
              label="Date"
              placeholder="G4.6 · M65 · K11.7 · A230 · 1944-06-06T14:32"
              required
              :error="fieldError('date')"
              @blur="touch('date')"
            />
            <span class="date-preview">{{ displayEvent }}</span>
          </div>
        </div>

        <div class="form-row" v-if="type === 'period'">
          <div class="form-group">
            <Input
              v-model="form.location"
              label="Temporal location"
              placeholder="Ex: Europe, France, Paris..."
              disabled
              hint="Information issue de Wikidata, non enregistrée."
            />
          </div>
        </div>

        <div class="form-row" v-if="type === 'event'">
          <div class="form-group full-width">
            <Input
              v-model="form.location"
              label="Temporal location"
              placeholder="Ex: Europe, France, Paris..."
              disabled
              hint="Information issue de Wikidata, non enregistrée."
            />
          </div>
        </div>

        <div class="form-row" v-if="isStoryCreation">
          <div class="form-group full-width">
            <StoryPlacementFields v-model="storyPlacement" :candidates="storyParentCandidates ?? []" :disabled="loading" />
          </div>
        </div>

        <div class="form-row" v-if="type === 'story'">
          <div class="form-group">
            <div class="switch-group">
              <Switch v-model="form.isPublic" label="Mode public" label-first :disabled="publicLocked" />
            </div>
            <p v-if="publicLocked" class="edit-modal__parent-hint">Une frise sans frise parente reste privée.</p>
          </div>
        </div>

        <div class="form-row" v-if="type === 'story'">
          <div class="form-group full-width">
            <BaseSelect
              v-model="form.categories"
              :error="fieldError('categories')"
              :options="editState.categories.map(cat => ({ value: cat.id, label: cat.label }))"
              label="Catégories"
              placeholder="Sélectionner des catégories"
              :multiple="true"
              :loading="editState.categoriesLoading"
              :disabled="loading || editState.categoriesLoading"
            />
          </div>
        </div>
      </fieldset>
    </form>
    <!-- Contenu propre à l'appelant, enregistré hors du formulaire (ex. frises d'un événement). -->
    <slot name="after-form" />

    <!-- Footer gauche : actions secondaires -->
    <template #footer-left>
      <Button
        v-if="mode === 'edit'"
        variant="danger"
        type="button"
        :disabled="loading || wikidataApplyLoading"
        @click="handleDelete"
      >
        Supprimer
      </Button>
      <Button
        v-if="!selectedExistingEntity && form.qid && type !== 'story'"
        variant="secondary"
        :disabled="loading || !form.qid || wikidataImportLoading"
        @click="handleFooterWikidataImport"
      >
        <template #icon><Icon icon="mdi:database" /></template>
        <span v-if="wikidataImportLoading">Chargement...</span>
        <span v-else>Remplir avec Wikidata</span>
      </Button>
      <span v-if="type === 'period' && !selectedExistingEntity && !convertFrom" class="children-count">
        <template v-if="editState.directChildrenCount !== null">{{ editState.directChildrenCount }} sous-périodes</template>
        <template v-else>{{ data?.hasChildren ? 'Contient des sous-périodes' : 'Nombre de sous-périodes inconnu' }}</template>
      </span>
    </template>

    <!-- Footer droit : validation -->
    <template #footer-right>
      <Button
        variant="primary"
        type="button"
        :disabled="loading || wikidataApplyLoading || (isStoryCreation && !storyPlacement.complete) || (!selectedExistingEntity && (!editState.isValid || !!editState.qidError || editState.categoriesLoading || !!editState.categoriesError))"
        @click="handleSubmit"
      >
        {{ selectedExistingEntity ? 'Ajouter à la frise' : mode === 'edit' ? 'Mettre à jour' : convertFrom ? 'Convertir' : 'Créer' }}
      </Button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import FeedbackState from '@/components/base/FeedbackState.vue';
import { watch, ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import type { EditInitialData, EditFormSubmission, StoryPlacementDraft } from '@/types/editForm';
import type { StorySummary } from '@/types/database';
import StoryPlacementFields from './StoryPlacementFields.vue';
import { Icon } from '@iconify/vue';
import { useEditModal } from '@/composables/useEditModal';
import { validateEntityQid } from '@/services/validateEntityQid';
import { useToast } from '@/composables/useToast';
import { useWikidataForm } from '@/composables/useWikidataForm';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { useSuggestionNavigation } from '@/composables/useSuggestionNavigation';
import { DateService } from '@/services/DateService';
import { formatSearchResultDateBound } from '@/lib/formatTemporalBoundLabel';
import { SearchApiService, type WikidataEntityLabelHit } from '@/services/SearchApiService';
import { useMeaningSearch } from '@/composables/useMeaningSearch';
import { creationSearchScore, type SearchTimeBounds } from '@/lib/creationSearchRanking';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import ModalShell from '@/components/base/ModalShell.vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import DateInput from '@/components/base/DateInput.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import Switch from '@/components/base/Switch.vue';
import BaseSelect from '@/components/base/Select.vue';

const props = defineProps<{
  isOpen: boolean;
  type: 'period' | 'event' | 'story';
  mode: 'create' | 'edit';
  data?: EditInitialData | null;
  loading?: boolean;
  error?: string | null;
  allowExistingPeriods?: boolean;
  allowExistingEvents?: boolean;
  excludedPeriodIds?: string[];
  excludedEventIds?: string[];
  searchBounds?: SearchTimeBounds | null;
  /** Création qui remplace partout une fiche de l'autre type (conversion période ↔ événement). */
  convertFrom?: 'period' | 'event';
  /** Création d’une frise : frises modifiables proposées comme parente. */
  storyParentCandidates?: StorySummary[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', data: EditFormSubmission): void;
  (e: 'delete'): void;
  (e: 'select-period', id: string): void;
  (e: 'select-event', id: string): void;
}>();

const modalTitle = computed(() => {
  if (props.convertFrom) return props.type === 'event' ? 'Convertir en événement' : 'Convertir en période';
  const action = props.mode === 'edit' ? 'Modifier' : 'Créer';
  const subject = props.type === 'period' ? 'une période'
                : props.type === 'event'  ? 'un événement'
                : 'une frise';
  return `${action} ${subject}`;
});

const conversionNotice = computed(() => props.convertFrom === 'period'
  ? 'La période sera remplacée par cet événement dans toutes les frises qui l’utilisent, puis supprimée du catalogue. Sa durée et son classement en sous-période ne sont pas conservés.'
  : 'L’événement sera remplacé par cette période, à la racine de chaque frise qui l’utilise, puis supprimé du catalogue. Son importance n’est pas conservée.');

// Initialisation des composables
const { form, state: editState, validation, resetForm, updateForm, prepareSubmitData, loadCategories, setQidError, setQidExists, setChildrenCount } = useEditModal(() => props.type, () => props.mode, props.data);
const touched = reactive(new Set<string>());
const submitted = ref(false);
const touch = (field: string) => { touched.add(field); };
const fieldError = (field: string) => props.mode === 'edit' || touched.has(field) || submitted.value ? validation.value.fields[field] || '' : '';
const toast = useToast();
const wikidataForm = useWikidataForm({
  form,
  context: () => ({ open: props.isOpen, mode: props.mode, type: props.type, data: props.data, busy: props.loading }),
  categoryIds: () => new Set(editState.categories.map(category => category.id)),
  onChildrenCount: count => setChildrenCount(count === null ? null : String(count)),
  onImported: () => { Object.keys(validation.value.fields).forEach(touch); void validateQid(); },
});
const {
  query: wikidataSearchQuery, loading: wikidataApplyLoading, error: wikidataImportError, notice: wikidataNotice, retryAvailable: wikidataRetryAvailable,
  importCurrent: handleFooterWikidataImport, retry: retryWikidataImport,
} = wikidataForm;
const {
  results: wikidataSuggestHits, loading: wikidataSearchLoading, error: wikidataSearchError, retry: retryWikidataSearch,
} = wikidataForm.search;
const wikidataImportLoading = wikidataApplyLoading;
type CreationSearchHit = WikidataEntityLabelHit & { source: 'local' | 'wikidata'; semanticRank?: number; dateLabel?: string };
const allowExistingSelection = computed(() => props.type === 'period' ? !!props.allowExistingPeriods : props.type === 'event' && !!props.allowExistingEvents);
const existingEntityLabel = computed(() => props.type === 'period' ? 'Période existante' : 'Événement existant');
const creationSearchLabel = computed(() => allowExistingSelection.value ? props.type === 'period' ? 'Rechercher une période' : 'Rechercher un événement' : 'Recherche Wikidata');
const creationResultsLabel = computed(() => !allowExistingSelection.value ? 'Résultats Wikidata' : props.type === 'period' ? 'Périodes existantes et Wikidata' : 'Événements existants et Wikidata');
const selectedExistingEntity = ref<CreationSearchHit | null>(null);
const existingSearch = useDebouncedSearch(() => wikidataSearchQuery.value,
  (query, signal) => SearchApiService.getInstance().searchLocal(query, { ...(props.type === 'period' ? { onlyPeriods: true } : { onlyEvents: true }), signal }),
  { enabled: () => allowExistingSelection.value && props.mode === 'create' && props.isOpen && !props.loading && !wikidataApplyLoading.value, criteria: () => props.type });
const meaningSearch = useMeaningSearch(() => wikidataSearchQuery.value, () => ({
  enabled: props.isOpen && props.mode === 'create' && props.type !== 'story' && !props.loading && !wikidataApplyLoading.value,
  type: props.type === 'event' ? 'event' : 'period', keywordLoading: wikidataSearchLoading.value, keywordCount: wikidataSuggestHits.value.length, resolveLocal: allowExistingSelection.value,
}));
const keywordErrorVisible = computed(() => !!wikidataSearchError.value && !meaningSearch.results.value.length);
const creationSearchLoading = computed(() => wikidataSearchLoading.value || existingSearch.loading.value || meaningSearch.loading.value);
/** Date courte d'un résultat Wikidata : point, intervalle ou borne connue. */
function searchHitDateLabel(hit: { startDate?: string; endDate?: string }) {
  const start = formatSearchResultDateBound(hit.startDate); const end = formatSearchResultDateBound(hit.endDate);
  return start && end && start !== end ? `${start} → ${end}` : start || end;
}
const creationSearchHits = computed<CreationSearchHit[]>(() => {
  const semantic = meaningSearch.results.value;
  const ranks = new Map(semantic.map((hit, index) => [hit.id, index]));
  const locals = new Map([...existingSearch.results.value, ...semantic.flatMap(hit => hit.localMatch ? [hit.localMatch] : [])].filter(hit => hit.type === props.type).map(hit => [hit.id, hit]));
  const existingQids = new Set([...locals.values()].flatMap(hit => hit.wikidataId ? [hit.wikidataId] : []));
  const excluded = new Set((props.type === 'period' ? props.excludedPeriodIds : props.excludedEventIds) ?? []);
  const local: CreationSearchHit[] = [...locals.values()].filter(hit => !excluded.has(hit.id)).map(hit => ({ id: hit.id, label: hit.label.fr || hit.label.en, description: hit.description, dateLabel: hit.dateLabel, startDate: hit.startDate || hit.date, endDate: hit.endDate, source: 'local', semanticRank: hit.wikidataId ? ranks.get(hit.wikidataId) : undefined }));
  const remote = new Map([...wikidataSuggestHits.value, ...semantic].map(hit => [hit.id, hit]));
  const combined = [...local, ...[...remote.values()].filter(hit => !existingQids.has(hit.id)).map(hit => ({ ...hit, source: 'wikidata' as const, semanticRank: ranks.get(hit.id), dateLabel: searchHitDateLabel(hit) }))];
  return combined.map((hit, index) => ({ hit, index, score: creationSearchScore(wikidataSearchQuery.value, hit, props.searchBounds) }))
    .sort((a,b) => b.score-a.score || a.index-b.index).map(row => row.hit);
});

const wikidataSearchWrapRef = ref<HTMLElement | null>(null);
const wikidataSearchInputRef = ref<{ focus: () => void } | null>(null);
const wikidataDropdownRef = ref<HTMLElement | null>(null);
const wikidataPanelOpen = ref(false);
let wikidataFocusOutTimer: ReturnType<typeof setTimeout> | undefined;

const wikidataEntityImportType = computed<'period' | 'event' | null>(() =>
  props.type === 'period' || props.type === 'event' ? props.type : null,
);

const wikidataSearchPlaceholder = computed(() =>
  allowExistingSelection.value ? props.type === 'period' ? 'Rechercher une période existante ou sur Wikidata…' : 'Rechercher un événement existant ou sur Wikidata…' : props.type === 'event'
    ? 'Ex. Révolution française, Apollo 11, Q12345…'
    : 'Ex. Jurassique, Phanérozoïque, Q12345…',
);

const wikidataDropdownVisible = computed(
  () =>
    props.isOpen && !props.loading && !wikidataApplyLoading.value &&
    props.mode === 'create' &&
    wikidataEntityImportType.value != null &&
    wikidataPanelOpen.value &&
    wikidataSearchQuery.value.trim().length >= 2,
);

const wikidataOptionsVisible = computed(() => wikidataDropdownVisible.value && creationSearchHits.value.length > 0);
const {
  listId: wikidataListId, optionId: wikidataOptionId, cursor: wikidataCursor,
  activeId: wikidataActiveId, move: moveWikidataSuggestion, current: currentWikidataSuggestion,
} = useSuggestionNavigation(() => creationSearchHits.value, () => wikidataOptionsVisible.value);

function confirmWikidataSuggestion() {
  const hit = currentWikidataSuggestion();
  if (hit) void onPickWikidataSearchHit(hit);
}
function retryWikidataSuggestions() {
  wikidataSearchInputRef.value?.focus();
  return retryWikidataSearch();
}

function onWikidataEscape(event: KeyboardEvent) {
  if (!wikidataDropdownVisible.value) return;
  event.preventDefault(); event.stopPropagation();
  wikidataSearchInputRef.value?.focus();
  wikidataPanelOpen.value = false;
}

function onWikidataSearchFocusOut(e: FocusEvent) {
  const rt = e.relatedTarget as Node | null;
  if (rt && (wikidataSearchWrapRef.value?.contains(rt) || wikidataDropdownRef.value?.contains(rt))) return;
  clearTimeout(wikidataFocusOutTimer);
  wikidataFocusOutTimer = setTimeout(() => {
    const ae = document.activeElement;
    if (wikidataSearchWrapRef.value?.contains(ae) || wikidataDropdownRef.value?.contains(ae)) return;
    wikidataPanelOpen.value = false;
  }, 150);
}

function onDocMouseDownWikidata(e: MouseEvent) {
  if (props.mode !== 'create' || wikidataEntityImportType.value == null) return;
  const t = e.target as Node;
  if (wikidataSearchWrapRef.value?.contains(t)) return;
  if (wikidataDropdownRef.value?.contains(t)) return;
  wikidataPanelOpen.value = false;
}

// Derived previews also clear when a field is erased; they never rewrite the draft.
const preview = (raw: string) => raw.trim() ? DateService.format(DateService.parse(raw)) : '';
const displayStart = computed(() => preview(form.startDate));
const displayEnd = computed(() => preview(form.endDate));
const displayEvent = computed(() => preview(form.date));

// Validation du Q-id
const qidRequests = useLatestRequest();
watch(() => form.qid, () => { setQidError(''); setQidExists(false); });
watch([() => form.qid, () => props.type, () => props.data, () => props.mode, () => props.isOpen], qidRequests.cancel, { flush: 'sync' });
const validateQid = async () => {
  if (form.sourceKey?.startsWith('fact:') && !form.qid) { setQidError(''); return; }
  if (props.type === 'story') return;
  const isCurrent = qidRequests.begin();
  const validation = await validateEntityQid(form.qid.trim().toUpperCase(), props.type, props.mode === 'edit' ? props.data?.id : undefined);
  if (!isCurrent()) return;
  setQidError(validation.error);
  setQidExists(validation.exists, validation.item);
};

// Gestion de la soumission du formulaire
const isStoryCreation = computed(() => props.type === 'story' && props.mode === 'create');
const storyPlacement = ref<StoryPlacementDraft>({ parentStoryId: null, anchorPeriodId: null, complete: true });
/** Règle 1 : une frise sans parente est un brouillon privé. */
const publicLocked = computed(() => isStoryCreation.value && !storyPlacement.value.parentStoryId);
watch(publicLocked, locked => { if (locked) form.isPublic = false; }, { immediate: true });
const handleSubmit = () => {
  if (props.loading || wikidataApplyLoading.value) return;
  if (isStoryCreation.value && !storyPlacement.value.complete) return;
  if (selectedExistingEntity.value) {
    if (props.type === 'period') emit('select-period', selectedExistingEntity.value.id);
    else if (props.type === 'event') emit('select-event', selectedExistingEntity.value.id);
    return;
  }
  if (editState.categoriesLoading || editState.categoriesError) return;
  submitted.value = true;
  if (!validation.value.isValid || editState.qidError) return;
  try {
    const formData = prepareSubmitData();
    const { parentStoryId, anchorPeriodId } = storyPlacement.value;
    emit('submit', isStoryCreation.value && parentStoryId ? { ...formData, storyPlacement: { parentStoryId, anchorPeriodId } } : formData);
  } catch (error: unknown) {
    console.error('[EditModal] Erreur lors de la préparation des données:', error);
    toast.show('Erreur lors de la préparation des données', 'error');
  }
};

const handleDelete = () => {
  if (props.loading || wikidataApplyLoading.value) return;
  emit('delete');
};

/** Message affiché quand l'élément Wikidata choisi est déjà dans la frise. */
const existingQidNotice = ref('');
const canOfferExisting = computed(() => allowExistingSelection.value && props.mode === 'create');
/** Remplace la création par l'ajout de l'élément déjà en base, sauf s'il est déjà dans la frise. */
function offerExisting(item: EditInitialData) {
  const id = String(item.id ?? '');
  if (!id) return;
  const excluded = new Set((props.type === 'period' ? props.excludedPeriodIds : props.excludedEventIds) ?? []);
  if (excluded.has(id)) {
    existingQidNotice.value = props.type === 'period' ? 'Cette période est déjà dans la frise.' : 'Cet événement est déjà dans la frise.';
    return;
  }
  const label = item.label?.fr || item.label?.en || id;
  const dateLabel = props.type === 'event'
    ? preview(item.date ?? '')
    : [preview(item.startDate ?? ''), preview(item.endDate ?? '')].filter(Boolean).join(' → ');
  const description = item.description?.fr || item.description?.en || undefined;
  existingQidNotice.value = '';
  selectedExistingEntity.value = { id, label, description, dateLabel, source: 'local' };
  wikidataSearchQuery.value = '';
}

async function onPickWikidataSearchHit(hit: CreationSearchHit) {
  wikidataPanelOpen.value = false;
  existingQidNotice.value = '';
  if (hit.source === 'local') { selectedExistingEntity.value = hit; wikidataSearchQuery.value = ''; return; }
  selectedExistingEntity.value = null;
  // Un résultat Wikidata peut correspondre à un élément déjà en base sous un autre libellé.
  if (canOfferExisting.value && props.type !== 'story') {
    const isCurrent = qidRequests.begin();
    const found = await validateEntityQid(hit.id, props.type);
    if (!isCurrent()) return;
    if (found.exists && found.item) { offerExisting(found.item as EditInitialData); return; }
  }
  return wikidataForm.pick(hit);
}

const closeModal = () => {
  if (props.loading) return;
  wikidataForm.cancel();
  emit('close');
};

// Watchers
watch(() => [props.data, props.mode, props.type], () => {
  selectedExistingEntity.value = null;
  touched.clear(); submitted.value = false;
  if (props.data) updateForm(props.data); else resetForm();
}, { immediate: true });

watch(() => props.isOpen, (open) => {
  if (!open) {
    selectedExistingEntity.value = null;
    wikidataSearchQuery.value = '';
    wikidataSuggestHits.value = [];
    wikidataPanelOpen.value = false;
  }
});

watch(
  () => [props.mode, props.type] as const,
  () => {
    wikidataSearchQuery.value = '';
    wikidataSuggestHits.value = [];
    wikidataPanelOpen.value = false;
  },
);

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDownWikidata);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMouseDownWikidata);
  clearTimeout(wikidataFocusOutTimer);
});
</script>

<style scoped>
.modal-form {
  width: 100%;
}

.form-content {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
  width: 100%;
}

.form-group {
  flex: 1;
  min-width: 0;
}

.form-group.full-width {
  flex: 1 1 100%;
}

.form-group label {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-primary);
}

.form-group input,
.form-group textarea {
  background: var(--color-surface-default);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  font-size: var(--font-size-base);
  width: 100%;
  transition: border-color var(--transition-fast);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group textarea {
  min-height: calc(var(--spacing-sm) * 15);
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
  padding: var(--spacing-md);
  white-space: pre-wrap;
  word-wrap: break-word;
  vertical-align: top;
  text-align: left;
  display: block;
  box-sizing: border-box;
}

.form-group input {
  height: calc(var(--spacing-sm) * 5);
  line-height: calc(var(--spacing-sm) * 5);
  padding: 0 var(--spacing-sm);
  box-sizing: border-box;
  display: block;
}

.children-count {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-left: var(--spacing-sm);
}

.switch-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: calc(var(--spacing-2xl) + var(--spacing-md) / 2) 0 var(--spacing-sm) 0;
  min-height: 44px;
}

.date-preview {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.9em;
  color: var(--color-text-secondary);
  font-style: italic;
  min-height: 1.2em;
}

.edit-modal__wikidata-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  width: 100%;
  min-width: 0;
}

.edit-modal__wikidata-header :deep(.search-input-wrap) {
  flex: 1;
  min-width: 0;
  max-width: 100%;
}

.edit-modal__existing-entity { padding: var(--spacing-md) 0; }
.edit-modal__existing-entity h3 { margin-block: var(--spacing-sm) 0; }
.edit-modal__existing-date { margin: 0 0 var(--spacing-sm); font-variant-numeric: tabular-nums; }
.edit-modal__use-existing { margin-top: var(--spacing-xs); }
.edit-modal__existing-notice { margin: 0 0 var(--spacing-sm); color: var(--color-text-secondary); font-size: var(--font-size-sm); }

.edit-modal__parent-hint {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.edit-modal__wikidata-loading {
  flex-shrink: 0;
  font-size: var(--font-size-lg);
  opacity: 0.7;
}
@media (max-width: 640px) {
  .form-row { flex-direction: column; }
  .edit-modal__wikidata-header { width: 100%; }
}
</style>

<style>
/* Keep the suggestions in the dialog's DOM and accessibility scope. */
.edit-modal-wd-dd {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: max(100%, min(320px, calc(100vw - 48px)));
  z-index: var(--z-index-search-layer);
  background: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  max-height: min(50vh, 320px);
  overflow-y: auto;
  box-sizing: border-box;
}

.edit-modal-wd-dd__status {
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
}

.edit-modal-wd-dd__item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface-default);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--color-text-primary);
  transition: background var(--transition-fast);
}

.edit-modal-wd-dd__item:last-child {
  border-bottom: none;
}

.edit-modal-wd-dd__item--active { background: var(--color-interaction-hover); outline: 2px solid var(--color-primary); outline-offset: -2px; }

.edit-modal-wd-dd__item:hover:not(:disabled) {
  background: var(--color-interaction-hover);
}

.edit-modal-wd-dd__item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.edit-modal-wd-dd__title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.edit-modal-wd-dd__id {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.edit-modal-wd-dd__date {
  flex: 1 1 100%;
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.edit-modal-wd-dd__desc {
  flex: 1 1 100%;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.35;
}
</style>
