<template>
  <Transition name="confirm-modal">
    <div v-if="isOpen" class="modal-overlay" @click="handleCancel">
      <div class="modal-content" @click.stop>
        <h3 class="modal-title">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
        <div class="modal-footer">
          <Button variant="secondary" @click="handleCancel">Annuler</Button>
          <Button variant="danger" @click="handleConfirm">Confirmer</Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from './Button.vue';

const isOpen = ref(false);
const title = ref('');
const message = ref('');

let resolvePromise: (value: boolean) => void;

const show = (newTitle: string, newMessage: string): Promise<boolean> => {
  title.value = newTitle;
  message.value = newMessage;
  isOpen.value = true;
  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
};

const handleConfirm = () => {
  isOpen.value = false;
  if (resolvePromise) {
    resolvePromise(true);
  }
};

const handleCancel = () => {
  isOpen.value = false;
  if (resolvePromise) {
    resolvePromise(false);
  }
};

defineExpose({ show });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000; /* Plus haut que la modale d'édition */
}

.modal-content {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
  text-align: center;
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
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

.confirm-modal-enter-active,
.confirm-modal-leave-active {
  transition: opacity var(--transition-fast);
}

.confirm-modal-enter-from,
.confirm-modal-leave-to {
  opacity: 0;
}
</style> 