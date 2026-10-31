import { DateService } from '@/services/DateService';
import type { ListPeriod } from '@/types/database';
import type { Period as GeologicalPeriod } from '@/types/geological';

/** Extrait un Q-id canonique (accepte URL Wikidata, espaces, casse). */
export function normalizeWikidataQId(raw?: string | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (/^Q[1-9]\d*$/i.test(s)) return s.toUpperCase();
  const fromUrl = s.match(/\/entity\/(Q[1-9]\d*)/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  const word = s.match(/\b(Q[1-9]\d*)\b/i);
  return word ? word[1].toUpperCase() : null;
}

/** Mappe un enfant géologique Wikidata vers une entrée finder (non persistée, id préfixé `wikidata:`). */
export function mapWikidataGeologicalChildToListPeriod(
  child: GeologicalPeriod,
  parentDbId: string
): ListPeriod {
  const startDate = child.temporalData[0]?.startDate ?? '';
  const endDate = child.temporalData[0]?.endDate ?? '';
  const qid = child.id;
  return {
    id: `wikidata:${qid}`,
    wikidata_id: qid,
    label: child.label,
    description: child.description,
    startDate,
    endDate,
    startYearsBP: DateService.tryToYearsBP(startDate) ?? undefined,
    endYearsBP: DateService.tryToYearsBP(endDate) ?? undefined,
    parentId: parentDbId,
    hasParent: true,
    hasChildren: child.hasChildren,
    children: [],
    categories: [],
    temporalLocation: 'Globale',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

