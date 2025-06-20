// Types globaux pour l'application

declare global {
  interface Window {
    showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  }
}

export interface Tab<T extends string = string> {
  label: string;
  value: T;
  icon?: string;
  disabled?: boolean;
} 