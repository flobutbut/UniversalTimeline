# Réseau global des relations dans l’administration

Implémentation du 3 novembre 2026, corrigée à la demande de l’utilisateur : un **réseau de forces D3 comprenant tous les objets dès l’ouverture**, à `/admin?section=relations`.

## Fonctionnement

- Toutes les frises, toutes les périodes et tous les événements sont chargés dans un instantané admin complet, y compris les fiches inutilisées et les frises privées.
- Une fiche du catalogue possède un seul nœud, même si plusieurs frises la partagent. Les appartenances se rejoignent sur ce nœud commun.
- Les cercles se distinguent par leur taille et les tokens `--color-data-frise`, `--color-data-period`, `--color-data-event`.
- D3 anime la simulation de forces, qui se stabilise naturellement. Glisser un cercle fait réagir le réseau ; zoom et déplacement du fond permettent de l’explorer. Les boutons Pause/Reprendre, Relancer les forces et Tout cadrer restent disponibles.
- Les libellés des frises sont visibles ; ceux des autres objets apparaissent à la sélection ou avec le zoom. « Tous les libellés » les affiche tous. Le survol donne le titre complet.
- Sélectionner un objet souligne ses voisins et affiche une infobulle ancrée à son cercle, sans ajout dans le flux de la page ni reconstruction des nœuds. Elle suit la simulation, le zoom et les déplacements, et reste bornée au graphe. Cliquer dans le vide, fermer l’infobulle ou appuyer sur Échap désélectionne.
- L’infobulle contient le nom, le type et « Ouvrir », qui ouvre la fiche dans l’onglet Frises (`/database?story=…`, `period=…` ou `event=…`). Pour les périodes et événements sans appartenance à une frise, l’action est désactivée et l’état orphelin est indiqué. Les frises parentes sont listées avec des liens propres vers leurs fiches et, pour une sous-période, le contexte de parenté connu. La liste suit les filtres de frises, même si le type Frises est masqué. Pour une frise, seuls les rattachements historiques définissent les parents, pas les passerelles. Aucun panneau de sélection n’est ajouté au-dessus ni au-dessous du graphe.
- Les trois types d’objets sont activés par défaut. Les interrupteurs Frises, Périodes et Événements permettent de masquer un type. Les compteurs sont placés directement sous le titre. La recherche, large de 248 px, se place à l’intérieur du graphe en haut à gauche. Tous les interrupteurs, y compris « Tous les libellés », restent regroupés au-dessus du graphe et se replient sur petit écran. La recherche propose dès la saisie des suggestions en overlay sous le champ, sans déplacer la page ni filtrer implicitement le graphe. Les accents sont ignorés et les titres commençant par la saisie sont prioritaires. Les flèches et Entrée sélectionnent une suggestion ; Échap, Tab ou un clic extérieur ferment le panneau ; la fonction de liste complète des objets a été retirée.
- La préférence de réduction des mouvements met la simulation en pause initialement. Les déplacements manuels restent possibles.

L’ancienne exploration par dépliage de frise et le moteur Cytoscape ont été retirés de l’interface. La sélection exploite directement l’instantané du réseau et ne déclenche aucune lecture de détail supplémentaire.

## Filtres d’exploration

Deux interrupteurs du design system se combinent, désactivés par défaut pour garder le réseau complet à l’ouverture :

- **Frises sans enfants** conserve les frises finales et les fiches qui leur appartiennent. Les enfants sont définis uniquement par `stories.parent_story_id`, transporté par les liens `legacy`. Les points d’entrée et vues détaillées sont des passerelles : ils ne rendent pas une frise « parent ».
- **Contenus partagés seulement** conserve les périodes et événements appartenant à au moins deux frises retenues. Les usages sont comptés par frise distincte après le premier filtre. Un événement présent dans un parent et un seul de ses enfants ne constitue donc plus un partage entre frises finales.

Les deux options sont indépendantes des interrupteurs de type : masquer les cercles des frises ne change pas le calcul des partages. Les frises retenues sans contenu partagé restent visibles, éventuellement isolées. Un message indique l’absence de contenu partagé.

Les compteurs, les résultats de recherche, les usages dans le détail d’une fiche et les contenus proposés dans le détail d’une frise suivent le périmètre retenu. Les usages totaux restent indiqués séparément dans le détail d’une fiche. Les hiérarchies des périodes perdent leurs contextes exclus et aucune arête ne pointe vers un objet absent. Une sélection masquée par un filtre est désélectionnée ; désactiver les filtres restitue le réseau initial sans modifier les données ni nécessiter de nouvelle lecture serveur.

## Vue agrandie

Le bouton « Agrandir le graphe », à droite des commandes du graphe, étend l’espace de travail à la fenêtre du navigateur sans utiliser l’API de plein écran. La recherche, les filtres, les commandes et le graphe restent visibles ; le titre, les métadonnées, la navigation et le panneau de détail sont masqués. L’overlay de suggestions reste disponible pour sélectionner un objet. Échap ferme d’abord les suggestions, puis l’infobulle de sélection si elle est ouverte, avant de réduire le graphe.

Le composant D3 reste monté : les filtres et la sélection sont conservés. Le ResizeObserver adapte le cadrage à l’espace disponible. Le bouton « Réduire le graphe » ou Échap ramène à la vue normale et restaure le focus. L’isolation du fond et la gestion du clavier réutilisent `useDialog`. Les commandes restent accessibles si les filtres ne laissent aucun objet. Le démontage ou un changement d’identité libère l’isolation.

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

Les informations de l’infobulle proviennent de l’instantané déjà chargé. Ouvrir la fiche réutilise les gardes de lecture des vues Frises existantes, sans écriture automatique ni modification des accès ordinaires.

Les migrations appliquées au projet actif sont :

- `20261103172801_admin_relations_graph.sql` : lectures admin détaillées et index d’utilisation.
- `20261103183154_admin_relations_network.sql` : lecture complète du réseau en un instantané.

La baseline inclut les mêmes fonctions. Aucune fiche, association ou règle d’accès ordinaire n’est modifiée par ces migrations. Les filtres d’exploration utilisent l’instantané existant dans le navigateur et ne nécessitent aucune migration supplémentaire.

## Organisation du code

- `relationGraph.ts` projette le réseau en nœuds canoniques et arêtes, indépendamment de la sélection. Les identités distinguent type et identifiant métier.
- `RelationGraphCanvas.vue` utilise D3 (`forceSimulation`, liens, répulsion, collision et forces de rappel), avec zoom et drag. D3 reçoit des copies : ses mutations ne touchent ni le transport ni la projection. La simulation est arrêtée au démontage.
- `useAdminRelations.ts` porte les lectures et leurs gardes d’annulation.
- `RelationGraphSearch.vue` compose SearchInput, PopoverSurface, ItemSummary et useSuggestionNavigation pour les suggestions locales des objets affichés, avec focus conservé et hauteur bornée au graphe.
- `RelationGraphSelection.vue` réutilise PopoverSurface, Button et Tag pour la sélection et les parents, avec action désactivée pour les objets orphelins.
- `AdminRelations.vue` assemble le réseau, les contrôles et les infobulles.

Réutilisation : SidebarLayout, SearchInput, Switch, Button, Tag, ItemSummary et FeedbackState ; surfaces, couleurs, typographie et espacements du design system. Le moteur D3 est chargé uniquement avec la section Relations.

## Validation

- `yarn verify` : tests isolés, design system, configuration, symboles inutilisés et builds réussis.
- Filtres : distinction hiérarchie/passerelles, partage recompté entre frises finales, usages distincts, contextes exclus, absence de résultat, retour au réseau complet, sélection masquée et détails cohérents. Les quatre fichiers de tests de projection, d’interface, de rendu et d’autocomplétion totalisent 34 tests réussis, incluant la vue agrandie, la sélection conservée, Échap, le retour du focus et le nettoyage de l’isolation.
- 15 tests admin PostgreSQL 17 sur cluster jetable : refus anonyme/utilisateur/éditeur/claim périmé, données privées, objets partagés et inutilisés, importance locale et migrations incrémentales.
- 17 tests de baseline PostgreSQL 17 réussis sur une deuxième base vierge ; aucun changement des accès ordinaires. Repli contrôlé à 390 px, sans débordement et avec les 652 objets conservés.
- Tests du réseau : tous les objets au premier rendu, une identité par fiche partagée, liens contextuels, filtres explicites sans arête orpheline ; sélection et désélection sans modification du graphe ; réponses obsolètes et purge des identités.
- Tests du rendu D3 : données non mutées, clic objet distinct du fond, Échap, sélection sans déplacement des positions.
- Contrôle navigateur : 652 objets (34 frises, 307 périodes, 311 événements) et 1 125 liens au relevé du 3 novembre ; déplacement manuel, pause/reprise, sélection et désélection avec conservation des 652 nœuds. Ces nombres sont des observations ponctuelles, pas des constantes applicatives.
- Le contrôle de sécurité Supabase après migration ne remonte aucune alerte. Les tests de mutation ont utilisé uniquement PostgreSQL local jetable.
