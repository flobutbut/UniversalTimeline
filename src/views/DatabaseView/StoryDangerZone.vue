<template>
  <section class="story-danger-zone" aria-labelledby="story-danger-zone-title">
    <h4 id="story-danger-zone-title">{{ uiText("Actions sensibles") }}</h4>
    <div class="story-danger-zone__row">
      <div>
        <p class="story-danger-zone__label">{{ uiText("Visibilité :") }} {{ uiText(story.isPublic ? 'publique' : 'privée') }}</p>
        <p class="story-danger-zone__hint">{{ uiText(story.isPublic ? 'Une frise privée n’est visible que par vous.' : 'Une frise publique est visible par tous dans la timeline.') }}</p>
      </div>
      <Button variant="danger" size="sm" type="button" :disabled="busy" @click="emit('toggle-visibility')">{{ uiText(story.isPublic ? 'Rendre privée' : 'Rendre publique') }}</Button>
    </div>
    <div class="story-danger-zone__row">
      <div>
        <p class="story-danger-zone__label">{{ uiText("Supprimer la frise") }}</p>
        <p class="story-danger-zone__hint">{{ uiText("La frise est supprimée définitivement ; ses périodes et événements restent dans le catalogue.") }}</p>
      </div>
      <Button variant="danger" size="sm" type="button" :disabled="busy" @click="emit('delete')">{{ uiText("Supprimer la frise") }}</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { uiText } from "@/i18n";
import Button from '@/components/base/Button.vue';
import type { Story } from '@/types/database';

defineProps<{
  story: Story;
  busy?: boolean;
}>();

const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'toggle-visibility'): void;
}>();
</script>

<style scoped>
.story-danger-zone { max-width: 960px; border: 1px solid var(--color-status-error-foreground); border-radius: var(--radius-md); }
.story-danger-zone h4 { margin: 0; padding: var(--spacing-lg); font-size: var(--font-size-base); color: var(--color-status-error-foreground); border-bottom: 1px solid var(--color-border-default); }
.story-danger-zone__row { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-md); padding: var(--spacing-lg); }
.story-danger-zone__row + .story-danger-zone__row { border-top: 1px solid var(--color-border-default); }
.story-danger-zone__label { margin-bottom: 0; font-weight: var(--font-weight-semibold); }
.story-danger-zone__hint { margin-bottom: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
</style>
