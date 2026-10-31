/** Rounded, sourced examples, independent of the live catalogue. */
export const EARTH_AGE = 4_540_000_000;
export const HUMAN_AGE = 300_000;
export type IntroScaleId = 'earth' | 'dinosaurs' | 'humans' | 'inventions';
export interface IntroBand {
  id: string; label: string; from: number; to: number;
  color: 'period' | 'period-root' | 'event' | 'story'; dateLabel: string;
}
export interface IntroLandmark {
  id: string; title: string; date: string; description: string; source: string; sourceName: string;
}
export const introLandmarks: IntroLandmark[] = [
  { id: 'earth', title: 'Formation de la Terre', date: '≈ 4,54 milliards d’années',
    description: 'Notre point de départ : la formation de la Terre, dans le jeune Système solaire. Tout ce qui suit tient sur cette même ligne.',
    source: 'https://pubs.usgs.gov/gip/geotime/age.html', sourceName: 'USGS' },
  { id: 'life', title: 'Premières traces de vie', date: '≈ 3,5 milliards d’années',
    description: 'Des fossiles largement reconnus attestent déjà la présence de vie. La date exacte de son apparition reste inconnue ; certains indices plus anciens sont débattus.',
    source: 'https://www.nhm.ac.uk/discover/origin-of-life-on-earth.html', sourceName: 'Natural History Museum' },
  { id: 'dinosaurs', title: 'Premiers dinosaures', date: '≈ 230 millions d’années',
    description: 'Les premiers dinosaures bien attestés apparaissent au Trias. À cette échelle, leur histoire commence très près de nous, tout à droite.',
    source: 'https://www.nhm.ac.uk/discover/where-did-dinosaurs-come-from.html', sourceName: 'Natural History Museum' },
  { id: 'extinction', title: 'Extinction des dinosaures', date: '≈ 66 millions d’années',
    description: 'Les dinosaures non aviens disparaissent lors de la crise de fin du Crétacé. Les oiseaux, eux aussi des dinosaures, survivent.',
    source: 'https://www.nhm.ac.uk/discover/dinosaur-extinction.html', sourceName: 'Natural History Museum' },
  { id: 'humans', title: 'Homo sapiens', date: '≈ 300 000 ans',
    description: 'Notre espèce apparaît en Afrique. Toute son histoire représente environ 0,0066 % de celle de la Terre. Les autres espèces humaines ont une histoire plus ancienne.',
    source: 'https://humanorigins.si.edu/evidence/human-fossils/species/homo-sapiens', sourceName: 'Smithsonian' },
  { id: 'printing', title: 'L’imprimerie de Gutenberg', date: 'Vers 1450',
    description: 'Gutenberg développe l’imprimerie à caractères mobiles métalliques en Europe. D’autres techniques d’impression existaient déjà, notamment en Asie.',
    source: 'https://www.lib.uchicago.edu/collex/exhibits/a-pressing-call-500-years-of-women-printing/a-short-history-of-printing/', sourceName: 'University of Chicago Library' },
  { id: 'internet', title: 'Internet : le repère TCP/IP', date: '1983',
    description: 'Le 1er janvier 1983, ARPANET adopte TCP/IP : un jalon de la construction d’Internet. Ce repère ne correspond pas à l’invention du Web, plus tardive.',
    source: 'https://www.internetsociety.org/internet/history-internet/brief-history-internet/', sourceName: 'Internet Society' },
];
export interface IntroScale {
  id: IntroScaleId; label: string; span: number;
  ticks: { age: number; label: string }[]; bands: IntroBand[]; landmarks: string[];
  thought: string; explanation: string; nextLabel: string;
}
/** True proportional layout: subpixel durations are never widened. */
export function introBandLayout(band: Pick<IntroBand, 'from' | 'to'>, span: number) {
  const from = Math.min(span, band.from);
  const to = Math.max(0, band.to);
  return { left: (span - from) / span * 100, width: Math.max(0, from - to) / span * 100 };
}
export function createIntroScales(year: number): IntroScale[] {
  const earth: IntroBand = { id: 'earth', label: 'La Terre', from: EARTH_AGE, to: 0, color: 'period', dateLabel: '4,54 milliards d’années' };
  const life: IntroBand = { id: 'life', label: 'La vie', from: 3_500_000_000, to: 0, color: 'period-root', dateLabel: 'Depuis au moins 3,5 milliards d’années' };
  const dinosaurs: IntroBand = { id: 'dinosaurs', label: 'Dinosaures non aviens', from: 230_000_000, to: 66_000_000, color: 'event', dateLabel: 'Environ −230 à −66 millions d’années' };
  const humans: IntroBand = { id: 'humans', label: 'Homo sapiens', from: HUMAN_AGE, to: 0, color: 'story', dateLabel: 'Depuis environ 300 000 ans' };
  const printing: IntroBand = { id: 'printing', label: 'Depuis Gutenberg', from: year - 1450, to: 0, color: 'period', dateLabel: 'Depuis environ 1450' };
  const internet: IntroBand = { id: 'internet', label: 'Depuis Internet', from: year - 1983, to: 0, color: 'story', dateLabel: 'Depuis le passage à TCP/IP en 1983' };
  return [
    { id: 'earth', label: 'La Terre', span: EARTH_AGE,
      ticks: [{ age: EARTH_AGE, label: '−4,54 Ga' }, { age: 3e9, label: '−3 Ga' }, { age: 2e9, label: '−2 Ga' }, { age: 1e9, label: '−1 Ga' }, { age: 0, label: 'Aujourd’hui' }],
      bands: [earth, life, dinosaurs, humans], landmarks: ['earth', 'life', 'dinosaurs', 'extinction', 'humans'],
      thought: 'Toute notre espèce. Moins d’un pixel.',
      explanation: 'Les dinosaures sont déjà tout au bout. Et notre espèce occupe une fraction presque invisible de cette histoire.',
      nextLabel: 'Agrandir les derniers 250 millions d’années' },
    { id: 'dinosaurs', label: 'Les dinosaures', span: 250_000_000,
      ticks: [250, 200, 150, 100, 50, 0].map(age => ({ age: age * 1e6, label: age ? `−${age} Ma` : 'Aujourd’hui' })),
      bands: [dinosaurs, humans], landmarks: ['dinosaurs', 'extinction', 'humans'],
      thought: 'Les dinosaures prennent de la place. Nous, toujours si peu.',
      explanation: 'Il s’écoule environ 65,7 millions d’années entre la disparition des dinosaures non aviens et l’apparition d’Homo sapiens.',
      nextLabel: 'Agrandir les derniers 300 000 ans' },
    { id: 'humans', label: 'Notre espèce', span: HUMAN_AGE,
      ticks: [300, 200, 100, 0].map(age => ({ age: age * 1e3, label: age ? `−${age} 000 ans` : 'Aujourd’hui' })),
      bands: [humans, printing, internet], landmarks: ['humans', 'printing', 'internet'],
      thought: 'Nous remplissons la ligne. Nos inventions, à peine.',
      explanation: 'À l’échelle de notre espèce, l’imprimerie de Gutenberg et Internet se retrouvent presque au même endroit.',
      nextLabel: 'Agrandir les derniers siècles' },
    { id: 'inventions', label: 'Nos inventions', span: year - 1450,
      ticks: Array.from({ length: 5 }, (_, index) => ({ age: (year - 1450) * (1 - index / 4), label: `${Math.round(1450 + (year - 1450) * index / 4)}` })),
      bands: [printing, internet], landmarks: ['printing', 'internet'],
      thought: 'Deux révolutions. Une tout autre distance.',
      explanation: 'De Gutenberg au repère TCP/IP : environ 533 ans. D’Internet à aujourd’hui : quelques décennies. Les mêmes dates, vues de plus près.',
      nextLabel: 'Revenir à la formation de la Terre' },
  ];
}
