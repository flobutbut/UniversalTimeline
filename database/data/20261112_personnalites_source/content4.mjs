// Source éditoriale du lot « Marco Polo », 12 novembre 2026. Mêmes conventions que content3.mjs.
const TER = 'territoires-exploration', ECO = 'economie-echanges', POW = 'pouvoir-institutions', WAR = 'conflits', ART = 'arts-culture-loisirs', SOC = 'peuplement-societe';

export const lot = { slug: '20261112_personnalites_lot4', title: 'Personnalités, quatrième lot (Marco Polo)', count: 'une', heading: 'Création d’une frise.' };
export const sourceTitles = { 15: 'Moyen Âge', 52: 'Histoire de la Chine' };
export const sources = { 15: 'ebd2107e08725de6365bab1a04254143', 52: 'acff54dd49a7327934546622969b5f00' };
export const reused = {
  events: { '3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7': { date: '1298', q: 'Q654562' } },
  periods: {},
};

export const stories = [
  {
    key: 'marcopolo', parent: 15,
    title: ['Marco Polo', 'Marco Polo'],
    description: [
      'De Venise à la cour de Kubilai Khan : la route de la soie, dix-sept années passées en Chine, le retour par l’océan Indien et le récit dicté en prison à Gênes.',
      'From Venice to the court of Kublai Khan: the Silk Road, seventeen years spent in China, the return by the Indian Ocean and the account dictated in prison in Genoa.',
    ],
    tags: [TER, ECO],
    entries: [[15, '3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7'], [52, '3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7']],
    periods: [
      { key: 'marcopolo-jeunesse', label: ['Jeunesse de Marco Polo à Venise', 'Marco Polo’s youth in Venice'], start: '1254', end: '1271', tags: [SOC, ECO],
        description: ['Marco grandit dans une famille de marchands vénitiens, tandis que son père et son oncle commercent jusqu’en Asie centrale.', 'Marco grows up in a family of Venetian merchants while his father and uncle trade as far as Central Asia.'] },
      { key: 'marcopolo-aller', label: ['Voyage de Marco Polo vers la Chine', 'Marco Polo’s journey to China'], start: '1271', end: '1275', tags: [TER, ECO],
        description: ['Avec son père Niccolò et son oncle Maffeo, Marco traverse l’Anatolie, la Perse, le Pamir et le désert de Gobi.', 'With his father Niccolò and his uncle Maffeo, Marco crosses Anatolia, Persia, the Pamirs and the Gobi Desert.'] },
      { key: 'marcopolo-chine', label: ['Marco Polo au service de Kubilai Khan', 'Marco Polo in the service of Kublai Khan'], start: '1275', end: '1292', tags: [POW, TER],
        description: ['Selon son récit, Marco remplit des missions pour l’empereur mongol dans plusieurs provinces de Chine ; les sources chinoises ne le mentionnent pas.', 'By his own account, Marco carries out missions for the Mongol emperor in several provinces of China; Chinese sources do not mention him.'] },
      { key: 'marcopolo-retour', label: ['Retour de Marco Polo par la mer', 'Marco Polo’s return by sea'], start: '1292', end: '1295', tags: [TER],
        description: ['Les Polo accompagnent une princesse mongole jusqu’en Perse par Sumatra, Ceylan et l’Inde, puis regagnent Venise.', 'The Polos escort a Mongol princess to Persia by way of Sumatra, Ceylon and India, then make their way back to Venice.'] },
      { key: 'marcopolo-venise', label: ['Marco Polo marchand à Venise', 'Marco Polo as a merchant in Venice'], start: '1295', end: '1324-01-08', tags: [ECO],
        description: ['Rentré riche, Marco reprend le commerce, se marie et voit son récit circuler dans toute l’Europe.', 'Back home a rich man, Marco returns to trade, marries and sees his account circulate throughout Europe.'] },
    ],
    events: [
      { key: 'marcopolo-naissance', label: ['Naissance de Marco Polo', 'Birth of Marco Polo'], date: '1254', tags: [SOC], importance: 'normal',
        description: ['Marco Polo naît à Venise ; la tradition retient le 15 septembre 1254.', 'Marco Polo is born in Venice; tradition gives 15 September 1254.'] },
      { key: 'marcopolo-depart', label: ['Départ des Polo pour l’Orient', 'The Polos set out for the East'], date: '1271', tags: [TER], importance: 'major',
        description: ['À dix-sept ans, Marco quitte Venise avec son père et son oncle, porteurs de lettres du pape pour le grand khan.', 'Aged seventeen, Marco leaves Venice with his father and uncle, who carry letters from the pope for the Great Khan.'] },
      { key: 'marcopolo-arrivee', label: ['Arrivée des Polo à la cour de Kubilai Khan', 'The Polos arrive at the court of Kublai Khan'], date: '1275', tags: [TER, POW], importance: 'major',
        description: ['Après plus de trois ans de route, les Polo sont reçus par l’empereur à Shangdu, sa résidence d’été.', 'After more than three years on the road, the Polos are received by the emperor at Shangdu, his summer residence.'] },
      { key: 'marcopolo-retour-venise', label: ['Retour de Marco Polo à Venise', 'Marco Polo returns to Venice'], date: '1295', tags: [TER], importance: 'normal',
        description: ['Les trois voyageurs retrouvent Venise après vingt-quatre ans d’absence.', 'The three travellers return to Venice after twenty-four years away.'] },
      { key: 'marcopolo-curzola', label: ['Bataille de Curzola', 'Battle of Curzola'], date: '1298-09-09', tags: [WAR], importance: 'normal', q: 'Q2139987', wiki: ['Bataille de Curzola', 'Battle of Curzola'],
        description: ['La flotte de Gênes bat celle de Venise en Adriatique ; selon la tradition, Marco Polo y est fait prisonnier.', 'The Genoese fleet defeats the Venetian fleet in the Adriatic; according to tradition, Marco Polo is taken prisoner there.'] },
      { id: '3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7', importance: 'major' },
      { key: 'marcopolo-mort', label: ['Mort de Marco Polo', 'Death of Marco Polo'], date: '1324-01-08', tags: [SOC], importance: 'normal',
        description: ['Marco Polo meurt à Venise, laissant un testament qui détaille sa fortune.', 'Marco Polo dies in Venice, leaving a will that details his fortune.'] },
    ],
  },
];
