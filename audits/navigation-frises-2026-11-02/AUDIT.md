# Audit de la navigation chronologique entre frises

Date : 2 novembre 2026. Projet Supabase : Universal-Timeline (`ftubzndxivponqoihrsu`), PostgreSQL 17.6.
Instant de l'inventaire : 12:49:41 UTC, soit 13:49:41 à Paris.

## Conclusion

La base permet d'organiser les contenus et les accès entre frises, mais ne décrit pas encore un parcours chronologique transversal fiable. Ma proposition précédente, consistant à déduire systématiquement les voisins depuis les ancres, était insuffisante.

Il faut distinguer trois informations : la période consultée, le contexte qui définit ses voisines et la frise utilisée pour la présenter. Une petite quantité de métadonnées explicites est justifiée. Elles peuvent rester invisibles au lecteur et être renseignées automatiquement dans les créations depuis une période.

Recommandation : réutiliser une frise de référence pour organiser le parcours, puis ajouter un mapping explicite entre ses périodes et leurs vues de détail. Ne pas réintroduire de parent global dans le catalogue et ne pas enregistrer de chaînes de liens « précédent/suivant ».

## Périmètre et méthode

Audit de lecture du schéma actif, des migrations appliquées, des contraintes, index, triggers et règles RLS des tables de navigation. Extraction des identités, dates, catégories, appartenances, racines et ancres ; reconstruction locale des arbres et vérification avec les fonctions temporelles réelles du projet. Aucun compte utilisateur ni secret n'a été extrait.

Les requêtes exécutées sont des SELECT. Aucune migration, modification des données ou modification de l'application n'a été effectuée dans ce tour. Le fichier `snapshot.json` est un instantané local de contenu pour l'audit, pas une sauvegarde exploitable pour restaurer la base. L'audit porte sur cette fonctionnalité ; ce n'est pas une certification de sécurité générale.

## État réellement observé

| Élément | Nombre exact |
| --- | ---: |
| Frises | 21 |
| Périodes | 152 |
| Événements | 128 |
| Appartenances période–frise | 230 |
| Appartenances événement–frise | 217 |
| Ancres historiques | 21 |
| Nouveaux points d'entrée | 0 |
| Frises à racine unique | 16 |
| Frises à plusieurs racines | 5 |

Les 21 frises sont publiques à cet instant. Les règles d'accès devront néanmoins être appliquées aux futures destinations privées.

Aucun cycle de périodes, cycle de parenté historique des frises, parent local manquant, ancre absente de sa source ou période sans appartenance n'a été trouvé. Les 152 périodes ont des bornes comparables par le parseur du projet.

Ces contrôles ne démontrent pas que chaque hiérarchie est sémantiquement adaptée à une navigation chronologique.

## Ce que représentent les tables

| Table / information | Rôle constaté | Limite pour Précédent / Suivant |
| --- | --- | --- |
| `periods` | Identité et faits communs réutilisables | Aucun parent global, aucun rang historique universel |
| `story_periods` | Appartenance et parent local à une frise | Une profondeur n'est comparable qu'à l'intérieur d'un contexte |
| `stories.parent_story_id` | Parent historique de la frise | Plusieurs relations successives relient des périodes chronologiquement successives |
| `story_anchors` | Point depuis lequel on propose une frise | L'ancre ne désigne pas nécessairement le sujet de la destination |
| `story_entry_points` | Accès multiples source → cible sur une période ou un événement | Aucun champ ne distingue « détail de cette période » et « autre contenu associé » |
| `relatedStories` dans l'API | Frises partageant des périodes ou événements | Le partage d'une fiche ne garantit pas une vue de détail appropriée |

Les parents locaux sont protégés par une clé étrangère composée et un trigger anticyle. Les nouveaux points d'entrée vérifient l'appartenance de l'ancre à leur source et dédupliquent les mêmes relations. Les anciennes ancres ont une clé étrangère vers leur frise, mais leur `anchor_id` polymorphe n'a pas la même intégrité référentielle composée ; les 21 ancres actuelles sont valides.

Les quatre tables de navigation auditées ont RLS activé. Les politiques de lecture des nouveaux points d'entrée vérifient les deux extrémités. Une future table de présentation devra conserver cette propriété et ne pas exposer de titre ou d'identifiant inaccessible par une réponse calculée avec des privilèges élevés.

## Cas concret : Moyen Âge

| Frise source | Période d'entrée | Destination |
| --- | --- | --- |
| Antiquité et premières civilisations, n° 10 | Antiquité, `Q40244` | Moyen Âge, n° 15 |
| Moyen Âge, n° 15 | Moyen Âge, `Q12554` | Époque moderne, n° 16 |
| Moyen Âge, n° 15 | Moyen Âge tardif | Renaissance, n° 17 |

La frise Moyen Âge contient seulement Moyen Âge à sa racine, Moyen Âge central et Moyen Âge tardif comme enfants. La période de début 476–1000 n'est pas représentée par un enfant dans cet instantané. Ce manque de contenu est distinct du problème de navigation.

La frise n° 10 a Holocène pour racine et Antiquité comme enfant. La frise n° 16 comporte deux racines : Époque moderne et Histoire contemporaine. Renaissance s'étend de 1400 à 1650 et chevauche Moyen Âge et Époque moderne.

Aucune frise ne contient ensemble les quatre fiches Antiquité, Moyen Âge, Époque moderne et Histoire contemporaine. Les quatre fiches existent, mais ne forment pas un même groupe de navigation dans les appartenances actuelles.

Conséquences :

- chercher les voisins locaux depuis la racine Moyen Âge ne trouve rien ;
- reprendre son ancre extérieure ferait chercher les voisins d'Antiquité ;
- assimiler enfant de frise et sous-période confondrait Époque moderne avec une subdivision du Moyen Âge ;
- ouvrir seulement la frise n° 16 ne suffit pas : il faut également préciser Époque moderne ou Histoire contemporaine.

Le rattachement actuel n'est pas à corriger automatiquement : il fonctionne comme porte d'entrée éditoriale et peut être intentionnel.

## Pourquoi les heuristiques seules ne suffisent pas

Sur les 20 ancres de type période, 10 ne correspondent à aucune racine de leur destination. Cela n'en fait pas des erreurs : elles expriment d'autres relations éditoriales.

Une racine unique n'est pas un sujet garanti : la frise Antiquité a Holocène pour racine ; Les cinq grandes extinctions a Phanérozoïque. La frise Empire romain contient une racine Antiquité romaine et une période interne nommée Empire romain. Le titre et les bornes globales ne suffisent donc pas à choisir le sujet automatiquement.

57 périodes apparaissent dans plusieurs frises ; 24 d'entre elles y ont des profondeurs différentes. Crétacé se trouve à profondeur 3 dans les frises n° 2 et 11, et à profondeur 2 dans la n° 22.

Le calcul local trouve 82 paires de périodes sœurs qui se chevauchent, en comptant chaque occurrence dans chaque frise et en excluant les seuls contacts de bornes. Plusieurs chevauchements sont attendus : espèces humaines, civilisations, programmes spatiaux, conflits. Une date de début permet un ordre de consultation, mais ne prouve pas une succession historique.

Un cas illustre aussi la limite de profondeur dans une même frise : dans Histoire du climat, le précédent du Quaternaire serait l'Optimum climatique de l'Éocène. Ce résultat suit exactement les racines enregistrées, mais ne correspond pas à un découpage géologique régulier.

Enfin, six ères primordiales ont le même texte pour leurs dates de début et de fin, et donc des bornes égales avec le comparateur actuel. Plusieurs nombres stockés diffèrent malgré ces textes identiques. Le rapport ne les qualifie pas de dates inversées. Un ordre strict ne peut pas être déduit de ces seules dates ; un rang explicite ou une correction temporelle devra être prévu pour ce cas, sans inventer une précision.

## Solution proposée

### 1. Utiliser une frise comme contexte de navigation

Définir une frise de référence qui regroupe les périodes comparables au même endroit. Exemple à préparer : « Grandes périodes de l'histoire européenne », contenant les fiches existantes Antiquité → Moyen Âge → Époque moderne → Histoire contemporaine.

Ce nom et ce découpage sont une proposition éditoriale, pas un fait retrouvé en base. Le contexte géographique et thématique doit rester explicite : une frise sur l'histoire chinoise pourra avoir un autre parcours.

Les dates proposent l'ordre dans un groupe local. Un rang optionnel sert aux égalités et aux parcours éditoriaux particuliers. Le contexte conserve ses propres placements dans `story_periods`, conformément au modèle existant ; aucun arbre global supplémentaire n'est nécessaire.

Dans une frise déjà structurée de manière pertinente, son groupe de périodes local sert directement de contexte. Traverser un changement de parent ne doit pas être déduit uniquement d'un numéro de profondeur : le contexte doit identifier le groupe ou le parcours qui l'autorise.

### 2. Définir explicitement la présentation d'une période

Proposer une petite table conceptuelle de vues de détail, par exemple :

`story_period_presentations(context_story_id, period_id, target_story_id)`

Cette relation dit : « dans ce contexte, cette frise est une présentation de cette période ». Elle est distincte d'un lien associé ordinaire. Les noms et la migration définitive restent à concevoir avant implémentation.

Les deux couples `(context_story_id, period_id)` et `(target_story_id, period_id)` doivent référencer une appartenance valide dans `story_periods`. La période est ainsi réellement présente dans le contexte et la destination. La relation est unique par triplet ; une préférence par contexte/période peut être ajoutée uniquement si plusieurs vues existent et que le produit veut une ouverture directe.

Pour l'exemple :

| Période dans le contexte proposé | Frise de détail existante | Période à y ouvrir |
| --- | --- | --- |
| Antiquité | n° 10 | `Q40244`, sous Holocène |
| Moyen Âge | n° 15 | `Q12554` |
| Époque moderne | n° 16 | `Q7432` |
| Histoire contemporaine | n° 16 | `Q11769` |

Ces quatre appartenances dans les destinations ont été vérifiées. Les appartenances dans le nouveau contexte n'existent pas encore. Deux étapes peuvent présenter des périodes différentes dans une même frise, comme les deux dernières lignes.

Si aucune vue de détail n'existe, la cible reste la période dans la frise de référence. Si plusieurs vues sont déclarées sans préférence, le sélecteur existant peut les proposer. Une simple association thématique ne doit jamais devenir automatiquement la destination principale.

### 3. Conserver le contexte pendant le parcours

L'état de navigation doit transporter au moins le contexte, la période du parcours et la période effectivement consultée dans sa frise de présentation.

Au niveau de Moyen Âge, les voisins viennent du contexte historique : Antiquité et Époque moderne. En explorant Moyen Âge central, la navigation porte sur les subdivisions locales jusqu'au retour à la période de référence.

Les vues sans sous-périodes doivent aussi pouvoir être ciblées et affichées comme période courante. Le comportement actuel du clic sur une feuille, qui cherche surtout des frises associées, ne suffit pas à cette ouverture ciblée.

Un lien direct doit restaurer le même contexte. L'URL doit pouvoir transmettre contexte et période, en plus de `story` ; aujourd'hui la route ne prend en charge que l'identifiant de frise pour son initialisation. Sans contexte dans un ancien lien, utiliser un contexte par défaut uniquement si une configuration validée le détermine sans ambiguïté. En présence de plusieurs parcours valides, proposer le choix ; ne pas sélectionner le premier résultat SQL.

Le fil d'Ariane conserve le contexte puis la vue courante. Un déplacement chronologique remplace l'étape courante ; il ne doit pas empiler les frises précédentes comme des ancêtres. L'historique du navigateur conserve naturellement les visites.

### 4. Automatiser sans interpréter arbitrairement

Lors de « créer une frise depuis cette période », la source et la période sélectionnée sont connues avec certitude. On peut enregistrer la vue de détail et transporter le contexte automatiquement, sans champ supplémentaire pour le lecteur.

Pour les données existantes, préparer un aperçu de rattachements candidats. Valider les cas ambigus une fois côté éditorial. Les racines, titres et dates aident cet aperçu mais ne doivent pas constituer une migration automatique irréversible de sens.

Une frise entièrement indépendante n'offre pas assez d'information pour deviner un parcours fiable. Son auteur pourra définir une fois son contexte dans les relations ; le lecteur n'aura rien à configurer.

Aucun lien « précédent » ou « suivant » n'est stocké : les deux se recalculent dans le contexte choisi. Ajouter une période au parcours met ainsi ses voisines à jour.

## Mise en œuvre recommandée, après validation du choix produit

1. Valider le parcours historique de référence et les quatre présentations ci-dessus dans un aperçu local.
2. Concevoir la table de présentation, les contraintes composées, les index et les politiques RLS ; tester les suppressions et les cibles privées sur PostgreSQL jetable.
3. Faire renvoyer par l'API des destinations complètes : contexte, période, frise et éventuels choix. Les calculer avec les droits du lecteur.
4. Ajouter l'ouverture ciblée, les URL reproductibles, la restauration du contexte et le remplacement correct de l'étape du fil d'Ariane.
5. Alimenter automatiquement ces métadonnées dans la création depuis une période, puis reprendre les anciennes frises à partir d'un aperçu validé.

Cas à vérifier : Moyen Âge → Antiquité / Époque moderne ; Époque moderne → Histoire contemporaine dans la même frise ; lien direct et rechargement ; période cible sans enfants ; deux frises pour une période ; frise accessible depuis deux contextes ; cible supprimée ou privée ; chevauchement Renaissance ; égalités de dates ; contexte absent ; retour navigateur ; conservation des portes d'entrée historiques.

## Pièces de l'audit

- `snapshot.json` : contenu et métadonnées de schéma audités, sans comptes ni secrets.
- `analysis.json` : résultats des contrôles locaux.
- `analyze.mjs` : reproduction locale, sans connexion à la base.
- `queries.sql` : requêtes de lecture pour réactualiser les principaux éléments de l'audit.
- `validation.json` : dernières vérifications ciblées.

Commande locale : `node --experimental-strip-types audits/navigation-frises-2026-11-02/analyze.mjs`.

Sources locales confrontées à l'état actif : `Documentation/RELATIONS-FRISES.md`, migrations frise_only_period_hierarchy et story_entry_points, `server/src/repositories/storyRepository.ts`, `server/src/services/storyAssociations.ts`, `src/lib/storyNavigationLinks.ts` et `src/composables/useHomeNavigation.ts`.
