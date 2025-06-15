<template>
  <div class="finder-root">
    <div v-if="loading" class="finder-loading">Chargement...</div>
    <div v-else-if="error" class="finder-error">{{ error }}</div>
    <div v-else class="finder-columns">
      <div class="finder-column" v-for="(col, colIdx) in columns" :key="colIdx">
        <FinderItem
          v-for="item in col"
          :key="item.id"
          :label="typeof item.label === 'string' ? item.label : item.label?.fr || ''"
          :selected="selectedIds[colIdx] === item.id"
          :hasChildren="hasChildren(item.id)"
          :itemId="item.id"
          @click="handleSelect(item, colIdx)"
          @dragstart="onDragStart"
          @drop="onDrop"
        />
      </div>
    </div>
    <Toast ref="toast" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { DatabaseViewService } from '../services/DatabaseViewService';
import FinderItem from './FinderItem.vue';
import Toast from './Toast.vue';
import type { ApiPeriod } from '../types/geological';

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
    // Mettre à jour le parent de la période déplacée
    await databaseViewService.updateParent(draggedItemId.value, targetItemId);
    
    // Mettre à jour les enfants de la période cible
    const targetPeriod = allPeriods.value.find(p => p.id === targetItemId);
    const newChildren = [...(targetPeriod?.children || []), draggedItemId.value];
    await databaseViewService.updateChildren(targetItemId, newChildren);
    
    // Mettre à jour le statut hasParent de la période déplacée
    await databaseViewService.updateHasParent(draggedItemId.value, true);

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
</script>

<style scoped>
.finder-root {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
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
}
</style> 