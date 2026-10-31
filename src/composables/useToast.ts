import { useUiStore, type ToastType } from '@/stores/useUiStore';

export function useToast() {
  const ui = useUiStore();
  const show = (message: string, type: ToastType = 'info', duration?: number) => {
    ui.notify(message, type, duration);
  };

  const hide = () => {
    ui.hideNotification();
  };

  return { show, hide };
}
