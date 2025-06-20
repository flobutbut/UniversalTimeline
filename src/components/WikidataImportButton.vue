<template>
  <Button
    variant="secondary"
    icon="fas fa-database"
    :disabled="!qid || state.loading"
    @click="handleImport"
  >
    <span v-if="state.loading">Chargement...</span>
    <span v-else>Remplir avec Wikidata</span>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/base/Button.vue';
import { useWikidataImport } from '@/composables/useWikidataImport';

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

const { state, importAndTransform } = useWikidataImport();

const handleImport = async () => {
  if (!props.qid) {
    emit('import-error', 'Q-id requis pour l\'import');
    return;
  }

  try {
    const transformedData = await importAndTransform(props.qid, props.type);
    emit('import-success', transformedData);
  } catch (error: any) {
    console.error('[WikidataImportButton] Erreur lors de l\'import:', error);
    emit('import-error', error.message || 'Erreur lors de l\'import depuis Wikidata');
  }
};
</script>

<style scoped>
/* Styles spécifiques si nécessaire */
</style> 