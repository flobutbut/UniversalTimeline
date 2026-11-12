# Données et maintenance

La base active est PostgreSQL dans le projet Supabase Universal-Timeline. L’API Express utilise pg ; Docker ne fournit pas de seconde base. Configuration et TLS : [server/SUPABASE.md](../server/SUPABASE.md). Auth, rôles et propriété : [server/AUTHENTICATION.md](../server/AUTHENTICATION.md).

L’organisation actuelle est décrite dans [Relations au sein des frises](../Documentation/RELATIONS-FRISES.md). Les fiches du catalogue ne possèdent plus de parent global.

## Fichiers actifs

- `migrations/20261108120000_taxonomy_tags.sql` : grille fermée de 16 tags thématiques (`tags`, `event_tags`, `period_tags`, `story_tags`, `periods.non_thematic`), voir [la taxonomie](../Documentation/TAXONOMIE-TAGS.md). Appliquée au projet actif le 8 novembre 2026 après accord explicite, version distante `20261108214704` (effectifs et empreintes des événements, périodes et catégories inchangés, 21 règles `ut_` conservées, aucun avis de sécurité). Reportée dans la baseline. Ajouts uniquement : les catégories et leurs liens restent intacts.
- `migrations/20261106100000_wikipedia_titles.sql` : titres d’articles Wikipédia (`wikipedia_title_fr`, `wikipedia_title_en`) des périodes et événements, avec contrainte de forme (espaces, sans `_ # < > [ ] | { }` ni caractère de contrôle, 255 caractères). Ajouts uniquement, colonnes nulles par défaut. Appliquée au projet actif le 6 novembre 2026 après accord explicite, version distante `20261106111819` (sans les `BEGIN`/`COMMIT` du fichier) : 442 périodes et 499 événements préservés, empreintes des anciennes données et des policies identiques, contrôle de sécurité sans alerte. Complément appliqué le même jour, en une instruction atomique équivalente à `data/20261106_wikipedia_titles.sql` (mêmes 812 lignes et conditions) : 385 périodes (371 avec article français, 14 anglais seulement) et 439 événements (396 et 43) ; empreinte des titres en base identique au fichier, aucun fait dérivé touché. Annulation : `data/20261106_wikipedia_titles_rollback.sql`. Le 6 novembre 2026 également, après validation explicite d’une liste relue, 68 fiches sans titre (29 périodes, 39 événements, surtout sans Q-id) ont reçu un article trouvé par leur nom : titre exact vérifié sur Wikipédia, sans redirection ni homonymie ; certaines pointent vers un article plus général (personne, lieu, thème). Générateur : `node --experimental-strip-types scripts/wikipedia-titles-backfill.mjs`, à relancer pour les fiches créées sans titres ; il n’écrase aucune saisie, ignore les faits dérivés et met à jour `updated_at` des fiches complétées. La baseline contient les mêmes colonnes et contraintes.
- `migrations/20261104234615_wikidata_fact_sources.sql` : identité stable des faits datés extraits de déclarations Wikidata et provenance avec précision des dates ; appliquée au projet actif le 5 novembre 2026, version distante `20261105063453`. Ajouts uniquement : 431 événements et 379 périodes préservés, empreintes des anciennes données identiques, policies inchangées et contrôle de sécurité sans alerte. La baseline contient les mêmes colonnes, contraintes et index partiels. Voir [la génération Wikidata](../Documentation/GENERATION-WIKIDATA.md).
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

La migration `20261102131202_story_period_presentations.sql` ajoute les présentations de périodes par contexte, avec index et RLS. La migration `20261104132539_navigation_without_wrapper_periods.sql`, appliquée le 4 novembre 2026 (version distante `20261104134742`), conserve la clé composée côté contexte et référence seulement la frise côté cible. Elle autorise aussi les entrées à la racine sans modifier les droits ni les données. Elle est appliquée au projet actif. La baseline des projets vides contient déjà cette table.

Le lot `data/20261102_historical_navigation_context.sql`, appliqué le 2 novembre 2026, crée la frise de référence « Grandes périodes de l’histoire européenne » et quatre présentations sur les fiches existantes Antiquité, Moyen Âge, Époque moderne et Histoire contemporaine. Les points d’entrée historiques sont conservés. Ce lot est propre aux données auditées ; ne pas l’exécuter sur une installation vide. Les identifiants des frises créées sont obtenus par `RETURNING`, jamais imposés.

Voir [Relations au sein des frises](../Documentation/RELATIONS-FRISES.md) pour le comportement et l’édition des parcours.

## Catégorie personnelle — 5 novembre 2026

Le lot idempotent `data/20261105_personal_category.sql` ajoute « Personnelle » (`CAT_PERSONAL`) pour les frises, périodes et événements. Appliqué au projet actif le 5 novembre 2026 et vérifié par lecture. Il peut aussi être exécuté après la baseline sur une installation vide.

## Tags thématiques — 8 novembre 2026

Le lot `data/20261108_tags_lot1_non_thematiques.sql` marque 269 des 611 périodes comme non thématiques (ères, divisions géologiques, époques, règnes, dynasties, empires, régimes). Appliqué au projet actif le 8 novembre 2026 après relecture et accord, et vérifié par lecture : seule la marque change, dates de modification comprises. Annulation : `data/20261108_tags_lot1_non_thematiques_rollback.sql`.

Le lot `data/20261109_tags_lot2_periodes.sql` pose 453 liens de tags sur 341 périodes thématiques, relues une par une. Appliqué au projet actif le 8 novembre 2026 après relecture et accord, et vérifié par lecture : fiches et catégories inchangées. Annulation : `data/20261109_tags_lot2_periodes_rollback.sql`.

Le lot `data/20261109_tags_lot3_evenements.sql` pose 872 liens de tags sur les 652 événements, relus un par un. Appliqué au projet actif le 8 novembre 2026 après relecture et accord, et vérifié par lecture : fiches et catégories inchangées. Annulation : `data/20261109_tags_lot3_evenements_rollback.sql`.

Le lot `data/20261109_tags_lot4_frises.sql` pose 54 liens de tags sur 35 frises et marque la dernière période non classée. Appliqué au projet actif le 8 novembre 2026 après relecture et accord, et vérifié par lecture : fiches et catégories inchangées. Annulation : `data/20261109_tags_lot4_frises_rollback.sql`.

## Corrections du catalogue

Les fichiers `data/20261102_catalogue_*` contiennent les textes sourcés et le lot transactionnel de correction de l’audit du 2 novembre 2026, déjà appliqué au projet actif. Le [compte rendu](../Documentation/PERFORMANCE-ET-CATALOGUE.md) décrit les décisions et la validation. Ces corrections ciblent les anciennes fiches recensées et ne doivent pas être exécutées sur une nouvelle base vide. Le retour arrière refuse les contenus ou relations modifiés depuis l’application.

## Retours utilisateurs — 9 novembre 2026

La migration additive `20261109220108_user_feedback.sql` ajoute le stockage privé des feedbacks et les routines de dépôt, suivi par e-mail et traitement administrateur. Appliquée au projet actif le 9 novembre 2026, vérifiée par lecture des droits et par des tests PostgreSQL locaux. La baseline inclut ce schéma pour les installations vides. Voir [Retours utilisateurs](../Documentation/FEEDBACK-UTILISATEURS.md).

La migration `20261109221920_feedback_email_notifications.sql`, appliquée le même jour et intégrée à la baseline, mémorise les abonnements des administrateurs et les envois en attente. Le destinataire provient de l’adresse confirmée du compte Auth. Le SMTP de production est configuré dans Vercel et validé par un envoi reçu chez Hostinger ; les paramètres locaux restent indépendants.

La migration `20261109222916_feedback_list_filters.sql`, également appliquée et intégrée à la baseline, ajoute les filtres combinables d’objet et de statut avant pagination, avec un compteur des résultats correspondants.

La migration `20261109223738_feedback_delete.sql` ajoute la suppression ciblée d’un retour et de ses notifications en attente, réservée aux administrateurs. Appliquée et intégrée à la baseline le même jour.

La migration `20261109230646_feedback_feature_switch.sql`, appliquée le 10 novembre 2026 et intégrée à la baseline, ajoute le switch global « Activer les avis ». Elle conserve les retours existants, bloque les écritures publiques à la désactivation et annule les notifications en attente.

## Archives

Les anciens initialiseurs Docker, imports, scripts de sauvegarde, migrations Prisma/anciens modèles et dumps sont conservés comme textes dans [archive/](archive/README.md), avec leur chemin d’origine et leur SHA-256. Certains anciens scripts détruisent des données ou remplacent les IDs ; ils sont incompatibles avec le schéma courant. La routine historique `maintain_period_relations()` a été retirée avec le classement global le 2 novembre 2026. Les fichiers d’archive restent inchangés.

Le test `server/test/maintenance.test.ts`, inclus dans `yarn test`, vérifie les archives byte pour byte et les seuls points d’entrée SQL conservés. Les tests PostgreSQL du serveur utilisent des bases locales jetables ; ne jamais les diriger vers Supabase.

## Sauvegardes

Voir [la procédure actuelle](README_backup.md). Aucun dump, restauration ou changement de la base distante n’a été exécuté au lot 27.


## Navigation sans chapeau — 4 novembre 2026

Le schéma de compatibilité est appliqué ; les huit tables de données contrôlées gardent leurs effectifs initiaux (39 frises, 366 périodes, 421 événements). Le lot `data/20261104_navigation_without_wrappers.sql` est **préparé mais non appliqué** : l’API et le frontend doivent être déployés ensemble avant son exécution. La revue automatique demande un accord explicite pour le déploiement Vercel.

La répétition locale anonymisée valide les quatre retraits, les cinq nouveaux placements racine, la conservation des huit destinations ancrées et l’ajout de Genre Homo → Techniques. Le [suivi](../audits/navigation-2026-11-04/implementation.md) distingue les actions effectuées de celles en attente et référence le retour arrière testé. Ne pas rejouer ce lot propre aux données auditées sur une installation vide.

La migration `20261112090000_catalogue_write_guard.sql`, intégrée à la baseline et appliquée en production le 12 novembre 2026 (version enregistrée `20261112084646`), réserve la modification et la suppression des périodes et événements aux éditeurs/admins et au créateur d’une fiche non utilisée par un autre compte (table privée `catalogue_private.record_creators`, triggers `guard_*_write`). Elle ne modifie aucune ligne existante ; sur toute autre base, l’appliquer avant de déployer le serveur qui appelle `catalogue_private.can_edit_record`.
