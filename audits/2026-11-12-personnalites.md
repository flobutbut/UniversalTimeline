# Lot « personnalités » — six frises

Date : 2026-11-12 · État : **appliqué en production le 12 novembre 2026** (frises 58 à 63), contenu comparé au lot après écriture. Règles suivies : `Documentation/CREATION-DE-FRISES.md`.

## Fichiers

- `database/data/20261112_personnalites.sql` : création, une transaction.
- `database/data/20261112_personnalites_rollback.sql` : retour arrière ciblé.
- `database/data/20261112_personnalites.json` : contenu complet du lot, dates calculées par `temporal.ts` (référence 2026-11-12T12:00:00Z).
- `database/data/20261112_personnalites_source/` : texte éditorial (`content.mjs`) et générateur (`build.mjs`).

## Contenu

| Frise | Frise parente | Périodes | Événements | Ouverte depuis |
|---|---|---|---|---|
| Jésus de Nazareth | Antiquité romaine (45) | 3 | 6, dont 3 existants | « Naissance de Jésus » dans 45 et 10 |
| Bouddha (Siddhartha Gautama) | Histoire de l'Inde (55) | 3 | 5 | « Siddhartha Gautama (Bouddha) » dans 55 |
| Isaac Newton | Histoire de l'Angleterre (53) | 4 | 9, dont 1 existant | « Principia de Newton » dans 53 et 16 |
| Albert Einstein | Époque contemporaine (37) | 4 | 8, dont 2 existants | « Relativité restreinte » dans 37 |
| Adolf Hitler | Seconde Guerre mondiale (9) | 6, dont Shoah existante | 15, dont 6 existants | « Hitler nommé chancelier » dans 9 |
| Harry S. Truman | Histoire des États-Unis (50) | 6, dont Guerre de Corée existante | 12, dont 4 existants | « Truman expose sa doctrine » dans 12, « Hiroshima » dans 50 |

Total : 6 frises publiques, 24 périodes et 39 événements nouveaux, 17 événements et 2 périodes réutilisés, 9 points d'entrée par événement. Aucune fiche existante n'est modifiée.

## Décisions

- **Pas de période chapeau** « Vie de… » : les phases de vie sont les racines de chaque frise.
- **Moins de 16 événements par frise**, pour qu'elles s'ouvrent sur tout leur contenu sans le filtre « L'essentiel ».
- **Jésus** : dates à l'année, alignées sur les fiches existantes (naissance 4 av. J.-C., crucifixion 30). Wikidata place la fin du ministère en 33 ; la date de la conversion de Paul (34) est approximative et le dit.
- **Bouddha** : chronologie traditionnelle (563–483 av. J.-C.), annoncée comme discutée dans la description. La fiche existante « Siddhartha Gautama (Bouddha) », datée 500 av. J.-C., sert d'entrée et n'est pas reprise dans la frise.
- **Newton** : dates du calendrier grégorien (naissance le 4 janvier 1643), comme Wikidata ; la date julienne est donnée dans la description.
- **Présidence de Harry S. Truman** : période sans thème (`non_thematic`), comme les autres mandats.
- **Q-id** : 22 nouveaux, tous retrouvés par recherche Wikidata puis vérifiés (libellés, liens Wikipédia) ; aucun n'est déjà en base. Les naissances, morts et phases de vie n'ont pas de Q-id, donc ni lien Wikipédia ni image.
- **Titres Wikipédia** : repris des liens Wikidata ; quatre fiches n'ont qu'un article anglais (Grand Départ, télescope de Newton, éclipse de 1919, renvoi de MacArthur) et la mort du Bouddha n'en a aucun.

## Contrôles du script

Refus du lot si : une frise source est absente ou renommée, les sources n'ont pas un seul propriétaire, une fiche réutilisée a changé de date ou de Q-id, une ancre n'est plus dans sa frise, un titre de frise, un libellé ou un Q-id nouveau existe déjà.

## Répétition locale

PostgreSQL 17 jetable, baseline `database/baseline/application.sql`, données minimales reprises des identifiants de production : création réussie (frises 58 à 63, comptes conformes), seconde exécution refusée, retour arrière ramenant la base à son état initial (empreinte identique).

## Non vérifié

- Le rendu dans l’exploration n’a été contrôlé que sur trois frises (58, 59, 62), par le contenu de la page ; les accès depuis les frises sources n’ont pas été parcourus à la main.
- Les descriptions sont rédigées de mémoire à partir de faits biographiques courants, sans relecture source par source.

---

# Second lot — dix frises

État : **appliqué en production le 12 novembre 2026** (frises 64 à 73), comptes relus en base. Le débordement signalé chez Louis XIV (et un autre chez Lincoln) est un faux positif : les dates écrites coïncident ou s’emboîtent, mais les fiches anciennes ont des `*_years_bp` arrondis à trois décimales et calculés à un autre instant de référence. Fichiers : `database/data/20261112_personnalites_lot2.sql`, son `_rollback.sql`, son `.json` ; texte éditorial dans `20261112_personnalites_source/content2.mjs`.

| Frise | Frise parente | Périodes | Événements | Ouverte depuis |
|---|---|---|---|---|
| Alexandre le Grand | Antiquité grecque (44) | 3, dont Conquêtes existante | 9, dont 4 existants | « Mort d'Alexandre le Grand » dans 44 |
| Jules César | Antiquité romaine (45) | 5, dont Guerre des Gaules existante | 8, dont 3 existants | « Passage du Rubicon » dans 45, « Siège d'Alésia » dans 51 |
| Confucius | Histoire de la Chine (52) | 4 | 5, dont 1 existant | « Naissance de Confucius » dans 52 |
| Mahomet | Le monde islamique médiéval (54) | 2, dont Prédication existante | 10, dont 3 existants | « Début de l'Hégire » dans 54 et 15 |
| Charlemagne | Histoire de France (51) | 3, dont Règne existant | 7, dont 1 existant | « Couronnement de Charlemagne » dans 51 et 15 |
| Galilée | Époque moderne (16) | 4 | 8, dont 2 existants | « Sidereus Nuncius » dans 16 |
| Louis XIV | Histoire de France (51) | 5, dont Règne et Succession d'Espagne existants | 8, dont 3 existants | « La cour s'installe à Versailles » dans 51 |
| Gandhi | Histoire de l'Inde (55) | 3 | 7, dont 4 existants | « Assassinat de Gandhi » dans 55 |
| Winston Churchill | Histoire de l'Angleterre (53) | 6, dont Bataille d'Angleterre existante | 10, dont 2 existants | « Churchill devient Premier ministre » dans 53 et 9 |
| Charles de Gaulle | Régimes politiques en France (35) | 7, dont Présidence existante | 12, dont 5 existants | « Appel du 18 juin » dans 35 et 51 |

Total : 10 frises publiques, 34 périodes et 56 événements nouveaux, 28 événements et 8 périodes réutilisés, 15 points d'entrée. Aucune fiche existante n'est modifiée.

## Décisions propres à ce lot

- **Sous-périodes** : chez Louis XIV, la minorité (avec la Fronde) et le règne personnel (avec la guerre de Succession d'Espagne) sont placés sous le règne existant ; les guerres de Saxe sous le règne de Charlemagne ; la bataille d'Angleterre sous « Churchill dans la Seconde Guerre mondiale ».
- **Confucius et Mahomet** : dates traditionnelles, à l'année, signalées comme telles ; Confucius n'a aucun Q-id nouveau, donc ni lien ni image hors de sa naissance.
- **Charlemagne** : naissance en 748, date la plus souvent retenue, signalée comme discutée.
- **Galilée** : naissance au 15 février 1564, date usuelle (calendrier julien, avant 1582).
- **César** : la dictature se termine à la date de la fiche existante de l'assassinat (`-0043-03-15`, soit le 15 mars 44 av. J.-C.).
- **Q-id** : 24 nouveaux, vérifiés comme pour le premier lot. Deux fiches trouvées en cours de route étaient déjà en base et sont réutilisées (bataille de l'Hydaspe, Marche du sel).

## Répétition locale

Même protocole : création réussie (dix frises, parents locaux conformes), seconde exécution refusée, retour arrière ramenant la base à son état initial.

---

# Troisième lot — onze frises

État : **appliqué en production le 12 novembre 2026** (frises 74 à 84), comptes relus en base. Fichiers : `database/data/20261112_personnalites_lot3.sql`, son `_rollback.sql`, son `.json` ; texte éditorial dans `20261112_personnalites_source/content3.mjs`.

| Frise | Frise parente | Périodes | Événements | Ouverte depuis |
|---|---|---|---|---|
| Gengis Khan | Moyen Âge (15) | 3 | 5, dont 2 existants | « Fondation de l'Empire mongol » dans 15, 52 et 54 |
| Jeanne d'Arc | La guerre de Cent Ans (33) | 3 | 9, dont 3 existants | « Jeanne d'Arc brûlée à Rouen » dans 33 et 51 |
| Martin Luther | Époque moderne (16) | 4 | 8, dont 1 existant | « Les 95 thèses de Luther » dans 16 et 17 |
| Christophe Colomb | Grandes découvertes (34) | 4, dont Voyages existante | 7, dont 2 existants | « Arrivée de Christophe Colomb en Amérique » dans 34 et 16 |
| Abraham Lincoln | Histoire des États-Unis (50) | 4, dont Guerre de Sécession existante | 9, dont 4 existants | « Assassinat d'Abraham Lincoln » dans 50 |
| Mao Zedong | Histoire de la Chine (52) | 6, dont Ère maoïste, Grand Bond et Révolution culturelle existantes | 8, dont 5 existants | « Mort de Mao Zedong » dans 52 |
| Charles Darwin | Histoire de l'Angleterre (53) | 4 | 7, dont 1 existant | « De l'origine des espèces » dans 53 et 37 |
| Marie Curie | Histoire de France (51) | 3 | 10, dont 2 existants | « Découverte du radium » dans 51 et 37 |
| Joseph Staline | Époque contemporaine (37) | 7, dont Stalingrad existante | 11, dont 5 existants | « Pacte germano-soviétique » dans 9, « Révolution d'Octobre » dans 37 |
| Léonard de Vinci | Renaissance (17) | 4 | 5, dont 1 existant | « La Joconde » dans 17 et 40 |
| Nelson Mandela | Époque contemporaine (37) | 7 | 7 | racine de 37 (aucune fiche d'accroche dans le catalogue) |

Total : 11 frises publiques, 43 périodes et 60 événements nouveaux, 26 événements et 6 périodes réutilisés, 20 points d'entrée dont un à la racine. Aucune fiche existante n'est modifiée.

## Décisions propres à ce lot

- **Mandela** : aucun événement sud-africain n'existait ; la frise s'ouvre depuis la racine d'Époque contemporaine et contient la période « Apartheid » (1948–1994), en parallèle des phases de vie.
- **Staline** : naissance au 18 décembre 1878 (registres), la date officielle de 1879 étant rappelée ; « Conférence de Potsdam », créée au premier lot, est réutilisée.
- **Gengis Khan, Jeanne d'Arc, Colomb** : années de naissance approximatives (1162, 1412, 1451), signalées comme telles.
- **Luther** : la diète de Worms de 1521 n'a pas de Q-id, la recherche ne renvoyant de façon sûre que la diète de 1495.
- **Sous-périodes** : conquête du Khwarezm sous les conquêtes de Gengis Khan ; guerre des Paysans sous « Luther organise la Réforme » ; guerre de Sécession sous la présidence de Lincoln ; Grand Bond et Révolution culturelle sous l'Ère maoïste ; Grandes Purges et Stalingrad sous leurs phases.
- **Q-id** : 21 nouveaux, vérifiés ; le XIIIe amendement, trouvé en cours de route, était déjà en base et est réutilisé.

## Répétition locale

Même protocole : création réussie (onze frises, parents locaux et accès racine conformes), seconde exécution refusée, retour arrière ramenant la base à son état initial.
