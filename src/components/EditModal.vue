<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ mode === 'edit' ? 'Modifier' : 'Créer' }} {{ 
          type === 'period' ? 'une période' : 
          type === 'event' ? 'un événement' : 
          'une story' 
        }}</h2>
      </div>
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <span>Chargement des données...</span>
      </div>
      <div v-else-if="error" class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ error }}</span>
        <button @click="$emit('close')">Fermer</button>
      </div>
      <form v-else @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-grid">
          <template v-if="type !== 'story'">
            <div class="form-group">
              <Input
                v-model="form.qid"
                label="Q-id Wikidata"
                placeholder="Q12345"
                :error="qidError"
                @blur="validateQid"
              />
            </div>
          </template>
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
          <template v-if="type === 'period'">
            <div class="form-group">
              <Input
                v-model="form.startDate"
                label="Date de début"
                placeholder="Date brute"
              />
            </div>
            <div class="form-group">
              <Input
                v-model="form.endDate"
                label="Date de fin"
                placeholder="Date brute"
              />
            </div>
            <div class="form-group">
              <label>Parent</label>
              <input v-model="form.parentId" type="text" placeholder="ID du parent" />
            </div>
            <div class="form-group">
              <label>Temporal location</label>
              <input v-model="form.temporalLocation" type="text" />
            </div>
          </template>
          <template v-else-if="type === 'event'">
            <div class="form-group">
              <Input
                v-model="form.date"
                label="Date"
                placeholder="Date brute"
              />
            </div>
          </template>
          <template v-else-if="type === 'story'">
            <div class="form-group">
              <Input
                v-model="form.author"
                label="Auteur"
                placeholder="Nom de l'auteur"
                required
              />
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="form.isPublic" />
                Story publique
              </label>
            </div>
          </template>
        </div>
        <div class="form-actions">
          <div class="left-actions">
            <Button
              v-if="mode === 'edit' && form.qid && type !== 'story'"
              variant="secondary"
              icon="fas fa-database"
              @click="fillFromWikidata"
            >
              Remplir avec Wikidata
            </Button>
          </div>
          <div class="right-actions">
            <Button variant="secondary" @click="closeModal">Annuler</Button>
            <Button
              variant="primary"
              type="submit"
              :disabled="!isValid || (type !== 'story' && qidExistsInBase)"
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
import { reactive, ref, watch, toRefs, computed, onMounted } from 'vue';
import { DatabaseQueryService } from '../services/DatabaseQueryService';
import { WikidataQueryService } from '../services/WikidataQueryService';
import Button from './base/Button.vue';
import Input from './base/Input.vue';

interface Category {
  id: string;
  label: string;
}

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

const queryService = DatabaseQueryService.getInstance();
const wikidataService = WikidataQueryService.getInstance();

const modalType = ref<'period' | 'event' | 'story'>(props.type);
const isCreateMode = ref<boolean>(props.mode === 'create');
const open = ref<boolean>(props.isOpen);

const form = reactive({
  qid: props.data?.wikidata_id || '',
  title: {
    fr: props.data?.label?.fr || props.data?.title?.fr || '',
    en: props.data?.label?.en || props.data?.title?.en || ''
  },
  description: {
    fr: props.data?.description?.fr || '',
    en: props.data?.description?.en || ''
  },
  startDate: props.data?.temporalData?.[0]?.startDate || '',
  endDate: props.data?.temporalData?.[0]?.endDate || '',
  date: props.data?.date || '',
  parentId: props.data?.parent_id || '',
  temporalLocation: props.data?.temporal_location || '',
  author: props.data?.author || '',
  isPublic: props.data?.isPublic || false
});

const qidExistsInBase = ref(false);
const existingItem = ref<any>(null);
const qidError = ref('');

const isValid = computed(() => {
  if (props.type !== 'story' && !form.qid) return false;
  if (!form.title.fr) return false;
  if (props.type === 'period') {
    if (!form.startDate || !form.endDate) return false;
  } else if (props.type === 'event') {
    if (!form.date) return false;
  }
  return true;
});

watch(
  () => props.data,
  (val) => {
    if (props.mode === 'edit' && val) {
      form.qid = val.wikidata_id || '';
      form.title.fr = val.label?.fr || '';
      form.title.en = val.label?.en || '';
      form.description.fr = val.description?.fr || '';
      form.description.en = val.description?.en || '';
      form.date = val.date || '';
      form.startDate = val.start_date || val.startDate || '';
      form.endDate = val.end_date || val.endDate || '';
      form.parentId = val.parent_id || val.parentId || '';
      form.temporalLocation = val.temporal_location || val.temporalLocation || '';
      qidExistsInBase.value = false;
      existingItem.value = val;
    } else {
      form.qid = '';
      form.title.fr = '';
      form.title.en = '';
      form.description.fr = '';
      form.description.en = '';
      form.date = '';
      form.startDate = '';
      form.endDate = '';
      form.parentId = '';
      form.temporalLocation = '';
      qidExistsInBase.value = false;
      existingItem.value = null;
    }
  },
  { immediate: true }
);

const validateQid = async () => {
  if (!form.qid) {
    qidError.value = 'Le Q-id est requis';
    return;
  }

  if (!form.qid.match(/^Q\d+$/)) {
    qidError.value = 'Format de Q-id invalide';
    return;
  }

  try {
    const periods = await queryService.getAllPeriods();
    const period = periods.find(p => p.wikidata_id === form.qid);
    if (period) {
      qidExistsInBase.value = true;
      existingItem.value = period;
      qidError.value = 'Ce Q-id existe déjà dans la base';
    } else {
      qidExistsInBase.value = false;
      existingItem.value = null;
      qidError.value = '';
    }
  } catch (error) {
    qidExistsInBase.value = false;
    existingItem.value = null;
    qidError.value = '';
  }
};

const closeModal = () => {
  open.value = false;
  emit('close');
}

const handleSubmit = async () => {
  try {
    if (props.type !== 'story' && (!form.qid || !form.qid.match(/^Q\d+$/))) {
      window.showToast('Le Q-id doit commencer par Q suivi de chiffres', 'error');
      return;
    }

    let conflict = null;
    if (props.type === 'event') {
      try {
        const existing = await queryService.getEventById(form.qid);
        if (existing && existing.id !== props.data.id) {
          conflict = existing;
        }
      } catch (e) { /* Pas de conflit si non trouvé */ }
    }

    if (conflict) {
      await queryService.deleteEvent(conflict.id);
      window.showToast('Un événement avec ce Q-id existait déjà. Il a été supprimé automatiquement.', 'error');
    }

    const formData = {
      ...form,
      type: modalType.value,
      label: form.title,
      wikidata_id: form.qid,
      start_date: form.startDate,
      end_date: form.endDate,
      parent_id: form.parentId,
      temporal_location: form.temporalLocation,
      author: form.author,
      isPublic: form.isPublic
    };
    if ('id' in formData) {
      delete formData.id;
    }
    emit('submit', formData);
    closeModal();
  } catch (error) {
    window.showToast('Erreur lors de la soumission du formulaire', 'error');
  }
}

function close() {
  emit('close');
}

const openModal = (type: 'period' | 'event' | 'story', mode: 'create' | 'edit', data?: any) => {
  modalType.value = type
  isCreateMode.value = mode === 'create'
  open.value = true

  form.qid = '';
  form.title.fr = '';
  form.title.en = '';
  form.description.fr = '';
  form.description.en = '';
  form.date = '';
  form.startDate = '';
  form.endDate = '';
  form.parentId = '';
  form.temporalLocation = '';

  if (mode === 'edit' && data) {
    form.qid = data.wikidata_id || data.qid || data.wikidataId || '';
    form.title.fr = data.label?.fr || data.title?.fr || '';
    form.title.en = data.label?.en || data.title?.en || '';
    form.description.fr = data.description?.fr || '';
    form.description.en = data.description?.en || '';
    form.date = data.date || '';
    form.startDate = data.start_date || '';
    form.endDate = data.end_date || '';
    form.parentId = data.parent_id || '';
    form.temporalLocation = data.temporal_location || '';
  }
}

const showError = (message: string) => {
  window.showToast(message, 'error');
};

const showSuccess = (message: string) => {
  window.showToast(message, 'success');
};

const fillFromWikidata = async () => {
  if (!form.qid) {
    showError('Veuillez entrer un Q-id Wikidata');
    return;
  }

  try {
    console.log('[EditModal] Début du chargement Wikidata pour Q-id:', form.qid);
    let data;
    if (props.type === 'period') {
      data = await wikidataService.loadPeriod(form.qid);
      console.log('[EditModal] Données période reçues:', data);
    } else if (props.type === 'event') {
      data = await wikidataService.loadEvent(form.qid);
      console.log('[EditModal] Données événement reçues:', data);
    } else {
      showError('Type non supporté pour Wikidata');
      return;
    }

    if (data) {
      console.log('[EditModal] Traitement des données reçues');
      
      // Gestion des labels
      if (typeof data.label === 'string') {
        console.log('[EditModal] Label unique reçu:', data.label);
        form.title.fr = data.label;
        form.title.en = data.label;
      } else if (typeof data.label === 'object' && data.label !== null) {
        console.log('[EditModal] Labels reçus:', data.label);
        form.title.fr = data.label.fr || '';
        form.title.en = data.label.en || '';
      }

      // Gestion des descriptions
      if (data.description) {
        console.log('[EditModal] Descriptions reçues:', data.description);
        form.description.fr = data.description.fr || '';
        form.description.en = data.description.en || '';
      }

      // Gestion des données temporelles pour les périodes
      if (props.type === 'period' && 'temporalData' in data && Array.isArray(data.temporalData) && data.temporalData.length > 0) {
        console.log('[EditModal] Données temporelles reçues:', data.temporalData);
        const temporalData = data.temporalData[0];
        if (temporalData.startDate) {
          form.startDate = temporalData.startDate;
        }
        if (temporalData.endDate) {
          form.endDate = temporalData.endDate;
        }
        if (temporalData.location) {
          form.temporalLocation = temporalData.location;
        }
      }

      console.log('[EditModal] État final du formulaire:', form);
      showSuccess('Données chargées depuis Wikidata');
    }
  } catch (error) {
    console.error('[EditModal] Erreur lors du chargement depuis Wikidata:', error);
    showError('Erreur lors du chargement depuis Wikidata');
  }
};
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
  padding: 2.5rem 2rem;
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
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg) var(--spacing-xl);
}
.form-group {
  margin-bottom: var(--spacing-md);
  display: flex;
  flex-direction: column;
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
}
.form-group textarea {
  min-height: 60px;
  resize: vertical;
}
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.left-actions {
  display: flex;
  gap: 10px;
}
.right-actions {
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
</style> 