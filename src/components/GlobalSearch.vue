<template>
  <div ref="rootRef" class="gs search-bar" :class="{ 'gs--active': focused }" @click="searchRef?.focus()" @focusin="onFocus" @focusout="onBlur">
    <SearchInput
      ref="searchRef"
      v-model="query"
      placeholder="Rechercher une frise ou un sujet…"
      aria-label="Rechercher une frise ou un sujet Wikidata"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="dropdownVisible && hasResults"
      :aria-controls="dropdownVisible && hasResults ? listId : undefined"
      :aria-activedescendant="activeId"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.escape.prevent="dismiss"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="confirm"
    />

    <PopoverSurface v-if="dropdownVisible" class="gs__dropdown">
      <div v-if="loading" class="gs__status" role="status">Recherche de frises…</div>
      <div v-else-if="error" class="gs__status" role="alert">
        {{ error }} <Button variant="tertiary" size="sm" type="button" @mousedown.prevent @click="retrySource">Réessayer</Button>
      </div>
      <div v-if="wikidata.loading.value" class="gs__status" role="status">Recherche Wikidata…</div>
      <div v-if="wikidata.error.value" class="gs__status" role="alert">
        {{ wikidata.error.value }} <Button variant="tertiary" size="sm" type="button" @mousedown.prevent @click="retryWikidata">Réessayer Wikidata</Button>
      </div>
      <div v-if="hasResults" :id="listId" role="listbox" aria-label="Frises et sujets Wikidata trouvés">
        <template v-for="(hit, i) in allHits" :key="`${isWikidata(hit) ? 'wd' : 'story'}:${hit.id}`">
        <div v-if="i === 0 || isWikidata(hit) !== isWikidata(allHits[i - 1]!)" class="gs__section" aria-hidden="true">{{ isWikidata(hit) ? 'Wikidata · générer une frise' : 'Frises' }}</div>
        <button :id="optionId(i)" type="button" role="option" tabindex="-1" :aria-selected="cursor === i" class="gs__item" :class="{ 'gs__item--active': cursor === i }" @mousedown.prevent @click="selectHit(hit)">
          <Icon :icon="isWikidata(hit) ? 'mdi:earth' : 'mdi:timeline-text-outline'" class="gs__icon" aria-hidden="true" />
          <ItemSummary v-if="isWikidata(hit)" class="gs__content" :title="hit.label" :description="hit.description">
            <template #meta>Aperçu d’une frise depuis ce sujet</template>
          </ItemSummary>
          <ItemSummary v-else class="gs__content" :title="hit.label.fr || hit.label.en" :description="hit.description.fr || hit.description.en">
            <template v-if="hit.match" #meta>
              <span class="gs__match" :class="`gs__match--${hit.match.type}`">
                <span class="gs__match-type"><Icon :icon="hit.match.type === 'event' ? 'mdi:circle-small' : 'mdi:minus'" aria-hidden="true" />{{ hit.match.type === 'event' ? 'Événement' : 'Période' }}</span>
                <span aria-hidden="true">·</span>
                <span class="gs__match-label">{{ hit.match.label.fr || hit.match.label.en }}</span>
              </span>
            </template>
          </ItemSummary>
        </button>
        </template>
      </div>
      <div v-if="!loading && !error && !wikidata.loading.value && !wikidata.error.value && !hasResults" class="gs__status" role="status">Aucune frise ni sujet Wikidata trouvé. Essayez un autre mot-clé.</div>
      <span class="sr-only" role="status">{{ hasResults ? `${allHits.length} résultats. Utilisez les flèches puis Entrée pour choisir.` : '' }}</span>
    </PopoverSurface>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import PopoverSurface from '@/components/base/PopoverSurface.vue';
import { ref, computed, onScopeDispose } from 'vue';
import SearchInput from './base/SearchInput.vue';
import ItemSummary from './base/ItemSummary.vue';
import { Icon } from '@iconify/vue';
import { SearchApiService, type GlobalSearchResult, type WikidataEntityLabelHit } from '@/services/SearchApiService';
import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
import { useSuggestionNavigation } from '@/composables/useSuggestionNavigation';

const emit = defineEmits<{ (e: 'select', hit: GlobalSearchResult): void }>();
const rootRef = ref<HTMLElement | null>(null);
const query = ref('');
const focused = ref(false);
const searchRef = ref<{ focus: () => void; blur: () => void } | null>(null);
const service = SearchApiService.getInstance();
const { results: stories, loading, error, retry } = useDebouncedSearch(
  () => query.value, (q, signal) => service.searchStories(q, { signal }), { delayMs: 250, enabled: () => focused.value },
);
const wikidata = useDebouncedSearch(
  () => query.value, (q, signal) => service.searchWikidataEntityLabels(q, { signal }), { delayMs: 600, enabled: () => focused.value },
);
function isWikidata(hit: GlobalSearchResult): hit is WikidataEntityLabelHit & { fromWikidata: true } { return 'fromWikidata' in hit && hit.fromWikidata === true; }
const allHits = computed<GlobalSearchResult[]>(() => [...stories.value, ...wikidata.results.value.map(hit => ({ ...hit, fromWikidata: true as const }))]);
const hasResults = computed(() => allHits.value.length > 0);
const dropdownVisible = computed(() => focused.value && query.value.trim().length >= 2);
const { listId, optionId, cursor, activeId, move, reset, current } = useSuggestionNavigation(() => allHits.value, () => dropdownVisible.value);
let blurTimer: ReturnType<typeof setTimeout> | undefined;
function onFocus() { clearTimeout(blurTimer); focused.value = true; }
function onBlur() {
  clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    if (!rootRef.value?.contains(document.activeElement)) focused.value = false;
  }, 150);
}
onScopeDispose(() => clearTimeout(blurTimer));
function confirm() { const hit = current(); if (hit) selectHit(hit); }
function retrySource() { searchRef.value?.focus(); return retry(); }
function retryWikidata() { searchRef.value?.focus(); return wikidata.retry(); }
function dismiss() { query.value = ''; reset(); focused.value = false; searchRef.value?.blur(); }
function selectHit(hit: GlobalSearchResult) { emit('select', hit); clear(); }
function clear() {
  query.value = ''; reset(); focused.value = false;
  searchRef.value?.focus();
}
</script>

<style scoped>
.gs.search-bar {
  position: relative;
  width: var(--field-height-md);
  max-width: 100%;
  transition: width var(--transition-normal);
  cursor: text;
}

.gs.search-bar:hover, .gs.search-bar:focus-within { width: 320px; }
.gs :deep(.search-input-wrap__icon) { width: 18px; height: 18px; }

@media (prefers-reduced-motion: reduce) {
  .gs.search-bar { transition: none; }
}

/* ─── Dropdown ───────────────────────────────────────────────────────────────── */

.gs__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: calc(var(--spacing-sm) * 50);
  overflow-y: auto;
  z-index: var(--z-index-dropdown);
}

.gs__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
}

.gs__section {
  display: flex;
  align-items: center;
  gap: calc((var(--spacing-sm) + var(--spacing-xs)) / 2);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-background-default);
  border-bottom: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
}

.gs__item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  width: 100%;
  padding: calc(var(--spacing-sm) - 1px) var(--spacing-md);
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface-default);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}
.gs__item:last-child { border-bottom: none; }
.gs__item--active, .gs__item:hover { background: var(--color-interaction-hover); }

.gs__icon { flex: 0 0 auto; width: 18px; height: 18px; margin-top: 1px; color: var(--color-text-link); }
.gs__content { flex: 1; min-width: 0; }
.gs__match { display: inline-flex; align-items: center; gap: var(--spacing-xs); min-width: 0; color: var(--color-text-secondary); }
.gs__match-type { display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.gs__match-type svg { width: 14px; height: 14px; }
.gs__match-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 480px) {
  .gs__status { flex-wrap: wrap; }
}
</style>
