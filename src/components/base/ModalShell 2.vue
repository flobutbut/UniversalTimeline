<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" :style="modalStyle" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
      </div>

      <div class="modal-body">
        <slot />
      </div>

      <div class="modal-footer">
        <div class="footer-left">
          <slot name="footer-left" />
        </div>
        <div class="footer-right">
          <Button variant="secondary" type="button" @click="$emit('close')">Annuler</Button>
          <slot name="footer-right" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { isEscapeKeyboardEvent, isModalOverlayDirectClick } from '@/lib/modalOverlayDismiss';
import Button from './Button.vue';

const props = defineProps<{
  title: string;
  /** Hauteur fixe de la modale. `'auto'` laisse la modale s'adapter au contenu. Défaut : `'85vh'`. */
  height?: string | 'auto';
}>();

const modalStyle = computed(() => ({
  height: props.height === 'auto' ? undefined : (props.height ?? '85vh'),
  maxHeight: props.height === 'auto' ? '85vh' : undefined,
}));

const emit = defineEmits<{ (e: 'close'): void }>();

const handleOverlayClick = (e: MouseEvent) => {
  if (isModalOverlayDirectClick(e)) emit('close');
};

const handleEscape = (e: KeyboardEvent) => {
  if (isEscapeKeyboardEvent(e)) emit('close');
};

onMounted(() => document.addEventListener('keydown', handleEscape));
onUnmounted(() => document.removeEventListener('keydown', handleEscape));
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--overlay-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
}

.modal-content {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl) var(--spacing-2xl);
  width: calc(var(--spacing-xs) * 215);
  max-width: 92vw;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.modal-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-lg);
  flex-shrink: 0;
}

.footer-left,
.footer-right {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}
</style>
