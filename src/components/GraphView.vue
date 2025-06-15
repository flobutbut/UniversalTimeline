<template>
  <div class="finder-root">
    <div v-if="loading" class="finder-loading">Chargement...</div>
    <div v-else-if="error" class="finder-error">{{ error }}</div>
    <div v-else class="finder-columns">
      <div class="finder-column" v-for="(col, colIdx) in columns" :key="colIdx">
        <FinderItem
          v-for="item in col"
          :key="item.id"
          :label="item.label.fr || item.label"
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

function handleSelect(item: any, colIdx: number) {
  selectedIds.value = selectedIds.value.slice(0, colIdx);
  selectedIds.value[colIdx] = item.id;
}

function onDragStart(itemId: string) {
  draggedItemId.value = itemId;
}

async function onDrop(targetItemId: string) {
  if (!draggedItemId.value || draggedItemId.value === targetItemId) return;
  
  try {
    loading.value = true;
    // Récupérer la période cible et la période déplacée
    const targetPeriod = allPeriods.value.find(p => p.id === targetItemId);
    const draggedPeriod = allPeriods.value.find(p => p.id === draggedItemId.value);
    
    if (!targetPeriod || !draggedPeriod) {
      toast.value?.show('Période non trouvée', 'error');
      return;
    }

    // Vérifier si la période n'est pas déjà un enfant
    if (targetPeriod.children?.includes(draggedItemId.value)) {
      toast.value?.show('Cette période est déjà un enfant de la période cible', 'info');
      return;
    }

    // Vérifier si on ne crée pas une référence circulaire
    if (draggedPeriod.children?.includes(targetItemId)) {
      toast.value?.show('Impossible de déplacer une période dans son propre enfant', 'error');
      return;
    }

    // Mettre à jour les enfants de la période cible
    const newChildren = [...(targetPeriod.children || []), draggedItemId.value];
    await databaseViewService.updateChildren(targetItemId, newChildren);

    // Recharger les données après modification des children
    await databaseViewService.loadListData();

    // Mettre à jour has_parent de la période déplacée après le rechargement
    const updatedDraggedPeriod = allPeriods.value.find(p => p.id === draggedItemId.value);
    if (updatedDraggedPeriod && !updatedDraggedPeriod.hasParent) {
      await databaseViewService.updateHasParent(draggedItemId.value, true);
      // Recharger une dernière fois pour avoir l'état final
      await databaseViewService.loadListData();
    }

    draggedItemId.value = null;
    toast.value?.show('Période déplacée avec succès', 'success');
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Erreur lors du déplacement de la période';
    error.value = errorMessage;
    toast.value?.show(errorMessage, 'error');
  } finally {
    loading.value = false;
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