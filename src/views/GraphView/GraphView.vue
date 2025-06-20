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
              v-for="(item, idx) in col"
              :key="item.id"
              :label="item.label"
              :selected="selectionState.selectedIds[colIdx] === item.id"
              :hasChildren="true"
              :hasActualChildren="hasChildren(item.id)"
              :itemId="item.id"
              @click="handleSelect(item, colIdx)"
              @dragstart="onDragStart"
              @drop="onDrop"
              @edit="handleEdit"
            />
          </template>
          <div v-else class="finder-empty-column">
            Aucune période dans ce niveau
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

// Utilisation des composables
const {
  state,
  selectionState,
  allPeriods,
  columns,
  hasChildren,
  getParentLabel,
  isDescendant,
  handleSelect,
  loadInitialData
} = useGraphView();

const {
  onDrop: dropHandler,
  onColumnDrop: columnDropHandler
} = useGraphDragDrop();

const {
  showEditModal,
  showAddModal,
  selectedPeriod,
  currentColumnIdx,
  loading: modalLoading,
  handleEdit,
  closeEditModal,
  handleEditSubmit,
  handleAddPeriod: addPeriodHandler,
  closeAddModal,
  handleAddSubmit: addSubmitHandler
} = useGraphModals();

// Fonctions de drag & drop
const onDragStart = (itemId: string) => {
  selectionState.draggedItemId = itemId;
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const onColumnDragOver = (colIdx: number) => {
  if (selectionState.draggedItemId) {
    const originColIdx = columns.value.findIndex(col => col.some(item => item.id === selectionState.draggedItemId));
    if (colIdx !== originColIdx) {
      selectionState.dragOverColumnIdx = colIdx;
    } else {
      selectionState.dragOverColumnIdx = null;
    }
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

.finder-columns {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow-x: auto;
  max-width: 100vw;
  box-sizing: border-box;
  background: var(--color-background);
  gap: 0;
}

.finder-column {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  box-sizing: border-box;
  outline: none;
  padding: 0;
}

.finder-column:focus {
  outline: none;
}

.finder-column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  gap: var(--spacing-sm);
}

.finder-column-header h2 {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

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

.finder-column-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  padding-top: 0;
}

.graph-view {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  height: calc(100vh - 64px);
  position: absolute;
  inset: 64px 0 0 0;
  overflow: hidden;
}

.column {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.column-header {
  flex: 0 0 auto;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.column-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.column-content::-webkit-scrollbar {
  width: 8px;
}

.column-content::-webkit-scrollbar-track {
  background: var(--color-background-mute);
  border-radius: 4px;
}

.column-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.column-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}

.period-item {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-item:hover {
  background: var(--color-background-soft);
}

.period-item.selected {
  background: var(--color-primary);
  color: white;
}

.period-item.has-children {
  border-left: 3px solid var(--color-primary);
}

.period-item.has-parent {
  opacity: 0.7;
}

.period-item.dragging {
  opacity: 0.5;
}

.period-item.drag-over {
  border: 2px dashed var(--color-primary);
}

.period-item .period-label {
  font-weight: 500;
}

.period-item .period-dates {
  font-size: 0.8em;
  color: var(--color-text-light);
}

.period-item.selected .period-dates {
  color: rgba(255, 255, 255, 0.8);
}

.finder-item-focused {
  outline: 2px solid var(--color-primary);
  background: var(--color-background-soft);
}

.finder-column.drag-over {
  background: var(--color-primary-light);
}

.finder-empty-column {
  padding: var(--spacing-md);
  color: var(--color-text-light);
  font-style: italic;
  text-align: center;
  opacity: 0.5;
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