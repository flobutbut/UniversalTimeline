/** The laboratory and production page use the same extraction rules. */
export { defaultSettings, profiles, propertyLabels, label, description, statements, itemId, ids, labDate, extractCandidates, evaluate, sourceUrl } from '@/lib/wikidataGenerationModel';
export type { Profile, Status, Statement, Entity, WikidataGenerationCollection as LabSnapshot, WikidataGenerationDate as LabDate, WikidataCandidate as LabItem, WikidataGenerationSettings as LabSettings } from '@/lib/wikidataGenerationModel';
import type { Profile } from '@/lib/wikidataGenerationModel';

export const examples: Array<{ qid: string; label: string; profile: Profile; hint: string }> = [
  { qid: 'Q5593', label: 'Pablo Picasso', profile: 'person', hint: 'Biographie et œuvres' },
  { qid: 'Q46611', label: 'Programme Apollo', profile: 'space', hint: 'Missions et étapes' },
  { qid: 'Q43653', label: 'Apollo 11', profile: 'space', hint: 'Du lancement au retour' },
  { qid: 'Q6534', label: 'Révolution française', profile: 'history', hint: 'Événements historiques' },
  { qid: 'Q362', label: 'Seconde Guerre mondiale', profile: 'history', hint: 'Pertinence et couverture' },
  { qid: 'Q4692', label: 'Renaissance', profile: 'history', hint: 'Dates au siècle' },
  { qid: 'Q45805', label: 'Jurassique', profile: 'geology', hint: 'Temps profond' },
  { qid: 'Q44626', label: 'Crétacé', profile: 'geology', hint: 'Subdivisions obsolètes' },
  { qid: 'Q42934', label: 'Cubisme', profile: 'art', hint: 'Mouvements artistiques' },
];
