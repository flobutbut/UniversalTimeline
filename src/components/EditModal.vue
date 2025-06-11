<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal">
      <h3 class="modal-title">{{ isEdit ? 'Éditer' : 'Ajouter' }} {{ type === 'period' ? 'une période' : 'un événement' }}</h3>
      <form @submit.prevent="submit" class="modal-form">
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
          <button type="submit">{{ isEdit ? 'Mettre à jour' : 'Créer' }}</button>
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
  show: boolean;
  type: 'period' | 'event';
  isEdit: boolean;
  data?: any;
}>();
const emit = defineEmits(['close', 'submit']);

const queryService = DatabaseQueryService.getInstance();
const wikidataService = WikidataQueryService.getInstance();

const defaultForm = {
  qid: '',
  title: { fr: '', en: '' },
  description: { fr: '', en: '' },
  categories: '',
  startDate: '',
  endDate: '',
  parentId: '',
  temporalLocation: '',
  date: ''
};

const form = reactive({ ...defaultForm });
const qidExistsInBase = ref(false);

watch(
  () => props.data,
  (val) => {
    if (props.isEdit && val) {
      Object.assign(form, {
        qid: val.wikidataId || '',
        title: val.label || { fr: '', en: '' },
        description: val.description || { fr: '', en: '' },
        categories: val.categories ? val.categories.map((c: any) => c.label.fr).join(', ') : '',
        startDate: val.startDate || '',
        endDate: val.endDate || '',
        parentId: val.parentId || '',
        temporalLocation: val.temporalLocation || '',
        date: val.date || ''
      });
      qidExistsInBase.value = false;
    } else {
      Object.assign(form, defaultForm);
      qidExistsInBase.value = false;
    }
  },
  { immediate: true }
);

async function checkQidExistsAndFill() {
  if (!form.qid) {
    qidExistsInBase.value = false;
    return;
  }
  try {
    if (props.type === 'period') {
      await queryService.loadPeriod(form.qid);
      window.showToast('Une période avec ce Q-id existe déjà dans la base.', 'error');
      qidExistsInBase.value = true;
    } else if (props.type === 'event') {
      await queryService.getEventById?.(form.qid);
      window.showToast('Un événement avec ce Q-id existe déjà dans la base.', 'error');
      qidExistsInBase.value = true;
    }
  } catch (e: any) {
    // Si 404, l'entrée n'existe pas en base locale, on tente Wikidata
    qidExistsInBase.value = false;
    if (props.type === 'period') {
      try {
        const wikidataPeriod = await wikidataService.loadPeriod(form.qid);
        form.title.fr = wikidataPeriod.label || '';
        form.title.en = wikidataPeriod.label || '';
        form.startDate = wikidataPeriod.temporalData?.[0]?.startDate || '';
        form.endDate = wikidataPeriod.temporalData?.[0]?.endDate || '';
        window.showToast('Champs pré-remplis depuis Wikidata', 'success');
      } catch (err) {
        window.showToast('Q-id non trouvé sur Wikidata', 'error');
      }
    } else if (props.type === 'event') {
      try {
        const wikidataEvent = await wikidataService.loadEvent(form.qid);
        form.title.fr = wikidataEvent.label || '';
        form.title.en = wikidataEvent.label || '';
        form.description.fr = wikidataEvent.description || '';
        form.description.en = wikidataEvent.description || '';
        form.date = wikidataEvent.date || '';
        window.showToast('Champs pré-remplis depuis Wikidata', 'success');
      } catch (err) {
        window.showToast('Q-id non trouvé sur Wikidata', 'error');
      }
    }
  }
}

function close() {
  emit('close');
}

function submit() {
  emit('submit', { ...form });
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  min-width: 700px;
  max-width: 90vw;
  box-shadow: var(--shadow-xl);
  position: relative;
}
.modal-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
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
  .modal {
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