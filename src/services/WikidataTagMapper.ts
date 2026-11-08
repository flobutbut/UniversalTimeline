/**
 * Classes Wikidata (P31/P279) qui suggèrent un domaine à l'import. Libellés vérifiés sur Wikidata le 8 novembre 2026.
 * L'ordre des domaines compte : le premier reconnu devient le tag principal proposé.
 */
const WIKIDATA_CLASS_TO_TAG: Record<string, string[]> = {
  conflits: ['Q198', 'Q178561', 'Q188055', 'Q124734', 'Q645883', 'Q180684', 'Q350604', 'Q1261499', 'Q831663'], // guerre, bataille, siège, rébellion, opération, conflit, conflit armé, bataille navale, campagne
  'pouvoir-institutions': ['Q10931', 'Q131569', 'Q40231', 'Q7188', 'Q820655', 'Q7748', 'Q45382'], // révolution, traité, élection, gouvernement, statut, loi, coup d'État
  'economie-echanges': ['Q8142', 'Q290178', 'Q4830453'], // monnaie, crise économique, entreprise
  'sante-corps': ['Q12136', 'Q3241045', 'Q44512', 'Q12184'], // maladie, flambée, épidémie, pandémie
  catastrophes: ['Q3839081', 'Q8065', 'Q7944', 'Q8070', 'Q168247', 'Q8068'], // catastrophe, catastrophe naturelle, séisme, tsunami, famine, inondation
  'techniques-inventions': ['Q11016', 'Q39546', 'Q11019', 'Q40218', 'Q26529', 'Q5916', 'Q2133344'], // technologie, outil, machine, vaisseau, sonde, vol spatial, mission spatiale
  'territoires-exploration': ['Q2401485', 'Q5916', 'Q2133344'], // expédition, vol spatial, mission spatiale (en second)
  'sciences-savoirs': ['Q11862829', 'Q336', 'Q17737', 'Q2465832'], // discipline, science, théorie, branche scientifique
  'philosophie-ideologies': ['Q5891', 'Q7257', 'Q12909644'], // philosophie, idéologie, idéologie politique
  'religions-spiritualites': ['Q9174', 'Q1530022', 'Q13414953'], // religion, organisation religieuse, dénomination
  'arts-culture-loisirs': ['Q838948', 'Q3305213', 'Q11424', 'Q7366', 'Q2188189', 'Q968159', 'Q571', 'Q7725634', 'Q47461344'], // œuvre, peinture, film, chanson, œuvre musicale, mouvement artistique, livre, œuvre littéraire, œuvre écrite
  sport: ['Q16510064', 'Q349', 'Q500834', 'Q159821'], // événement sportif, sport, tournoi, Jeux d'été
  cosmos: ['Q6999', 'Q523', 'Q3863', 'Q318', 'Q634', 'Q3937', 'Q3559', 'Q3887'], // objet astronomique, étoile, astéroïde, galaxie, planète, supernova, comète, éclipse
  terre: ['Q8072', 'Q7692360'], // volcan, éruption
  vivant: ['Q16521', 'Q123509', 'Q7377'], // taxon, extinction, mammifère
};

const TAGS_BY_CLASS = new Map<string, string[]>();
for (const [tag, classes] of Object.entries(WIKIDATA_CLASS_TO_TAG)) {
  for (const qid of classes) TAGS_BY_CLASS.set(qid, [...(TAGS_BY_CLASS.get(qid) ?? []), tag]);
}

export function mapWikidataClassesToTags(classes: readonly string[]): string[] {
  return [...new Set(classes.flatMap(qid => TAGS_BY_CLASS.get(qid) ?? []))];
}
