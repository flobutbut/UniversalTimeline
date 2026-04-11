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
  /** Texte secondaire affiché sous le label, en plus petit (`--font-size-sm`). */
  sublabel?: string;
  value: T;
  icon?: string;
  disabled?: boolean;
  /** Badge numérique affiché à droite du label (variant `underline`). */
  count?: number;
} 