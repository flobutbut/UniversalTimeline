# Données et maintenance

La base active est PostgreSQL dans le projet Supabase Universal-Timeline. L’API Express utilise pg ; Docker ne fournit pas de seconde base. Configuration et TLS : [server/SUPABASE.md](../server/SUPABASE.md). Auth, rôles et propriété : [server/AUTHENTICATION.md](../server/AUTHENTICATION.md).

L’organisation actuelle est décrite dans [Relations au sein des frises](../Documentation/RELATIONS-FRISES.md). Les fiches du catalogue ne possèdent plus de parent global.

## Fichiers actifs

- `migrations/20261103183154_admin_relations_network.sql` : instantané complet du réseau D3 admin (toutes les frises, périodes, événements et appartenances, sans dépliage ni duplication des fiches partagées) ; appliquée au projet actif le 3 novembre 2026 après validation locale. Lecture uniquement, avec contrôle admin API + base ; incluse dans la baseline.
- `migrations/20261103172801_admin_relations_graph.sql` : graphe admin en lecture seule, quatre fonctions privées protégées par `require_admin()` et index pour les utilisations des fiches ; appliquée au projet actif le 3 novembre 2026, après validation PostgreSQL 17 locale. La baseline contient les mêmes fonctions. Voir [le graphe des relations](../Documentation/GRAPHE-RELATIONS-ADMIN.md).
- `migrations/20261103143455_public_story_editors.sql` : rôle éditeur et édition des frises publiques ; appliquée au projet actif le 3 novembre 2026 après relecture et accord explicite, l’API et le frontend avec le contrôle de propriété avant suppression étant déjà déployés (enregistrée sous le nom `public_story_editors`, sans les `BEGIN`/`COMMIT` du fichier : l’outil d’application fournit la transaction). Contrôles après application : trois fonctions `access_private`, `admin_private.set_editor`, trigger `guard_story_ownership`, huit policies via `can_edit_story`, aucun avertissement de sécurité. Aucune attribution de rôle.
- `migrations/20261029090427_story_access.sql` : accès et propriété des stories, appliqué après autorisation.
- `migrations/20261029093707_harden_public_functions.sql` : privilèges et search_path des fonctions, appliqué.
- `migrations/20261029093923_isolate_postgis.sql` : déplacement de PostGIS vers extensions, appliqué.
- `migrations/20261031204007_story_period_hierarchy.sql` : placement des périodes propre à chaque frise, avec conservation du classement du catalogue ; appliqué.
- `migrations/20261031220914_hybrid_catalogue_search.sql` : recherche plein texte, tolérance aux fautes et aux accents ; appliqué.
- `migrations/20261102001509_frise_only_period_hierarchy.sql` : conservation des parcours dans les frises, suppression du parent global et contrôles de hiérarchie locale ; appliquée le 2 novembre 2026.
- `migrations/20261102075026_story_entry_points.sql` : points d’entrée multiples entre frises, rattachés aux périodes ou événements de leur source ; appliquée le 2 novembre 2026. Les liens historiques sont conservés.
- `migrations/20261102075524_optimize_story_entry_point_policies.sql` : évaluation du JWT une fois par requête dans les règles des points d’entrée ; appliquée.
- `migrations/20261102223946_story_event_importance.sql` : importance d’un événement dans une frise (`story_events.importance` : `major`, `normal` par défaut, `minor`), écrite par le propriétaire de la frise sous `ut_write_story_events` ; appliquée au projet actif le 2 novembre 2026. La baseline la contient déjà.
- `operations/assign_admin_role.sql` et `assign_legacy_stories.sql` : opérations ponctuelles et explicites déjà effectuées pour le compte confirmé ; aucune exécution automatique au démarrage.

Ces migrations sont un historique des changements sur le schéma existant. Pour une nouvelle cible vide, utiliser uniquement [la baseline du lot 28](baseline/README.md), validée sur PostgreSQL 17. Elle contient déjà l’état des accès/durcissements applicatifs ; ne pas rejouer ensuite ces migrations ni les opérations d’attribution. Le projet existant ne doit recevoir aucun de ces initialiseurs.

## Parcours chronologiques

La migration `20261102131202_story_period_presentations.sql` ajoute les présentations de périodes par contexte, avec clés étrangères composées, index et RLS. Elle est appliquée au projet actif. La baseline des projets vides contient déjà cette table.

Le lot `data/20261102_historical_navigation_context.sql`, appliqué le 2 novembre 2026, crée la frise de référence « Grandes périodes de l’histoire européenne » et quatre présentations sur les fiches existantes Antiquité, Moyen Âge, Époque moderne et Histoire contemporaine. Les points d’entrée historiques sont conservés. Ce lot est propre aux données auditées ; ne pas l’exécuter sur une installation vide. Les identifiants des frises créées sont obtenus par `RETURNING`, jamais imposés.

Voir [Relations au sein des frises](../Documentation/RELATIONS-FRISES.md) pour le comportement et l’édition des parcours.

## Corrections du catalogue

Les fichiers `data/20261102_catalogue_*` contiennent les textes sourcés et le lot transactionnel de correction de l’audit du 2 novembre 2026, déjà appliqué au projet actif. Le [compte rendu](../Documentation/PERFORMANCE-ET-CATALOGUE.md) décrit les décisions et la validation. Ces corrections ciblent les anciennes fiches recensées et ne doivent pas être exécutées sur une nouvelle base vide. Le retour arrière refuse les contenus ou relations modifiés depuis l’application.

## Archives

Les anciens initialiseurs Docker, imports, scripts de sauvegarde, migrations Prisma/anciens modèles et dumps sont conservés comme textes dans [archive/](archive/README.md), avec leur chemin d’origine et leur SHA-256. Certains anciens scripts détruisent des données ou remplacent les IDs ; ils sont incompatibles avec le schéma courant. La routine historique `maintain_period_relations()` a été retirée avec le classement global le 2 novembre 2026. Les fichiers d’archive restent inchangés.

Le test `server/test/maintenance.test.ts`, inclus dans `yarn test`, vérifie les archives byte pour byte et les seuls points d’entrée SQL conservés. Les tests PostgreSQL du serveur utilisent des bases locales jetables ; ne jamais les diriger vers Supabase.

## Sauvegardes

Voir [la procédure actuelle](README_backup.md). Aucun dump, restauration ou changement de la base distante n’a été exécuté au lot 27.
