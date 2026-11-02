<template>
  <ModalShell title="Sélectionner des périodes" @close="$emit('close')">

    <div v-if="loading" role="status">Chargement…</div>
    <div v-if="loadError" role="alert">{{ loadError }} <button type="button" :disabled="loading" @click="retryLoad">Réessayer</button></div>
    <!-- Barre de recherche -->
    <div class="ppm-search">
      <SearchInput ref="searchInputRef" v-model="search" placeholder="Rechercher une période…" autocomplete="off" />
    </div>

    <div class="ppm-columns">
      <div class="ppm-column ppm-column--fill">
        <div class="ppm-column-header">Catalogue <span class="ppm-column-header__count">{{ displayedPeriods.length }}</span></div>
        <div class="ppm-column-content">
          <PeriodPickerItem v-for="p in displayedPeriods" :key="p.id" :period="p"
            :checked="checkedIds.has(p.id)" :already="alreadyInStory.includes(p.id)" :selected="false"
            @click="toggleCheck(p.id)" @toggle="toggleCheck(p.id)" />
          <div v-if="!displayedPeriods.length && !loading && !loadError" class="ppm-empty">Aucune période</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer-left>
      <PickerSelectionCount :count="checkedIds.size" hide-when-zero />
    </template>
    <template #footer-right>
      <PickerModalAddButton :disabled="checkedIds.size === 0" @click="confirm" />
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { useDataStore } from '@/stores/useDataStore';
import ModalShell from '@/components/base/ModalShell.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import PickerSelectionCount from './PickerSelectionCount.vue';
import PickerModalAddButton from './PickerModalAddButton.vue';
import type { ListPeriod } from '@/types/database';

// ─── Sous-composant inline ────────────────────────────────────────────────────
// Évite de créer un fichier séparé pour un composant aussi simple.

const PeriodPickerItem = defineComponent({
  props: {
    period: { type: Object as () => ListPeriod, required: true },
    checked: Boolean,
    already: Boolean,
    selected: Boolean,
  },
  emits: ['click', 'toggle'],
  setup(props, { emit }) {
    return () => h('div', {
      class: [
        'ppm-item',
        props.selected && 'ppm-item--selected',
        props.already && 'ppm-item--already',
      ].filter(Boolean),
      onClick: () => emit('click'),
    }, [
      // Case à cocher ou badge ✓
      props.already
        ? h('span', { class: 'ppm-item__already-badge' }, '✓')
        : h('input', {
            type: 'checkbox',
            class: 'ppm-item__checkbox',
            checked: props.checked,
            onClick: (e: Event) => e.stopPropagation(),
            onChange: (e: Event) => { e.stopPropagation(); emit('toggle'); },
          }),
      // Label
      h('span', { class: 'ppm-item__label' }, props.period.label.fr),
    ]);
  },
});

// ─── Props / emits ────────────────────────────────────────────────────────────

const props = defineProps<{ alreadyInStory: string[]; initialPeriodId?: string | null }>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', ids: string[]): void;
}>();

// ─── État ─────────────────────────────────────────────────────────────────────

const dataStore = useDataStore();
const loading = ref(false);
const loadError = ref<string | null>(null);
const requests = useLatestRequest();
let retry: () => Promise<void>;
const retryLoad = () => retry();
async function load(action: (isCurrent: () => boolean) => Promise<void>) {
  const isCurrent = requests.begin();
  retry = () => load(action);
  loading.value = true;
  loadError.value = null;
  try {
    await action(isCurrent);
  } catch (cause) {
    if (isCurrent()) loadError.value = cause instanceof Error ? cause.message : 'Erreur de chargement';
  } finally {
    if (isCurrent()) loading.value = false;
  }
}
const search = ref('');
const checkedIds = ref(new Set<string>());
const searchInputRef = ref<{ focus: () => void } | null>(null);

// ─── Recherche ────────────────────────────────────────────────────────────────

const displayedPeriods = computed(() => {
  const q = search.value.trim().toLocaleLowerCase('fr');
  return dataStore.periods.filter(p => !p.id.startsWith('wikidata:') && (!q || p.label.fr.toLocaleLowerCase('fr').includes(q) || p.label.en?.toLocaleLowerCase('fr').includes(q)))
    .sort((a,b) => a.label.fr.localeCompare(b.label.fr, 'fr'));
});

const toggleCheck = (id: string) => {
  if (props.alreadyInStory.includes(id)) return;
  const next = new Set(checkedIds.value);
  next.has(id) ? next.delete(id) : next.add(id);
  checkedIds.value = next;
};

const confirm = () => emit('confirm', [...checkedIds.value]);

const loadInitialData = () => load(async isCurrent => {
  await dataStore.ensureRootsLoaded();
  if (isCurrent()) searchInputRef.value?.focus();
});
onMounted(loadInitialData);
</script>

<style scoped>
/* ─── Recherche ──────────────────────────────────────────────────────────────── */

.ppm-search {
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

/* ─── Colonnes ───────────────────────────────────────────────────────────────── */

.ppm-columns {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.ppm-column {
  width: calc(var(--spacing-xs) * 60);
  min-width: calc(var(--spacing-xs) * 60);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  min-height: 0;
}

.ppm-column--fill {
  flex: 1;
  width: auto;
  min-width: 0;
}

.ppm-column:last-child {
  border-right: none;
}

.ppm-column-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-background);
}

.ppm-column-header__count {
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.ppm-column-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.ppm-empty {
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-style: italic;
  text-align: center;
}

</style>

<!-- Styles du sous-composant PeriodPickerItem (non scoped) -->
<style>
.ppm-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
  user-select: none;
}

.ppm-item:hover {
  background: var(--color-surface-hover);
}

.ppm-item--selected {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.ppm-item--selected:hover {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.ppm-item__checkbox {
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--color-primary);
  width: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
  height: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
}

.ppm-item__already-badge {
  flex-shrink: 0;
  width: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
  height: calc(var(--spacing-lg) - var(--spacing-xs) / 2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  color: var(--color-success);
  font-weight: 600;
}

.ppm-item__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ppm-item__chevron {
  color: var(--color-text-light);
  font-size: var(--font-size-lg);
  flex-shrink: 0;
  line-height: 1;
}
</style>
