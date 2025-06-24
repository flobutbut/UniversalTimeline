import { ref } from 'vue';
import { useDatabaseDataStore } from './useDatabaseDataStore';
import { useDatabaseSave } from './useDatabaseSave';
import { useParentChildManagement } from './useParentChildManagement';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import type { ApiPeriod } from '@/types/geological';

export function useGraphModals() {
  const databaseViewService = DatabaseViewService.getInstance();
  const databaseQueryService = DatabaseQueryService.getInstance();
  const { updatePeriods: sharedUpdatePeriods } = useDatabaseDataStore();
  const { handleSave: saveHandler } = useDatabaseSave();
  const { updateParentChildRelation } = useParentChildManagement();

  // États des modales
  const showEditModal = ref(false);
  const showAddModal = ref(false);
  const selectedPeriod = ref<ApiPeriod | null>(null);
  const currentColumnIdx = ref<number | null>(null);
  const loading = ref(false);

  // Fonction pour ouvrir la modale d'édition
  const handleEdit = async (itemId: string) => {
    try {
      loading.value = true;
      
      // S'assurer que les données sont chargées dans le store
      const { periods, ensureDataLoaded } = useDatabaseDataStore();
      await ensureDataLoaded();
      
      const period = periods.value.find(p => p.id === itemId);
      
      if (!period) {
        throw new Error(`Période ${itemId} non trouvée dans le store`);
      }
      
      // Formater les données comme dans useDatabaseView
      selectedPeriod.value = {
        ...period,
        description: (period as any).description || { fr: '', en: '' },
        categories: period.categories || [],
        hasParent: (period as any).hasParent || false,
        children: (period as any).children || [],
        temporalLocation: (period as any).temporalLocation || '',
        createdAt: (period as any).createdAt || new Date().toISOString(),
        updatedAt: (period as any).updatedAt || new Date().toISOString()
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
  };

  // Fonction pour fermer la modale d'édition
  const closeEditModal = () => {
    showEditModal.value = false;
    selectedPeriod.value = null;
  };

  // Fonction pour soumettre l'édition
  const handleEditSubmit = async (formData: any) => {
    try {
      console.log('[GraphView] Données reçues:', { formData, selectedPeriod: selectedPeriod.value });
      
      if (!selectedPeriod.value) {
        throw new Error('Aucune période sélectionnée');
      }
      
      const oldId = selectedPeriod.value.id;
      const newQid = formData.qid;
      
      console.log('[GraphView] IDs:', { oldId, newQid, currentWikidataId: selectedPeriod.value.wikidata_id });
      
      // Utiliser useDatabaseSave pour la cohérence avec les autres vues
      const success = await saveHandler(formData, 'period', 'edit', selectedPeriod.value);
      
      if (success) {
        // Si le Q-id a changé, mettre à jour les relations
        if (selectedPeriod.value.wikidata_id !== newQid) {
          console.log('[GraphView] Q-id modifié, mise à jour des relations');
          // Récupérer l'UUID de la nouvelle période
          const newPeriod = await databaseQueryService.getPeriodByWikidataId(newQid);
          if (!newPeriod) {
            throw new Error('Nouvelle période non trouvée');
          }
          await databaseQueryService.updatePeriodRelations(oldId, newPeriod.id);
        }
        
        closeEditModal();
      }
    } catch (error) {
      console.error('[GraphView] Erreur lors de la mise à jour:', error);
      window?.showToast?.(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la période', 'error');
    }
  };

  // Fonction pour ouvrir la modale d'ajout
  const handleAddPeriod = (colIdx: number) => {
    // Vérifier si on a besoin d'un parent et s'il est sélectionné
    if (colIdx > 0) {
      // Cette vérification sera faite dans le composant parent
      currentColumnIdx.value = colIdx;
      showAddModal.value = true;
    } else {
      currentColumnIdx.value = colIdx;
      showAddModal.value = true;
    }
  };

  // Fonction pour fermer la modale d'ajout
  const closeAddModal = () => {
    showAddModal.value = false;
    currentColumnIdx.value = null;
  };

  // Fonction pour soumettre l'ajout - Création manuelle avec les bonnes propriétés
  const handleAddSubmit = async (formData: any, selectedIds: string[]) => {
    try {
      console.log('[GraphView] Données reçues du formulaire:', JSON.stringify(formData, null, 2));
      
      // Déterminer le parent en fonction de la colonne
      let parentId: string | null = null;
      
      if (currentColumnIdx.value !== null && currentColumnIdx.value > 0) {
        // La colonne > 0 signifie qu'on a un parent
        parentId = selectedIds[currentColumnIdx.value - 1];
      }
      
      // Créer la période directement avec les bonnes propriétés
      const newPeriod = await databaseQueryService.createPeriod(formData);
      console.log('[GraphView] Nouvelle période créée:', newPeriod);
      
      // Créer l'objet période pour le store avec les bonnes propriétés
      const periodForStore = {
        id: newPeriod.id,
        label: { fr: formData.title.fr, en: formData.title.en },
        startDate: formData.startDate,
        endDate: formData.endDate,
        hasParent: !!parentId, // true si on a un parent, false sinon
        children: [] as string[],
        categories: [],
        wikidata_id: formData.qid
      };
      
      // Mettre à jour le store partagé
      const { periods } = useDatabaseDataStore();
      const updatedPeriods = [...periods.value];
      
      // Ajouter la nouvelle période
      updatedPeriods.push(periodForStore as any);
      
      // Si on a un parent, mettre à jour les relations
      if (parentId) {
        console.log('[GraphView] Liaison avec le parent:', parentId);
        
        // Mettre à jour le parent
        const parentIndex = updatedPeriods.findIndex(p => p.id === parentId);
        if (parentIndex !== -1) {
          const parent = updatedPeriods[parentIndex];
          const parentWithChildren = parent as any;
          const newChildren = Array.isArray(parentWithChildren.children) ? [...parentWithChildren.children] : [];
          if (!newChildren.includes(newPeriod.id)) {
            newChildren.push(newPeriod.id);
            updatedPeriods[parentIndex] = {
              ...parent,
              children: newChildren
            } as any;
          }
        }
        
        // Mettre à jour la base de données pour les relations
        await databaseViewService.updateChildren(parentId, (updatedPeriods.find(p => p.id === parentId) as any)?.children || []);
        await databaseViewService.updateHasParent(newPeriod.id, true);
      } else {
        // Période racine : s'assurer que hasParent est false dans la base de données
        await databaseViewService.updateHasParent(newPeriod.id, false);
      }
      
      // Mettre à jour le store partagé
      sharedUpdatePeriods(updatedPeriods);
      
      // Mettre à jour aussi le service pour la cohérence
      databaseViewService.setPeriods(updatedPeriods);
      
      closeAddModal();
      window?.showToast?.('Période ajoutée avec succès', 'success');
    } catch (error: any) {
      console.error('[GraphView] Erreur lors de la création:', error);
      if (error.response?.data?.message) {
        window?.showToast?.(error.response.data.message, 'error');
      } else {
        window?.showToast?.(error instanceof Error ? error.message : 'Erreur lors de la création de la période', 'error');
      }
    }
  };

  return {
    // États
    showEditModal,
    showAddModal,
    selectedPeriod,
    currentColumnIdx,
    loading,
    
    // Fonctions d'édition
    handleEdit,
    closeEditModal,
    handleEditSubmit,
    
    // Fonctions d'ajout
    handleAddPeriod,
    closeAddModal,
    handleAddSubmit
  };
} 