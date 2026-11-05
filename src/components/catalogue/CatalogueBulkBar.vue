<template>
  <section v-if="count || message || failures.length || uncertain" class="catalogue-bulk" aria-label="Actions groupées">
    <div class="catalogue-bulk__controls">
      <strong role="status">{{ count }} sélectionné(s)</strong>
      <Select v-if="hasAssociations" v-model="storyId" :options="stories ?? []" placeholder="Choisir une frise" :searchable="(stories?.length ?? 0) > 8" compact :disabled="busy || uncertain || !count" />
      <Button v-for="action in actions" :key="action.value" :variant="action.value === 'delete' ? 'danger' : 'tertiary'" size="sm"
        :disabled="busy || uncertain || !count || ((action.value === 'add-story' || action.value === 'remove-story') && !hasSelectedStory)"
        @click="emit('apply', action.value, action.value === 'add-story' || action.value === 'remove-story' ? storyId : undefined)">{{ actionLabels[action.value] }}</Button>
      <Button variant="ghost" size="sm" icon-only aria-label="Désélectionner" title="Désélectionner" :disabled="busy || !count" @click="emit('clear')"><template #icon><Icon icon="mdi:close" aria-hidden="true" /></template></Button>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="uncertain" role="alert">Une réponse n’a pas pu être confirmée. Rechargez les données avant toute nouvelle action. <Button variant="tertiary" size="xs" :disabled="busy" @click="emit('reload')">Recharger les données</Button></p>
    <ul v-if="failures.length" class="catalogue-bulk__failures" role="alert"><li v-for="failure in failures" :key="failure.id"><strong>{{ failure.label }}</strong> : {{ failure.message }}</li></ul>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import type { CatalogueBulkAction } from '@/composables/useCatalogueBulkActions';
const props = defineProps<{ count: number; actions: { value: CatalogueBulkAction; label: string }[]; stories?: { value: string; label: string }[]; busy: boolean; message: string; failures: { id: string; label: string; message: string }[]; uncertain: boolean }>();
const emit = defineEmits<{ apply: [action: CatalogueBulkAction, storyId?: string]; clear: []; reload: [] }>();
const storyId = ref('');
const hasAssociations = computed(() => props.actions.some(action => action.value === 'add-story' || action.value === 'remove-story'));
const hasSelectedStory = computed(() => props.stories?.some(story => story.value === storyId.value) ?? false);
const actionLabels: Record<CatalogueBulkAction, string> = { 'add-story': 'Ajouter à la frise', 'remove-story': 'Retirer de la frise', export: 'Exporter', delete: 'Supprimer', suspend: 'Suspendre', reactivate: 'Réactiver' };
</script>
<style scoped>
.catalogue-bulk { flex-shrink: 0; padding: var(--spacing-md); background: var(--color-surface-subtle); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); }
.catalogue-bulk__controls { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); }
.catalogue-bulk__controls > .base-select { flex: 1 1 200px; min-width: 0; max-width: 320px; }
.catalogue-bulk p, .catalogue-bulk__failures { margin: var(--spacing-sm) 0 0; font-size: var(--font-size-sm); }
.catalogue-bulk__failures { max-height: 160px; overflow: auto; padding-left: var(--spacing-lg); color: var(--color-status-error-foreground); }
</style>
