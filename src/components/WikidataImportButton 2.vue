<template>
  <Button
    variant="secondary"
    icon="fas fa-database"
    :disabled="!qid || isLoading"
    @click="handleImport"
  >
    <span v-if="isLoading">Chargement...</span>
    <span v-else>Remplir avec Wikidata</span>
  </Button>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import { useWikidataImport } from '@/composables/useWikidataImport';
import {
  WIKIDATA_IMPORT_QID_REQUIRED_MSG,
  wikidataImportErrorMessage,
} from '@/lib/wikidataImportButtonHelpers';

interface Props {
  qid: string;
  type: 'period' | 'event';
}

interface Emits {
  (e: 'import-success', data: any): void;
  (e: 'import-error', error: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { isLoading, importAndTransform } = useWikidataImport();

const handleImport = async () => {
  if (!props.qid) {
    emit('import-error', WIKIDATA_IMPORT_QID_REQUIRED_MSG);
    return;
  }

  try {
    const transformedData = await importAndTransform(props.qid, props.type);
    emit('import-success', transformedData);
  } catch (error: unknown) {
    console.error('[WikidataImportButton] Erreur lors de l\'import:', error);
    emit('import-error', wikidataImportErrorMessage(error));
  }
};
</script>

<style scoped>
/* Styles spécifiques si nécessaire */
</style> 