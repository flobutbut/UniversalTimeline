<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('cancel')">
      <div ref="dialog" class="modal-content" role="alertdialog" aria-modal="true" :aria-labelledby="`${id}-title`" :aria-describedby="`${id}-message`" tabindex="-1" @click.stop>
        <h3 :id="`${id}-title`" class="modal-title">{{ title }}</h3>
        <p :id="`${id}-message`" class="modal-message">{{ message }}</p>
        <div class="modal-footer">
          <Button variant="secondary" @click="$emit('cancel')">Annuler</Button>
          <Button variant="danger" @click="$emit('confirm')">Confirmer</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from './Button.vue';
import { useDialog } from '@/composables/useDialog';

defineProps<{ title: string; message: string }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const dialog = ref<HTMLElement>();
const { dialogId: id } = useDialog(dialog, { close: () => emit('cancel') });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--overlay-scrim-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal-nested); /* Plus haut que la modale d'édition */
}

.modal-content {
  box-sizing: border-box;
  background: var(--color-surface-default);
  color: var(--color-text-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
  text-align: center;
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--spacing-sm) 0;
}

.modal-message {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
}

</style>
