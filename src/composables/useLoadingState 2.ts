import { ref } from 'vue';

export function useLoadingState() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function execute<T>(fn: () => Promise<T>): Promise<T | null> {
    isLoading.value = true;
    error.value = null;
    try {
      return await fn();
    } catch (e: any) {
      error.value = e?.message ?? 'Une erreur est survenue';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  function reset() {
    isLoading.value = false;
    error.value = null;
  }

  return { isLoading, error, execute, clearError, reset };
}
