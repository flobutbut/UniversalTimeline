<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ mode === 'edit' ? 'Modifier' : 'Créer' }} {{ type === 'period' ? 'une période' : 'un événement' }}</h2>
      </div>
      <form @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Q-id Wikidata</label>
            <input v-model="form.qid" type="text" placeholder="Q12345" @blur="checkQidExistsAndFill" />
            <div v-if="qidExistsInBase" class="qid-alert">
              <span>Ce Q-id existe déjà dans la base. Vous ne pouvez pas créer un doublon.</span>
            </div>
          </div>
          <div class="form-group">
            <label>Titre (fr)</label>
            <input v-model="form.title.fr" type="text" required />
          </div>
          <div class="form-group">
            <label>Titre (en)</label>
            <input v-model="form.title.en" type="text" />
          </div>
          <div class="form-group">
            <label>Description (fr)</label>
            <textarea v-model="form.description.fr" />
          </div>
          <div class="form-group">
            <label>Description (en)</label>
            <textarea v-model="form.description.en" />
          </div>
          <div class="form-group">
            <label>Catégories</label>
            <input v-model="form.categories" type="text" placeholder="Catégories (séparées par des virgules)" />
          </div>
          <template v-if="type === 'period'">
            <div class="form-group">
              <label>Date de début</label>
              <input v-model="form.startDate" type="text" placeholder="Date brute" />
            </div>
            <div class="form-group">
              <label>Date de fin</label>
              <input v-model="form.endDate" type="text" placeholder="Date brute" />
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
          <template v-else>
            <div class="form-group">
              <label>Date</label>
              <input v-model="form.date" type="text" placeholder="Date brute" />
            </div>
          </template>
        </div>
        <div class="modal-actions">
          <button type="submit">{{ mode === 'edit' ? 'Mettre à jour' : 'Créer' }}</button>
          <button type="button" @click="close">Annuler</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, toRefs } from 'vue';
import { DatabaseQueryService } from '../services/DatabaseQueryService';
import { WikidataQueryService } from '../services/WikidataQueryService';

const props = defineProps<{
  isOpen: boolean;
  type: 'period' | 'event';
  mode: 'create' | 'edit';
  data?: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', data: any): void;
}>();

const queryService = DatabaseQueryService.getInstance();
const wikidataService = WikidataQueryService.getInstance();

const modalType = ref<'period' | 'event'>(props.type);
const isCreateMode = ref<boolean>(props.mode === 'create');
const open = ref<boolean>(props.isOpen);

const form = ref({
  qid: '',
  title: { fr: '', en: '' },
  description: { fr: '', en: '' },
  date: '',
  startDate: '',
  endDate: '',
  parentId: '',
  temporalLocation: '',
  categories: []
});

const qidExistsInBase = ref(false);
const existingItem = ref<any>(null);

watch(
  () => props.data,
  (val) => {
    if (props.mode === 'edit' && val) {
      console.log('[EditModal] Données reçues pour édition:', val, 'Clés:', Object.keys(val))
      form.value.qid =
        (val.wikidata_id && typeof val.wikidata_id === 'string' && val.wikidata_id.startsWith('Q')) ? val.wikidata_id :
        (val.id && typeof val.id === 'string' && val.id.startsWith('Q')) ? val.id :
        val.qid || val.wikidataId || '';
      form.value.title = val.label || { fr: '', en: '' }
      form.value.description = val.description || { fr: '', en: '' }
      form.value.date = val.date || ''
      form.value.startDate = val.startDate || ''
      form.value.endDate = val.endDate || ''
      form.value.parentId = val.parentId || ''
      form.value.temporalLocation = val.temporalLocation || ''
      form.value.categories = val.categories || []
      qidExistsInBase.value = false;
      existingItem.value = val;
    } else {
      Object.assign(form.value, {
        qid: '',
        title: { fr: '', en: '' },
        description: { fr: '', en: '' },
        date: '',
        startDate: '',
        endDate: '',
        parentId: '',
        temporalLocation: '',
        categories: []
      });
      qidExistsInBase.value = false;
      existingItem.value = null;
    }
  },
  { immediate: true }
);

async function checkQidExistsAndFill() {
  if (!form.value.qid) {
    qidExistsInBase.value = false;
    existingItem.value = null;
    return;
  }

  // Validation du format du Q-id
  if (!form.value.qid.match(/^Q\d+$/)) {
    window.showToast('Le Q-id doit commencer par Q suivi de chiffres', 'error');
    qidExistsInBase.value = false;
    existingItem.value = null;
    return;
  }

  try {
    if (props.type === 'period') {
      const period = await queryService.loadPeriod(form.value.qid);
      qidExistsInBase.value = true;
      existingItem.value = period;
      window.showToast('Une période avec ce Q-id existe déjà dans la base. Vous pouvez la mettre à jour.', 'info');
    } else if (props.type === 'event') {
      const event = await queryService.getEventById(form.value.qid);
      qidExistsInBase.value = true;
      existingItem.value = event;
      window.showToast('Un événement avec ce Q-id existe déjà dans la base. Vous pouvez le mettre à jour.', 'info');
    }
  } catch (e: any) {
    // Si non trouvé, l'entrée n'existe pas en base locale, on tente Wikidata
    if (e.message === 'Événement non trouvé' || e.message === 'Période non trouvée') {
      qidExistsInBase.value = false;
      existingItem.value = null;
      if (props.type === 'period') {
        try {
          const wikidataPeriod = await wikidataService.loadPeriod(form.value.qid);
          form.value.title.fr = wikidataPeriod.label || '';
          form.value.title.en = wikidataPeriod.label || '';
          form.value.startDate = wikidataPeriod.temporalData?.[0]?.startDate || '';
          form.value.endDate = wikidataPeriod.temporalData?.[0]?.endDate || '';
          window.showToast('Champs pré-remplis depuis Wikidata', 'success');
        } catch (err) {
          window.showToast('Q-id non trouvé sur Wikidata', 'error');
        }
      } else if (props.type === 'event') {
        try {
          const wikidataEvent = await wikidataService.loadEvent(form.value.qid);
          form.value.title.fr = wikidataEvent.label || '';
          form.value.title.en = wikidataEvent.label || '';
          form.value.description.fr = wikidataEvent.description || '';
          form.value.description.en = wikidataEvent.description || '';
          form.value.date = wikidataEvent.date || '';
          window.showToast('Champs pré-remplis depuis Wikidata', 'success');
        } catch (err) {
          window.showToast('Q-id non trouvé sur Wikidata', 'error');
        }
      }
    } else {
      // Autre type d'erreur
      console.error('Erreur lors de la vérification du Q-id:', e);
      window.showToast('Erreur lors de la vérification du Q-id', 'error');
    }
  }
}

const closeModal = () => {
  open.value = false
  emit('close')
}

const handleSubmit = async () => {
  try {
    const formData = {
      ...form.value,
      type: modalType.value
    }
    emit('submit', formData)
    closeModal()
  } catch (error) {
    console.error('Erreur lors de la soumission:', error)
  }
}

function close() {
  emit('close');
}

const openModal = (type: 'period' | 'event', mode: 'create' | 'edit', data?: any) => {
  modalType.value = type
  isCreateMode.value = mode === 'create'
  open.value = true

  // Réinitialiser le formulaire
  form.value = {
    qid: '',
    title: { fr: '', en: '' },
    description: { fr: '', en: '' },
    date: '',
    startDate: '',
    endDate: '',
    parentId: '',
    temporalLocation: '',
    categories: []
  }

  // En mode édition, préremplir les champs
  if (mode === 'edit' && data) {
    console.log('Mode édition - Données reçues:', data)
    form.value = {
      qid: data.wikidata_id || data.qid || data.wikidataId || '',
      title: {
        fr: data.label?.fr || data.title?.fr || '',
        en: data.label?.en || data.title?.en || ''
      },
      description: {
        fr: data.description?.fr || '',
        en: data.description?.en || ''
      },
      date: data.date || '',
      startDate: data.start_date || '',
      endDate: data.end_date || '',
      parentId: data.parent_id || '',
      temporalLocation: data.temporal_location || '',
      categories: data.categories || []
    }
    console.log('Formulaire prérempli:', form.value)
  }
}
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
  margin-bottom: var(--spacing-lg);
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
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}
button[type="submit"] {
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
button[type="submit"]:hover {
  background: var(--color-primary-dark);
}
button[type="button"] {
  background: none;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-xl);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
}
button[type="button"]:hover {
  background: var(--color-surface-hover);
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
.qid-alert {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
  font-weight: 600;
}
</style> 