<template>
  <Teleport to="body"><Transition name="toast">
    <div v-if="notification" :key="notification.id" class="toast" :class="notification.type"
      :role="notification.type === 'error' ? 'alert' : 'status'" aria-atomic="true" data-ui-feedback>
      {{ notification.message }}
    </div>
  </Transition></Teleport>
</template>

<script setup lang="ts">
import type { Notification } from '@/stores/useUiStore';
defineProps<{ notification: Notification | null }>();
</script>

<style scoped>
.toast {
  box-sizing: border-box;
  position: fixed;
  bottom: calc(var(--spacing-lg) + var(--spacing-xs));
  right: calc(var(--spacing-lg) + var(--spacing-xs));
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  color: var(--color-text-white);
  font-size: var(--font-size-sm);
  z-index: var(--z-index-tooltip);
  box-shadow: var(--shadow-lg);
  min-width: calc(var(--spacing-xs) * 50);
  max-width: min(calc(var(--spacing-xs) * 100), calc(100vw - 48px));
}

.toast.info {
  background-color: var(--color-primary);
}

.toast.success {
  background-color: var(--color-success);
}

.toast.error {
  background-color: var(--color-error);
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-enter-from,
.toast-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
