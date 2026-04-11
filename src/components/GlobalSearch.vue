<template>
  <div class="gs">
    <SearchInput
      ref="searchRef"
      v-model="query"
      placeholder="Rechercher…"
      autocomplete="off"
      @focus="focused = true"
      @blur="onBlur"
      @input="onInput"
      @keydown.escape.prevent="clear"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="confirm"
    />

    <div v-if="focused && query.trim().length >= 2" class="gs__dropdown">
      <div v-if="loading && !hasResults" class="gs__status">
        <span class="gs__spinner" /> Recherche…
      </div>
      <div v-else-if="!hasResults && !loading" class="gs__status">Aucun résultat</div>
      <template v-else>
        <template v-if="localHits.length">
          <div class="gs__section">Base de données</div>
          <button
            v-for="(hit, i) in localHits" :key="hit.id"
            class="gs__item" :class="{ 'gs__item--active': cursor === i }"
            @mousedown.prevent @click="selectHit(hit)"
          >
            <span class="gs__badge" :class="`gs__badge--${hit.type}`">{{ searchHitTypeFrLabel(hit.type) }}</span>
            <span class="gs__label">{{ typeof hit.label === 'object' ? hit.label.fr : hit.label }}</span>
            <span class="gs__date">{{ hit.dateLabel }}</span>
          </button>
        </template>
        <template v-if="wikidataHits.length">
          <div class="gs__section">Wikidata <span v-if="loadingWd" class="gs__spinner gs__spinner--sm" /></div>
          <button
            v-for="(hit, i) in wikidataHits" :key="hit.id"
            class="gs__item" :class="{ 'gs__item--active': cursor === localHits.length + i }"
            @mousedown.prevent @click="selectHit(hit)"
          >
            <span class="gs__badge" :class="`gs__badge--${hit.type}`">{{ searchHitTypeFrLabel(hit.type) }}</span>
            <span class="gs__label gs__label--wd">{{ hit.label }}</span>
            <span class="gs__date">{{ hit.dateLabel }}</span>
          </button>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import SearchInput from './base/SearchInput.vue';
import { SearchApiService, type SearchHit } from '@/services/SearchApiService';
import { moveListCursor, searchHitTypeFrLabel } from '@/lib/searchHitDisplay';

const emit = defineEmits<{ (e: 'select', hit: SearchHit): void }>();

const query = ref('');
const focused = ref(false);
const cursor = ref(-1);
const loading = ref(false);
const loadingWd = ref(false);
const localHits = ref<SearchHit[]>([]);
const wikidataHits = ref<SearchHit[]>([]);
const searchRef = ref<{ focus: () => void; blur: () => void } | null>(null);

const hasResults = computed(() => localHits.value.length + wikidataHits.value.length > 0);
const allHits = computed(() => [...localHits.value, ...wikidataHits.value]);

const service = SearchApiService.getInstance();
let dbTimer: ReturnType<typeof setTimeout> | null = null;
let wdTimer: ReturnType<typeof setTimeout> | null = null;

function onInput() {
  const q = query.value.trim();
  cursor.value = -1;
  localHits.value = [];
  wikidataHits.value = [];
  if (dbTimer) clearTimeout(dbTimer);
  if (wdTimer) clearTimeout(wdTimer);
  if (q.length < 2) { loading.value = false; return; }

  loading.value = true;
  loadingWd.value = true;

  dbTimer = setTimeout(async () => {
    try { localHits.value = await service.searchLocal(q); }
    catch { /* */ } finally { loading.value = false; }
  }, 250);

  wdTimer = setTimeout(async () => {
    try {
      const wd = await service.searchWikidata(q);
      const ids = new Set(localHits.value.map(h => (h as any).wikidataId).filter(Boolean));
      wikidataHits.value = wd.filter(h => !ids.has(h.id));
    } catch { /* */ } finally { loadingWd.value = false; }
  }, 600);
}

function move(dir: 1 | -1) {
  cursor.value = moveListCursor(cursor.value, dir, allHits.value.length);
}

function confirm() {
  if (cursor.value >= 0 && allHits.value[cursor.value]) selectHit(allHits.value[cursor.value]);
}

function selectHit(hit: SearchHit) {
  emit('select', hit);
  clear();
}

function clear() {
  query.value = '';
  localHits.value = [];
  wikidataHits.value = [];
  cursor.value = -1;
  focused.value = false;
  searchRef.value?.blur();
}

function onBlur() {
  setTimeout(() => { focused.value = false; }, 150);
}
</script>

<style scoped>
.gs {
  position: relative;
  width: 100%;
}

/* ─── Dropdown ───────────────────────────────────────────────────────────────── */

.gs__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
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
  color: var(--color-text-light);
  font-style: italic;
}

.gs__section {
  display: flex;
  align-items: center;
  gap: calc((var(--spacing-sm) + var(--spacing-xs)) / 2);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
}

.gs__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: calc(var(--spacing-sm) - 1px) var(--spacing-md);
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}
.gs__item:last-child { border-bottom: none; }
.gs__item--active, .gs__item:hover { background: var(--color-surface-hover); }

.gs__badge {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px calc(var(--spacing-xs) + 1px);
  border-radius: calc(var(--radius-md) / 2);
  background: color-mix(in srgb, var(--color-period) 15%, transparent);
  color: var(--color-period);
}
.gs__badge--event {
  background: color-mix(in srgb, var(--color-event) 15%, transparent);
  color: var(--color-event);
}

.gs__label {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gs__label--wd { color: var(--color-wikidata-label); }

.gs__date {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  white-space: nowrap;
}

.gs__spinner {
  display: inline-block;
  width: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
  height: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: gs-spin 0.7s linear infinite;
  flex-shrink: 0;
}
.gs__spinner--sm { width: calc(var(--spacing-sm) + var(--spacing-xs) / 2); height: calc(var(--spacing-sm) + var(--spacing-xs) / 2); border-width: 1.5px; }
@keyframes gs-spin { to { transform: rotate(360deg); } }
</style>
