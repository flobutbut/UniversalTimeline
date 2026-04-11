<template>
  <ModalShell title="Sélectionner des périodes" @close="$emit('close')">

    <!-- Barre de recherche -->
    <div class="ppm-search">
      <SearchInput ref="searchInputRef" v-model="search" placeholder="Rechercher une période…" autocomplete="off" />
    </div>

    <!-- Mode recherche : liste plate -->
    <div v-if="isSearching" class="ppm-columns">
      <div class="ppm-column ppm-column--fill">
        <div class="ppm-column-header">
          Résultats <span class="ppm-column-header__count">{{ searchResults.length }}</span>
        </div>
        <div class="ppm-column-content">
          <template v-if="searchResults.length">
            <PeriodPickerItem
              v-for="p in searchResults"
              :key="p.id"
              :period="p"
              :checked="checkedIds.has(p.id)"
              :already="alreadyInStory.includes(p.id)"
              :selected="false"
              @click="handleItemClick(p, -1)"
              @toggle="toggleCheck(p.id)"
            />
          </template>
          <div v-else class="ppm-empty">Aucun résultat</div>
        </div>
      </div>
    </div>

    <!-- Mode explorateur : colonnes -->
    <div v-else ref="columnsRef" class="ppm-columns">
      <div v-for="(col, colIdx) in columns" :key="colIdx" class="ppm-column">
        <div class="ppm-column-header">
          {{ colIdx === 0 ? 'Racines' : getColumnLabel(colIdx) }}
        </div>
        <div class="ppm-column-content">
          <template v-if="col.length">
            <PeriodPickerItem
              v-for="p in col"
              :key="p.id"
              :period="p"
              :checked="checkedIds.has(p.id)"
              :already="alreadyInStory.includes(p.id)"
              :selected="selectedParentIds[colIdx] === p.id"
              @click="handleItemClick(p, colIdx)"
              @toggle="toggleCheck(p.id)"
            />
          </template>
          <div v-else class="ppm-empty">
            {{ colIdx === 0 ? 'Chargement…' : 'Aucune sous-période' }}
          </div>
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
import { ref, computed, watch, onMounted, nextTick, defineComponent, h } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import { PeriodApiService } from '@/services/PeriodApiService';
import { buildPeriodIdAncestorChain } from '@/lib/periodAncestorChain';
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
      // Chevron si enfants
      props.period.hasChildren
        ? h('span', { class: 'ppm-item__chevron' }, '›')
        : null,
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
const search = ref('');
const selectedParentIds = ref<string[]>([]);
const checkedIds = ref(new Set<string>());
const searchInputRef = ref<{ focus: () => void } | null>(null);
const columnsRef = ref<HTMLElement | null>(null);

// ─── Recherche ────────────────────────────────────────────────────────────────

const isSearching = computed(() => search.value.trim().length > 0);

const searchResults = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return [];
  return dataStore.periods.filter(p =>
    p.label.fr.toLowerCase().includes(q) ||
    p.label.en?.toLowerCase().includes(q)
  );
});

// ─── Colonnes explorateur ─────────────────────────────────────────────────────

const rootPeriods = computed(() =>
  dataStore.periods.filter(p => !p.parentId && !p.hasParent)
);

const columns = computed(() => {
  const cols: ListPeriod[][] = [rootPeriods.value];
  for (const parentId of selectedParentIds.value) {
    cols.push(dataStore.periods.filter(p => p.parentId === parentId));
  }
  return cols;
});

const getColumnLabel = (colIdx: number) =>
  dataStore.periods.find(p => p.id === selectedParentIds.value[colIdx - 1])?.label.fr
  ?? `Niveau ${colIdx + 1}`;

// ─── Auto-scroll quand une colonne est ajoutée ───────────────────────────────

watch(
  () => columns.value.length,
  async () => {
    if (isSearching.value) return;
    await nextTick();
    columnsRef.value?.scrollTo({ left: columnsRef.value.scrollWidth });
  }
);

// ─── Interactions ─────────────────────────────────────────────────────────────

const handleItemClick = async (period: ListPeriod, colIdx: number) => {
  if (!isSearching.value) {
    selectedParentIds.value = selectedParentIds.value.slice(0, colIdx);
    selectedParentIds.value[colIdx] = period.id;
  }
  if (period.hasChildren) {
    const loaded = dataStore.periods.some(p => p.parentId === period.id);
    if (!loaded) await dataStore.ensureChildrenLoaded(period.id);
  }
};

const toggleCheck = (id: string) => {
  if (props.alreadyInStory.includes(id)) return;
  const next = new Set(checkedIds.value);
  next.has(id) ? next.delete(id) : next.add(id);
  checkedIds.value = next;
};

const confirm = () => emit('confirm', [...checkedIds.value]);

// Réinitialiser la navigation quand la recherche change
watch(isSearching, () => { selectedParentIds.value = []; });

onMounted(async () => {
  await dataStore.ensureRootsLoaded();
  if (props.initialPeriodId) {
    const path = await buildPeriodIdAncestorChain(props.initialPeriodId, {
      getPeriodFromStore: (id) => dataStore.periods.find((p) => p.id === id),
      fetchPeriodFromApi: async (id) => {
        try {
          const fetched = await PeriodApiService.getInstance().getPeriod(id);
          return { parentId: (fetched as { parentId?: string | null } | null)?.parentId ?? null };
        } catch {
          return null;
        }
      },
    });
    // Charger les enfants de chaque niveau (du haut vers le bas)
    for (const id of path) {
      await dataStore.ensureChildrenLoaded(id);
    }
    selectedParentIds.value = path;
  }
  searchInputRef.value?.focus();
});
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
