<template>
  <div class="feedback-state" :class="[`feedback-state--${kind}`, `feedback-state--${layout}`]" :role="kind === 'error' ? 'alert' : 'status'">
    <LoadingSpinner v-if="kind === 'loading'" />
    <div v-else-if="$slots.icon" class="feedback-state__icon" aria-hidden="true"><slot name="icon" /></div>
    <div class="feedback-state__content">
      <h2 v-if="title" class="feedback-state__title">{{ title }}</h2>
      <div><slot>{{ message || (kind === 'loading' ? 'Chargement…' : 'Aucun résultat') }}</slot></div>
    </div>
    <div v-if="retryable || $slots.actions" class="feedback-state__actions">
      <Button v-if="retryable" variant="tertiary" size="sm" @click="$emit('retry')">{{ retryLabel }}</Button>
      <slot name="actions" />
    </div>
  </div>
</template>
<script setup lang="ts">
import Button from './Button.vue';
import LoadingSpinner from './LoadingSpinner.vue';
withDefaults(defineProps<{ kind?: 'loading' | 'error' | 'empty' | 'success'; layout?: 'inline' | 'panel'; title?: string; message?: string | null; retryable?: boolean; retryLabel?: string }>(), { kind: 'empty', layout: 'panel', retryLabel: 'Réessayer' });
defineEmits<{ retry: [] }>();
</script>
<style scoped>
.feedback-state { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: var(--spacing-sm); padding: var(--spacing-xl); color: var(--color-text-secondary); font: var(--type-body); overflow-wrap: anywhere; }
.feedback-state--panel { flex: 1; flex-direction: column; min-height: 100px; text-align: center; gap: var(--spacing-lg); }
.feedback-state--inline { justify-content: flex-start; padding: var(--spacing-sm) var(--spacing-md); font: var(--type-meta); }
.feedback-state__content { min-width: 0; }
.feedback-state--panel .feedback-state__content { max-width: 460px; }
.feedback-state__title { margin: 0 0 var(--spacing-sm); color: var(--color-text-heading); font: var(--type-panel-title); }
.feedback-state__icon { display: flex; align-items: center; justify-content: center; padding: var(--spacing-lg); border-radius: var(--radius-lg); background: var(--color-surface-subtle); color: var(--color-text-link); }
.feedback-state--error { color: var(--color-status-error-foreground); }
.feedback-state--success { min-height: 0; padding: var(--spacing-lg); gap: var(--spacing-sm); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-status-success-background); color: var(--color-status-success-foreground); font: var(--type-label); }
.feedback-state--success .feedback-state__icon { padding: 0; background: transparent; color: inherit; }
.feedback-state__actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); align-items: center; }
.feedback-state--panel .feedback-state__actions { justify-content: center; }
</style>
