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
      >
        <div class="finder-column-content">
          <FinderItem
            v-for="(item, idx) in col"
            :key="item.id"
            :label="typeof item.label === 'string' ? item.label : item.label?.fr || ''"
            :selected="selectedIds[colIdx] === item.id"
            :hasChildren="hasChildren(item.id)"
            :itemId="item.id"
            @click="handleSelect(item, colIdx)"
            @dragstart="onDragStart"
            @drop="onDrop"
            :class="{ focused: focusedIndexes[colIdx] === idx }"
          />
        </div>
      </div>
    </div>
    <Toast ref="toast" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import FinderItem from './FinderItem.vue';
import Toast from '@/components/Toast.vue';
import type { ApiPeriod } from '@/types/geological';

const databaseViewService = DatabaseViewService.getInstance();
const loading = ref(false);
const error = ref<string | null>(null);
const toast = ref<InstanceType<typeof Toast> | null>(null);

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
const selectedIds = ref<string[]>([]);
const draggedItemId = ref<string | null>(null);
const focusedIndexes = ref<number[]>([0]);

// Fonction optimisée pour vérifier si un item a des enfants
function hasChildren(itemId: string): boolean {
  const period = allPeriods.value.find(p => p.id === itemId);
  return period?.children?.length > 0;
}

const columns = computed(() => {
  const cols: any[][] = [];
  // Première colonne : items sans parent (has_parent = false)
  let currentLevel = allPeriods.value.filter(p => !p.hasParent);
  console.log('[GraphView] Périodes sans parent:', currentLevel.map(p => ({ id: p.id, label: p.label.fr, hasParent: p.hasParent })));
  cols.push(currentLevel);
  
  // Colonnes suivantes basées sur la sélection
  for (const id of selectedIds.value) {
    const selected = allPeriods.value.find(p => p.id === id);
    if (!selected) break;
    
    // On utilise directement la liste des children
    const children = allPeriods.value.filter(p => 
      selected.children?.includes(p.id)
    );
    
    if (children.length > 0) {
      console.log(`[GraphView] Enfants de ${selected.label.fr}:`, children.map(p => ({ id: p.id, label: p.label.fr, hasParent: p.hasParent })));
      cols.push(children);
      currentLevel = children;
    } else {
      break;
    }
  }
  return cols;
});

const handleSelect = async (period: ApiPeriod, colIdx: number) => {
  selectedIds.value = selectedIds.value.slice(0, colIdx);
  selectedIds.value[colIdx] = period.id;

  // Si la période a des enfants, on les charge
  if (period.children && period.children.length > 0) {
    try {
      // Charger les détails de chaque enfant
      const childrenDetails = await Promise.all(
        period.children.map(async (childId: string) => {
          const response = await fetch(`/api/periods/${childId}`);
          if (!response.ok) {
            throw new Error(`Erreur lors du chargement de la période ${childId}`);
          }
          return response.json() as Promise<ApiPeriod>;
        })
      );

      // Mettre à jour la liste des périodes avec les détails des enfants
      const updatedPeriods = [...allPeriods.value];
      childrenDetails.forEach((childData: ApiPeriod) => {
        const existingIndex = updatedPeriods.findIndex(p => p.id === childData.id);
        if (existingIndex !== -1) {
          // Mettre à jour la période existante
          updatedPeriods[existingIndex] = {
            ...updatedPeriods[existingIndex],
            ...childData,
            label: childData.label.fr,
            hasParent: childData.hasParent
          };
        } else {
          // Ajouter la nouvelle période
          updatedPeriods.push({
            ...childData,
            label: childData.label.fr,
            hasParent: childData.hasParent
          });
        }
      });

      // Mettre à jour la liste des périodes
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

async function onDrop(targetItemId: string) {
  if (!draggedItemId.value || !targetItemId) return;

  try {
    // Mettre à jour les enfants de la période cible
    const targetPeriod = allPeriods.value.find(p => p.id === targetItemId);
    const newChildren = [...(targetPeriod?.children || []), draggedItemId.value];
    await databaseViewService.updateChildren(targetItemId, newChildren);
    
    // Mettre à jour les données localement
    const updatedPeriods = [...allPeriods.value];
    const draggedPeriodIndex = updatedPeriods.findIndex(p => p.id === draggedItemId.value);
    const targetPeriodIndex = updatedPeriods.findIndex(p => p.id === targetItemId);

    if (draggedPeriodIndex !== -1 && targetPeriodIndex !== -1) {
      // Mettre à jour la période cible
      const targetPeriod = updatedPeriods[targetPeriodIndex];
      if (!targetPeriod.children) {
        targetPeriod.children = [];
      }
      if (!targetPeriod.children.includes(draggedItemId.value)) {
        targetPeriod.children.push(draggedItemId.value);
      }
      updatedPeriods[targetPeriodIndex] = targetPeriod;

      // Mettre à jour la période déplacée
      const draggedPeriod = updatedPeriods[draggedPeriodIndex];
      draggedPeriod.hasParent = true;
      updatedPeriods[draggedPeriodIndex] = draggedPeriod;

      // Mettre à jour la liste des périodes
      databaseViewService.setPeriods([...updatedPeriods]);
    }
  } catch (error) {
    console.error('[GraphView] Erreur lors du déplacement de la période:', error);
  } finally {
    draggedItemId.value = null;
  }
}

function focusColumn(colIdx: number) {
  nextTick(() => {
    const col = document.querySelectorAll('.finder-column')[colIdx] as HTMLElement;
    if (col) col.focus();
  });
}

function handleKeyDown(event: KeyboardEvent, colIdx: number) {
  const col = columns.value[colIdx];
  if (!col) return;
  let idx = focusedIndexes.value[colIdx] ?? 0;
  if (event.key === 'ArrowDown') {
    idx = Math.min(idx + 1, col.length - 1);
    focusedIndexes.value[colIdx] = idx;
    event.preventDefault();
  } else if (event.key === 'ArrowUp') {
    idx = Math.max(idx - 1, 0);
    focusedIndexes.value[colIdx] = idx;
    event.preventDefault();
  } else if (event.key === 'Enter') {
    const item = col[idx];
    if (item) handleSelect(item, colIdx);
    event.preventDefault();
  } else if (event.key === 'ArrowRight') {
    const item = col[idx];
    if (item) handleSelect(item, colIdx);
    // Focus colonne suivante si elle existe
    if (columns.value[colIdx + 1]) {
      focusColumn(colIdx + 1);
    }
    event.preventDefault();
  } else if (event.key === 'ArrowLeft') {
    if (colIdx > 0) {
      focusColumn(colIdx - 1);
    }
    event.preventDefault();
  }
}

onMounted(() => {
  // Focus la première colonne au chargement
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

.focused {
  outline: 2px solid var(--color-primary);
  background: var(--color-background-soft);
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