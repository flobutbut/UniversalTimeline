/** Source identities are independent of catalogue UUIDs and the subject's Q-id. */
export interface WikidataSourceTime { time: string; precision?: number; calendarmodel?: string; before?: number; after?: number }
export interface WikidataSource {
  qid: string;
  property: string;
  statementId?: string;
  references: number;
  start?: WikidataSourceTime[];
  end?: WikidataSourceTime[];
}
export function generatedSourceKey(qid: string, origin: 'entity' | 'fact', source?: WikidataSource): string {
  if (origin === 'entity') return `entity:${qid}`;
  if (!source?.statementId) throw new Error('Une déclaration Wikidata est requise pour identifier ce fait.');
  if (source.qid !== qid || !/^P[1-9]\d*$/.test(source.property) || !new RegExp(`^${qid}\\$[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$`, 'i').test(source.statementId)) throw new Error('La provenance de ce fait Wikidata est invalide.');
  return `fact:${qid}:${source.property}:${source.statementId.toLowerCase()}`;
}
