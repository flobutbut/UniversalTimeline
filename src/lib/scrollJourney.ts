import { introLandmarks } from '@/lib/landingTimeline';

/** Durations for an illustrative zoom, not dates parsed from catalogue records. */
export const JOURNEY_YEAR_SECONDS = 365.25 * 86400;
export interface JourneyChapter {
  id: string;
  label: string;
  title: string;
  description: string;
  duration: number;
  date: string;
  source?: { name: string; url: string };
  stories: string[];
  color: 'period' | 'period-root' | 'event' | 'story';
  example?: boolean;
}
const sourceFor = (id: string) => {
  const landmark = introLandmarks.find(item => item.id === id)!;
  return { name: landmark.sourceName, url: landmark.source };
};
const years = (value: number) => value * JOURNEY_YEAR_SECONDS;
export const journeyChapters: JourneyChapter[] = [
  {
    id: 'universe', label: 'L’Univers', title: 'Au début, tout notre temps tient sur une ligne.',
    description: 'Du Big Bang à aujourd’hui : environ 13,8 milliards d’années. Notre histoire est déjà là, à l’extrémité. Descendez pour vous en approcher.',
    duration: years(13.8e9), date: 'Depuis le Big Bang · ≈ 13,8 milliards d’années',
    source: { name: 'NASA', url: 'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-big-bang/' },
    stories: ['3', '1'], color: 'period',
  },
  {
    id: 'galaxy', label: 'La Voie lactée', title: 'Une galaxie se construit. La nôtre.',
    description: 'La Voie lactée s’assemble progressivement. Son disque épais commence à se former il y a environ 13 milliards d’années. Le Soleil est encore loin d’apparaître.',
    duration: years(13e9), date: 'Formation du disque épais · ≈ 13 milliards d’années',
    source: { name: 'ESA / Gaia', url: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia/Gaia_finds_parts_of_the_Milky_Way_much_older_than_expected' },
    stories: ['1', '3'], color: 'story',
  },
  {
    id: 'solar', label: 'Le Système solaire', title: 'Un Soleil. Puis notre voisinage.',
    description: 'Un nuage de gaz et de poussières s’effondre. Le Soleil et les planètes se forment. Nous venons de laisser des milliards d’années hors du cadre.',
    duration: years(4.6e9), date: 'Formation du Système solaire · ≈ 4,6 milliards d’années',
    source: { name: 'NASA', url: 'https://spaceplace.nasa.gov/solar-system-formation/en/' },
    stories: ['1'], color: 'event',
  },
  {
    id: 'earth', label: 'La Terre', title: 'Notre monde entre dans le cadre.',
    description: 'La Terre se forme peu après les débuts du Système solaire. À cette échelle, les deux repères sont voisins. Tout ce que nous connaissons du vivant va tenir dans cette fenêtre.',
    duration: years(4.54e9), date: 'Formation de la Terre · ≈ 4,54 milliards d’années',
    source: sourceFor('earth'), stories: ['11', '1'], color: 'period',
  },
  {
    id: 'life', label: 'La vie', title: 'Quelque chose commence à vivre.',
    description: 'Des fossiles largement reconnus témoignent d’une vie déjà présente il y a environ 3,5 milliards d’années. Son apparition exacte reste inconnue. Les dinosaures ne sont toujours qu’un détail, tout au bout.',
    duration: years(3.5e9), date: 'Traces fossiles attestées · ≈ 3,5 milliards d’années',
    source: sourceFor('life'), stories: ['2', '11'], color: 'period-root',
  },
  {
    id: 'dinosaurs', label: 'Les dinosaures', title: 'Les géants prennent enfin de la place.',
    description: 'Les premiers dinosaures bien attestés apparaissent au Trias, vers 230 millions d’années avant nous. Leur histoire devient lisible. Celle de notre espèce reste presque invisible.',
    duration: years(230e6), date: 'Premiers dinosaures · ≈ 230 millions d’années',
    source: sourceFor('dinosaurs'), stories: ['2', '11'], color: 'event',
  },
  {
    id: 'extinction', label: 'Après les dinosaures', title: 'Ils disparaissent. Nous ne sommes pas encore là.',
    description: 'Les dinosaures non aviens disparaissent il y a environ 66 millions d’années. Un intervalle immense les sépare encore d’Homo sapiens. Les oiseaux, eux, survivent.',
    duration: years(66e6), date: 'Extinction des dinosaures non aviens · ≈ 66 millions d’années',
    source: sourceFor('extinction'), stories: ['2', '11'], color: 'event',
  },
  {
    id: 'humans', label: 'Notre espèce', title: 'Ce trait minuscule, c’était nous.',
    description: 'Homo sapiens apparaît en Afrique il y a environ 300 000 ans. Notre espèce remplit maintenant la ligne. Les plus anciennes écritures restent serrées contre le présent.',
    duration: years(300e3), date: 'Apparition d’Homo sapiens · ≈ 300 000 ans',
    source: sourceFor('humans'), stories: ['5'], color: 'story',
  },
  {
    id: 'history', label: 'Les histoires écrites', title: 'Des vies commencent à laisser des mots.',
    description: 'En Mésopotamie, les premières écritures apparaissent vers 3200 avant notre ère. Des millénaires d’histoires tiennent dans ce qui n’était qu’un point, quelques écrans plus haut.',
    duration: years(5200), date: 'Premières écritures en Mésopotamie · vers 3200 av. notre ère',
    source: { name: 'British Museum', url: 'https://www.britishmuseum.org/sites/default/files/2019-09/Visit_Mesopotamia_KS2b.pdf' },
    stories: ['10'], color: 'period',
  },
  {
    id: 'lifetime', label: 'Une vie', title: 'Et si la ligne tenait dans une vie ?',
    description: 'Prenons 80 ans pour exemple. Quelques générations deviennent de grandes distances. Une année compte. Une journée est encore un trait presque imperceptible.',
    duration: years(80), date: '80 ans · durée choisie pour l’exemple',
    stories: [], color: 'story', example: true,
  },
  {
    id: 'day', label: 'Une journée', title: 'Ce qui était invisible devient une journée entière.',
    description: 'Vingt-quatre heures. Une durée que l’on connaît de l’intérieur. Le matin, l’après-midi, le soir : nous avons changé d’échelle, pas de temps.',
    duration: 86400, date: '24 heures · durée illustrative',
    stories: [], color: 'period-root', example: true,
  },
  {
    id: 'minute', label: 'Une minute', title: 'Il reste encore de la place pour se rapprocher.',
    description: 'Soixante secondes remplissent maintenant le cadre. Les durées que nous laissions derrière nous ne disparaissent pas : elles continuent au-delà de l’écran.',
    duration: 60, date: '60 secondes · durée illustrative',
    stories: [], color: 'period-root', example: true,
  },
  {
    id: 'second', label: 'Cet instant', title: 'Ce moment aussi fait partie de l’histoire.',
    description: 'Une seconde. Elle se mesure avec le même temps que les milliards d’années du départ. Ce qui a changé, c’est la place que nous lui donnons.',
    duration: 1, date: '1 seconde · durée illustrative',
    stories: [], color: 'story', example: true,
  },
];

export const clampJourneyProgress = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Logarithmic camera movement; positions within each visible ruler stay linear. */
export function journeyFrame(progress: number, reducedMotion = false) {
  const position = clampJourneyProgress(progress) * (journeyChapters.length - 1);
  const index = Math.min(journeyChapters.length - 1, Math.floor(position + 1e-9));
  const from = Math.floor(position);
  const to = Math.min(from + 1, journeyChapters.length - 1);
  const fraction = position - from;
  const eased = fraction * fraction * (3 - 2 * fraction);
  const duration = reducedMotion ? journeyChapters[index].duration : Math.exp(
    Math.log(journeyChapters[from].duration) * (1 - eased) + Math.log(journeyChapters[to].duration) * eased,
  );
  return { index, duration, progress: clampJourneyProgress(progress) };
}

export function journeyDuration(seconds: number): { value: string; unit: string } {
  const choices: [number, string][] = [
    [JOURNEY_YEAR_SECONDS * 1e9, 'milliards d’années'], [JOURNEY_YEAR_SECONDS * 1e6, 'millions d’années'],
    [JOURNEY_YEAR_SECONDS * 1e3, 'milliers d’années'], [JOURNEY_YEAR_SECONDS, 'ans'],
    [86400, 'jours'], [3600, 'heures'], [60, 'minutes'], [1, 'secondes'],
  ];
  // A tolerance prevents floating point endpoints displaying 60 seconds instead of 1 minute.
  const [factor, plural] = choices.find(([factor]) => seconds >= factor * (1 - 1e-12)) ?? choices[choices.length - 1];
  const value = seconds / factor;
  const rounded = Number(value.toPrecision(3));
  const singulars: Record<string, string> = {
    'milliards d’années': 'milliard d’années', 'millions d’années': 'million d’années', 'milliers d’années': 'millier d’années',
    ans: 'an', jours: 'jour', heures: 'heure', minutes: 'minute', secondes: 'seconde',
  };
  const unit = rounded === 1 ? (singulars[plural] ?? plural) : plural;
  return { value: rounded.toLocaleString('fr-FR', { maximumFractionDigits: 2 }), unit };
}

export function journeyTickLabel(age: number, span: number) {
  if (age === 0) return 'Maintenant';
  const formatted = journeyDuration(age);
  const unit = formatted.unit.includes('milliard') ? 'Ga' : formatted.unit.includes('million') ? 'Ma' : formatted.unit.includes('millier') ? 'ka' :
    formatted.unit === 'ans' || formatted.unit === 'an' ? 'ans' : formatted.unit.startsWith('jour') ? 'j' : formatted.unit.startsWith('heure') ? 'h' : formatted.unit.startsWith('minute') ? 'min' : 's';
  return `${span >= JOURNEY_YEAR_SECONDS ? '−' : ''}${formatted.value} ${unit}`;
}
