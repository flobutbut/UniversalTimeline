# Réseau global des relations dans l’administration

Implémentation du 3 novembre 2026, corrigée à la demande de l’utilisateur : un **réseau de forces D3 comprenant tous les objets dès l’ouverture**, à `/admin?section=relations`.

## Fonctionnement

- Toutes les frises, toutes les périodes et tous les événements sont chargés dans un instantané admin complet, y compris les fiches inutilisées et les frises privées.
- Une fiche du catalogue possède un seul nœud, même si plusieurs frises la partagent. Les appartenances se rejoignent sur ce nœud commun.
- Les cercles se distinguent par leur taille et les tokens `--color-data-frise`, `--color-data-period`, `--color-data-event`.
- D3 anime la simulation de forces, qui se stabilise naturellement. Glisser un cercle fait réagir le réseau ; zoom et déplacement du fond permettent de l’explorer. Les boutons Pause/Reprendre, Relancer les forces et Tout cadrer restent disponibles.
- Les libellés des frises sont visibles ; ceux des autres objets apparaissent à la sélection ou avec le zoom. « Tous les libellés » les affiche tous. Le survol donne le titre complet.
- Sélectionner un objet souligne ses voisins et charge ses détails sans retirer ni reconstruire les autres nœuds. Cliquer dans le vide ou appuyer sur Échap désélectionne sans modifier le réseau.
- Les trois types d’objets sont activés par défaut. Seuls les interrupteurs explicites permettent de masquer un type. La recherche et la liste des objets permettent la sélection au clavier sans filtrer implicitement le graphe.
- La préférence de réduction des mouvements met la simulation en pause initialement. Les déplacements manuels restent possibles.

L’ancienne exploration par dépliage de frise et le moteur Cytoscape ont été retirés de l’interface. Le détail d’une frise conserve une liste de ses périodes et événements, mais cette liste ne commande plus la présence des objets dans le réseau.

## Sens des liens

| Lien | Source | Information conservée |
| --- | --- | --- |
| Frise → période | `story_periods` | Appartenance explicite |
| Frise → événement | `story_events` | Appartenance et importance propre à cette frise |
| Période → sous-période | `story_periods.parent_period_id` | Liste des frises dans lesquelles ce parent s’applique |
| Frise → autre frise | `story_entry_points` | Points d’entrée et ancres |
| Parcours → vue détaillée | `story_period_presentations` | Contexte et période présentée |
| Frise → enfant historique | `stories.parent_story_id`, `story_anchors` | Rattachement et ancres historiques |

Les parents des périodes restent propres à chaque frise. Une période réutilisée peut donc recevoir plusieurs liens de parenté dans le réseau global ; sélectionner un lien indique ses contextes. La réunion de plusieurs arbres locaux n’est pas présentée comme un arbre global.

Aucune relation événement → période n’est inventée à partir des dates. Les événements se relient aux frises qui les contiennent. Les liens parallèles de même nature entre deux frises sont regroupés visuellement, sans perdre leurs ancres ni leurs provenances.

## Chargement et sécurité

`GET /api/admin/relations/network` lit `admin_private.relations_network()` dans la transaction existante. Le JSON contient `stories`, `periods`, `events`, `memberships`, `links` et `generatedAt`. Les tableaux ne sont ni tronqués ni limités aux objets sélectionnés. Ils transportent seulement les faits nécessaires au réseau, sans descriptions longues ni données de compte.

La fonction est `STABLE SECURITY DEFINER`, avec `search_path=''`, schéma non exposé et exécution réservée à `authenticated`. Elle appelle `require_admin()` : le claim et le rôle stocké doivent tous deux être admin. Le contrôle API reste aussi actif. Les réponses restent `no-store`. Un changement d’identité annule les lectures et purge les données de la vue.

Les détails continuent d’utiliser les endpoints admin existants pour les frises et les fiches. Ils sont annulables et protégés contre les réponses obsolètes. Les liens vers la timeline sont proposés pour les frises publiques ; afficher un détail privé dans l’administration ne modifie aucun droit sur les routes ordinaires.

Les migrations appliquées au projet actif sont :

- `20261103172801_admin_relations_graph.sql` : lectures admin détaillées et index d’utilisation.
- `20261103183154_admin_relations_network.sql` : lecture complète du réseau en un instantané.

La baseline inclut les mêmes fonctions. Aucune fiche, association ou règle d’accès ordinaire n’est modifiée par ces migrations. La fusion dans `main` déclenche le déploiement Git/Vercel habituel de l’interface et de l’API. Les deux migrations sont déjà appliquées au projet actif ; elles ne doivent pas être rejouées lors de ce déploiement.

## Organisation du code

- `relationGraph.ts` projette le réseau en nœuds canoniques et arêtes, indépendamment de la sélection. Les identités distinguent type et identifiant métier.
- `RelationGraphCanvas.vue` utilise D3 (`forceSimulation`, liens, répulsion, collision et forces de rappel), avec zoom et drag. D3 reçoit des copies : ses mutations ne touchent ni le transport ni la projection. La simulation est arrêtée au démontage.
- `useAdminRelations.ts` porte les lectures et leurs gardes d’annulation.
- `AdminRelations.vue` assemble le réseau, les contrôles et les détails.

Réutilisation : SidebarLayout, SearchInput, Switch, Button, Tag, ItemSummary et FeedbackState ; surfaces, couleurs, typographie et espacements du design system. Le moteur D3 est chargé uniquement avec la section Relations.

## Validation

- `yarn verify` : 1 392 tests isolés, design system, configuration, symboles inutilisés et builds réussis.
- 15 tests admin PostgreSQL 17 sur cluster jetable : refus anonyme/utilisateur/éditeur/claim périmé, données privées, objets partagés et inutilisés, importance locale et migrations incrémentales.
- 17 tests de baseline PostgreSQL 17 réussis sur une deuxième base vierge ; aucun changement des accès ordinaires. Repli contrôlé à 390 px, sans débordement et avec les 652 objets conservés.
- Tests du réseau : tous les objets au premier rendu, une identité par fiche partagée, liens contextuels, filtres explicites sans arête orpheline ; sélection et désélection sans modification du graphe ; réponses obsolètes et purge des identités.
- Tests du rendu D3 : données non mutées, clic objet distinct du fond, Échap, sélection sans déplacement des positions.
- Contrôle navigateur : 652 objets (34 frises, 307 périodes, 311 événements) et 1 125 liens au relevé du 3 novembre ; déplacement manuel, pause/reprise, sélection et désélection avec conservation des 652 nœuds. Ces nombres sont des observations ponctuelles, pas des constantes applicatives.
- Le contrôle de sécurité Supabase après migration ne remonte aucune alerte. Les tests de mutation ont utilisé uniquement PostgreSQL local jetable.
