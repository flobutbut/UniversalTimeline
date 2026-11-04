# Audit des frises et stratégie de navigation

État de Supabase Universal-Timeline au 4 novembre 2026, 12:32 CET. Inspection en lecture seule. Les propositions ci-dessous ne sont pas appliquées à l’application ni à la base. Le code examiné est celui de l’espace de travail, qui comporte des modifications en cours. Le comportement de l’application déployée n’a pas été vérifié dans le navigateur.

## Règles du produit

La frise principale ne comporte aucun zoom. La navigation horizontale sert exclusivement à avancer ou reculer de façon linéaire dans le temps. Un changement de sujet n'est jamais un précédent ou un suivant.

L'objectif est de conserver cette règle lorsque l'on passe d'une frise à une autre, et de permettre le retour sans obliger à conserver une période chapeau. Les branches, le leveling et de nouveaux sélecteurs ne sont pas des prérequis à cette correction.

Le problème principal est le cumul de responsabilités : certaines périodes servent de contenu, de sujet de la frise, de bouton de retour, de support de liens et de condition d’accès aux voisins chronologiques. Retirer une période du récit ne devrait pas retirer ces autres fonctions.

## Ce que contient le tableur

| Onglet | Utilisation |
| --- | --- |
| Synthèse | Chiffres et méthode de lecture. |
| Frises | Les 39 frises, les candidats chapeau, les parents historiques, les sources d’accès et les colonnes de revue éditoriale. |
| Périodes | Les 418 appartenances période–frise. Filtrer Détection sur « Couverture complète » pour retrouver les 17 candidats. |
| Accès | 65 relations explicites distinctes, avec leur provenance et leur ancre. Une présentation chronologique est identifiée comme telle. |
| Partages | 102 paires de frises partageant au moins une période ou un événement. Ces rapprochements ne constituent pas une parenté éditoriale. |

La base contient 366 périodes, 421 événements, 418 appartenances de périodes et 555 appartenances d’événements. Les fiches non utilisées restent dans l’instantané source. L’export couvre toutes les frises, y compris privées, sans exporter leurs propriétaires ou leurs auteurs.

Les cellules jaunes du tableur sont des champs exploratoires laissés vides. Les colonnes de sujet, branche et parent proposé ne constituent pas un modèle validé. L'inventaire et les mesures de couverture restent utilisables indépendamment de ces pistes.

## Détection des périodes chapeau

Une période est signalée si son intervalle contient tous les autres contenus de sa frise, périodes et événements compris. Le candidat lui-même est exclu de l’échantillon comparé : on évite de conclure qu’une période est un chapeau uniquement parce qu’elle définit les bornes de sa propre frise. Les comparaisons utilisent le moteur temporel du projet à l’instant de l’extraction, avec une tolérance d’une seconde pour les arrondis. Les textes sources et les coordonnées comparables sont conservés dans le tableur.

Une autre donnée mal datée empêche de confirmer une couverture complète. Une période seule, sans événement, est classée « Contenu unique ». Une couverture complète constitue un indice géométrique, pas la preuve que la période n’apporte rien au récit. Par exemple, une période nommée Guerre froide peut encore servir de cadrage éditorial utile.

| Frise | Période à couverture complète |
| --- | --- |
| Univers moderne | Univers |
| Big Bang et ères primordiales | Big Bang |
| Empire romain | Antiquité romaine |
| Antiquité et premières civilisations | Holocène |
| Guerre froide | Guerre froide |
| Conquête spatiale | Conquête spatiale |
| Moyen Âge | Moyen Âge |
| Époque moderne | Époque moderne |
| Renaissance | Renaissance |
| Néolithique | Néolithique |
| Âges des métaux | Âges des métaux |
| Les cinq grandes extinctions | Phanérozoïque |
| Révolutions industrielles et énergie | Ère industrielle |
| L’âge des révolutions | Âge des révolutions |
| Empire byzantin | Empire byzantin |
| La guerre de Cent Ans | Guerre de Cent Ans |
| Époque contemporaine | Histoire contemporaine |

Les chapeaux retirés auparavant ne sont pas reconstitués : l’audit décrit l’état actuel, pas l’historique des suppressions. Les candidats proches de 100 % mais débordés par un événement restent visibles via le pourcentage de durée et le statut « Couverture partielle ».

## Problèmes d’architecture confirmés

### 1. Plusieurs sens de « frise associée » sont fusionnés

Le serveur fournit les accès explicites et les contenus partagés séparément. Le client les fusionne ensuite dans une liste de liens par période ou événement. Une suggestion issue d’un contenu partagé n’a pas le même sens qu’une vue de détail choisie par l’auteur. Pourtant, elles se retrouvent dans le même mécanisme de badges.

Preuves : [assemblage serveur](../../server/src/repositories/storyRepository.ts#L20), [fusion côté client](../../src/lib/storyNavigationLinks.ts#L12).

Conséquence : une période très partagée devient un carrefour de suggestions. Le nombre d’associations dépend du partage de contenu plutôt que d’une intention de navigation stable.

### 2. Supprimer du contenu peut supprimer des accès

Le retrait d’une période d’une frise supprime ses ancres historiques et peut faire disparaître les points d’entrée et présentations qui dépendent de cette appartenance. Les enfants de la période deviennent des racines. Cela respecte le modèle courant mais rend le nettoyage éditorial dépendant de la navigation.

Preuves : [retrait des associations](../../server/src/repositories/storyRelationsRepository.ts#L18), [présentations dépendantes des appartenances](../../database/migrations/20261102131202_story_period_presentations.sql#L8).

Dans l’instantané actuel, Terre ne figure plus dans Histoire géologique de la Terre. Univers moderne possède désormais trois accès sur Terre : Géologie, Vie et Climat. Géologie conserve cependant Vie et Climat comme enfants historiques sans ancre. Le client reporte ces liens sans ancre sur chacune des quatre racines géologiques. Ce repli peut leur donner des emplacements qui ne traduisent pas une intention éditoriale.

Preuve du repli : [ancres remplacées par les racines](../../src/lib/storyNavigationLinks.ts#L8). L’origine exacte des suppressions historiques n’a pas été reconstituée.

### 3. Le retour local et le retour vers la provenance sont différents

Le retour de la barre parent remonte dans les périodes locales ou vers le contexte chronologique. Le fil des frises visitées permet déjà de revenir vers des frises précédentes, mais il faut vérifier qu'il conserve exactement la frise et la période depuis lesquelles le lecteur est entré. La cible de navigation contient actuellement storyId, periodId, contextId, view et entry.

Preuves : [retour local](../../src/composables/useHomeNavigation.ts#L197), [historique des visites](../../src/composables/useHomeNavigation.ts#L31), [contrat de cible](../../src/lib/timelineNavigation.ts#L6).

Il faut préserver ce qui fonctionne dans le fil d’Ariane et compléter le contrat. Afficher la période source comme une véritable période locale de la cible réintroduirait le couplage que l’on cherche à retirer.

### 4. La navigation chronologique exige une période dupliquée dans la cible

Une présentation demande que sa période appartienne à la frise de référence et à la frise de détail. Le client vise ensuite cette période dans la cible. Retirer un chapeau peut donc supprimer la présentation et les voisins liés à son contexte, même si les subdivisions du récit sont intactes.

Preuves : [double clé étrangère](../../database/migrations/20261102131202_story_period_presentations.sql#L8), [cible chronologique](../../src/lib/timelineNavigation.ts#L58).

La base ne comporte que quatre présentations, toutes dans Grandes périodes de l’histoire européenne. Les nombreux points d’entrée thématiques ne sont pas automatiquement des parcours précédent/suivant.

### 5. Les accès à la racine n’ont pas leur propre emplacement d’affichage

L’exploration attache les accès aux cartes de périodes et d’événements. La barre parent n’existe que si une période courante existe. Les liens historiques sans ancre sont répartis sur les périodes racines. Une frise sans période d’accueil ne dispose donc pas d’un emplacement équivalent et stable pour ses accès de racine.

Preuves : [barre parent conditionnelle et badges](../../src/views/HomeView/PeriodGrid.vue#L26), [indexation par ancre](../../src/lib/storyNavigationLinks.ts#L34).

Histoire des techniques a actuellement un accès explicite depuis Les premiers hominines, sur un événement. Elle n’a pas d’accès explicite depuis Genre Homo. Son récit commence à 3,3 Ma, tandis que l’enveloppe de Genre Homo commence à 2,8 Ma. L’accès à ajouter serait thématique, éventuellement placé à la racine de la frise Homo, sans imposer une inclusion temporelle.

### 6. La distance de navigation ne mesure pas la spécialisation du sujet

20 frises ont plusieurs sources explicites, présentations comprises. Vie et Climat se trouvent à une transition d’Univers moderne depuis les nouveaux accès sur Terre, mais à une profondeur historique de deux via Géologie. Les deux chiffres sont corrects dans leur définition respective. Aucun ne constitue un niveau universel de connaissance.

Grandes périodes de l’histoire européenne n’a pas de chemin orienté depuis Univers en suivant uniquement les parents historiques et les points d’entrée. Cela ne signifie pas qu’elle est invisible : le catalogue et les suggestions de contenu partagé peuvent y donner accès. Les calculs du tableur portent sur la structure en base, sans simulation des droits d’un lecteur particulier. Le fil d’Ariane actuel sait aussi reconstruire un chemin via les suggestions partagées, donc son résultat peut différer de la distance explicite auditée.

Preuve du parcours client élargi : [recherche depuis Univers](../../src/lib/universeStoryTrail.ts#L21).

## Proposition simplifiée

Trois actions suffisent à décrire le besoin :

| Action | Comportement attendu |
| --- | --- |
| Gauche / droite | Rejoindre l'étape chronologique précédente ou suivante. Même signification à l'intérieur d'une frise ou en passant dans une autre. |
| Ouvrir une frise associée | Consulter cette frise depuis la période, l'événement ou la racine qui donne accès à elle. Cette association ne choisit pas les voisins temporels. |
| Revenir | Retrouver la frise et la période d'où l'on vient, même si la cible ne contient pas la période source. |

Aucun sélecteur de récits n'est proposé comme navigation horizontale. Géologie, Vie et Climat ne sont pas des étapes successives dans le temps : leurs associations ne doivent donc pas les rendre voisines avec les flèches.

### Retirer un chapeau sans perdre le retour

Lorsqu'on ouvre Géologie depuis Terre dans Univers moderne, conserver cette origine. La période Terre peut rester un repère de retour sans être ajoutée aux périodes du récit géologique.

La première ligne existante est l'emplacement à étudier en priorité pour ce retour. Un bandeau supplémentaire n'est pas une exigence. Il reste à vérifier la représentation lorsque les durées de la source et de la cible diffèrent : afficher Terre comme repère de retour ne doit pas fabriquer une correspondance de longueur entre les deux frises.

### Conserver la continuité temporelle entre frises

Un passage dans une frise de détail doit conserver le lien avec la place chronologique par laquelle on y est entré. Retirer la période chapeau de la cible ne devrait pas effacer ce lien.

Exemple de comportement : dans une succession Antiquité → Moyen Âge → Époque moderne, ouvrir la frise de détail de Moyen Âge doit permettre de retrouver Antiquité et Époque moderne comme voisines temporelles au niveau de cette succession. Dans les subdivisions du Moyen Âge, les voisins correspondent au découpage chronologique de ces subdivisions.

Cela demande de distinguer la période qui situe la frise dans la chronologie et les périodes réellement racontées dans celle-ci. Le modèle de présentations existant est le premier mécanisme à examiner pour retirer l'obligation de recopier la période dans la cible. Aucun choix supplémentaire de parcours par le lecteur n'est posé comme condition de fonctionnement.

Les périodes simultanées ou imbriquées ne deviennent pas successives parce qu'elles ont la même profondeur. Le critère de continuité doit être vérifié sur les découpages réels avant de modifier l'algorithme.

### Donner accès aux frises depuis une racine

Un accès placé à la racine doit pouvoir apparaître sans créer une période chapeau pour le porter. C'est une correction du support des associations existantes.

Histoire des techniques doit ainsi pouvoir être associée à une racine pertinente sans entrer artificiellement dans l'intervalle de Homo sapiens. Cette association n'a aucun effet sur les flèches temporelles.

### Place du leveling

Le leveling reste une hypothèse à évaluer, pas une solution déjà choisie. Il pourrait aider à reconnaître des rangs de découpage comparables. Il ne doit pas décider que deux récits sont temporellement successifs parce qu'ils partagent un niveau ou un parent.

Avant d'ajouter des niveaux globaux ou un classement de sujets, vérifier si le parent local et la place chronologique d'entrée suffisent pour les cas concrets. Plusieurs accès à une frise doivent rester compatibles avec le chemin réellement suivi par le lecteur.

## Ordre de travail proposé

1. Décrire le résultat attendu sur trois parcours : Univers → Terre → Géologie, une succession historique traversant plusieurs frises, et un accès à Techniques depuis une racine.
2. Vérifier le retour vers l'origine et la conservation des voisins temporels après retrait d'un chapeau. Réutiliser les mécanismes existants autant que possible.
3. Permettre les associations à la racine sans période artificielle.
4. Examiner alors le besoin de leveling, uniquement pour les ambiguïtés restantes.
5. Revoir les 17 candidats chapeau une fois leur retrait compatible avec ces comportements.

## Composition des frises : question encore ouverte

Le tableur distingue les périodes du récit et les relations de navigation. Il ne démontre pas qu'une frise devrait ne contenir que des événements. L'appartenance explicite des périodes est utilisée aujourd'hui pour sélectionner et organiser les subdivisions.

Avant de retirer cette appartenance, il faut comparer le fonctionnement attendu sur les trois parcours ci-dessus. Cette décision n'est pas nécessaire pour corriger le retour ou afficher un accès à la racine.

## Vérification et reproduction

L’instantané source a été extrait en une seule requête SQL de lecture, conservée dans extraction.sql. source.json contient les huit tables utiles à cet audit et l’heure de lecture. build.mjs réutilise le moteur temporel local pour produire les calculs et le classeur. Les totaux des appartenances et les identifiants ont été rapprochés de l’instantané, les formules de synthèse ont été contrôlées et leur recalcul testé. Les cinq onglets ont été rendus pour vérification visuelle. Le classeur n’a pas été testé dans une application Excel native.

La régénération à partir de source.json conserve la date de cet instantané. Obtenir l’état actualisé nécessite une nouvelle extraction en lecture seule. Les décisions humaines remplies dans le classeur doivent être reportées par identifiant stable avant toute régénération, car le constructeur crée un nouveau fichier.
