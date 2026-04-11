<template>
  <ModalShell :title="modalTitle" height="auto" @close="closeModal">
    <div v-if="editState.loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>Chargement des données...</span>
    </div>
    <div v-else-if="editState.error" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <span>{{ editState.error }}</span>
      <button @click="closeModal">Fermer</button>
    </div>
    <form v-else ref="formEl" @submit.prevent="handleSubmit" class="modal-form">
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
              placeholder="G4.6 · M65 · K11.7 · A230 · 1944-06-06T14:32"
              required
              @blur="refreshDisplay('startDate')"
            />
            <span class="date-preview">{{ displayStart }}</span>
          </div>
          <div class="form-group">
            <Input
              v-model="form.endDate"
              label="Date de fin (vide = aujourd'hui)"
              placeholder="G4.6 · M65 · K11.7 · A230 · 1944-06-06T14:32 · NOW"
              @blur="refreshDisplay('endDate')"
            />
            <span class="date-preview">{{ displayEnd }}</span>
          </div>
        </div>

        <div class="form-row" v-if="type === 'event'">
          <div class="form-group full-width">
            <Input
              v-model="form.date"
              label="Date"
              placeholder="G4.6 · M65 · K11.7 · A230 · 1944-06-06T14:32"
              required
              @blur="refreshDisplay('date')"
            />
            <span class="date-preview">{{ displayEvent }}</span>
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
              <Switch v-model="form.isPublic" :checked="form.isPublic" />
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
    </form>

    <!-- Footer gauche : actions secondaires -->
    <template #footer-left>
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
    </template>

    <!-- Footer droit : validation -->
    <template #footer-right>
      <Button
        variant="primary"
        type="button"
        :disabled="!editState.isValid"
        @click="handleSubmit"
      >
        {{ mode === 'edit' ? 'Mettre à jour' : 'Créer' }}
      </Button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { watch, ref, computed } from 'vue';
import { useEditModal } from '@/composables/useEditModal';
import { useParentChildManagement } from '@/composables/useParentChildManagement';
import { useToast } from '@/composables/useToast';
import { DateService } from '@/services/DateService';
import {
  applyWikidataImportPayloadToFormDraft,
  type WikidataImportPayload,
} from '@/lib/wikidataImportFormMerge';
import ModalShell from '@/components/base/ModalShell.vue';
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

const modalTitle = computed(() => {
  const action = props.mode === 'edit' ? 'Modifier' : 'Créer';
  const subject = props.type === 'period' ? 'une période'
                : props.type === 'event'  ? 'un événement'
                : 'une story';
  return `${action} ${subject}`;
});

// Initialisation des composables
const { form, state: editState, resetForm, updateForm, prepareSubmitData, setQidError, setQidExists, setChildrenCount } = useEditModal(props.type, props.mode, props.data);
const { validateQid: validateQidParentChild } = useParentChildManagement();
const toast = useToast();

// Previews calculés à partir du format de stockage
const displayStart = ref('');
const displayEnd   = ref('');
const displayEvent = ref('');

function refreshDisplay(field: 'startDate' | 'endDate' | 'date') {
  const raw = field === 'startDate' ? form.startDate
            : field === 'endDate'   ? form.endDate
            : form.date;
  if (!raw) { (field === 'startDate' ? displayStart : field === 'endDate' ? displayEnd : displayEvent).value = ''; return; }
  const preview = DateService.format(DateService.parse(raw));
  if (field === 'startDate') displayStart.value = preview;
  else if (field === 'endDate') displayEnd.value = preview;
  else displayEvent.value = preview;
}

// Initialiser les previews quand les données arrivent
watch(() => form.startDate, (v) => { if (v) displayStart.value = DateService.format(DateService.parse(v)); }, { immediate: true });
watch(() => form.endDate,   (v) => { if (v) displayEnd.value   = DateService.format(DateService.parse(v)); }, { immediate: true });
watch(() => form.date,      (v) => { if (v) displayEvent.value = DateService.format(DateService.parse(v)); }, { immediate: true });

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
    toast.show('Erreur lors de la préparation des données', 'error');
  }
};

const handleDelete = () => {
  emit('delete');
};

// Gestion de l'import Wikidata
const handleWikidataImportSuccess = (data: WikidataImportPayload) => {
  applyWikidataImportPayloadToFormDraft(form, data, {
    availableCategoryIds: new Set(editState.categories.map((c: any) => c.id)),
    onChildrenCount: (n) => setChildrenCount(String(n)),
  });
  toast.show('Données chargées depuis Wikidata', 'success');
};

const handleWikidataImportError = (error: string) => {
  console.error('[EditModal] Erreur import Wikidata:', error);
  toast.show(error, 'error');
};

const closeModal = () => {
  emit('close');
};

// Watchers
watch(() => props.data, (val) => { updateForm(val); }, { immediate: true });
watch(() => props.mode, () => {
  if (props.mode === 'create' && (props.data === undefined || props.data === null)) {
    resetForm();
  }
});
watch(() => props.type, () => { resetForm(); });
</script>

<style scoped>
.modal-form {
  width: 100%;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
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
  min-height: calc(var(--spacing-sm) * 15);
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
  height: calc(var(--spacing-sm) * 5);
  line-height: calc(var(--spacing-sm) * 5);
  padding: 0 var(--spacing-sm);
  box-sizing: border-box;
  display: block;
}

.loading-overlay,
.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  color: var(--color-text);
}

.spinner {
  width: calc(var(--spacing-sm) * 5);
  height: calc(var(--spacing-sm) * 5);
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background-color: var(--color-error);
  color: var(--color-text-white);
}

.children-count {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  margin-left: var(--spacing-sm);
}

.switch-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: calc(var(--spacing-2xl) + var(--spacing-md) / 2) 0 var(--spacing-sm) 0;
  min-height: 44px;
}

.switch-label {
  font-weight: 600;
  color: var(--color-text);
  margin-right: var(--spacing-md);
  font-size: var(--font-size-base);
}

.date-preview {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.9em;
  color: var(--color-text-light);
  font-style: italic;
  min-height: 1.2em;
}
</style>
