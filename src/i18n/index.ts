import { ref } from 'vue';
import english from './en.json';

export type Language = 'fr' | 'en';
const storageKey = 'universal-timeline.language';
export const language = ref<Language>('fr');
const messages: Record<string, string> = english;

export function initializeLanguage() {
  let saved: string | null = null;
  try { saved = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
  const preferences = navigator.languages?.length ? navigator.languages : [navigator.language];
  const supported = preferences.map(tag => tag?.toLowerCase().split('-')[0]).find(tag => tag === 'fr' || tag === 'en');
  language.value = saved === 'en' || saved === 'fr' ? saved : supported === 'en' ? 'en' : 'fr';
  document.documentElement.lang = language.value;
}

export function setLanguage(value: Language) {
  language.value = value;
  document.documentElement.lang = value;
  try { localStorage.setItem(storageKey, value); } catch { /* The session preference still applies. */ }
}

export function uiText<T>(source: T): T {
  if (language.value === 'fr' || typeof source !== 'string') return source;
  return (Object.prototype.hasOwnProperty.call(messages, source) ? messages[source] : source) as T;
}

export function localizedText(text: { fr?: string | null; en?: string | null } | null | undefined): string {
  return text?.[language.value]?.trim() || text?.[language.value === 'fr' ? 'en' : 'fr']?.trim() || '';
}

/** Keep substituted names, dates and user content intact when translating a sentence. */
export function uiFormat(parts: TemplateStringsArray, ...values: unknown[]): string {
  const source = parts.reduce((text, part, index) => text + (index ? '{' + (index - 1) + '}' : '') + part, '');
  return uiText(source).replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)]));
}

export function contentLanguage(text?: { fr?: string | null; en?: string | null } | null): Language {
  const other = language.value === 'fr' ? 'en' : 'fr';
  return text?.[language.value]?.trim() || !text?.[other]?.trim() ? language.value : other;
}
