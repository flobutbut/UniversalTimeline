# Taxonomie thématique

État au 8 novembre 2026 : migration et lots 1 à 4 appliqués sur Supabase (16 tags, 270 périodes non thématiques, 341 périodes, 652 événements et 35 frises tagués) ; API et interface prêtes, **non déployées**. Les catégories actuelles restent en place tant que la nouvelle grille n'est pas validée. **Le code exige la migration : toute lecture du catalogue échoue sans elle**, y compris en local.

## Grille de niveau 1

Les identifiants sont stables. Les libellés sont modifiables. Une famille sert seulement à grouper l'affichage : on ne l'attache jamais à une fiche.

| Famille | Identifiant | Libellé | Portée |
|---|---|---|---|
| Monde & vivant | `cosmos` | Cosmos | Univers, astres, phénomènes astronomiques |
| | `terre` | Terre | Géologie et climat, y compris les événements naturels sans société touchée |
| | `vivant` | Vivant | Évolution, espèces, écosystèmes, extinctions |
| Sociétés | `peuplement-societe` | Peuplement & société | Populations, migrations, modes de vie |
| | `pouvoir-institutions` | Pouvoir & institutions | États, gouvernements, droit, traités |
| | `conflits` | Conflits | Guerres, batailles, révoltes |
| | `economie-echanges` | Économie & échanges | Production, commerce, monnaie |
| | `territoires-exploration` | Territoires & exploration | Explorations, conquêtes de territoires, colonisation |
| | `sante-corps` | Santé & corps | Médecine, maladies, soins |
| | `catastrophes` | Catastrophes | Catastrophes naturelles ou humaines touchant des sociétés |
| Productions | `techniques-inventions` | Techniques & inventions | Outils, machines, infrastructures |
| | `sciences-savoirs` | Sciences & savoirs | Découvertes, savoirs, éducation |
| | `philosophie-ideologies` | Philosophie & idéologies | Courants de pensée, doctrines |
| | `religions-spiritualites` | Religions & spiritualités | Croyances, cultes, textes religieux |
| | `arts-culture-loisirs` | Arts, culture & loisirs | Œuvres, courants, langues, loisirs |
| | `sport` | Sport | Compétitions, pratiques sportives |

Niveau 2 prévu, non créé : droit et justice (sous `pouvoir-institutions`), éducation (sous `sciences-savoirs`), langues (sous `arts-culture-loisirs`), environnement-écologie (sous `terre`), agriculture-alimentation et architecture (parents à arbitrer).

## Règles de classement

- Une fiche a de 1 à 3 tags. La position la plus basse désigne le tag principal, qui donne la couleur.
- Un tag est un domaine, jamais un lieu ni une époque. Il n'existe pas de tag « Autre » : une fiche non classée n'a simplement aucun tag.
- Une période n'est taguée que si elle est thématique. Ères, règnes, dynasties et régimes reçoivent `non_thematic = true` et aucun tag, ce qui les distingue des périodes pas encore relues.
- Une période non thématique n'apparaît pas quand un filtre thématique est actif dans le tableau Périodes.
- Exploration spatiale : `techniques-inventions` en principal, `territoires-exploration` en second.
- Événement naturel sans société humaine touchée : `terre`, ou `vivant` pour une extinction. `catastrophes` est réservé aux événements qui touchent des sociétés.
- Fait biographique : il hérite du domaine de la personne. « Biographie » n'est pas un tag ; un filtre « Personnalités » serait une dimension séparée, combinée en ET.
- Un tag sans aucune fiche, comme `sport` aujourd'hui, reste dans la grille mais n'est pas proposé dans les filtres.

## Filtre de la vue exploration

Sur toute frise qui couvre au moins deux sujets, un select discret figure dans l'en-tête. À partir de 16 événements, l'exploration part d'une sélection réduite : les événements dont l'un des tags (principal ou non) appartient aux tags de la frise, ou à ses deux sujets principaux les plus représentés si elle n'en a pas (un seul si elle n'en couvre qu'un). Les événements majeurs et les fiches non classées restent visibles dans cet état « L'essentiel ». Le select propose aussi « Tous les sujets » et chaque sujet présent, seul ; en dessous de 16 événements, la frise s'ouvre sur « Tous les sujets ». Le filtre ne touche pas les périodes, se fait par frise comparée et revient à l'état de départ au changement de frise. Une frise d'un seul thème ne s'allège pas avec les tags : seul le niveau d'importance pourrait le faire.

## Correspondance avec les anciennes catégories

Effectifs : fiches liées dans le catalogue, en événements / périodes / frises. L'accord compare chaque règle au classement manuel des 300 fiches de l'échantillon ; il est indicatif, car ce classement a été fait par un seul annotateur.

| Ancienne catégorie | É / P / F | Tag proposé | Traitement | Accord (échantillon) | Cas à signaler |
|---|---|---|---|---|---|
| Art et Culture (`CAT_ART`) | 33 / 18 / 1 | `arts-culture-loisirs` | Direct | 15/15 | Architecture à arbitrer |
| Technologie (`CAT_TECH`) | 74 / 25 / 6 | `techniques-inventions` | Direct | 29/32 | Quelques découvertes vont vers `sciences-savoirs` ; spatial en second tag |
| Cosmologie (`CAT_COSMO`) | 4 / 11 / 2 | `cosmos` | Direct | 3/3 | Ères primordiales : vérifier le caractère thématique |
| Astrophysique (`CAT_ASTRO`) | 10 / 9 / 1 | `cosmos` | Direct | 3/3 | Avec Géologie : ajouter `terre` |
| Physique des particules (`CAT_PART`) | 0 / 5 / 0 | `cosmos` | Direct | aucune fiche | Toujours associée à Cosmologie |
| Biologie évolutive (`CAT_BIO_EVO`) | 39 / 26 / 5 | `vivant` | Direct | 11/13 | Périodes géologiques à exclure |
| Microbiologie (`CAT_MICRO`) | 5 / 0 / 0 | `vivant` | Direct | 1/1 | Avec Histoire (1 fiche) : relire |
| Botanique (`CAT_BOT`) | 4 / 0 / 0 | `vivant` | Direct | aucune fiche | |
| Géologie (`CAT_GEO`) | 42 / 59 / 4 | `terre` | Conditionnel | 18/22 | 7 catastrophes sur 22 ; 9 périodes chronologiques ; relire les 25 fiches avec Histoire |
| Paléontologie (`CAT_PALEO`) | 55 / 49 / 4 | `vivant` | Conditionnel | 14/21 | 7 fiches vers `terre` ; périodes géologiques non thématiques |
| Physique théorique (`CAT_PHYS`) | 2 / 8 / 1 | `cosmos` avec Cosmologie, sinon relecture | Conditionnel | 2/3 | Découvertes vers `sciences-savoirs` |
| Océanographie (`CAT_OCEAN`) | 2 / 4 / 0 | `terre` | Conditionnel | 1/2 | Voir le co-classement |
| Écologie (`CAT_ECO_SYS`) | 7 / 3 / 1 | `vivant` avec Biologie, sinon `terre` | Conditionnel | 2/2 pour `terre` | Niveau 2 environnement-écologie |
| Chimie (`CAT_CHEM`) | 4 / 1 / 0 | Aucun par défaut | Relecture | aucun tag dominant | 5 fiches, à classer une par une |
| Histoire et Civilisations (`CAT_HIST`) | 434 / 439 / 41 | Aucun | Reclassement | sans objet | 12 tags différents dans l'échantillon, 28 % de règnes, dynasties, empires et régimes |
| Anthropologie, Archéologie (`CAT_ANTHRO`) | 51 / 67 / 12 | Aucun | Reclassement | 16/31 pour `peuplement-societe` | Mêle évolution humaine, techniques et cultures |
| Religion et Philosophie (`CAT_PHILO`) | 46 / 33 / 5 | Aucun | Reclassement | 6/16 pour `religions-spiritualites` | Souvent des conflits religieux ; la catégorie regroupe deux domaines |
| Économie (`CAT_ECO`) | 31 / 26 / 3 | Aucun | Reclassement | 6/14 pour `economie-echanges` | Catégorie appliquée de façon trop large |
| Personnelle (`CAT_PERSONAL`) | 0 / 0 / 0 | Aucun | Sans équivalent | sans objet | Pas un domaine ; catégorie conservée, hors grille |

### Portée de la conversion

Sur 1 161 fiches et frises catégorisées, combinaisons comprises :

| Traitement | Fiches | Part |
|---|---|---|
| Direct : au moins une catégorie fiable | 259 | 22 % |
| Conditionnel : règle à relire | 72 | 6 % |
| Reclassement complet | 830 | 71 % |

S'y ajoutent les fiches sans catégorie (101 événements, 50 périodes), qui partent de leur texte et de leurs classes Wikidata. Une frise n'est taguée que pour ses thèmes : « Histoire de France » ne reçoit aucun tag au titre de son lieu.

## Ordre de déploiement

1. Fait le 8 novembre 2026 : `database/migrations/20261108120000_taxonomy_tags.sql` appliquée. Elle n'ajoute que des tables, une colonne et les 16 tags, et reste compatible avec le code alors en production.
2. Lot 1 fait le 8 novembre 2026 : 269 périodes sur 611 marquées non thématiques (`database/data/20261108_tags_lot1_non_thematiques.sql`, dates « Modifié » conservées). Lot 2 fait le 8 novembre 2026 : 341 périodes taguées (`database/data/20261109_tags_lot2_periodes.sql`). Lot 3 fait le 8 novembre 2026 : 652 événements tagués (`database/data/20261109_tags_lot3_evenements.sql`). Lot 4 fait le 8 novembre 2026 : 35 frises sur 51 taguées et dernière période marquée (`database/data/20261109_tags_lot4_frises.sql`).
3. Fait le 8 novembre 2026 : aucune période ni aucun événement non classé. 16 frises définies par un lieu ou une époque restent volontairement sans tag.
4. Déployer l'API et l'interface : avant le remplissage, les filtres seraient vides et le surlignage de la timeline inactif.
5. Les anciennes catégories ne sont retirées qu'après validation séparée. Elles ne sont plus modifiables dans l'interface et restent transportées par l'API.
