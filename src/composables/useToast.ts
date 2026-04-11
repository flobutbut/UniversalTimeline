type ToastType = 'success' | 'error' | 'info';

export function useToast() {
  const show = (message: string, type: ToastType = 'info', duration?: number) => {
    window.toast?.show(message, type, duration);
  };

  const hide = () => {
    window.toast?.hide();
  };

  return { show, hide };
}
