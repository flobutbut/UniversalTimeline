/**
 * Mappe les classes Wikidata (P31/P279) vers les catégories locales.
 *
 * Pour chaque catégorie locale on liste les Q-ids Wikidata qui, s'ils apparaissent
 * dans P31 ou P279 de l'entité importée, déclenchent l'attribution de la catégorie.
 */

// Catégories locales → Q-ids Wikidata déclencheurs
const WIKIDATA_CLASS_TO_CATEGORY: Record<string, string[]> = {
  CAT_COSMO: [
    'Q1137750', // cosmological event
    'Q83478',   // cosmology
    'Q1075',    // color... skip — cosmological epoch
    'Q498787',  // cosmological epoch
    'Q1322908', // cosmic era
    'Q15328',   // cosmic structure
  ],
  CAT_ASTRO: [
    'Q523',     // star
    'Q6999',    // astronomical object
    'Q3863',    // asteroid
    'Q318',     // galaxy
    'Q11282',   // nebula
    'Q44559',   // solar system
    'Q67206691',// astronomical event
    'Q8068',    // supernova
    'Q2469',    // planet
    'Q107534',  // star cluster
    'Q545449',  // natural satellite
    'Q184616',  // comet
  ],
  CAT_PHYS: [
    'Q413',     // physics
    'Q2095685', // physical phenomenon
    'Q11012',   // robot? no — particle physics below
    'Q39297',   // quantum mechanics
    'Q2111',    // thermodynamics
    'Q11101',   // force (physics)
    'Q2111',    // thermodynamics
  ],
  CAT_PART: [
    'Q11012',   // particle physics (discipline)
    'Q13134',   // elementary particle
    'Q26732',   // quark
    'Q11367',   // lepton
    'Q39369',   // boson
    'Q3235978', // hadron era
  ],
  CAT_GEO: [
    'Q4005761', // geochronological unit
    'Q4005689', // chronostratigraphic unit
    'Q1066',    // geology
    'Q3839081', // glaciation
    'Q39546',   // ice age
    'Q1326',    // supercontinent
    'Q205702',  // geological formation
    'Q35758',   // landform
    'Q908',     // mountain range
    'Q46831',   // mountain
    'Q166376',  // volcanic eruption
    'Q8502',    // mountain (Q8502 = mountain)
    'Q1149131', // tectonic plate
    'Q2372385', // impact event
    'Q5307737', // glacial period
  ],
  CAT_OCEAN: [
    'Q8585',    // ocean
    'Q33999',   // sea
    'Q165',     // sea (alt)
    'Q9612',    // deep sea
  ],
  CAT_CHEM: [
    'Q2329',    // chemistry
    'Q11173',   // chemical compound
    'Q141022',  // mineral
    'Q131656',  // nucleosynthesis
    'Q43455',   // chemical element
    'Q11344',   // chemical element (alt)
  ],
  CAT_MICRO: [
    'Q10876',   // bacteria
    'Q19350530',// microorganism
    'Q7239',    // organism (narrow use — only if no other cat matches)
    'Q4952',    // archaea
    'Q811883',  // cyanobacteria
    'Q593644',  // prokaryote
  ],
  CAT_BIO_EVO: [
    'Q16521',   // taxon
    'Q1622272', // evolutionary biology
    'Q178790',  // extinction event
    'Q7150',    // extinction
    'Q26711',   // speciation
    'Q11639',   // evolution
    'Q3539780', // biodiversification
    'Q1340547', // evolutionary event
    'Q23058',   // dinosaur
    'Q7377',    // mammal
    'Q7358',    // primate
    'Q152',     // fish
    'Q10908',   // amphibian
    'Q1390',    // insect
    'Q756',     // plant
    'Q729',     // animal
  ],
  CAT_PALEO: [
    'Q28853',   // paleontology
    'Q23058',   // dinosaur
    'Q39831',   // fossil
    'Q2168020', // prehistoric fauna
    'Q1302863', // paleoecology
    'Q854022',  // ancient life
  ],
  CAT_BOT: [
    'Q756',     // plant
    'Q25314',   // algae
    'Q1136609', // land plant
    'Q147304',  // embryophyte
    'Q17488',   // tree
    'Q190736',  // flower
  ],
  CAT_ECO_SYS: [
    'Q37813',   // ecosystem
    'Q1321064', // biome
    'Q11369',   // biodiversity
    'Q44763',   // mass extinction
  ],
  CAT_ANTHRO: [
    'Q5',       // human
    'Q9715',    // Hominidae
    'Q3238722', // hominid
    'Q7725634', // prehistoric people
    'Q34770',   // language
    'Q15253',   // cave art
    'Q1914636', // archaeology
    'Q2140786', // stone age
    'Q11751',   // Paleolithic
    'Q5686',    // Neolithic
  ],
  CAT_HIST: [
    'Q198',     // war
    'Q178561',  // battle
    'Q8889',    // revolution
    'Q11514315',// historical period
    'Q6256',    // country
    'Q21199',   // political event
    'Q4413091', // major political event
    'Q107642044',// historical event
    'Q28754',   // empire
    'Q7275',    // state
    'Q108823170',// founding of a state
    'Q2465508', // treaty
    'Q192703',  // regime change
  ],
  CAT_ART: [
    'Q838948',  // work of art
    'Q3305213', // painting
    'Q11424',   // film
    'Q7366',    // song
    'Q2188189', // musical work
    'Q483394',  // genre
    'Q4178',    // painting (Q4178 = painting art)
    'Q15328',   // cosmic structure... skip — only ART
    'Q46855',   // cave painting
    'Q735',     // art
  ],
  CAT_PHILO: [
    'Q9121',    // religion
    'Q5891',    // philosophy
    'Q5879',    // political philosophy
    'Q483677',  // religious figure
    'Q2018526', // belief system
    'Q9292',    // islam
    'Q5043',    // christianity
    'Q748',     // judaism
    'Q9156',    // buddhism
  ],
  CAT_TECH: [
    'Q11629',   // technology
    'Q2061711', // invention
    'Q12748',   // tool
    'Q7141',    // spacecraft
    'Q13974',   // space exploration
    'Q3196',    // fire
    'Q1385548', // technological innovation
    'Q483247',  // phenomenon
    'Q483426',  // industrial revolution (period)
  ],
  CAT_ECO: [
    'Q159810',  // economy
    'Q4830453', // business
    'Q3932296', // economic activity
    'Q7391',    // market
    'Q13218644',// economic concept
    'Q8161',    // capitalism
  ],
};

// Index inversé Q-id → [cat1, cat2, ...]
const QCLASS_TO_CATS = new Map<string, string[]>();
for (const [catId, qids] of Object.entries(WIKIDATA_CLASS_TO_CATEGORY)) {
  for (const qid of qids) {
    if (!QCLASS_TO_CATS.has(qid)) QCLASS_TO_CATS.set(qid, []);
    QCLASS_TO_CATS.get(qid)!.push(catId);
  }
}

/**
 * Convertit une liste de Q-ids de classes Wikidata en catégories locales.
 * Retourne les IDs de catégories sans doublon, dans un ordre stable.
 */
export function mapWikidataClassesToCategories(wikidataClassQids: string[]): string[] {
  const result = new Set<string>();
  for (const qid of wikidataClassQids) {
    const cats = QCLASS_TO_CATS.get(qid);
    if (cats) cats.forEach(c => result.add(c));
  }
  return [...result];
}
