# Audit des descriptions et des liens du catalogue

État relevé le 2 novembre 2026 sur le projet Supabase **Universal-Timeline** (`ftubzndxivponqoihrsu`).

Audit en lecture seule. Aucune ligne distante, aucun schéma et aucun comportement applicatif n’ont été modifiés. Périmètre : périodes et événements du catalogue, associations et points d’entrée des frises publiques. Les descriptions de frises, comptes et autres données personnelles ne sont pas inclus dans ce rapport.

## Évolution après l’audit

Le rattachement de Conquête spatiale à Époque moderne a été confirmé par l’utilisateur. C’est un choix de navigation éditoriale, sans obligation d’inclusion chronologique. Les recommandations ci-dessous sur un éventuel changement de ce parent sont donc abandonnées.

La centralisation des classements dans les frises est décrite dans `Documentation/RELATIONS-FRISES.md`. Les chiffres de descriptions manquantes ci-dessous restent ceux du relevé initial ; cette évolution du modèle ne complète pas les textes.

## Résultat

| Contenu | Total | Description FR absente | Description EN absente | Absente dans les deux langues |
| --- | --- | --- | --- | --- |
| Périodes | 112 | 17 | 16 | 16 |
| Événements | 104 | 29 | 27 | 27 |
| Total | 216 | 46 | 43 | 43 |

Une description est considérée absente si elle est NULL, vide ou composée d’espaces. Le comptage porte sur les fiches uniques ; une même fiche peut être utilisée dans plusieurs frises.

Les relations publiques comprennent **143 associations période–frise**, **156 associations événement–frise**, **12 points d’entrée explicites** et **16 frises**. Les libellés stockés sont repris tels quels ci-dessous.

## Liens à reprendre

### 1. Point d’entrée invalide : Époque moderne

- Frise enfant : **Époque moderne**, ID `16`.
- Frise parente : **Moyen Âge**, ID `15`.
- Point d’entrée enregistré : période `Q7432`, libellée **Époque moderne**.
- Cette période existe dans le catalogue et dans la frise 16, mais **n’appartient pas à la frise parente 15**.
- L’application écarte cette ancre et propose la frise enfant sur les périodes racines de sa parente. Le lien peut donc encore apparaître, mais son emplacement n’est plus celui enregistré.

Correction à préparer : choisir un repère réellement présent dans la frise parente, ou revoir le parent. Ajouter automatiquement la période moderne au Moyen Âge changerait le contenu de cette frise.

### 2. Point d’entrée non renseigné : Conquête spatiale

- Frise enfant : **Conquête spatiale**, ID `14`.
- Frise parente : **Époque moderne**, ID `16`.
- **Aucun point d’entrée explicite**.
- Le repli de l’application affiche ce lien au niveau des racines de la frise 16.
- La période racine de la frise 16 couvre 1492–1789 ; celle de Conquête spatiale commence en 1957. Ce parent demande donc aussi une révision éditoriale.

Piste : utiliser une frise consacrée à l’histoire contemporaine ou un repère spatial approprié. La période **Histoire contemporaine** existe déjà, mais n’appartient à aucune frise publique à la date de l’audit.

### 3. Contenus absents des frises publiques

| Type | Fiche | ID |
| --- | --- | --- |
| Période | Galaxie d'Andromède | b34af765-32cd-4d01-820d-2934fc21c2aa |
| Période | Anthropocène | 771a1b53-5ffe-474e-85a4-b62e12dbdab8 |
| Période | Histoire contemporaine | Q11769 |
| Événement | Révolution française | EVT_FR_REV |

Ce constat signifie qu’aucune appartenance publique n’est enregistrée. Il ne suffit pas à conclure à une suppression ou à un lien cassé : le catalogue peut volontairement contenir des fiches en réserve.

Pistes de classement : Andromède dans Univers moderne ; Anthropocène dans une frise de la Terre ; Histoire contemporaine dans un parcours historique ; Révolution française dans une frise moderne ou contemporaine. Ce sont des propositions à examiner.

### 4. Passerelles entre périodes et frises limitées par l’interface

**33 périodes sont partagées entre plusieurs frises publiques**.

Les événements combinent les frises enfants ancrées et les autres frises qui contiennent le même événement (`src/lib/eventStorySuggestions.ts:13`). Les badges des périodes ne listent que les frises enfants de la frise courante, ancrées sur cette période (`src/composables/useTimelineAssociatedStories.ts:12`).

Exemple : **Hadéen** appartient à **Histoire de la vie sur Terre** (2) et à **Histoire géologique de la Terre** (11). Depuis l’une de ces frises, le badge de la période ne propose pas automatiquement l’autre, car elles sont sœurs sous Univers moderne.

Piste d’évolution : proposer aussi les appartenances lisibles d’une période à d’autres frises, avec déduplication et exclusion de la frise courante, selon le même principe que pour les événements. Ce comportement nécessite un choix produit ; il ne se corrige pas uniquement en complétant la base.

### 5. Parcours séparés et frises peu remplies

Les racines publiques sont **Univers moderne** (1), **Guerres modernes** (4), **Moyen Âge** (15) et **Renaissance** (17). Ces quatre parcours ne sont pas tous reliés par la hiérarchie des frises ; des passerelles par événements partagés peuvent cependant exister.

**Renaissance** (17) et **Opération militaire spéciale en Ukraine** (13) ont chacune une période et aucun événement. Cela décrit leur contenu actuel sans établir que des événements précis devraient y être ajoutés.

La période **Renaissance**, ID `e00cf6f6-a795-4810-bda3-ed726296c822`, est la seule période sans catégorie. Tous les événements ont au moins une catégorie.

## Répartition des descriptions manquantes par frise

Les colonnes de manques FR comptent les fiches de la frise dont la description française est absente. Elles ne doivent pas être additionnées entre frises, car des fiches sont partagées.

| ID | Frise | Périodes | Événements | Périodes sans FR | Événements sans FR |
| --- | --- | --- | --- | --- | --- |
| 1 | Univers moderne | 6 | 14 | 1 | 9 |
| 2 | Histoire de la vie sur Terre | 28 | 21 | 5 | 10 |
| 3 | Big Bang et ères primordiales | 10 | 2 | 10 | 1 |
| 4 | Guerres modernes | 4 | 11 | 0 | 0 |
| 5 | Genre Homo | 12 | 8 | 0 | 5 |
| 7 | Empire romain | 3 | 9 | 0 | 2 |
| 8 | Première Guerre mondiale | 3 | 5 | 1 | 0 |
| 9 | Seconde Guerre mondiale | 8 | 6 | 0 | 0 |
| 10 | Antiquité et premières civilisations | 22 | 11 | 0 | 3 |
| 11 | Histoire géologique de la Terre | 30 | 28 | 5 | 18 |
| 12 | Guerre froide | 1 | 8 | 0 | 1 |
| 13 | Opération militaire spéciale en Ukraine | 1 | 0 | 0 | 0 |
| 14 | Conquête spatiale | 10 | 24 | 0 | 0 |
| 15 | Moyen Âge | 3 | 7 | 0 | 2 |
| 16 | Époque moderne | 1 | 2 | 0 | 0 |
| 17 | Renaissance | 1 | 0 | 0 | 0 |

Priorités : **Big Bang et ères primordiales** a ses 10 périodes sans description FR ; **Histoire géologique de la Terre** a 18 événements sans description FR. Compléter une fiche partagée améliore plusieurs parcours à la fois.

## Liste complète des descriptions à compléter

### Périodes — 17 fiches

| Fiche | ID local | Wikidata | Langues absentes |
| --- | --- | --- | --- |
| Big Bang | PER_BIGBANG | Q323 | FR, EN |
| Ère de la Grande Unification | PER_GUT | Q2444744 | FR, EN |
| Ère de la Nucléosynthèse Primordiale | PER_NUCLEOSYN | Q837317 | FR, EN |
| Ère de la Recombinaison | PER_RECOMB | Q3373825 | FR, EN |
| Ère de Planck | PER_PLANCK | Q59077 | FR, EN |
| Ère de Réionisation | PER_REION | Q1670901 | FR, EN |
| Ère des Âges Sombres | PER_DARK_AGES | Q3577063 | FR, EN |
| Ère Électrofaible | PER_ELECTROWEAK | Q3772968 | FR, EN |
| Ère Hadronique | PER_HADRON | Q3491753 | FR, EN |
| Ère Leptonique | PER_LEPTON | Q1079826 | FR, EN |
| Guerre arméno-azerbaïdjanaise | fd216ffa-0552-48b2-9dbf-b1a551c8bcb8 | Q2015687 | FR |
| Mésozoïque | PER_MESOZOIC | Q83222 | FR, EN |
| Néogène | PER_NEOGENE | Q103924 | FR, EN |
| Paléogène | PER_PALEOGENE | Q55810 | FR, EN |
| Silurien | PER_SILURIAN | Q62412 | FR, EN |
| Système solaire | PER_SOLAR_SYS | Q544 | FR, EN |
| Trias | PER_TRIASSIC | Q47158 | FR, EN |

### Événements — 29 fiches

| Fiche | ID local | Wikidata | Langues absentes |
| --- | --- | --- | --- |
| Apparition d'Homo sapiens | EVT_SAPIENS | Q15978631 | FR, EN |
| Apparition de l'oxygène atmosphérique (Grande Oxydation) | EVT_GOE | Q837561 | FR, EN |
| Apparition des premiers hominidés | EVT_HOMINIDS | Q107588 | FR, EN |
| Apparition des premiers mammifères | EVT_MAMMALS | Q7377 | FR, EN |
| Apparition des premiers primates | EVT_PRIMATES | Q7380 | FR, EN |
| Chute de l'Empire romain d'Occident | EVT_ROME_FALL | Q608613 | FR, EN |
| Colonisation des terres par les plantes | EVT_LAND_PLANTS | Q192154 | FR, EN |
| Début de l'Hégire | EVT_HEGIRA | Q131482 | FR, EN |
| Début des glaciations quaternaires | EVT_QUAT_GLAC | Q1040770 | FR, EN |
| Doctrine Jdanov | 2bf8b54a-22fe-43fc-8fcf-39eada08d71d | Q1899501 | FR |
| Faune d'Édiacara | EVT_EDIACARA | Q723846 | FR, EN |
| Fin de la dernière période glaciaire | EVT_LAST_GLAC | Q754949 | FR, EN |
| Fondation de Rome | EVT_ROME | Q1247524 | FR, EN |
| Formation de l'Himalaya | EVT_HIMALAYA | Q5451 | FR, EN |
| Formation de la Lune | EVT_MOON_FORM | Q723219 | FR, EN |
| Formation de la nébuleuse solaire | EVT_SOLAR_NEB | Q3400 | FR, EN |
| Formation de la Pangée | EVT_PANGAEA | Q4398 | FR, EN |
| Formation de la Terre | EVT_EARTH_FORM | — | FR, EN |
| Formation des amas globulaires | EVT_GLOB_CLUSTERS | — | FR, EN |
| Formation des océans | EVT_OCEAN_FORM | — | FR, EN |
| Formation des premières étoiles | EVT_FIRST_STARS | — | FR, EN |
| Formation du supercontinent Columbia | EVT_COLUMBIA | Q870505 | FR, EN |
| Glaciation huronienne | EVT_HURON_GLAC | Q24322 | FR, EN |
| Glaciation sturtienne | EVT_STURT_GLAC | Q1450075 | FR, EN |
| Grand bombardement tardif | EVT_LHB_END | Q591571 | FR |
| Invention de l'écriture | EVT_WRITING | Q1340267 | FR, EN |
| Première utilisation contrôlée du feu | EVT_FIRE_USE | Q912205 | FR, EN |
| Premières traces de vie | EVT_FIRST_LIFE | — | FR, EN |
| Premiers minéraux connus (zircons) | EVT_FIRST_MIN | Q4571428 | FR, EN |

Sur ces 46 fiches, 43 n’ont de description dans aucune langue. Les trois fiches avec uniquement une description EN sont **Doctrine Jdanov**, **Grand bombardement tardif** et **Guerre arméno-azerbaïdjanaise**.

## Vérifications structurelles

- Aucun parent de période pointant vers une fiche inexistante.
- Aucun cycle détecté dans la hiérarchie globale des périodes.
- Aucune période avec bornes numériques inversées ou manquantes.
- Aucun événement sans coordonnée temporelle numérique.
- Sur les 12 ancres explicites des frises publiques, **11 appartiennent à la frise parente et une n’y appartient pas** (Époque moderne). La frise enfant sans ancre est Conquête spatiale.
- 14 placements de période utilisent un parent du catalogue absent de leur frise. L’application traite ces périodes comme des racines locales ; ces placements ne sont donc pas comptés comme des liens cassés.
- 13 descriptions FR de périodes et 10 descriptions FR d’événements font moins de 40 caractères. C’est un indicateur de concision, pas une preuve d’insuffisance.
- Il n’existe pas de relation persistée directe événement–période. La navigation filtre les événements **déjà associés à la frise** selon les bornes de la période (`src/composables/useHomeNavigation.ts:40`). Une proximité de date seule ne crée donc pas d’appartenance.

## Cohérence temporelle à examiner

Une comparaison des coordonnées BP stockées signale **11 associations événement–frise**, soit **10 événements distincts**, dont la date est hors de toutes les périodes associées à leur frise :

| Frise | Événement | Date stockée |
| --- | --- | --- |
| Guerres modernes | Assassinat de l'archiduc François-Ferdinand | 1914-06-28T00:00:00Z |
| Guerres modernes | Armistice du 11 Novembre 1918 | 1918-11-11T00:00:00Z |
| Guerres modernes | Seconde Guerre mondiale | 1939-09-01T00:00:00Z |
| Genre Homo | Apparition des premiers primates | M55 |
| Empire romain | Fondation de Rome | -0753-04-21T00:00:00Z |
| Empire romain | Assassinat de Jules César | -0044-03-15T00:00:00Z |
| Empire romain | Bataille d'Actium | -0031-09-02T00:00:00Z |
| Empire romain | Chute de l'Empire romain d'Occident | 0476-09-04T00:00:00Z |
| Première Guerre mondiale | Assassinat de l'archiduc François-Ferdinand | 1914-06-28T00:00:00Z |
| Guerre froide | Dislocation de l'URSS | 1991-12-26T00:00:00Z |
| Moyen Âge | Arrivée de Christophe Colomb en Amérique | 1492-10-12T00:00:00Z |

Ces lignes sont des **candidats de vérification**, pas des suppressions proposées. Certaines sont des événements de contexte ; d’autres sont proches d’une borne et peuvent refléter des coordonnées numériques calculées à des instants différents. Par exemple, l’Armistice est associé à Guerres modernes mais pas à l’intérieur des périodes qui y sont enregistrées, tandis que sa frise dédiée contient aussi des périodes complémentaires.

La validation éditoriale des dates et des sources n’a pas été faite dans cet audit. Les coordonnées historiques et géologiques ne doivent pas être réécrites en masse à partir d’une simple comparaison.

## Ordre de correction proposé

1. Compléter les **46 descriptions françaises**, puis les **43 descriptions anglaises**, avec une description spécifique à chaque fiche, des sources et conservation des textes déjà présents.
2. Reprendre le parent et le point d’entrée des frises **Époque moderne** et **Conquête spatiale**.
3. Décider du classement des quatre fiches absentes des frises publiques et du rattachement de Renaissance.
4. Compléter les passerelles d’interface entre périodes et frises qui les contiennent.
5. Vérifier les onze associations temporelles signalées avant de modifier leurs dates ou appartenances.

Les imports ne doivent pas confondre l’**ID local** et `wikidata_id` : plusieurs IDs locaux historiques ressemblent à des QIDs mais désignent désormais d’autres fiches (par exemple `PER_MILKYWAY` est libellé Terre, `PER_EARTH` Empire romain, `Q7432` Époque moderne). Les QIDs doivent être lus dans le champ `wikidata_id`.

Pour les événements formulés comme « Apparition… », « Formation… » ou « Inauguration… », vérifier que la source décrit bien l’événement, et non seulement l’espèce, l’objet ou le bâtiment associé. Aucun enrichissement automatique Wikidata n’a été exécuté.

## Méthode et limites

Requêtes SELECT sur la base active, agrégations des champs vides, examen des appartenances publiques et des ancres, parcours récursif des parents du catalogue, comparaison des coordonnées BP, et lecture des fonctions de navigation. Les relevés ont été faits par plusieurs requêtes successives et constituent un instantané d’audit, pas une sauvegarde transactionnelle.

Pas de test navigateur, de vérification de chaque source historique ou de mutation distante. Les défauts de navigation décrits résultent de l’analyse du code et des associations constatées. Les requêtes de contrôle principales sont conservées dans `audits/catalogue-quality-2026-11-02.sql`.
