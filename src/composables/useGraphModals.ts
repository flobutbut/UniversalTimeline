import { ref } from 'vue';
import { DatabaseViewService } from '@/services/DatabaseViewService';
import { DatabaseQueryService } from '@/services/DatabaseQueryService';
import type { ApiPeriod } from '@/types/geological';

export function useGraphModals() {
  const databaseViewService = DatabaseViewService.getInstance();
  const databaseQueryService = DatabaseQueryService.getInstance();

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
      
      // Mise à jour de la période via le service de requête
      await databaseQueryService.updatePeriod(selectedPeriod.value.id, formData);
      
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
      
      // Rechargement des données
      await databaseViewService.loadListData();
      closeEditModal();
      window?.showToast?.('Période mise à jour avec succès', 'success');
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

  // Fonction pour soumettre l'ajout
  const handleAddSubmit = async (formData: any, selectedIds: string[]) => {
    try {
      console.log('[GraphView] Données reçues du formulaire:', JSON.stringify(formData, null, 2));
      
      const newPeriod = await databaseQueryService.createPeriod(formData);
      console.log('[GraphView] Nouvelle période créée ou période existante trouvée:', newPeriod);
      
      // Si on est dans une colonne autre que la première, on doit lier la période au parent
      if (currentColumnIdx.value !== null && currentColumnIdx.value > 0) {
        const parentId = selectedIds[currentColumnIdx.value - 1];
        if (parentId) {
          console.log('[GraphView] Liaison avec le parent:', parentId);
          // Utiliser le service pour déplacer la période
          const allPeriods = databaseViewService.getPeriods();
          const parentTarget = allPeriods.find(p => p.id === parentId);
          if (parentTarget) {
            const newChildren = Array.isArray(parentTarget.children) ? [...parentTarget.children] : [];
            if (!newChildren.includes(newPeriod.id)) {
              newChildren.push(newPeriod.id);
              await databaseViewService.updateChildren(parentTarget.id, newChildren);
              await databaseViewService.updateHasParent(newPeriod.id, true);
            }
          }
        }
      }
      
      // Rechargement des données
      await databaseViewService.loadListData();
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