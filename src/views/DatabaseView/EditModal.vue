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
            <div class="form-group">
              <Input
                v-model="form.qid"
                label="Q-id Wikidata"
                placeholder="Q12345"
                :error="editState.qidError"
                @blur="validateQid"
              />
            </div>
            <div class="form-group">
              <BaseSelect
                v-model="form.categories"
                :options="editState.categories.map(cat => ({ value: cat.id, label: cat.label }))"
                label="Catégories"
                placeholder="Sélectionner des catégories"
                :multiple="true"
                :loading="editState.categoriesLoading"
                :disabled="editState.categoriesLoading"
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

          <div class="form-row" v-if="type === 'story'">
            <div class="form-group">
              <Input
                v-model="form.author"
                label="Auteur"
                placeholder="Nom de l'auteur"
              />
            </div>
            <div class="form-group">
              <div class="switch-group">
                <label class="switch-label">Mode public</label>

                <Switch
                  v-model="form.isPublic"
                  :checked="form.isPublic"
                />

              </div>
            </div>
          </div>

          <div class="form-row" v-if="type === 'story'">
            <div class="form-group full-width">
              <BaseSelect
                v-model="form.categories"
                :options="editState.categories.map(cat => ({ value: cat.id, label: cat.label }))"
                label="Catégories"
                placeholder="Sélectionner des catégories"
                :multiple="true"
                :loading="editState.categoriesLoading"
                :disabled="editState.categoriesLoading"
              />
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="footer-left">
            <Button
              v-if="mode === 'edit'"
              variant="danger"
              type="button"
              @click="handleDelete"
            >
              Supprimer
            </Button>
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
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import WikidataImportButton from '@/components/WikidataImportButton.vue';
import Switch from '@/components/base/Switch.vue';
import BaseSelect from '@/components/base/Select.vue';

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
  (e: 'delete'): void;
}>();

// Initialisation des composables
const { form, state: editState, isValid, resetForm, updateForm, prepareSubmitData, setQidError, setQidExists, setChildrenCount } = useEditModal(props.type, props.mode, props.data);
const { validateQid: validateQidParentChild } = useParentChildManagement();

// Validation du Q-id
const validateQid = async () => {
  if (props.type === 'story') return;
  const validation = await validateQidParentChild(form.qid, props.type);
  setQidError(validation.error);
  setQidExists(validation.exists, validation.item);
};

// Gestion de la soumission du formulaire
const handleSubmit = () => {
  try {
    const formData = prepareSubmitData();
    emit('submit', formData);
    closeModal();
  } catch (error: any) {
    console.error('[EditModal] Erreur lors de la préparation des données:', error);
    window.showToast('Erreur lors de la préparation des données', 'error');
  }
};

const handleDelete = () => {
  emit('delete');
};

// Gestion de l'import Wikidata
const handleWikidataImportSuccess = (data: any) => {
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

// Gestionnaires d'événements
const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeModal();
  }
};

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

// Watchers
watch(() => props.data, (val) => { updateForm(val); }, { immediate: true });
watch(() => props.mode, () => { if (props.mode === 'create') { resetForm(); } });
watch(() => props.type, () => { resetForm(); });

// Hooks de cycle de vie
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
.footer-left, .footer-right {
  display: flex;
  gap: 10px;
  align-items: center;
}
.loading-overlay, .error-message {
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
  background-color: var(--color-error);
  color: var(--color-neutral-0);
}
.children-count {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  margin-left: var(--spacing-sm);
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 38px 0 var(--spacing-sm) 0;
  height: 48px;
}

.switch-label {
  font-weight: 600;
  color: var(--color-text);
  margin-right: var(--spacing-md);
  font-size: var(--font-size-base);
}
</style> 