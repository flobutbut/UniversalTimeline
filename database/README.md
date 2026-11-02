# Données et maintenance

La base active est PostgreSQL dans le projet Supabase Universal-Timeline. L’API Express utilise pg ; Docker ne fournit pas de seconde base. Configuration et TLS : [server/SUPABASE.md](../server/SUPABASE.md). Auth, rôles et propriété : [server/AUTHENTICATION.md](../server/AUTHENTICATION.md).

L’organisation actuelle est décrite dans [Relations au sein des frises](../Documentation/RELATIONS-FRISES.md). Les fiches du catalogue ne possèdent plus de parent global.

## Fichiers actifs

- `migrations/20261029090427_story_access.sql` : accès et propriété des stories, appliqué après autorisation.
- `migrations/20261029093707_harden_public_functions.sql` : privilèges et search_path des fonctions, appliqué.
- `migrations/20261029093923_isolate_postgis.sql` : déplacement de PostGIS vers extensions, appliqué.
- `migrations/20261031204007_story_period_hierarchy.sql` : placement des périodes propre à chaque frise, avec conservation du classement du catalogue ; appliqué.
- `migrations/20261031220914_hybrid_catalogue_search.sql` : recherche plein texte, tolérance aux fautes et aux accents ; appliqué.
- `migrations/20261102001509_frise_only_period_hierarchy.sql` : conservation des parcours dans les frises, suppression du parent global et contrôles de hiérarchie locale ; appliquée le 2 novembre 2026.
- `operations/assign_admin_role.sql` et `assign_legacy_stories.sql` : opérations ponctuelles et explicites déjà effectuées pour le compte confirmé ; aucune exécution automatique au démarrage.

Ces migrations sont un historique des changements sur le schéma existant. Pour une nouvelle cible vide, utiliser uniquement [la baseline du lot 28](baseline/README.md), validée sur PostgreSQL 17. Elle contient déjà l’état des accès/durcissements applicatifs ; ne pas rejouer ensuite ces migrations ni les opérations d’attribution. Le projet existant ne doit recevoir aucun de ces initialiseurs.

## Corrections du catalogue

Les fichiers `data/20261102_catalogue_*` contiennent les textes sourcés et le lot transactionnel de correction de l’audit du 2 novembre 2026, déjà appliqué au projet actif. Le [compte rendu](../Documentation/PERFORMANCE-ET-CATALOGUE.md) décrit les décisions et la validation. Ces corrections ciblent les anciennes fiches recensées et ne doivent pas être exécutées sur une nouvelle base vide. Le retour arrière refuse les contenus ou relations modifiés depuis l’application.

## Archives

Les anciens initialiseurs Docker, imports, scripts de sauvegarde, migrations Prisma/anciens modèles et dumps sont conservés comme textes dans [archive/](archive/README.md), avec leur chemin d’origine et leur SHA-256. Certains anciens scripts détruisent des données ou remplacent les IDs ; ils sont incompatibles avec le schéma courant. La routine historique `maintain_period_relations()` a été retirée avec le classement global le 2 novembre 2026. Les fichiers d’archive restent inchangés.

Le test `server/test/maintenance.test.ts`, inclus dans `yarn test`, vérifie les archives byte pour byte et les seuls points d’entrée SQL conservés. Les tests PostgreSQL du serveur utilisent des bases locales jetables ; ne jamais les diriger vers Supabase.

## Sauvegardes

Voir [la procédure actuelle](README_backup.md). Aucun dump, restauration ou changement de la base distante n’a été exécuté au lot 27.
