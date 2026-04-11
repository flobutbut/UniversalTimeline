import { ref } from 'vue';
import type { Ref } from 'vue';

export function useModalState(initialOpen = false) {
  const isOpen: Ref<boolean> = ref(initialOpen);

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  function toggle() {
    isOpen.value = !isOpen.value;
  }

  return { isOpen, open, close, toggle };
}
