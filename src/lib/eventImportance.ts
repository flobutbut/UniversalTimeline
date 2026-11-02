import type { EventImportance, Story } from '@/types/database';

/** Niveaux du plus au moins important ; `normal` est la valeur par défaut d'un lien. */
export const EVENT_IMPORTANCES: readonly EventImportance[] = ['major', 'normal', 'minor'];

export const EVENT_IMPORTANCE_LABELS: Record<EventImportance, string> = {
  major: 'Majeur',
  normal: 'Normal',
  minor: 'Mineur',
};

/** Copie de la frise avec l'importance d'un de ses événements remplacée. */
export function withEventImportance(story: Story, eventId: string, importance: EventImportance): Story {
  return { ...story, events: story.events.map(event => event.id === eventId ? { ...event, importance } : event) };
}
