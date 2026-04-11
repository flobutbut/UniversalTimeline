import type { StoryPeriodInput } from '@/types/periodTree';

/** Clé de tri / affichage à partir du label (objet bilingue ou chaîne). */
export function labelKey(p: StoryPeriodInput): string {
  const l = p.label;
  if (l && typeof l === 'object' && 'fr' in l) return (l as { fr?: string }).fr ?? '';
  return typeof l === 'string' ? l : '';
}

/** Comparateur pour trier des entrées story par libellé (locale `fr`). */
export function compareStoryPeriodsByLabel(a: StoryPeriodInput, b: StoryPeriodInput): number {
  return labelKey(a).localeCompare(labelKey(b), 'fr');
}
