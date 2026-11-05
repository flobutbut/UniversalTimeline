# Créer une frise — règles et bonnes pratiques

Guide mis à jour le 4 novembre 2026 pour le moteur de navigation de l’exploration. Il distingue le contenu d’une frise, ses points d’entrée, son parcours chronologique et le chemin suivi par le lecteur. Le modèle technique est décrit dans [RELATIONS-FRISES.md](RELATIONS-FRISES.md), et les sujets envisagés dans [FRISES-A-CREER.md](FRISES-A-CREER.md).

## 1. Le modèle en bref

Une frise organise des périodes et des événements du catalogue partagé. Elle contient ce qui sert à raconter son sujet ; ses liens de navigation ne l’obligent pas à recopier le contenu de ses sources.

| Élément | Stockage | Rôle |
| --- | --- | --- |
| Faits communs : nom, description, dates, Wikidata, catégories | `periods`, `events` | Une modification s’applique partout où la fiche est utilisée. |
| Période et parent local dans un récit | `story_periods` | Un `parent_period_id` NULL désigne une racine locale. Une même période peut avoir des parents différents selon la frise. |
| Événement dans un récit | `story_events` | Appartenance explicite ; affichage selon sa date, sans parent de période obligatoire. |
| Accès depuis une autre frise | `story_entry_points` | Depuis une période, un événement ou la racine de la source ; plusieurs sources et emplacements sont permis. |
| Place dans un parcours chronologique | `story_period_presentations` | La frise présente une période d’un contexte de référence, sans devoir la contenir. |
| Parent et ancres historiques | `stories.parent_story_id`, `story_anchors` | Rattachements conservés pour compatibilité et certaines opérations de création ; ils ne définissent pas seuls le chemin du lecteur. |
| Chemin de retour | État de l’historique du navigateur | Positions quittées avec leur contexte ; ce chemin n’est pas une relation à enregistrer en base. |

La hiérarchie des périodes à l’intérieur d’une frise reste un arbre local. Les accès entre frises forment un réseau : une destination peut avoir plusieurs origines. Aucun niveau global unique n’est attribué aux frises.

## 2. Architecture : le rôle de chaque frise

### Trois rôles de lecture

| Rôle | Ce qu’elle organise | Exemples |
| --- | --- | --- |
| **Récit** | Les périodes et événements nécessaires à un sujet détaillé | Histoire du climat, Les croisades |
| **Portail** | Des périodes ouvrant vers des récits, avec éventuellement des événements de contexte | Univers moderne |
| **Parcours chronologique** | Des périodes de référence et leurs frises de détail, ordonnées dans le temps | Grandes périodes de l’histoire européenne |

L’interface déduit ces rôles de la structure. Ils ne constituent ni un niveau de navigation ni une règle d’accès. Une frise peut raconter son sujet tout en ouvrant vers d’autres récits.

### Choisir la bonne relation

| Besoin | Relation | Règle |
| --- | --- | --- |
| Décomposer une période dans le même récit | `story_periods.parent_period_id` | Le parent appartient à cette même frise. |
| Ouvrir un récit depuis une période ou un événement | Point d’entrée dans la source | L’ancre appartient à la source ; sa copie dans la cible n’est pas requise. |
| Ouvrir un récit depuis la frise entière | Point d’entrée à la racine | Ne pas créer une période chapeau pour porter ce lien. |
| Continuer vers une époque précédente ou suivante | Présentation dans un contexte chronologique | L’ordre vient des dates du contexte, pas de la parenté des frises. |
| Utiliser une fiche dans plusieurs récits | Appartenances explicites de la même fiche | La réutilisation ne crée pas automatiquement un parcours chronologique. |

Un accès n’exige ni inclusion temporelle, ni période commune aux deux récits, ni « niveau adjacent » dans l’ancien arbre. Il reste une action explicite dans un badge : les flèches ne deviennent pas des raccourcis thématiques.

### Règles de construction

1. **Définir le récit avant ses accès.** Choisir son sujet et sa durée, puis les sources depuis lesquelles il est utile de l’ouvrir.
2. **Ne pas recopier une période pour fabriquer un retour.** Une période couvrant toute la frise est à conserver seulement si elle structure ou informe le récit ; son seul rôle de chapeau de navigation ne suffit pas.
3. **Créer un récit de détail lorsqu’une période devient difficile à lire.** Plus de 10 sous-périodes, plus de deux niveaux sous elle, une dizaine d’événements propres ou le besoin d’une entrée directe sont des signes utiles. Ce sont des repères éditoriaux, pas des niveaux globaux obligatoires.
4. **Conserver les sources utiles.** Une même destination peut s’ouvrir depuis Terre, depuis Géologie ou depuis un événement, sans remplacer ses autres accès.
5. **Relier les époques successives par un parcours.** Moyen Âge → Époque moderne n’implique pas que la seconde frise soit enfant de la première.
6. **Respecter la fenêtre temporelle du récit cible.** L’origine de navigation ne doit ni élargir ses bornes, ni être dessinée arbitrairement sur toute sa largeur.

Un récit peut ne contenir que des événements. Il n’a pas besoin d’une période racine artificielle pour être navigable. Une petite frise reste pertinente si son sujet et ses accès sont utiles.

### Créer une frise depuis une période existante

L’action **Créer une frise depuis une période** effectue une transaction qui :

1. garde la période choisie dans la source comme point d’accès ;
2. déplace ses sous-périodes vers la nouvelle frise, sans recopier la période choisie comme chapeau ; ses enfants directs deviennent les racines du nouveau récit ;
3. rattache à la nouvelle frise les événements de la source compris dans les dates de la période ; ces événements restent aussi dans la source ;
4. reprend les catégories de la source et crée le rattachement historique ainsi que la présentation chronologique ;
5. transfère les accès et présentations situés sur les sous-périodes déplacées avant de retirer leurs appartenances de la source.

Les ancres d’une sous-frise déplacée qui restent dans l’ancienne source y sont conservées comme points d’entrée. Une présentation extérieure dont la frise source était la cible garde cette cible : retirer une appartenance ne change pas le sujet présenté. Si une frise liée appartient à un autre compte, l’opération de découpage est actuellement refusée pour éviter une perte de lien.

Depuis une période feuille, le nouveau récit peut ne contenir encore aucune période, voire aucun événement si la plage ne permet pas d’en reprendre. Son retour et son rattachement chronologique restent disponibles ; son contenu est à compléter.

### Avertissements encore présents dans l’interface

`src/lib/storyArchitecture.ts` déduit les rôles et signale notamment les rangs chargés, les débordements et les structures recopiées. Les avertissements de « saut de niveaux » et l’explication sur le parent requis pour publier utilisent encore l’arbre historique des parents. Le badge « Privé / Public » reflète toujours la visibilité réelle de la frise. Ces avertissements ne définissent ni les voisins temporels ni la validité d’un accès dans le nouveau moteur. Ne pas supprimer un lien utile pour satisfaire artificiellement cet ancien calcul.

## 3. Avant de créer : partir de l’existant

1. **Rechercher les frises, périodes et événements proches.** Réutiliser les fiches communes plutôt que dupliquer leurs faits.
2. **Définir le périmètre du récit.** Ses bornes viennent de ses périodes et événements, pas de la durée de sa source.
3. **Choisir les emplacements d’entrée.** Période, événement ou racine selon le sens du lien. L’ancre doit exister dans la source ; aucune copie dans la destination n’est nécessaire.
4. **Choisir un contexte chronologique si des voisins temporels sont utiles.** Distinguer cette décision de l’ajout d’un accès thématique.
5. **Préserver les autres origines.** Ajouter un accès ne doit pas supprimer ceux déjà présents.

Exemples de relations — ils ne décrivent pas tous un lot déjà appliqué en base :

| Cas | Choix |
| --- | --- |
| Terre ouvre Géologie, Vie ou Climat | Accès depuis Terre ; chaque récit conserve sa propre durée. |
| Les premiers hominines ouvre Genre Homo depuis son apparition | Accès depuis l’événement ; aucune fausse période « Les premiers hominines » dans Genre Homo. |
| Genre Homo ouvre Histoire des techniques, qui commence plus tôt | Accès à la racine ; ne pas inventer de période englobante ni déplacer le début du récit. |
| Moyen Âge et Époque moderne se suivent | Présentations dans un même parcours, sans recopier leurs références dans les récits cibles. |

### Dans l’éditeur

Dans **Relations**, ajouter les sources pertinentes. Le sélecteur propose une période de la source ou **Racine de la frise**. Le moteur et l’API acceptent aussi les entrées depuis un événement ; ce sélecteur ne propose actuellement pas les événements.

Dans **Relations → Parcours chronologique**, choisir la frise de référence et la période présentée par le récit courant. Le sélecteur propose aussi les périodes du contexte absentes du récit cible. Si une période choisie n’appartient pas encore au contexte, l’ajout l’y inscrit comme racine locale ; son placement existant est conservé sinon. Dissocier la présentation conserve la période dans le contexte.

### Contrainte actuelle de publication

Depuis le 5 novembre 2026, le formulaire et l’API autorisent la création manuelle et la publication d’une frise sans `parent_story_id`. La modale et la fiche signalent l’absence de point d’entrée et orientent vers **Propriétés** pour en ajouter un. Le rattachement proposé par **Choisir la frise parente** reste facultatif ; aucune période chapeau dans la cible n’est nécessaire. La génération Wikidata crée encore un brouillon privé.

Cette contrainte ne signifie pas que la navigation exige un parent unique. Ne pas confondre le parent historique, les sources d’accès et le chemin visité.

## 4. Structurer pour une lecture claire

### Périodes et événements du récit

Dans le détail d’un événement, **Frises associées** affiche la même liste que l’exploration : les rattachements explicites et les frises accessibles contenant le même événement, sans doublon ni inclusion de la frise courante. Seuls les rattachements explicites peuvent être détachés ici ; une frise partageant l’événement reste visible tant qu’elle le contient.

L’exploration, l’aperçu du détail et les miniatures utilisent le même moteur de placement (`sequentialTimelineLanes.ts`) et la même résolution de hiérarchie locale (`timelineHierarchy.ts`). À chaque niveau, les périodes et sous-frises sont placées dans l’ordre chronologique sur la ligne courante. Un chevauchement fait descendre d’une ligne ; les éléments suivants de ce niveau ne remontent jamais vers une ligne supérieure qui se serait libérée. Les niveaux suivants commencent sous les précédents. Les miniatures adaptent uniquement les hauteurs et limitent le nombre de lignes visibles.

Dans l’exploration, **Étendre** révèle tous les niveaux descendants des périodes visibles dans la frise courante, en respectant leurs parents locaux et sans limite d’une génération. Chaque niveau est étagé indépendamment : les périodes successives partagent la même ligne, y compris lorsqu’elles ont des parents différents ; seuls les chevauchements font descendre, sans réutiliser ensuite une ligne supérieure de ce niveau. Les cartes conservent leur présentation sur deux lignes : le nom au-dessus des dates, avec le badge des frises associées à droite. Les frises représentées comme périodes à cet endroit sont également affichées. Les enfants restent limités à la fenêtre active ; activer ce mode ne change ni l’échelle ni la position des événements. Un clic conserve la navigation habituelle, et désactiver le switch rétablit l’affichage courant.

- Regrouper des phases successives sous une période utile : Ère industrielle contient par exemple les révolutions industrielles et la Grande accélération.
- Garder les recouvrements qui racontent des histoires simultanées ; éviter deux périodes qui doublonnent le même découpage.
- Viser environ 3 à 10 périodes par rang. Regrouper ou créer un récit de détail lorsque la lecture devient difficile.
- Une sous-période devrait tenir dans les dates de son parent local. Si elle déborde, revoir le placement ou les dates avec une justification historique ; ne pas modifier une fiche partagée pour des raisons de mise en page seulement.
- Ne pas copier les subdivisions d’un récit de détail dans son portail uniquement pour conserver une navigation.

Dans l’onglet **Périodes**, la vue **Colonnes** permet de glisser une période ou une frise associée vers une autre colonne. La première colonne correspond à la racine ; chaque autre colonne correspond au parent indiqué dans son en-tête. Les périodes gardent leurs sous-périodes et leur fiche partagée. Pour une frise associée, seul le rattachement déplacé change : ses autres accès restent en place, y compris ceux par événement. Une période ne peut pas être déposée dans elle-même ou dans ses descendants. Les positions restent triées chronologiquement.

Les cartes des frises associées disposent du même menu à trois points que les périodes : **Voir la frise**, **Déplacer**, **Afficher comme une période** et **Supprimer**. Cette dernière action retire seulement le lien à cet endroit. Le chevron ouvre les sous-périodes de la frise dans des colonnes atténuées en **lecture seule** ; pour les modifier, ouvrir le détail de cette frise.

**Afficher comme une période** remplace le badge par une carte temporelle utilisant les bornes de la frise liée. Ce choix appartient au rattachement et ne crée aucune période dans le catalogue. La carte reste limitée à la fenêtre active, ouvre la frise cible et conserve le retour à l’origine. Le menu permet de revenir à **Afficher dans le badge**. Les flèches temporelles ne changent pas de rôle.

Ce choix actualise aussi l’aperçu du détail de la frise : chaque rattachement affiché comme une période y possède sa propre barre, avec les dates de la cible et son parent local. La barre suit le pliage de ce parent ; son clic ouvre les colonnes de lecture seule de la frise associée.

Dans cet aperçu, périodes et sous-frises sont classées chronologiquement. Les éléments successifs continuent sur la même ligne. Chaque chevauchement fait descendre d’une ligne ; les éléments suivants ne réutilisent jamais les lignes supérieures, même lorsqu’elles se libèrent.

### Fenêtre temporelle et origine de navigation

Le récit cible garde ses dates, même s’il commence avant ou après sa source. Périodes et événements sont placés sur la même échelle. **Il n’y a pas de zoom dans la frise principale.**

Une vraie période d’origine peut apparaître comme repère de retour, sans devenir une appartenance du récit :

- ses dates réelles sont conservées ;
- seule son intersection avec la fenêtre active est dessinée, à sa position temporelle ;
- si elle couvre toute cette fenêtre, sa barre peut légitimement occuper toute la largeur ;
- chaque extrémité qui dépasse se prolonge jusqu’au bord de l’écran, sans arrondi, pour distinguer une coupure d’une vraie borne temporelle ;
- entièrement hors fenêtre ou sans dates, elle n’est pas dessinée ; le retour reste dans l’en-tête.

Une entrée depuis un événement ou la racine d’une frise ne fabrique aucune période à partir du nom de la source. Le retour est une commande dans l’en-tête, hors du contenu temporel. Des dates inconnues ne justifient pas un positionnement arbitraire sur l’axe.

Exemple : Genre Homo commence à 2,8 Ma et le Quaternaire à 2,58 Ma. Le repère Quaternaire dans Genre Homo commence donc après le bord gauche. L’accès depuis l’événement « Apparition du genre Homo » dans Les premiers hominines conserve un retour à cette source sans afficher de faux chapeau.

### Flèches, retour et fil d’Ariane

Les flèches précédente/suivante servent **uniquement à naviguer dans le temps** : au rang local dans les subdivisions, ou dans les périodes d’un contexte chronologique explicite. Les voisins sont triés par date de début, avec départage stable par identifiant. Un accès thématique ou une fiche partagée ne devient pas automatiquement un voisin.

Une période sans vue dédiée s’ouvre dans sa frise de référence. Plusieurs vues dédiées d’une période donnent lieu à un choix ; plusieurs contextes permettent de choisir un parcours. Si une même frise présente plusieurs périodes, l’entrée doit identifier la référence voulue plutôt que supposer un niveau unique.

Le retour retrouve la position quittée, même après une transition vers une autre frise du parcours. Un rechargement dans le même onglet conserve ce chemin. Un lien direct ne transmet pas les visites de son auteur : il retrouve sa référence explicite sans inventer cet historique. L’entrée depuis le catalogue peut utiliser un chemin reconstruit depuis Univers ; ce repère d’entrée ne définit pas une hiérarchie universelle des sujets.

Le fil des frises reste sur une ligne : trois étapes récentes au maximum, moins si la largeur manque, avec les étapes précédentes dans « … ». La frise courante reste visible. Le fil des périodes décrit séparément la position locale.

## 5. Les dates

Il n'y a **qu'un seul moteur de dates** : `server/src/shared/temporal.ts`. Ne jamais calculer les années à la main.

Le moteur ramène toute date sur un seul axe, en années avant aujourd'hui. Le texte stocké, lui, suit **un format canonique par échelle** ; depuis le 3 novembre 2026, toute la base l'applique.

| Cas | Format à écrire | Affichage |
| --- | --- | --- |
| Temps profond (au-delà d'environ 12 000 ans) | `G13.8`, `M66`, `K40` (années avant aujourd'hui) | « il y a 66.0 Ma », « 40 000 ans » |
| Années avant J.-C. | `3000 BCE` | « 3000 av. J.-C. » |
| Jour avant J.-C. | ISO sans heure, en année **astronomique** : `-0489-08-12` (an 0 = 1 av. J.-C.) | « 12 août 490 av. J.-C. » |
| Années après J.-C., précision année | `0950`, `1850` (toujours 4 chiffres) | « 950 », « 1850 » |
| Précision mois | `1958-03` | « mars 1958 » |
| Précision jour | `1789-07-14` | « 14 juillet 1789 » |
| Heure réellement connue | `1969-07-16T13:32:00Z` | avec l'heure |
| Jusqu'à aujourd'hui | `TODAY` | « aujourd'hui » |

- **Ne jamais écrire d'horodatage complet** (`…T00:00:00Z`) sans heure réelle : le moteur en déduit une précision à la seconde et affiche un « 1 janvier » parasite.
- **Deux conventions pour les années négatives.** Le moteur suit la norme ISO, avec un an 0 : `-0490` vaut 491 av. J.-C. L'API JSON de Wikidata (`wbgetentities`) n'en a pas : `-0490` y vaut 490 av. J.-C. ; le SPARQL de Wikidata, lui, suit la norme. Une date reprise du JSON de Wikidata s'écrit donc `490 BCE`, jamais `-0490`.
- **Temps profond : compter depuis aujourd'hui**, avec `G`, `M` ou `K`. Une année ISO comme `-66000000` compte depuis l'an 0 et décale de 2 026 ans.
- **Choisir la précision réelle de la source.** Pas de jour inventé quand seule l'année est connue.
- **Avant 1582, utiliser les dates usuelles (calendrier julien)** : Crécy le 26 août 1346, pas le 3 septembre que donne Wikidata en grégorien proleptique.
- **`start_years_bp`, `end_years_bp` et `date_years_bp`** se calculent avec `storedYearsBeforePresent()`, qui arrondit à 15 chiffres significatifs ; ne pas appliquer un arrondi manuel à trois décimales.
- **Le début doit être strictement antérieur à la fin.**
- **Comparer à un même instant de référence.** Utiliser `comparableYearsBeforePresent()` pour les dates réutilisées ; ne pas recalculer des fiches communes uniquement pour ajuster le cadrage d’une frise.

## 6. Identifiants Wikidata

- Les retrouver par la recherche Wikidata (`wbsearchentities`) ou par une requête SPARQL sur les libellés anglais. **Ne jamais deviner un Q-id.**
- **`wikidata_id` est unique** dans `periods` et, séparément, dans `events`. Réutiliser la fiche existante du même type lorsqu’elle convient ; une variante distincte peut rester sans Q-id. Une période et un événement sont deux types de fiches : la présence d’un Q-id dans l’un ne suffit pas à interdire son utilisation dans l’autre.
- L’**identifiant interne** (`id`) d’une nouvelle fiche est un UUID. Ne pas réutiliser un Q-id comme `id`, même si d’anciennes fiches l’ont fait.
- Ajouter un contrôle en tête de script : refuser l'insertion si l'un des Q-ids existe déjà.

## 7. Contenu

- **Titre et description en français et en anglais.** La description de frise tient en une ou deux phrases et dit ce que la frise montre. Celle de chaque fiche est factuelle et courte (une phrase), sans dates répétées.
- **Catégories** : deux ou trois catégories existantes par fiche et par frise, parmi `CAT_ANTHRO`, `CAT_ART`, `CAT_ASTRO`, `CAT_BIO_EVO`, `CAT_BOT`, `CAT_CHEM`, `CAT_COSMO`, `CAT_ECO` (économie), `CAT_ECO_SYS` (écologie), `CAT_GEO`, `CAT_HIST`, `CAT_MICRO`, `CAT_OCEAN`, `CAT_PALEO`, `CAT_PART`, `CAT_PHILO`, `CAT_PHYS`, `CAT_TECH`. Ne pas créer de catégorie au passage.
- **Auteur** : le nom d'utilisateur du compte propriétaire. L'API l'impose à la création ; un script doit écrire le nom du compte créateur, sans identifiant de compte codé en dur dans cette procédure.
- **Propriétaire et visibilité** : `owner_user_id` du compte. `is_public = true` seulement pour une frise relue et respectant les conditions de publication de la section 3.
- **Événements de contexte** : relier aussi les causes et conséquences. Exemples : volcanisme et impact pour les extinctions, Arrhenius et la courbe de Keeling pour le climat.

## 8. Écrire en base

L’interface est le chemin normal : elle applique les validations, les droits et l’auteur. Ce guide décrit la création ; il n’autorise aucune écriture distante à lui seul.

### Associations de navigation

Pour les points d’entrée, `POST /stories/:sourceId/entry-points` reçoit `childStoryIds`, `operation` et un emplacement :

| Emplacement | Représentation API |
| --- | --- |
| Période de la source | `anchor: { anchorType: 'period', anchorId: '…' }` |
| Événement de la source | `anchor: { anchorType: 'event', anchorId: '…' }` |
| Racine de la source | `anchor: null` |

À l’ajout, l’emplacement est obligatoire. Au retrait, le préciser pour conserver les autres liens ; omettre l’ancre signifie historiquement retirer tous les accès depuis cette source. La racine est un emplacement distinct, pas une période fictive. Les deux frises doivent être modifiables par le compte.

Pour déplacer un rattachement, `POST /stories/:sourceId/entry-points/move` reçoit `targetStoryId`, `from` et `to`. Chaque emplacement est explicitement `null` pour la racine, ou `{ anchorType: 'period' | 'event', anchorId: '…' }`. Le retrait et le nouveau rattachement sont enregistrés dans une seule transaction ; une origine devenue périmée est refusée. Le parent historique et les autres accès sont conservés. Si l’occurrence déplacée était une présentation chronologique, cette présentation précise est retirée du parcours et remplacée par le nouvel accès ; les autres présentations restent intactes. Une frise visible à la racine seulement grâce à un événement peut recevoir un rattachement à une période sans perdre son accès par événement.

Pour une présentation chronologique, `POST /stories/:contextId/presentations` reçoit `periodId`, `targetStoryId` et `operation`. La période appartient au contexte ; elle n’a pas à appartenir au récit cible. Aucun lien précédent/suivant n’est enregistré séparément.

### Création ou migration par script

- Lire l’existant et préparer un lot limité avec son retour arrière. Pour une modification de relations, préserver les destinations accessibles avant l’opération.
- Utiliser le moteur partagé pour les dates et les contrôles de bornes ; générer les nouveaux identifiants de fiches et récupérer les identifiants de frises créées par `RETURNING`.
- Regrouper la création de la frise, ses catégories, les fiches nécessaires, leurs appartenances et leurs liens dans une transaction. Insérer les parents locaux avant leurs enfants.
- Ne pas dupliquer une période dans une cible pour satisfaire une référence chronologique. Lors d’un découpage, reproduire la transaction de la section 2, pas seulement copier les appartenances.
- Relire le lot et obtenir l’autorisation requise pour la cible avant toute écriture distante. Une répétition sur une base locale jetable peut vérifier le lot et son inverse ; elle n’applique rien à la production.
- Ne pas utiliser l’API REST publique de Supabase pour contourner les validations. Ne pas supprimer une fiche du catalogue lorsqu’on veut seulement la retirer d’une frise.
- Si le lot nécessite un nouveau comportement de lecture, déployer le code compatible avant de modifier les données actives.

Les changements de schéma et tests de mutation utilisent une base PostgreSQL 17 locale jetable, selon [la procédure de baseline](../database/baseline/README.md). Ne jamais diriger les tests vers la base distante.

## 9. Après la création

1. **Contrôler le contenu** : périodes, parents locaux, événements, dates et catégories. Vérifier qu’aucun chapeau n’a été ajouté seulement pour la navigation.
2. **Entrer par chaque source utile** : période, événement ou racine selon les liens créés. Contrôler la conservation des autres accès et la durée propre de la cible.
3. **Tester le retour**, après rechargement du même onglet et depuis deux origines différentes. Vérifier la position quittée, pas seulement le nom de la frise.
4. **Tester les flèches** : voisins temporels du contexte, subdivisions locales, début et fin du parcours. Aucun saut thématique implicite.
5. **Tester le cadrage de l’origine** : recouvrement partiel, couverture complète, origine hors fenêtre et entrée par événement. La barre respecte les dates ; le retour reste disponible quand aucune barre ne convient.
6. **Tester une entrée directe** (`/timeline?story=<id>`), avec `context` et `reference` si l’entrée doit préciser un rattachement. Vérifier les choix proposés lorsqu’il existe plusieurs vues ou contextes.
7. **Vérifier l’affichage** : précision des dates, lignes de périodes, badges dans leur emplacement, fil des frises compact et accès aux étapes masquées. Recharger la liste si une création externe n’est pas encore visible.
8. **Mettre à jour la feuille de route** et les comptes rendus concernés en distinguant le modèle prévu, le code disponible et les changements effectivement appliqués en base.

## Liste de contrôle

- [ ] L’existant a été recherché ; les fiches communes et Q-id ont été réutilisés sans doublon.
- [ ] Le récit a un sujet et des bornes propres, indépendants de ses sources.
- [ ] Ses périodes servent le récit ; aucun chapeau n’a été ajouté pour fabriquer un retour ou un accès racine.
- [ ] Les parents de périodes sont locaux et les subdivisions déplacées ne restent pas dupliquées dans le portail sans raison narrative.
- [ ] Chaque point d’entrée a un emplacement valide dans sa source ; les autres sources et emplacements sont conservés.
- [ ] Le parcours chronologique est explicite si nécessaire ; ses références ne sont pas copiées automatiquement dans les cibles.
- [ ] Les flèches restent temporelles et le retour retrouve la position d’origine.
- [ ] Le repère d’origine respecte la fenêtre active ou laisse place au retour dans l’en-tête.
- [ ] Les dates utilisent le moteur partagé, leur précision réelle et des intervalles du plus ancien au plus récent.
- [ ] Les textes, catégories, auteur, droits et conditions de publication ont été vérifiés.
- [ ] En cas de script, le lot et son inverse sont relus, la transaction est cohérente et l’écriture sur la cible est autorisée.
- [ ] Les cas critiques ont été vérifiés dans l’exploration et la feuille de route est à jour.

## État du déploiement et de l’existant

Le guide décrit le nouveau comportement du code ; il ne signifie pas que toutes les anciennes frises ont déjà été nettoyées. La couverture de toute une frise ne suffit pas à conclure qu’une période est inutile : sa fonction narrative doit être examinée.

Le schéma de compatibilité a été appliqué. Le lot préparé de retrait des quatre références historiques et d’ajout des accès racine attend la mise en ligne coordonnée de l’API et du frontend. Voir [le suivi de mise en œuvre](../audits/navigation-2026-11-04/implementation.md) pour l’état des opérations, sans déduire cet état des seuls exemples de ce guide.
