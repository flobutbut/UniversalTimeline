<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref<'info' | 'success' | 'error'>('info')
let timeoutId: number | null = null;

const show = (msg: string, toastType: 'info' | 'success' | 'error' = 'info', duration: number = 3000) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  message.value = msg
  type.value = toastType
  visible.value = true

  if (duration > 0) {
    timeoutId = window.setTimeout(() => {
      visible.value = false
    }, duration)
  }
}

const hide = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  visible.value = false;
}

defineExpose({
  show,
  hide
})
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  color: var(--color-neutral-0);
  font-size: var(--font-size-sm);
  z-index: var(--z-index-tooltip);
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  max-width: 400px;
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