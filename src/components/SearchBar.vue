<template>
  <div class="search-bar" ref="containerRef">
    <div class="search-input-wrapper">
      <Icon icon="mdi:magnify" class="search-icon" />
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="search-input"
        :placeholder="placeholder"
        @input="onInput"
        @keydown.escape="clear"
        @keydown.down.prevent="moveSelection(1)"
        @keydown.up.prevent="moveSelection(-1)"
        @keydown.enter.prevent="confirmSelection"
        @focus="open = true"
        autocomplete="off"
      />
      <button v-if="query" class="search-clear" @click="clear" aria-label="Effacer">
        <Icon icon="mdi:close" />
      </button>
    </div>

    <!-- Dropdown -->
    <Teleport to="body">
      <div
        v-if="open && (hits.length > 0 || loading || noResults)"
        class="search-dropdown"
        :style="dropdownStyle"
      >
        <!-- Loading -->
        <div v-if="loading && hits.length === 0" class="search-dropdown__status">
          <span class="search-dropdown__spinner" />
          Recherche…
        </div>

        <!-- Résultats -->
        <template v-else>
          <!-- Séparateur DB -->
          <div v-if="localHits.length" class="search-dropdown__section">Base de données</div>
          <div
            v-for="(hit, i) in localHits"
            :key="hit.id"
            class="search-dropdown__item"
            :class="{ 'search-dropdown__item--active': selectedIdx === i }"
            @mousedown.prevent="selectHit(hit)"
          >
            <span class="search-dropdown__type" :class="`search-dropdown__type--${hit.type}`">
              {{ searchHitTypeFrLabel(hit.type) }}
            </span>
            <span class="search-dropdown__label">{{ typeof hit.label === 'object' ? hit.label.fr : hit.label }}</span>
            <span class="search-dropdown__date">{{ hit.dateLabel }}</span>
          </div>

          <!-- Séparateur Wikidata -->
          <div v-if="wikidataHits.length" class="search-dropdown__section">Wikidata</div>
          <div
            v-for="(hit, i) in wikidataHits"
            :key="hit.id"
            class="search-dropdown__item"
            :class="{ 'search-dropdown__item--active': selectedIdx === localHits.length + i }"
            @mousedown.prevent="selectHit(hit)"
          >
            <span class="search-dropdown__type" :class="`search-dropdown__type--${hit.type}`">
              {{ searchHitTypeFrLabel(hit.type) }}
            </span>
            <span class="search-dropdown__label search-dropdown__label--wikidata">{{ hit.label }}</span>
            <span class="search-dropdown__date">{{ hit.dateLabel }}</span>
          </div>

          <div v-if="noResults" class="search-dropdown__status">Aucun résultat</div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';
import { SearchApiService, type SearchHit } from '@/services/SearchApiService';
import { moveListCursor, searchHitTypeFrLabel } from '@/lib/searchHitDisplay';

interface Props {
  placeholder?: string;
}
withDefaults(defineProps<Props>(), { placeholder: 'Rechercher une période ou un événement…' });

const emit = defineEmits<{
  (e: 'select', hit: SearchHit): void;
}>();

const query = ref('');
const open = ref(false);
const loading = ref(false);
const localHits = ref<SearchHit[]>([]);
const wikidataHits = ref<SearchHit[]>([]);
const selectedIdx = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const hits = computed(() => [...localHits.value, ...wikidataHits.value]);
const noResults = computed(() => !loading.value && query.value.trim().length >= 2 && hits.value.length === 0);

// ─── Positioning ──────────────────────────────────────────────────────────────

function updatePosition() {
  const el = containerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  dropdownStyle.value = {
    top: rect.bottom + 6 + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let wikidataTimer: ReturnType<typeof setTimeout> | null = null;

const service = SearchApiService.getInstance();

function onInput() {
  const q = query.value.trim();
  selectedIdx.value = -1;
  localHits.value = [];
  wikidataHits.value = [];

  if (debounceTimer) clearTimeout(debounceTimer);
  if (wikidataTimer) clearTimeout(wikidataTimer);

  if (q.length < 2) { loading.value = false; return; }

  loading.value = true;
  open.value = true;
  nextTick(updatePosition);

  debounceTimer = setTimeout(async () => {
    try {
      localHits.value = await service.searchLocal(q);
    } catch { /* ignore */ } finally {
      loading.value = false;
    }
  }, 250);

  // Wikidata un peu plus tard pour ne pas spammer
  wikidataTimer = setTimeout(async () => {
    try {
      const wd = await service.searchWikidata(q);
      // Exclure les QIDs déjà présents en local (même wikidataId)
      const localWdIds = new Set(
        localHits.value.filter(h => !h.fromWikidata && (h as any).wikidataId)
                       .map(h => (h as any).wikidataId)
      );
      wikidataHits.value = wd.filter(h => !localWdIds.has(h.id));
    } catch { /* ignore */ }
  }, 600);
}

// ─── Navigation clavier ───────────────────────────────────────────────────────

function moveSelection(dir: 1 | -1) {
  selectedIdx.value = moveListCursor(selectedIdx.value, dir, hits.value.length);
}

function confirmSelection() {
  if (selectedIdx.value >= 0 && hits.value[selectedIdx.value]) {
    selectHit(hits.value[selectedIdx.value]);
  }
}

function selectHit(hit: SearchHit) {
  emit('select', hit);
  clear();
}

function clear() {
  query.value = '';
  open.value = false;
  localHits.value = [];
  wikidataHits.value = [];
  selectedIdx.value = -1;
  loading.value = false;
}

// ─── Close on outside click ───────────────────────────────────────────────────

function onDocClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}
document.addEventListener('mousedown', onDocClick);
onUnmounted(() => document.removeEventListener('mousedown', onDocClick));
</script>

<style scoped>
.search-bar {
  position: relative;
  width: 100%;
  outline: none;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  height: calc(var(--spacing-sm) * 4);
  padding: 0 var(--spacing-xs);
  gap: var(--spacing-xs);
  transition: border-color var(--transition-fast);
}

.search-input-wrapper:focus-within {
  border-color: var(--color-primary);
}

.search-icon {
  flex-shrink: 0;
  width: var(--spacing-lg);
  height: var(--spacing-lg);
  color: var(--color-text-light);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-text-light);
}

.search-clear {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  width: var(--spacing-lg);
  height: var(--spacing-lg);
}

.search-clear:hover {
  color: var(--color-text);
}
</style>

<style>
/* Non-scoped : le dropdown est téléporté dans body */
.search-dropdown {
  position: fixed;
  z-index: var(--z-index-search-layer);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  max-height: calc(var(--spacing-xs) * 105);
  overflow-y: auto;
}

.search-dropdown__section {
  padding: 4px var(--spacing-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-background);
  position: sticky;
  top: 0;
}

.search-dropdown__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}

.search-dropdown__item:last-child {
  border-bottom: none;
}

.search-dropdown__item:hover,
.search-dropdown__item--active {
  background: var(--color-surface-hover);
}

.search-dropdown__type {
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

.search-dropdown__type--event {
  background: color-mix(in srgb, var(--color-event) 15%, transparent);
  color: var(--color-event);
}

.search-dropdown__label {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-dropdown__label--wikidata {
  color: var(--color-error);
}

.search-dropdown__date {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  white-space: nowrap;
}

.search-dropdown__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-style: italic;
}

.search-dropdown__spinner {
  display: inline-block;
  width: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
  height: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: search-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes search-spin { to { transform: rotate(360deg); } }
</style>
