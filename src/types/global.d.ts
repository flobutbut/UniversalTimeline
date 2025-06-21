// Types globaux pour l'application

declare global {
  interface ToastControls {
    show: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => void;
    hide: () => void;
  }
  
  interface Window {
    showToast: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => void;
    toast: ToastControls;
    showConfirm: (title: string, message: string) => Promise<boolean>;
  }
}

export interface Tab<T extends string = string> {
  label: string;
  value: T;
  icon?: string;
  disabled?: boolean;
} 