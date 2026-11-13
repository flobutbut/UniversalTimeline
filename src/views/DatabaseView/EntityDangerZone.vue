<template>
  <section class="entity-danger-zone" :aria-label="uiText('Zone de danger')">
    <div class="entity-danger-zone__heading">
      <h4 class="entity-danger-zone__title">{{ uiText("Zone de danger") }}</h4>
      <p class="entity-danger-zone__description">{{ description }}</p>
    </div>
    <Button variant="danger" size="sm" :disabled="busy" @click="emit('remove')">{{ uiText("Supprimer de cette frise") }}</Button>
  </section>
</template>
<script setup lang="ts">
import { uiText } from "@/i18n";
import Button from '@/components/base/Button.vue';
defineProps<{ description: string; busy?: boolean }>();
const emit = defineEmits<{ remove: [] }>();
</script>
<style scoped>
.entity-danger-zone.entity-danger-zone { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-sm); padding: var(--spacing-lg); border: 1px solid var(--color-status-error-foreground); border-radius: var(--radius-md); }
.entity-danger-zone__heading { display: flex; flex-direction: column; gap: 0; }
.entity-danger-zone .entity-danger-zone__title { margin: 0; padding: 0; color: var(--color-status-error-foreground); font: var(--type-label); }
.entity-danger-zone .entity-danger-zone__description { margin: 0; padding: 0; color: var(--color-text-secondary); font: var(--type-meta); }
</style>
