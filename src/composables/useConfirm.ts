import { getCurrentScope, onScopeDispose } from 'vue';
import { useUiStore } from '@/stores/useUiStore';

export function useConfirm() {
  const ui = useUiStore();
  const pending = new Set<AbortController>();
  let disposed = false;
  if (getCurrentScope()) onScopeDispose(() => {
    disposed = true;
    for (const controller of pending) controller.abort();
    pending.clear();
  });
  return async (title: string, message: string): Promise<boolean> => {
    if (disposed) return false;
    const controller = new AbortController();
    pending.add(controller);
    try {
      const accepted = await ui.requestConfirmation(title, message, controller.signal);
      return !disposed && !controller.signal.aborted && accepted;
    }
    finally { pending.delete(controller); }
  };
}
