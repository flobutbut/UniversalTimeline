# Corrections de performance — 10 novembre 2026

## Code validé

- Connexion Vercel : passage automatique du port Supavisor session 5432 au port transactionnel 6543, à partir du secret existant, uniquement pour les hôtes `*.pooler.supabase.com` et `VERCEL=1`. TLS vérifié conservé, pool global max=5, fermeture après 5 secondes d’inactivité et intégration officielle `attachDatabasePool`.
- Limites SQL locales à chaque transaction : 15 secondes de statement timeout et d’inactivité dans une transaction. Les rôles, claims et verrous restent transactionnels.
- Le contrôle du schéma et des rôles se fait avant la première transaction de données, avec partage des vérifications et reprise après un échec. L’accès aux données reste fermé en cas d’échec. Une panne temporaire ne fait plus échouer l’import de toute l’app Express ; `/api/access` reste disponible.
- Saturation du pool reconnue précisément et rendue en 503 avec Retry-After, sans traiter tous les codes XX000 comme des erreurs transitoires.
- Requête de frise : calcul des associations à partir des contenus partagés et agrégation par destination, plutôt que tableaux corrélés pour chaque autre frise.
- Graphe de navigation : `/api/stories/navigation`, une lecture SQL sous RLS, cache par session. La recherche du parcours utilise ce graphe sans télécharger les détails des frises candidates.
- Catalogue compact pour l’exploration : `/api/stories?view=summary`. Les dates, catégories, titres et droits restent disponibles ; les aperçus complets sont réservés à la galerie.
- L’espace Frises ne charge plus d’emblée tous les événements et toutes les périodes du catalogue.
- Annulation des lectures de détails, du catalogue et du graphe : les consommateurs partagent un transport ; seul le départ du dernier lecteur l’arrête. Les réponses obsolètes ne publient pas de données. Les lectures API sont bornées à 20 secondes, avec messages utilisateur en français. Les écritures ne sont jamais rejouées automatiquement.
- Fusion des périodes en une seule passe avec Map, au lieu de recopier et parcourir tout le tableau pour chaque élément reçu.
- Mesures de durée par route normalisée : total, Auth, attente du pool, SQL et identifiant de requête généré. Aucun token, body, paramètre SQL ou identifiant de contenu n’est journalisé.

## Mesures intermédiaires avant migration de production

La réécriture SQL a été mesurée sur la base actuelle, en lecture seule, sous le rôle connecté avec la même identité synthétique publique que l’audit. Un échantillon par mesure : ces chiffres ne sont pas des percentiles.

| Lecture SQL | Avant | Code corrigé, anciennes politiques |
| --- | ---: | ---: |
| Univers, détail | 891 ms | 32 ms |
| Histoire de France, détail | 1 118 ms | 199 ms |
| Liste des frises | 1 255 ms | 1 181 ms |

Le catalogue compact représente **48 677 octets** de JSON, contre **355 273 octets** précédemment, soit environ **86 % de moins**. Le graphe représente 276 657 octets pour les 50 frises publiques et remplace les multiples détails complets nécessaires au parcours. Les mesures HTTP locales des nouvelles routes sont dans `http-new-endpoints-local.json` ; elles ne sont pas des mesures de production.

## Validation

- `yarn verify` : design system, **1 920 tests**, configuration sans connexion, symboles inutilisés et builds frontend/API réussis.
- **242 tests PostgreSQL réussis**, incluant les contraintes, droits, comptes privés, éditeurs, suspensions, écritures atomiques, parcours, lecture immédiate après sauvegarde et restauration. Bases temporaires via sockets locaux ; tests nécessitant UTC exécutés avec les fuseaux serveur/client UTC, comme en CI.
- Audit des dépendances API après ajout de `@vercel/functions@3.11.1` : **0 vulnérabilité**.
- Navigateur local connecté : frise Histoire de France affichée, événements, filtres et parcours conservés.
- `git diff --check` réussi.

Les protections du compte, la vérification distante des sessions et les invalidations nécessaires aux liens partagés sont conservées. Aucun contenu réel n’a été modifié pour tester une sauvegarde.

## Migration de production appliquée

`database/migrations/20261110103843_performance_read_policies.sql` est testée et intégrée à la baseline pour une nouvelle installation. Elle sépare 11 politiques `ALL` en INSERT, UPDATE et DELETE **en recopiant les prédicats existants à l’identique**, sans les faire participer aux SELECT. Les noms historiques sont conservés sur UPDATE ; les nouvelles politiques ne changent pas le nombre de 21 noms `ut_` attendu par les anciens serveurs. Le schéma existant reste donc compatible avec le code livré avant cette migration.

La migration a été appliquée après autorisation explicite de l’utilisateur, sous la version distante **20261110110221**. La revue automatique exigeait cette confirmation pour le remplacement de politiques d’accès ; l’autorisation et celle de publier le commit ont été obtenues avant les actions. Les 11 politiques ALL ne participent plus aux lectures et le contrôle historique retrouve toujours ses 21 politiques ut_. Les empreintes de stories, périodes, événements et de leurs associations sont identiques avant et après migration.

## Livraison et mesures finales

Le commit **ec361b18cc2ac8146d85cf20746604efd8aaa8cf** a été publié sur main après autorisation explicite. Vercel le déclare READY ; le domaine public sert la nouvelle API (nouvelle route de graphe et identifiants de requête présents).

| Lecture SQL connectée | Avant | Après code et migration |
| --- | ---: | ---: |
| Liste | 1 255 ms | 28,14 ms |
| Détail Univers | 891 ms | 4,47 ms |
| Détail Histoire de France | 1 118 ms | 14,64 ms |

Ces mesures isolées concernent le temps d’exécution SQL, pas toute la page. Elles utilisent une identité synthétique à droits publics sous le rôle connecté ; les plans sont dans `db-plans-final.json`.

Recette HTTP publique à **12 h 06, heure de Paris** : 30 appels, aucune erreur. Médianes : Univers 73,5 ms, Histoire de France 99,5 ms, catalogue compact 114 ms. Le premier appel Univers a pris 669 ms ; les réponses chaudes ne résument donc pas le démarrage à froid. Le graphe contient les mêmes 50 identifiants publics que le catalogue, sans lien vers une frise absente de cet ensemble. Accès anonyme au compte : 401 ; frise inexistante : 404 ; page HTML timeline : 200.

Navigateur en production avec le compte connecté : Histoire de France affichée avec son parcours et ses événements, puis ouverture de son espace d’édition réussie. Aucun contenu de production n’a été modifié pour la recette ; le scénario écriture puis lecture immédiate a été vérifié sur la base jetable.

Les logs Supavisor de **12 h 05 à 12 h 07 min 44 s** confirment `mode=transaction` pour `universal-timeline-api`, sans EMAXCONNSESSION dans la fenêtre. L’avertissement sur les politiques permissives multiples a disparu. Les avis restants sur les index et les appels Auth dans les écritures ne démontrent pas un coût des lectures ; aucun index n’a été supprimé pour faire disparaître un diagnostic. Les quatre informations de sécurité RLS sans politique concernent des tables fermées par défaut ; aucun nouvel accès n’a été ouvert.

La [CI GitHub du commit déployé](https://github.com/flobutbut/UniversalTimeline/actions/runs/42804164717) est terminée avec succès : installation vierge, audits, builds, tests PostgreSQL 17 et restauration. Les corrections et la migration sont en production ; aucun accord supplémentaire ne reste requis.
