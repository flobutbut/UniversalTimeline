<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ mode === 'edit' ? 'Modifier' : 'Créer' }} {{ 
          type === 'period' ? 'une période' : 
          type === 'event' ? 'un événement' : 
          'une story' 
        }}</h2>
      </div>
      <div v-if="editState.loading" class="loading-overlay">
        <div class="spinner"></div>
        <span>Chargement des données...</span>
      </div>
      <div v-else-if="editState.error" class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ editState.error }}</span>
        <button @click="$emit('close')">Fermer</button>
      </div>
      <form v-else @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-content">
          <div class="form-row" v-if="type !== 'story'">
            <div class="form-group full-width">
              <Input
                v-model="form.qid"
                label="Q-id Wikidata"
                placeholder="Q12345"
                :error="editState.qidError"
                @blur="validateQid"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <Input
                v-model="form.title.fr"
                label="Titre (Français)"
                placeholder="Titre en français"
                required
              />
            </div>
            <div class="form-group">
              <Input
                v-model="form.title.en"
                label="Titre (Anglais)"
                placeholder="Title in English"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <Input
                v-model="form.description.fr"
                label="Description (Français)"
                placeholder="Description en français"
                type="textarea"
              />
            </div>
            <div class="form-group">
              <Input
                v-model="form.description.en"
                label="Description (Anglais)"
                placeholder="Description in English"
                type="textarea"
              />
            </div>
          </div>

          <div class="form-row" v-if="type === 'period'">
            <div class="form-group">
              <Input
                v-model="form.startDate"
                label="Date de début"
                placeholder="Date brute"
                required
              />
            </div>
            <div class="form-group">
              <Input
                v-model="form.endDate"
                label="Date de fin"
                placeholder="Date brute"
                required
              />
            </div>
          </div>

          <div class="form-row" v-if="type === 'event'">
            <div class="form-group full-width">
              <Input
                v-model="form.date"
                label="Date (brute)"
                placeholder="Date brute (ex: 2024-06-18, -65 000 000, etc.)"
                required
              />
            </div>
          </div>

          <div class="form-row" v-if="type !== 'story'">
            <div class="form-group full-width">
              <Input
                v-model="form.location"
                label="Temporal location"
                placeholder="Ex: Europe, France, Paris..."
              />
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="footer-left">
            <WikidataImportButton
              v-if="form.qid && type !== 'story'"
              :qid="form.qid"
              :type="type"
              @import-success="handleWikidataImportSuccess"
              @import-error="handleWikidataImportError"
            />
            <span v-if="type === 'period'" class="children-count">
              {{ editState.directChildrenCount }} sous-périodes
            </span>
          </div>
          <div class="footer-right">
            <Button variant="secondary" @click="closeModal">Annuler</Button>
            <Button
              variant="primary"
              type="submit"
              :disabled="!editState.isValid"
            >
              {{ mode === 'edit' ? 'Mettre à jour' : 'Créer' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';
import { useEditModal } from '@/composables/useEditModal';
import { useParentChildManagement } from '@/composables/useParentChildManagement';
import { EditFormValidator } from '@/validators/editFormValidators';
import { ConflictResolutionService } from '@/services/ConflictResolutionService';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import WikidataImportButton from '@/components/WikidataImportButton.vue';

const props = defineProps<{
  isOpen: boolean;
  type: 'period' | 'event' | 'story';
  mode: 'create' | 'edit';
  data?: any;
  loading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', data: any): void;
}>();

// Initialisation des composables
const { form, state: editState, isValid, resetForm, updateForm, prepareSubmitData, setLoading, setError, setQidError, setQidExists, setChildrenCount } = useEditModal(props.type, props.mode, props.data);

const { validateQid: validateQidParentChild, updateChildrenCount: updateChildrenCountParentChild } = useParentChildManagement();

const conflictService = ConflictResolutionService.getInstance();

// Validation du Q-id
const validateQid = async () => {
  if (props.type === 'story') return;

  const validation = await validateQidParentChild(form.qid, props.type);
  setQidError(validation.error);
  setQidExists(validation.exists, validation.item);
};

// Gestion de la soumission du formulaire
const handleSubmit = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('[EditModal] État du formulaire avant soumission:', {
      qid: form.qid,
      title: form.title,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      location: form.location
    });

    // Validation du formulaire
    const formData = prepareSubmitData();
    const validation = EditFormValidator.validateForm(formData, props.type);
    
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Validation du Q-id si nécessaire
    if (props.type !== 'story') {
      const qidValidation = EditFormValidator.validateQid(form.qid);
      if (!qidValidation.isValid) {
        setError(qidValidation.errors.join(', '));
        return;
      }
    }

    // Détection et résolution des conflits
    if (props.type !== 'story') {
      const conflictInfo = await conflictService.detectConflict(form.qid, props.type, props.data?.id);
      
      if (conflictInfo.hasConflict) {
        // Résolution automatique (comportement actuel)
        const resolved = await conflictService.resolveConflictAutomatically(conflictInfo);
        if (!resolved) {
          setError('Impossible de résoudre le conflit');
          return;
        }
      }
    }

    console.log('[EditModal] Données formatées pour l\'envoi:', JSON.stringify(formData, null, 2));

    // Émettre l'événement submit
    emit('submit', formData);
    
    // Attendre un peu pour s'assurer que l'événement est traité
    await new Promise(resolve => setTimeout(resolve, 100));
    closeModal();
  } catch (error: any) {
    console.error('[EditModal] Erreur lors de la soumission:', error);
    setError('Erreur lors de la soumission du formulaire');
  } finally {
    setLoading(false);
  }
};

// Gestion de l'import Wikidata
const handleWikidataImportSuccess = (data: any) => {
  console.log('[EditModal] Import Wikidata réussi:', data);
  
  // Mise à jour du formulaire avec les données importées
  if (data.title) {
    form.title.fr = data.title.fr || '';
    form.title.en = data.title.en || '';
  }
  
  if (data.description) {
    form.description.fr = data.description.fr || '';
    form.description.en = data.description.en || '';
  }
  
  if (data.startDate) form.startDate = data.startDate;
  if (data.endDate) form.endDate = data.endDate;
  if (data.date) form.date = data.date;
  if (data.location) form.location = data.location;
  
  if (data.childrenCount) {
    setChildrenCount(data.childrenCount);
  }
  
  window.showToast('Données chargées depuis Wikidata', 'success');
};

const handleWikidataImportError = (error: string) => {
  console.error('[EditModal] Erreur import Wikidata:', error);
  window.showToast(error, 'error');
};

// Fermeture de la modale
const closeModal = () => {
  emit('close');
};

// Gestion des clics sur l'overlay
const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeModal();
  }
};

// Gestion de la touche Escape
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

// Surveillance des changements de données
watch(
  () => props.data,
  (val) => {
    updateForm(val);
  },
  { immediate: true }
);

// Surveillance des changements de mode
watch(
  () => props.mode,
  () => {
    if (props.mode === 'create') {
      resetForm();
    }
  }
);

// Surveillance des changements de type
watch(
  () => props.type,
  () => {
    resetForm();
  }
);

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl) var(--spacing-2xl);
  min-width: 700px;
  max-width: 90vw;
  box-shadow: var(--shadow-xl);
  position: relative;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.modal-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
}
.modal-form {
  width: 100%;
}
.form-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
  width: 100%;
}

.form-group {
  flex: 1;
  min-width: 0;
}

.form-group.full-width {
  flex: 1 1 100%;
}

.form-group label {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}
.form-group input,
.form-group textarea {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  font-size: var(--font-size-base);
  width: 100%;
  transition: border-color var(--transition-fast);
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}
.form-group textarea {
  min-height: 120px;
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
  padding: var(--spacing-md);
  white-space: pre-wrap;
  word-wrap: break-word;
  vertical-align: top;
  text-align: left;
  display: block;
  box-sizing: border-box;
}
.form-group input {
  height: 40px;
  line-height: 40px;
  padding: 0 var(--spacing-sm);
  box-sizing: border-box;
  display: block;
}
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-lg);
}
.footer-left {
  display: flex;
  gap: 10px;
  align-items: center;
}
.footer-right {
  display: flex;
  gap: 10px;
}
.wikidata-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}
.wikidata-button:hover {
  background-color: #2980b9;
}
.wikidata-button i {
  font-size: 1em;
}
.cancel-button {
  background: none;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-xl);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
}
.cancel-button:hover {
  background: var(--color-surface-hover);
}
.submit-button {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-xl);
  font-weight: 600;
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
}
.submit-button:hover {
  background: var(--color-primary-dark);
}
@media (max-width: 900px) {
  .modal-content {
    min-width: 95vw;
    padding: var(--spacing-lg);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  color: var(--color-text);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.error-message {
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
  border-radius: var(--radius-md);
  background-color: var(--color-error);
  color: var(--color-neutral-0);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  align-items: center;
}
.error-message button {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-neutral-0);
  color: var(--color-error);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.error-message button:hover {
  background-color: var(--color-neutral-100);
}
.children-count {
  display: flex;
  align-items: center;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  margin-left: var(--spacing-sm);
}
</style> 