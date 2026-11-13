// Contenu de la frise « Guerre de Sécession » (13 novembre 2026).
// Dates : Wikidata (Q-id indiqués) et articles Wikipédia ; précision réelle de la source.
export const lot = { slug: '20261113_guerre_secession', title: 'Guerre de Sécession', date: '13 novembre 2026', reference: '2026-11-13T12:00:00Z' };

// md5(title_fr) des frises sources, vérifié avant écriture.
export const sources = { 41: '9d937ba942032769d213972ea0669ea5', 50: '3d9eaa9d9f3c3f4c6152ff08cbd4025b', 78: '2f7cfa603df2a25fce27ad69cd4be673' };

const WAR = '1f82c15a-d8dc-4b37-96de-891784474d69';
const E = {
  election: '70809365-87a9-469f-9edb-c2b58303f153',
  debats: 'b58c84a3-fd64-4b69-ab5c-786f664cccce',
  emancipation: '7a661c41-f7c9-4fe8-b5a4-03a39168f643',
  gettysburg: '0f5bdc93-5e59-4e98-a438-3cdf6c3d4173',
  discours: '86344162-d418-478c-87d1-d6c6a1ac1a26',
  reelection: '0db81758-6fd2-416c-9587-26d502f81ac1',
  assassinat: '7467dae4-5e53-49c0-af9f-b76e9417e0d3',
  xiii: '442c25a9-d5a5-459e-94ad-efe93e50f5e8',
};

export const reused = {
  periods: { [WAR]: { start: '1861-04-12', end: '1865-04-09', q: 'Q8676' } },
  events: {
    [E.election]: { date: '1860-11-06', q: 'Q698842' },
    [E.debats]: { date: '1858-08-21', q: 'Q622354' },
    [E.emancipation]: { date: '1863-01-01', q: 'Q391358' },
    [E.gettysburg]: { date: '1863-07-01', q: 'Q33132' },
    [E.discours]: { date: '1863-11-19', q: 'Q214524' },
    [E.reelection]: { date: '1864-11-08', q: null },
    [E.assassinat]: { date: '1865-04-14', q: 'Q1025404' },
    [E.xiii]: { date: '1865-12-06', q: 'Q175613' },
  },
};

const C = 'conflits', P = 'pouvoir-institutions', S = 'peuplement-societe', T = 'techniques-inventions', A = 'arts-culture-loisirs', I = 'philosophie-ideologies';

export const story = {
  title: ['Guerre de Sécession', 'American Civil War'],
  description: [
    'De la crise des années 1850 sur l’extension de l’esclavage à la reddition du Sud et au XIIIe amendement : batailles, campagnes, émancipation et premières armes modernes.',
    'From the 1850s crisis over the spread of slavery to the surrender of the South and the Thirteenth Amendment: battles, campaigns, emancipation and the first modern weapons.',
  ],
  tags: [C, P],
  parent: 50,
  anchor: { type: 'period', id: WAR },
  // [source, cible, type d’ancre, ancre] ; 'new' désigne la frise créée.
  entries: [
    [50, 'new', 'period', WAR],
    [78, 'new', 'period', WAR],
    [41, 'new', 'event', E.xiii],
    ['new', 78, 'event', E.election],
    ['new', 41, 'event', E.xiii],
  ],
  periods: [
    { key: 'crise', label: ['Crise de l’Union', 'Crisis of the Union'], description: ['Le Nord et le Sud s’affrontent sur l’extension de l’esclavage aux nouveaux territoires, jusqu’à la rupture.', 'North and South clash over the spread of slavery into the new territories, until the break-up.'], q: 'Q2991747', wiki: ['Genèse de la guerre de Sécession', 'Origins of the American Civil War'], start: '1850', end: '1861-04-12', tags: [P, S] },
    { key: 'kansas', parent: 'crise', label: ['Kansas sanglant', 'Bleeding Kansas'], description: ['Colons esclavagistes et abolitionnistes se disputent le territoire du Kansas, armes à la main.', 'Pro-slavery and free-state settlers fight over Kansas Territory, weapons in hand.'], q: 'Q331377', wiki: ['Bleeding Kansas', 'Bleeding Kansas'], start: '1854', end: '1861', tags: [C, P] },
    { id: WAR },
    { key: 'vicksburg', parent: WAR, label: ['Siège de Vicksburg', 'Siege of Vicksburg'], description: ['Grant assiège la dernière place confédérée sur le Mississippi ; sa chute coupe le Sud en deux.', 'Grant besieges the last Confederate stronghold on the Mississippi; its fall splits the South in two.'], q: 'Q1066253', wiki: ['Siège de Vicksburg', 'Siege of Vicksburg'], start: '1863-05-18', end: '1863-07-04', tags: [C] },
    { key: 'overland', parent: WAR, label: ['Campagne de l’Overland', 'Overland Campaign'], description: ['Grant engage l’armée de Lee en Virginie dans une suite de batailles d’usure, de la Wilderness à Cold Harbor.', 'Grant engages Lee’s army in Virginia in a series of battles of attrition, from the Wilderness to Cold Harbor.'], q: 'Q739644', wiki: ['Overland Campaign', 'Overland Campaign'], start: '1864-05-04', end: '1864-06-24', tags: [C] },
    { key: 'atlanta', parent: WAR, label: ['Campagne d’Atlanta', 'Atlanta campaign'], description: ['Sherman avance du Tennessee vers la Géorgie et prend Atlanta, centre ferroviaire du Sud.', 'Sherman advances from Tennessee into Georgia and takes Atlanta, the South’s railway hub.'], q: 'Q756118', wiki: ['Campagne d\'Atlanta', 'Atlanta campaign'], start: '1864-05-07', end: '1864-09-02', tags: [C] },
    { key: 'petersburg', parent: WAR, label: ['Siège de Petersburg', 'Siege of Petersburg'], description: ['Neuf mois de guerre de tranchées autour de Petersburg, qui protège Richmond, la capitale confédérée.', 'Nine months of trench warfare around Petersburg, which shields Richmond, the Confederate capital.'], q: 'Q815195', wiki: ['Siège de Petersburg', 'Siege of Petersburg'], start: '1864-06-09', end: '1865-03-25', tags: [C] },
    { key: 'sherman', parent: WAR, label: ['Marche de Sherman vers la mer', 'Sherman’s March to the Sea'], description: ['D’Atlanta à Savannah, l’armée de Sherman détruit voies ferrées, récoltes et ressources de la Géorgie.', 'From Atlanta to Savannah, Sherman’s army destroys Georgia’s railways, crops and resources.'], q: 'Q1052780', wiki: ['Marche de Sherman vers la mer', 'Sherman\'s March to the Sea'], start: '1864-11-15', end: '1864-12-21', tags: [C] },
  ],
  events: [
    { key: 'compromis', label: ['Compromis de 1850', 'Compromise of 1850'], description: ['Une série de lois admet la Californie comme État libre et laisse les nouveaux territoires décider de l’esclavage.', 'A package of laws admits California as a free state and lets the new territories decide on slavery.'], q: 'Q39392', wiki: ['Compromis de 1850', 'Compromise of 1850'], date: '1850-09', importance: 'normal', tags: [P, S] },
    { key: 'fugitifs', label: ['Loi sur les esclaves fugitifs', 'Fugitive Slave Act'], description: ['Les États libres doivent désormais aider à capturer et renvoyer les esclaves en fuite.', 'Free states must now help capture and return escaped slaves.'], q: 'Q535519', wiki: ['Fugitive Slave Act', 'Fugitive Slave Act of 1850'], date: '1850-09-18', importance: 'normal', tags: [P, S] },
    { key: 'oncletom', label: ['La Case de l’oncle Tom', 'Uncle Tom’s Cabin'], description: ['Le roman antiesclavagiste de Harriet Beecher Stowe devient le livre le plus vendu du siècle aux États-Unis.', 'Harriet Beecher Stowe’s anti-slavery novel becomes the best-selling book of the century in the United States.'], q: 'Q2222', wiki: ['La Case de l\'oncle Tom', 'Uncle Tom\'s Cabin'], date: '1852-03-20', importance: 'normal', tags: [A, I] },
    { key: 'kansasneb', label: ['Loi Kansas-Nebraska', 'Kansas–Nebraska Act'], description: ['La loi laisse les colons du Kansas et du Nebraska choisir l’esclavage, rouvrant la question dans le Nord-Ouest.', 'The act lets settlers in Kansas and Nebraska choose slavery, reopening the question in the Northwest.'], q: 'Q619762', wiki: ['Loi Kansas-Nebraska', 'Kansas–Nebraska Act'], date: '1854-05-30', importance: 'normal', tags: [P, S] },
    { key: 'republicain', label: ['Fondation du Parti républicain', 'Founding of the Republican Party'], description: ['Des opposants à l’extension de l’esclavage fondent un nouveau parti, implanté seulement dans le Nord.', 'Opponents of the spread of slavery found a new party, rooted only in the North.'], date: '1854', importance: 'normal', tags: [P, I] },
    { key: 'dredscott', label: ['Arrêt Dred Scott', 'Dred Scott decision'], description: ['La Cour suprême juge que les Noirs ne peuvent être citoyens et que le Congrès ne peut interdire l’esclavage dans les territoires.', 'The Supreme Court rules that Black people cannot be citizens and that Congress cannot ban slavery in the territories.'], q: 'Q690462', wiki: ['Scott v. Sandford', 'Dred Scott v. Sandford'], date: '1857-03-06', importance: 'major', tags: [P, S] },
    { id: E.debats, importance: 'normal' },
    { key: 'harpers', label: ['Raid de John Brown sur Harpers Ferry', 'John Brown’s raid on Harpers Ferry'], description: ['L’abolitionniste John Brown attaque un arsenal fédéral pour armer une révolte d’esclaves ; il est capturé et pendu.', 'Abolitionist John Brown attacks a federal arsenal to arm a slave revolt; he is captured and hanged.'], q: 'Q6223430', wiki: ['Raid de John Brown contre Harpers Ferry', 'John Brown\'s raid on Harpers Ferry'], date: '1859-10-16', importance: 'normal', tags: [C, I] },
    { id: E.election, importance: 'major' },
    { key: 'caroline', label: ['Sécession de la Caroline du Sud', 'Secession of South Carolina'], description: ['Premier État à quitter l’Union après l’élection de Lincoln ; dix autres le suivent.', 'The first state to leave the Union after Lincoln’s election; ten others follow.'], wiki: ['Ordonnance de sécession', 'Ordinance of Secession'], date: '1860-12-20', importance: 'normal', tags: [P] },
    { key: 'confederation', label: ['Création des États confédérés', 'Formation of the Confederate States'], description: ['Les États sécessionnistes adoptent une constitution provisoire à Montgomery ; Jefferson Davis est élu président.', 'The seceding states adopt a provisional constitution in Montgomery; Jefferson Davis is elected president.'], q: 'Q81931', wiki: ['États confédérés d\'Amérique', 'Confederate States of America'], date: '1861-02-08', importance: 'normal', tags: [P] },
    { key: 'sumter', label: ['Bataille de Fort Sumter', 'Battle of Fort Sumter'], description: ['Les confédérés bombardent le fort fédéral de Charleston : premiers coups de feu de la guerre.', 'Confederate forces shell the federal fort at Charleston: the first shots of the war.'], q: 'Q543165', wiki: ['Bataille de Fort Sumter', 'Battle of Fort Sumter'], date: '1861-04-12', importance: 'major', tags: [C] },
    { key: 'blocus', label: ['Proclamation du blocus de l’Union', 'Proclamation of the Union blockade'], description: ['Lincoln ordonne le blocus des ports du Sud pour étouffer son commerce de coton et ses importations d’armes.', 'Lincoln orders a blockade of Southern ports to choke its cotton trade and arms imports.'], q: 'Q2493703', wiki: ['Blocus de l\'Union', 'Union blockade'], date: '1861-04-19', importance: 'normal', tags: [C, 'economie-echanges'] },
    { key: 'bullrun', label: ['Première bataille de Bull Run', 'First Battle of Bull Run'], description: ['La déroute de l’armée de l’Union près de Washington dissipe l’espoir d’une guerre courte.', 'The rout of the Union army near Washington ends hopes of a short war.'], q: 'Q221469', wiki: ['Première bataille de Bull Run', 'First Battle of Bull Run'], date: '1861-07-21', importance: 'normal', tags: [C] },
    { key: 'ballons', label: ['Corps aérostatique de l’Union', 'Union Army Balloon Corps'], description: ['Thaddeus Lowe observe les lignes ennemies depuis des ballons captifs et transmet ses rapports par télégraphe.', 'Thaddeus Lowe watches enemy lines from tethered balloons and sends his reports by telegraph.'], q: 'Q3028072', wiki: ['Union Army Balloon Corps', 'Union Army Balloon Corps'], date: '1861', importance: 'normal', tags: [T, C] },
    { key: 'hamptonroads', label: ['Combat de Hampton Roads', 'Battle of Hampton Roads'], description: ['Premier combat entre deux navires cuirassés, le Monitor et le Virginia : les flottes de bois deviennent obsolètes.', 'The first fight between two ironclad warships, the Monitor and the Virginia: wooden fleets become obsolete.'], q: 'Q868481', wiki: ['Combat naval de Hampton Roads', 'Battle of Hampton Roads'], date: '1862-03-08', importance: 'major', tags: [T, C] },
    { key: 'shiloh', label: ['Bataille de Shiloh', 'Battle of Shiloh'], description: ['Plus de 23 000 tués, blessés ou disparus en deux jours dans le Tennessee : le pays découvre le prix de la guerre.', 'More than 23,000 killed, wounded or missing in two days in Tennessee: the country discovers the cost of the war.'], q: 'Q943277', wiki: ['Bataille de Shiloh', 'Battle of Shiloh'], date: '1862-04-06', importance: 'normal', tags: [C] },
    { key: 'nouvelleorleans', label: ['Prise de La Nouvelle-Orléans', 'Capture of New Orleans'], description: ['La flotte de Farragut force les forts du Mississippi et s’empare du plus grand port du Sud.', 'Farragut’s fleet runs past the Mississippi forts and seizes the South’s largest port.'], q: 'Q2700708', wiki: ['Bataille de La Nouvelle-Orléans (1862)', 'Capture of New Orleans'], date: '1862-04-25', importance: 'normal', tags: [C] },
    { key: 'antietam', label: ['Bataille d’Antietam', 'Battle of Antietam'], description: ['La journée la plus meurtrière de l’histoire américaine arrête l’invasion du Nord par Lee.', 'The bloodiest single day in American history halts Lee’s invasion of the North.'], q: 'Q719252', wiki: ['Bataille d\'Antietam', 'Battle of Antietam'], date: '1862-09-17', importance: 'major', tags: [C] },
    { key: 'brady', label: ['Exposition « The Dead of Antietam »', '“The Dead of Antietam” exhibition'], description: ['La galerie de Mathew Brady à New York montre les photographies de cadavres prises sur le champ de bataille.', 'Mathew Brady’s New York gallery shows photographs of the dead taken on the battlefield.'], date: '1862-10', importance: 'normal', tags: [T, A] },
    { key: 'gatling', label: ['Brevet de la mitrailleuse Gatling', 'Patent for the Gatling gun'], description: ['Richard Gatling fait breveter une arme à canons rotatifs actionnée par manivelle, ancêtre des mitrailleuses.', 'Richard Gatling patents a hand-cranked weapon with rotating barrels, forerunner of the machine gun.'], q: 'Q272975', wiki: ['Mitrailleuse Gatling', 'Gatling gun'], date: '1862-11-04', importance: 'major', tags: [T, C] },
    { id: E.emancipation, importance: 'major' },
    { key: 'chancellorsville', label: ['Bataille de Chancellorsville', 'Battle of Chancellorsville'], description: ['Victoire de Lee face à une armée deux fois plus nombreuse ; Stonewall Jackson y est mortellement blessé.', 'Lee defeats an army twice his size; Stonewall Jackson is mortally wounded.'], q: 'Q745979', wiki: ['Bataille de Chancellorsville', 'Battle of Chancellorsville'], date: '1863-04-30', importance: 'normal', tags: [C] },
    { id: E.gettysburg, importance: 'major' },
    { key: 'emeutes', label: ['Émeutes de la conscription à New York', 'New York City draft riots'], description: ['Des émeutiers opposés à la conscription s’en prennent aux habitants noirs ; plus d’une centaine de morts.', 'Rioters opposed to the draft attack Black residents; more than a hundred are killed.'], q: 'Q220497', wiki: ['Draft Riots', 'New York City draft riots'], date: '1863-07-13', importance: 'normal', tags: [S, C] },
    { key: 'wagner', label: ['Seconde bataille de Fort Wagner', 'Second Battle of Fort Wagner'], description: ['L’assaut du 54e Massachusetts, régiment de soldats noirs, prouve leur engagement au Nord.', 'The assault by the 54th Massachusetts, a regiment of Black soldiers, proves their commitment to the North.'], q: 'Q2676019', wiki: ['Seconde bataille de Fort Wagner', 'Second Battle of Fort Wagner'], date: '1863-07-18', importance: 'normal', tags: [C, S] },
    { id: E.discours, importance: 'normal' },
    { key: 'hunley', label: ['Le Hunley coule l’USS Housatonic', 'The Hunley sinks USS Housatonic'], description: ['Le sous-marin confédéré H. L. Hunley coule un navire de guerre de l’Union : première victoire d’un sous-marin, qui sombre aussi.', 'The Confederate submarine H. L. Hunley sinks a Union warship: the first submarine victory, and the Hunley sinks too.'], q: 'Q7524597', wiki: [null, 'Sinking of USS Housatonic'], date: '1864-02-17', importance: 'major', tags: [T, C] },
    { id: E.reelection, importance: 'normal' },
    { key: 'appomattox', label: ['Reddition de Lee à Appomattox', 'Lee’s surrender at Appomattox'], description: ['Encerclé, Lee rend l’armée de Virginie du Nord à Grant : la fin de la guerre est acquise.', 'Surrounded, Lee surrenders the Army of Northern Virginia to Grant: the end of the war is sealed.'], q: 'Q19918522', wiki: [null, 'Surrender at Appomattox'], date: '1865-04-09', importance: 'major', tags: [C] },
    { id: E.assassinat, importance: 'major' },
    { key: 'davis', label: ['Capture de Jefferson Davis', 'Capture of Jefferson Davis'], description: ['Le président confédéré en fuite est arrêté en Géorgie ; il passe deux ans en prison sans être jugé.', 'The fleeing Confederate president is arrested in Georgia; he spends two years in prison without trial.'], q: 'Q141906650', date: '1865-05-10', importance: 'normal', tags: [C, P] },
    { key: 'juneteenth', label: ['Juneteenth', 'Juneteenth'], description: ['À Galveston, l’armée de l’Union annonce aux esclaves du Texas qu’ils sont libres.', 'In Galveston, the Union army tells the enslaved people of Texas that they are free.'], q: 'Q6312521', wiki: ['Juneteenth', 'Juneteenth'], date: '1865-06-19', importance: 'normal', tags: [S] },
    { id: E.xiii, importance: 'major' },
  ],
};

