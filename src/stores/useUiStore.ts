import { onScopeDispose, readonly, shallowRef } from 'vue';
import { defineStore } from 'pinia';

export type ToastType = 'info' | 'success' | 'error';
export interface Notification { id: number; message: string; type: ToastType }
export interface Confirmation { id: number; title: string; message: string }

/** One app-owned host, queued confirmations, and no browser globals. */
export const useUiStore = defineStore('ui', () => {
  const notification = shallowRef<Notification | null>(null);
  const confirmation = shallowRef<Confirmation | null>(null);
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue: Array<{ request: Confirmation; resolve: (value: boolean) => void; cleanup: () => void }> = [];

  function hideNotification() {
    clearTimeout(timer);
    timer = undefined;
    notification.value = null;
  }
  function notify(message: string, type: ToastType = 'info', duration = 3000) {
    hideNotification();
    const id = ++sequence;
    notification.value = { id, message, type };
    if (duration > 0) timer = setTimeout(() => {
      if (notification.value?.id === id) hideNotification();
    }, duration);
  }
  function settleConfirmation(id: number, accepted: boolean) {
    const index = queue.findIndex(entry => entry.request.id === id);
    if (index < 0) return;
    const [entry] = queue.splice(index, 1);
    entry.cleanup();
    confirmation.value = queue[0]?.request ?? null;
    entry.resolve(accepted);
  }
  function requestConfirmation(title: string, message: string, signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted) return Promise.resolve(false);
    return new Promise(resolve => {
      const request = { id: ++sequence, title, message };
      const abort = () => settleConfirmation(request.id, false);
      signal?.addEventListener('abort', abort, { once: true });
      queue.push({ request, resolve, cleanup: () => signal?.removeEventListener('abort', abort) });
      confirmation.value = queue[0].request;
    });
  }
  function reset() {
    hideNotification();
    for (const entry of queue.splice(0)) { entry.cleanup(); entry.resolve(false); }
    confirmation.value = null;
  }
  onScopeDispose(reset);
  return { notification: readonly(notification), confirmation: readonly(confirmation), notify, hideNotification, requestConfirmation, settleConfirmation, reset };
});
