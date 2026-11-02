import { ref } from 'vue';

export type DocumentTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
export const documentTheme = ref<DocumentTheme>('light');

/** Indique si un thème a déjà été enregistré localement (choix utilisateur explicite). */
export function hasUserChosenTheme(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

/** Applique le thème sur `<html>` (tokens dans `variables.css` via `[data-theme]`). */
export function applyDocumentTheme(theme: DocumentTheme, persist = true): void {
  documentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
  if (!persist) return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode / quota */
  }
}

/** Thème persisté ou préférence système. */
export function getStoredOrPreferredTheme(): DocumentTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
