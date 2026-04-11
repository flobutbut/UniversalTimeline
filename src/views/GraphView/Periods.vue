<template>
  <div class="finder-root">
    <div v-if="state.loading" class="finder-loading">Chargement...</div>
    <div v-else-if="state.error" class="finder-error">{{ state.error }}</div>
    <div v-else class="finder-columns">
      <div
        class="finder-column"
        v-for="(col, colIdx) in columns"
        :key="colIdx"
        @dragover.prevent="onColumnDragOver(colIdx)"
        @dragleave="onColumnDragLeave(colIdx)"
        @drop.prevent="onColumnDrop(colIdx)"
        :class="{ 'drag-over': selectionState.dragOverColumnIdx === colIdx }"
      >
        <div class="finder-column-header">
          <h2>
            <template v-if="colIdx === 0">
              Périodes racines
            </template>
            <template v-else>
              {{ getParentLabel(colIdx) }}
            </template>
          </h2>
          <button class="action-button" @click="handleAddPeriod(colIdx)">Add</button>
        </div>
        <div class="finder-column-content">
          <template v-if="col.length > 0">
            <FinderItem
              v-for="item in col"
              :key="item.id"
              :label="item.label"
              :startDate="item.startDate"
              :endDate="item.endDate"
              :categories="item.categories"
              :selected="selectionState.selectedIds[colIdx] === item.id"
              :hasChildren="hasChildren(item.id)"
              :wikidataOnly="item.id.startsWith('wikidata:')"
              :itemId="item.id"
              @click="handleSelect(item, colIdx)"
              @dragstart="onDragStart"
              @drop="onDrop"
              @edit="handleEdit"
              @add="(id) => handleAddFromWikidataFinderItem(colIdx, id)"
            />
          </template>
          <div v-else class="finder-empty-column">
            <template v-if="colIdx > 0 && loadingChildrenColumnIndex === colIdx">
              Chargement depuis Wikidata…
            </template>
            <template v-else-if="colIdx === 0">
              Aucune période racine
            </template>
            <template v-else>
              Aucune sous-période
            </template>
          </div>
          <!-- Bouton d'enrichissement Wikidata : visible uniquement si la colonne a des enfants en base
               et que le parent a un wikidata_id -->
          <div
            v-if="colIdx > 0 && col.length > 0 && getParentPeriod(colIdx)?.wikidata_id"
            class="finder-wikidata-enrich"
          >
            <button
              class="wikidata-enrich-btn"
              :disabled="loadingChildrenColumnIndex === colIdx + 1"
              @click="enrichColumnWithWikidata(getParentPeriod(colIdx)!, colIdx)"
            >
              <span v-if="loadingChildrenColumnIndex === colIdx + 1">Chargement…</span>
              <span v-else>+ Rechercher aussi sur Wikidata</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <Toast ref="toast" />
    <EditModal
      v-if="showEditModal"
      :is-open="showEditModal"
      :type="'period'"
      :mode="'edit'"
      :data="selectedPeriod"
      @close="closeEditModal"
      @submit="handleEditSubmit"
    />
    <EditModal
      v-if="showAddModal"
      :is-open="showAddModal"
      :type="'period'"
      :mode="'create'"
      :data="addModalInitialData ?? undefined"
      @close="closeAddModal"
      @submit="handleAddSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import FinderItem from './FinderItem.vue';
import Toast from '@/components/Toast.vue';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import { useGraphView } from '@/composables/useGraphView';
import { useGraphDragDrop } from '@/composables/useGraphDragDrop';
import { useGraphModals } from '@/composables/useGraphModals';
import {
  finderDragOverColumnAfterMove,
  getFinderColumnParentPeriod,
} from '@/lib/graphFinderHelpers';

// Utilisation des composables
const {
  state,
  selectionState,
  allPeriods,
  columns,
  loadingChildrenColumnIndex,
  hasChildren,
  getParentLabel,
  isDescendant,
  handleSelect,
  enrichColumnWithWikidata,
  loadInitialData
} = useGraphView();

const getParentPeriod = (colIdx: number) =>
  getFinderColumnParentPeriod(colIdx, selectionState.selectedIds, allPeriods.value);

const {
  onDrop: dropHandler,
  onColumnDrop: columnDropHandler
} = useGraphDragDrop();

const {
  showEditModal,
  showAddModal,
  selectedPeriod,
  addModalInitialData,
  handleEdit,
  closeEditModal,
  handleEditSubmit,
  handleAddPeriod: addPeriodHandler,
  handleAddFromWikidataFinderItem,
  closeAddModal,
  handleAddSubmit: addSubmitHandler
} = useGraphModals();

// Fonctions de drag & drop
const onDragStart = (itemId: string) => {
  selectionState.draggedItemId = itemId;
};

const onColumnDragOver = (colIdx: number) => {
  const id = selectionState.draggedItemId;
  if (id) {
    selectionState.dragOverColumnIdx = finderDragOverColumnAfterMove(colIdx, id, columns.value);
  }
};

const onColumnDragLeave = (colIdx: number) => {
  if (selectionState.dragOverColumnIdx === colIdx) {
    selectionState.dragOverColumnIdx = null;
  }
};

const onDrop = async (targetItemId: string) => {
  await dropHandler(targetItemId, selectionState.draggedItemId, allPeriods.value, isDescendant);
  selectionState.draggedItemId = null;
};

const onColumnDrop = async (colIdx: number) => {
  await columnDropHandler(
    colIdx, 
    selectionState.draggedItemId, 
    selectionState.selectedIds, 
    columns.value, 
    allPeriods.value, 
    isDescendant
  );
  selectionState.dragOverColumnIdx = null;
  selectionState.draggedItemId = null;
};

// Fonctions de modales avec validation
const handleAddPeriod = (colIdx: number) => {
  // Vérifier si on a besoin d'un parent et s'il est sélectionné
  if (colIdx > 0 && !selectionState.selectedIds[colIdx - 1]) {
    window?.showToast?.('Veuillez sélectionner un parent avant d\'ajouter une période', 'error');
    return;
  }
  addPeriodHandler(colIdx);
};

const handleAddSubmit = async (formData: any) => {
  await addSubmitHandler(formData, selectionState.selectedIds);
};

// Charger les données au montage du composant
onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
.finder-root {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  max-width: 100vw;
  overflow: hidden;
  box-sizing: border-box;
}

.finder-loading, .finder-error {
  padding: var(--spacing-lg);
  color: var(--color-text);
  font-size: var(--font-size-lg);
  text-align: center;
}

/* Colonnes : src/styles/finder-column-layout.css */

.action-button {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: color var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-button:hover {
  color: var(--color-primary-dark);
}

.finder-wikidata-enrich {
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.wikidata-enrich-btn {
  width: 100%;
  background: none;
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.wikidata-enrich-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
}

.wikidata-enrich-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<style>
html, body {
  height: 100%;
  overflow: hidden;
}
#app {
  height: 100%;
  overflow: hidden;
}
</style> 