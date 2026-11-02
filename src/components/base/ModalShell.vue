<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div ref="dialog" class="modal-content" :style="modalStyle" role="dialog" aria-modal="true" :aria-labelledby="`${dialogId}-title`" :aria-busy="busy" tabindex="-1" @click.stop>
      <div class="modal-header">
        <h2 :id="`${dialogId}-title`" class="modal-header__title">{{ title }}</h2>
        <div v-if="$slots['header-right']" class="modal-header__right">
          <slot name="header-right" :dialog-id="dialogId" />
        </div>
      </div>

      <div v-if="$slots['header-bottom']" class="modal-header-bottom"><slot name="header-bottom" /></div>
      <div class="modal-body">
        <slot />
      </div>

      <div class="modal-footer">
        <div class="footer-left">
          <slot name="footer-left" />
        </div>
        <div class="footer-right">
          <Button variant="secondary" type="button" :disabled="busy" @click="$emit('close')">Annuler</Button>
          <slot name="footer-right" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { isModalOverlayDirectClick } from '@/lib/modalOverlayDismiss';
import { useDialog } from '@/composables/useDialog';
import Button from './Button.vue';

const props = defineProps<{
  title: string;
  /** Hauteur fixe de la modale. `'auto'` laisse la modale s'adapter au contenu. Défaut : `'85vh'`. */
  height?: string | 'auto';
  busy?: boolean;
}>();

const modalStyle = computed(() => ({
  height: props.height === 'auto' ? undefined : (props.height ?? '85vh'),
  // An auto-height form scrolls with the overlay instead of overlapping its footer.
}));

const emit = defineEmits<{ (e: 'close'): void }>();
const dialog = ref<HTMLElement>();
const { dialogId, isTop } = useDialog(dialog, { close: () => emit('close'), busy: () => !!props.busy });

const handleOverlayClick = (e: MouseEvent) => {
  if (isTop() && !props.busy && isModalOverlayDirectClick(e)) emit('close');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--overlay-scrim);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: var(--spacing-xl) var(--spacing-md);
  z-index: var(--z-index-modal);
}

.modal-content {
  position: relative;
  background: var(--color-surface-default);
  color: var(--color-text-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl) var(--spacing-2xl);
  width: calc(var(--spacing-xs) * 215);
  max-width: 92vw;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  /* visible : ne pas rogner les listes (Select, etc.) en position absolute sous le corps */
  overflow: visible;
  flex-shrink: 0;
  margin: var(--spacing-2xl) auto;
}

.modal-header {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-shrink: 0;
}

.modal-header-bottom { margin-bottom: var(--spacing-lg); flex-shrink: 0; }

.modal-header__title {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.25;
}

.modal-header__right {
  flex-shrink: 0;
  max-width: min(360px, 52%);
  margin-left: var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

.modal-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.modal-footer {
  position: relative;
  z-index: 0;
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

@media (max-width: 640px) {
  .modal-overlay { padding: var(--spacing-sm); }
  .modal-content { box-sizing: border-box; width: 100%; max-width: 100%; padding: var(--spacing-md); margin: 0; }
  .modal-header { flex-wrap: wrap; }
  .modal-header__right { flex-basis: 100%; max-width: 100%; margin-left: 0; }
  .modal-footer { flex-wrap: wrap; gap: var(--spacing-sm); }
  .footer-left, .footer-right { flex-wrap: wrap; }
}
</style>
