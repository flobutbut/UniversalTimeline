<template>
  <div class="finder-root">
    <div v-if="loading" class="finder-loading">Chargement...</div>
    <div v-else-if="error" class="finder-error">{{ error }}</div>
    <div v-else class="finder-columns">
      <div
        class="finder-column"
        v-for="(col, colIdx) in columns"
        :key="colIdx"
        tabindex="0"
        @keydown="(e) => handleKeyDown(e, colIdx)"
        @dragover.prevent="onColumnDragOver(colIdx)"
        @dragleave="onColumnDragLeave(colIdx)"
        @drop.prevent="onColumnDrop(colIdx)"
        :class="{ 'drag-over': dragOverColumnIdx === colIdx }"
      >
        <div class="finder-column-content">
          <FinderItem
            v-for="(item, idx) in col"
            :key="item.id"
            :label="item.label"
            :selected="selectedIds[colIdx] === item.id"
            :hasChildren="hasChildren(item.id)"
            :itemId="item.id"
            @click="handleSelect(item, colIdx)"
            @dragstart="onDragStart"
            @drop="onDrop"
            @edit="handleEdit"
          />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import FinderItem from './FinderItem.vue';
import Toast from '@/components/Toast.vue';
import EditModal from '@/views/DatabaseView/EditModal.vue';
import type { ApiPeriod } from '@/types/geological';

const databaseViewService = DatabaseViewService.getInstance();
const databaseQueryService = DatabaseQueryService.getInstance();
const loading = ref(false);
const error = ref<string | null>(null);
const toast = ref<InstanceType<typeof Toast> | null>(null);
const selectedIds = ref<string[]>([]);
const draggedItemId = ref<string | null>(null);
const dragOverColumnIdx = ref<number | null>(null);
const showEditModal = ref(false);
const selectedPeriod = ref<ApiPeriod | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    await databaseViewService.loadListData();
  } catch (e: any) {
    error.value = e?.message || 'Erreur lors du chargement des périodes';
  } finally {
    loading.value = false;
  }
});

const allPeriods = computed(() => databaseViewService.getPeriods());

function hasChildren(itemId: string): boolean {
  const period = allPeriods.value.find(p => p.id === itemId);
  return period?.children?.length > 0;
}

const columns = computed(() => {
  const cols: any[][] = [];
  const usedIds = new Set<string>();
  // 1. Racine : objets sans parent
  let currentLevel = allPeriods.value.filter(p => !p.hasParent);
  currentLevel = currentLevel.filter(p => !usedIds.has(p.id));
  currentLevel.forEach(p => usedIds.add(p.id));
  cols.push(currentLevel);

  for (const id of selectedIds.value) {
    const selected = allPeriods.value.find(p => p.id === id);
    if (!selected) break;
    // 2. Enfants : objets dont l'ID est dans le champ children du parent sélectionné
    let children = allPeriods.value.filter(p => Array.isArray(selected.children) && selected.children.includes(p.id));
    // On retire ceux déjà utilisés dans une colonne précédente
    children = children.filter(p => !usedIds.has(p.id));
    children.forEach(p => usedIds.add(p.id));
    if (children.length > 0) {
      cols.push(children);
      currentLevel = children;
    } else {
      break;
    }
  }
  return cols;
});

function handleKeyDown(event: KeyboardEvent, colIdx: number) {
  const col = columns.value[colIdx];
  if (!col) return;

  const currentSelectedId = selectedIds.value[colIdx];
  let currentIndex = currentSelectedId ? col.findIndex(item => item.id === currentSelectedId) : -1;
  
  if (currentIndex === -1) {
    currentIndex = 0;
    const firstItem = col[0];
    if (firstItem) {
      selectedIds.value = selectedIds.value.slice(0, colIdx);
      selectedIds.value[colIdx] = firstItem.id;
    }
  }

  if (event.key === 'ArrowDown') {
    const newIndex = Math.min(currentIndex + 1, col.length - 1);
    const newItem = col[newIndex];
    if (newItem) {
      selectedIds.value = selectedIds.value.slice(0, colIdx);
      selectedIds.value[colIdx] = newItem.id;
      nextTick(() => {
        const colEl = document.querySelectorAll('.finder-column')[colIdx];
        if (colEl) {
          const items = colEl.querySelectorAll('.finder-item');
          const selectedItem = Array.from(items).find(
            el => el.getAttribute('aria-selected') === 'true'
          );
          if (selectedItem) (selectedItem as HTMLElement).focus();
        }
      });
    }
    event.preventDefault();
  } else if (event.key === 'ArrowUp') {
    const newIndex = Math.max(currentIndex - 1, 0);
    const newItem = col[newIndex];
    if (newItem) {
      selectedIds.value = selectedIds.value.slice(0, colIdx);
      selectedIds.value[colIdx] = newItem.id;
      nextTick(() => {
        const colEl = document.querySelectorAll('.finder-column')[colIdx];
        if (colEl) {
          const items = colEl.querySelectorAll('.finder-item');
          const selectedItem = Array.from(items).find(
            el => el.getAttribute('aria-selected') === 'true'
          );
          if (selectedItem) (selectedItem as HTMLElement).focus();
        }
      });
    }
    event.preventDefault();
  } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
    const currentItem = col[currentIndex];
    if (currentItem) {
      selectedIds.value = selectedIds.value.slice(0, colIdx + 1);
      selectedIds.value[colIdx] = currentItem.id;
      if (event.key === 'ArrowRight' && hasChildren(currentItem.id)) {
        nextTick(() => {
          focusColumn(colIdx + 1);
        });
      }
    }
    event.preventDefault();
  } else if (event.key === 'ArrowLeft') {
    if (colIdx > 0) {
      selectedIds.value = selectedIds.value.slice(0, colIdx);
      focusColumn(colIdx - 1);
    }
    event.preventDefault();
  }
}

function focusColumn(colIdx: number) {
  nextTick(() => {
    const col = document.querySelectorAll('.finder-column')[colIdx];
    if (col) {
      const items = col.querySelectorAll('.finder-item');
      const selectedId = selectedIds.value[colIdx];
      let selectedItem = Array.from(items).find(
        el => el.getAttribute('aria-selected') === 'true'
      );
      if (!selectedItem && items.length > 0) {
        selectedItem = items[0];
      }
      if (selectedItem) (selectedItem as HTMLElement).focus();
    }
  });
}

const handleSelect = async (period: ApiPeriod, colIdx: number) => {
  selectedIds.value = selectedIds.value.slice(0, colIdx);
  selectedIds.value[colIdx] = period.id;

  if (period.children && period.children.length > 0) {
    try {
      const childrenDetails = await Promise.all(
        period.children.map(async (childId: string) => {
          const response = await fetch(`/api/periods/${childId}`);
          if (!response.ok) {
            throw new Error(`Erreur lors du chargement de la période ${childId}`);
          }
          return response.json() as Promise<ApiPeriod>;
        })
      );

      const updatedPeriods = [...allPeriods.value];
      childrenDetails.forEach((childData: ApiPeriod) => {
        const existingIndex = updatedPeriods.findIndex(p => p.id === childData.id);
        if (existingIndex !== -1) {
          updatedPeriods[existingIndex] = {
            ...updatedPeriods[existingIndex],
            ...childData,
            label: childData.label,
            hasParent: childData.hasParent
          };
        } else {
          updatedPeriods.push({
            ...childData,
            label: childData.label,
            hasParent: childData.hasParent
          });
        }
      });

      databaseViewService.setPeriods([...updatedPeriods]);
    } catch (error) {
      console.error('[GraphView] Erreur lors du chargement des enfants:', error);
    }
  }
};

function onDragStart(itemId: string) {
  draggedItemId.value = itemId;
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
}

function isDescendant(childId: string, potentialAncestorId: string): boolean {
  const all = allPeriods.value;
  const child = all.find(p => p.id === childId);
  if (!child || !Array.isArray(child.children)) return false;
  if (child.children.includes(potentialAncestorId)) return true;
  return child.children.some((id: string) => isDescendant(id, potentialAncestorId));
}

async function movePeriod(childId: string, newParentId: string | null) {
  if (newParentId && isDescendant(childId, newParentId)) {
    window?.showToast?.('Impossible de déplacer un parent dans un de ses propres descendants.', 'error');
    console.warn('[movePeriod] Opération interdite : cycle détecté');
    return;
  }
  const all = allPeriods.value;
  const parentOrigin = all.find(p => Array.isArray(p.children) && p.children.includes(childId));
  const updatedPeriods = [...allPeriods.value];

  try {
    // 1. Retirer du parent d'origine
    if (parentOrigin) {
      const newChildren = parentOrigin.children.filter((id: string) => id !== childId);
      await databaseViewService.updateChildren(parentOrigin.id, newChildren);
      // Mise à jour locale immédiate
      const idx = updatedPeriods.findIndex(p => p.id === parentOrigin.id);
      if (idx !== -1) {
        updatedPeriods[idx] = {
          ...updatedPeriods[idx],
          children: newChildren
        };
      }
    }
    // 2. Ajouter au parent cible
    if (newParentId) {
      const parentTarget = all.find(p => p.id === newParentId);
      if (parentTarget) {
        const newChildren = Array.isArray(parentTarget.children) ? [...parentTarget.children] : [];
        if (!newChildren.includes(childId)) {
          newChildren.push(childId);
          await databaseViewService.updateChildren(parentTarget.id, newChildren);
          // Mise à jour locale immédiate
          const idx = updatedPeriods.findIndex(p => p.id === newParentId);
          if (idx !== -1) {
            updatedPeriods[idx] = {
              ...updatedPeriods[idx],
              children: newChildren
            };
          }
        }
      }
    }
    // 3. Mettre à jour has_parent
    const updated = await databaseViewService.updateHasParent(childId, !!newParentId);
    console.log('[movePeriod] updateHasParent response:', updated);
    // 4. Mettre à jour l'objet déplacé
    const draggedIdx = updatedPeriods.findIndex(p => p.id === childId);
    if (draggedIdx !== -1 && updated && typeof updated.has_parent !== 'undefined') {
      updatedPeriods[draggedIdx] = {
        ...updatedPeriods[draggedIdx],
        hasParent: updated.has_parent
      };
    }
    databaseViewService.setPeriods(updatedPeriods);
  } catch (error) {
    console.error('[movePeriod] Erreur lors du déplacement:', error);
  }
}

async function onDrop(targetItemId: string) {
  if (!draggedItemId.value || !targetItemId) return;
  await movePeriod(draggedItemId.value, targetItemId);
  draggedItemId.value = null;
}

function onColumnDragOver(colIdx: number) {
  if (draggedItemId.value) {
    const originColIdx = columns.value.findIndex(col => col.some(item => item.id === draggedItemId.value));
    if (colIdx !== originColIdx) {
      dragOverColumnIdx.value = colIdx;
    } else {
      dragOverColumnIdx.value = null;
    }
  }
}

function onColumnDragLeave(colIdx: number) {
  if (dragOverColumnIdx.value === colIdx) {
    dragOverColumnIdx.value = null;
  }
}

async function onColumnDrop(colIdx: number) {
  if (!draggedItemId.value) return;
  const originColIdx = columns.value.findIndex(col => col.some(item => item.id === draggedItemId.value));
  if (colIdx === originColIdx) return;
  let newParentId: string | null = null;
  if (colIdx === 0) {
    newParentId = null;
  } else {
    newParentId = selectedIds.value[colIdx - 1] || null;
  }
  await movePeriod(draggedItemId.value, newParentId);
  dragOverColumnIdx.value = null;
  draggedItemId.value = null;
}

async function handleEdit(itemId: string) {
  try {
    loading.value = true;
    error.value = null;
    
    // Utiliser le service pour charger les données complètes
    const fullPeriod = await databaseViewService.loadFullPeriod(itemId);
    // Convertir les dates en string si nécessaire
    selectedPeriod.value = {
      ...fullPeriod,
      createdAt: fullPeriod.createdAt?.toISOString(),
      updatedAt: fullPeriod.updatedAt?.toISOString()
    };
    showEditModal.value = true;
  } catch (error: any) {
    console.error('[GraphView] Erreur lors du chargement de la période:', error);
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      window?.showToast?.('La période n\'a pas été trouvée dans la base de données', 'error');
    } else {
      window?.showToast?.('Erreur lors du chargement de la période', 'error');
    }
  } finally {
    loading.value = false;
  }
}

function closeEditModal() {
  showEditModal.value = false;
  selectedPeriod.value = null;
}

async function handleEditSubmit(formData: any) {
  try {
    if (!selectedPeriod.value) return;
    
    const oldId = selectedPeriod.value.id;
    const newId = formData.qid;
    
    // Mise à jour de la période via le service de requête
    await databaseQueryService.updatePeriod(selectedPeriod.value.id, formData);
    
    // Si le Q-id a changé, mettre à jour les relations
    if (oldId !== newId) {
      await databaseQueryService.updatePeriodRelations(oldId, newId);
    }
    
    // Rechargement des données
    await databaseViewService.loadListData();
    closeEditModal();
    window?.showToast?.('Période mise à jour avec succès', 'success');
  } catch (error) {
    console.error('[GraphView] Erreur lors de la mise à jour:', error);
    window?.showToast?.('Erreur lors de la mise à jour de la période', 'error');
  }
}

onMounted(() => {
  focusColumn(0);
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
  overflow-x: hidden;
  max-width: 100vw;
  box-sizing: border-box;
  background: var(--color-background);
}

.finder-column {
  min-width: 220px;
  max-width: 320px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--spacing-md) 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  box-sizing: border-box;
}

.finder-column-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
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