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