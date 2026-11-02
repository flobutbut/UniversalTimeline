import type { EventImportance, StorySuggestion } from '@/types/database';

/** Écart maximal, en % de la vue, pour qu'un événement marque la borne d'une période. */
export const BOUNDARY_TOLERANCE_PCT = 0.5;

export interface EventPrioritySignals {
  /** Choix de l'auteur pour cette frise ; prime sur tous les signaux calculés. */
  importance: EventImportance;
  /** L'événement ouvre une frise enfant de la frise courante. */
  anchorsChildStory: boolean;
  /** Sa date coïncide avec le début ou la fin d'une période affichée (ou de la vue). */
  marksBoundary: boolean;
  /** Nombre d'autres frises qui le contiennent. */
  relatedStoryCount: number;
  hasDescription: boolean;
}

/** Signaux tirés de la structure de la frise ; aucune lecture supplémentaire. */
export function eventPrioritySignals(
  leftPct: number,
  boundariesPct: readonly number[],
  links: readonly StorySuggestion[],
  storyId: string,
  hasDescription: boolean,
  importance: EventImportance = 'normal',
): EventPrioritySignals {
  const childLinks = links.filter(link => link.parentStoryId !== null && String(link.parentStoryId) === String(storyId));
  return {
    importance,
    anchorsChildStory: childLinks.length > 0,
    marksBoundary: boundariesPct.some(edge => Math.abs(edge - leftPct) <= BOUNDARY_TOLERANCE_PCT),
    relatedStoryCount: links.length - childLinks.length,
    hasDescription,
  };
}

const IMPORTANCE_RANK: Record<EventImportance, number> = { major: 2, normal: 1, minor: 0 };

/**
 * Ordre de priorité : importance choisie, puis frise enfant, borne de période, frises associées,
 * description. Négatif si `a` passe avant.
 */
export function compareEventPriority(a: EventPrioritySignals, b: EventPrioritySignals): number {
  return IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance]
    || Number(b.anchorsChildStory) - Number(a.anchorsChildStory)
    || Number(b.marksBoundary) - Number(a.marksBoundary)
    || b.relatedStoryCount - a.relatedStoryCount
    || Number(b.hasDescription) - Number(a.hasDescription);
}
