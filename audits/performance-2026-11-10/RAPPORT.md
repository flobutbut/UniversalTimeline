# Audit de performance et de disponibilité — 10 novembre 2026

Périmètre principal : **https://universaltimeline.net**, après précision que les problèmes ont été observés en ligne. Analyse du code local, lectures HTTP publiques, consultation de la session Chrome connectée, journaux Vercel et Supabase, six plans SQL réels en lecture seule. Aucun contenu modifié, aucune migration, aucun déploiement. Les essais locaux servent uniquement de comparaison.

## Diagnostic

**Une cause des erreurs 500 est confirmée : le pooler Supabase en mode session atteint sa limite de 15 clients.** Les journaux du pooler et ceux de Vercel coïncident. Le démarrage de l’API dépend de cette connexion ; quand elle est refusée, certaines instances ne démarrent même pas. Une ouverture de la frise Histoire de France dans la session connectée a aussi affiché `Request failed with status code 500` pendant l’audit.

**Une cause des lenteurs est également mesurée : les lectures sous le rôle connecté exécutent des contrôles d’écriture RLS coûteux.** Sur les mêmes données, les lectures SQL testées passent de 15–31 ms en visiteur à 891–1 255 ms avec le rôle connecté. Le calcul des frises associées amplifie ce coût.

Le mécanisme probable après une modification est donc : invalidation des caches → nouvelles lectures coûteuses → connexions occupées plus longtemps → limite du pooler atteinte → 500, puis récupération quand des connexions se libèrent. Après une modification du code déployée, le chevauchement des instances peut également accentuer la pression. **La séquence exacte écriture puis rechargement n’a pas été rejouée**, pour conserver les données ; ce lien avec le geste de modification reste une explication étayée, pas une reproduction complète.

## Mesures

### Lectures SQL sur la base actuelle

Les requêtes proviennent directement de `server/src/repositories/storyRepository.ts`. Chaque `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` s’exécute dans une transaction `READ ONLY`, terminée par `ROLLBACK`. Le rôle connecté utilise une identité synthétique sans propriété ni privilège administrateur : aucun compte réel n’est usurpé. Ces mesures isolent le SQL, hors réseau, Auth et sérialisation HTTP. Un échantillon par opération/rôle, donc pas de p95 ni de test de charge.

| Opération | Visiteur `anon` | Rôle `authenticated` | Rapport observé |
| --- | ---: | ---: | ---: |
| Liste des frises | 30,85 ms | 1 254,91 ms | × 40,7 |
| Détail Univers moderne, id 1 | 14,83 ms | 891,36 ms | × 60,1 |
| Détail Histoire de France, id 51 | 24,81 ms | 1 118,15 ms | × 45,1 |

Les plans complets sont dans [db-plans.json](db-plans.json). Les statistiques historiques de la famille de requêtes `WITH entry_links` montrent aussi, pour une version de requête, **338 appels connectés, moyenne 765 ms, maximum 11 836 ms**, contre 15,5 ms de moyenne sous `anon`. Ces statistiques sont cumulées depuis la remise à zéro du 4 avril 2026 : elles incluent plusieurs versions du code, le local et la production ; elles ne représentent pas un percentile du site actuel.

### Réponses HTTP publiques en production

Trois GET anonymes successifs par URL, depuis le poste ; toutes ces réponses ont renvoyé 200. Fin de mesure : **11 h 26, heure de Paris**. Aucun cache vidé et aucun démarrage à froid forcé.

| URL | Médiane du temps total | Plage | Corps décompressé |
| --- | ---: | ---: | ---: |
| `/api/access` | 164 ms | 62–198 ms | 16 octets |
| `/api/stories` | 179 ms | 172–245 ms | 355 273 octets |
| `/api/stories/1` | 108 ms | 103–172 ms | 24 072 octets |
| `/api/stories/51` | 130 ms | 123–154 ms | 170 086 octets |
| `/timeline?story=1` — HTML seul | 150 ms | 73–366 ms | 1 973 octets |
| `/timeline?story=51` — HTML seul | 88 ms | 86–100 ms | 1 996 octets |

L’API publique répond donc correctement entre les incidents. **Ces GET anonymes rapides ne décrivent pas la session connectée**, ni le temps jusqu’à la frise interactive. Brotli est bien actif en production ; les tailles ci-dessus ne sont pas les tailles transférées compressées. Les réponses API sont `no-store`, les pages timeline `private, no-store`.

## Constats et corrections prioritaires

### P0 — Connexions Supabase épuisées, cause d’indisponibilité confirmée

Preuve du pooler : `(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`, avec le code `XX000`. Dans la fenêtre **11 h 10–11 h 28**, les journaux contiennent **118 entrées en mode session et 65 en mode proxy** mentionnant ce refus. Ce sont des entrées de journal, pas 183 requêtes utilisateur distinctes ; les deux couches peuvent journaliser le même incident.

Les journaux Vercel affichent notamment, à **11 h 19 min 53 s et 11 h 22 min 54 s**, `database_check_failed / XX000`, `startup_failed`, puis sortie du processus. D’autres appels de détail, liste et profil échouent aussi avec `XX000`.

Dans `server/src/config/database.ts:31`, chaque processus peut conserver jusqu’à **5 connexions**, avec **30 secondes** avant fermeture d’une connexion inactive. Ce maximum s’applique à chaque instance, pas à l’ensemble du site. Trois instances ayant rempli leurs pools peuvent consommer les 15 places disponibles ; ce calcul illustre le risque, sans établir le nombre réel d’instances au moment des erreurs. Le pool est global et les clients sont bien libérés en `finally` : aucune fuite simple de client emprunté n’a été trouvée. Une connexion rendue au pool reste toutefois une session ouverte vers Supabase.

Correction proposée : employer le **pooler en mode transaction pour Vercel**, et gérer explicitement le cycle de vie des connexions inactives avec l’intégration Vercel appropriée. Supabase recommande le mode transaction pour les clients temporaires/serverless ; Vercel documente `attachDatabasePool` et un délai d’inactivité court. Sources : [connexion Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [pooling Vercel](https://vercel.com/kb/guide/connection-pooling-with-functions).

Avant bascule, valider la compatibilité : le projet utilise déjà `SET LOCAL ROLE`, des claims locaux à la transaction et des verrous transactionnels ; aucun prepared statement nommé n’a été trouvé dans les appels SQL applicatifs examinés. Vérifier aussi l’application de `statement_timeout` dans ce mode, idéalement dans la transaction qui en dépend. Conserver la vérification TLS et les droits actuels. La valeur secrète de production n’a pas été lue ni changée pendant l’audit. Une augmentation de capacité seule laisserait les causes de surconsommation intactes.

### P1 — Les règles d’écriture ralentissent les lectures connectées

Les politiques `ut_write_story_periods` et `ut_write_story_events` sont définies avec **`FOR ALL`** et utilisent `access_private.can_edit_story(story_id)`. Elles participent donc aussi aux SELECT du rôle connecté, en plus des politiques de lecture.

Les plans réels montrent des filtres de la forme `can_edit_story(story_id) OR (...)`. La fonction est réévaluée sur les associations parcourues, y compris dans les sous-requêtes des frises liées. Exemple : dans la liste, l’agrégation des événements tourne 87 fois et coûte environ 8,65 ms par boucle sous `authenticated`, contre 0,16 ms sous `anon`. Aucun temps JIT n’apparaît dans ces plans : l’écart mesuré ne vient pas d’une compilation JIT.

Correction proposée : séparer les politiques INSERT, UPDATE et DELETE des politiques SELECT sur les tables concernées, avec les mêmes conditions de propriété, d’édition publique et de suspension. Garder les contrôles d’écriture hors du chemin de lecture. Examiner aussi les autres politiques `ALL` signalées. **Ne pas remplacer aveuglément une fonction dépendante de `story_id` par une valeur globale mise en cache** : elle dépend de la ligne.

Attention à `server/src/auth/preflight.ts` : le démarrage exige actuellement exactement **21 politiques préfixées `ut_`**. Une migration qui sépare les politiques doit faire évoluer cette vérification et être déployée dans un ordre compatible. Les tests de droits doivent couvrir propriétaire, visiteur, compte ordinaire, éditeur, administrateur, compte suspendu et frise privée. Référence : [performance des règles RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations).

### P1 — Les frises associées dominent le coût du détail

`server/src/repositories/storyRepository.ts:120` parcourt les autres frises, calcule les périodes et événements communs, puis filtre sur la présence de correspondances. Les tableaux corrélés apparaissent dans le filtre et dans la projection du plan.

Dans le plan connecté de la frise 1, le sous-plan qui agrège ces relations prend **875 ms sur 891 ms** d’exécution totale. Pour la frise 51, il prend **1 030 ms sur 1 118 ms**. Ces temps sont inclus dans le total ; ils ne doivent pas s’additionner entre niveaux du plan.

Correction proposée : partir des associations de la frise courante, joindre les associations partageant les mêmes identifiants, puis grouper par frise cible. Les index inverses `(period_id, story_id)` et `(event_id, story_id)` existent déjà. Conserver une lecture cohérente de la frise et les filtrages RLS ; pas besoin de multiplier les petits appels HTTP. Une mesure comparative doit valider le gain après correction RLS.

### P1 — La reconstruction du parcours charge des détails complets en rafale

Le bouton « Voir dans la timeline » utilise `entry=universe` (`src/views/DatabaseView/StoryDetailPanel.vue:27`). `useHomeNavigation.ts:302` attend alors `universeStoryTrail` avant de présenter les périodes. Cette recherche explore les frises parentes et apparentées ; à chaque niveau, `src/lib/universeStoryTrail.ts:75` lance tous les détails candidats avec `Promise.allSettled`, sans limite explicite de concurrence.

Le détail coûteux décrit ci-dessus est donc réutilisé pour construire un fil d’Ariane. Une annulation de navigation empêche de publier une réponse obsolète, mais n’arrête pas les transports déjà lancés par `ensureStoryLoaded`.

Correction proposée : exposer un graphe de navigation léger, ou un endpoint de parcours, et réserver les détails complets à la frise affichée. À court terme, limiter les lectures simultanées et donner un budget au parcours. Une reconstruction de fil d’Ariane ne devrait pas maintenir la destination en chargement indéfiniment. Préserver les règles existantes : plus court chemin navigable, ancres, contextes et retours.

### P1 — Un incident de base empêche toute l’API de démarrer

`server/src/vercel.ts:12` attend `testConnection()` au chargement du module. Cette fonction fait aussi une transaction de contrôle du schéma et des rôles. Si le pooler refuse une connexion, l’app Express n’est pas créée : même `/api/access`, qui ne lit aucune donnée, dépend alors de PostgreSQL.

Correction proposée : distinguer configuration/schéma invalides et indisponibilité transitoire, préserver le refus d’accès aux données tant que les vérifications requises n’ont pas réussi, tout en permettant une réponse HTTP contrôlée et une récupération bornée. Garder le contrôle des rôles et de la migration ; le supprimer masquerait un problème de sécurité. Éviter une boucle de redémarrages ou de reprises immédiates qui ajoute encore des connexions.

### P2 — Le catalogue complet bloque l’ouverture d’une seule frise

`useHomeNavigation.ts:270` attend ensemble le détail et la liste entière. `/api/stories` transporte les aperçus de toutes les périodes et événements des **50 frises publiques**, soit **355 Ko de JSON décompressé** ; la liste n’est pas paginée. `storyRepository.ts:148` recalcule ces agrégats pour toutes les frises retournées, parfois plusieurs fois quand une frise a plusieurs catégories.

Correction proposée : séparer les résumés, les bornes temporelles, les données de navigation et les aperçus nécessaires à la galerie. Afficher la destination dès que ses données essentielles sont disponibles. Préserver les filtres temporels, les cartes de frises liées et les métadonnées SEO qui consomment actuellement ces aperçus.

Dans l’espace Frises, `useDatabaseView.ts:153` charge en plus toutes les périodes et tous les événements au montage, avant d’ouvrir une frise ciblée par l’URL (`DatabaseView.vue:296`). Charger ces catalogues à l’ouverture des sélecteurs réduirait le travail initial. L’invalidation globale des détails après certaines écritures amplifie les relectures ; elle protège actuellement la cohérence des liens partagés et doit être affinée par dépendances plutôt que simplement supprimée.

### P2 — Les erreurs transitoires sont mal présentées et les lectures peu bornées

`server/src/api/errors.ts:36` traite certains problèmes réseau comme des 503, mais le refus `XX000 / EMAXCONNSESSION` retombe ici en 500. Un code `XX000` quelconque ne signifie pas forcément saturation : il faut reconnaître le cas précis dans la couche d’infrastructure, avec un motif interne normalisé.

`src/services/ApiClient.ts:4` n’a pas de timeout général. Les lectures de détails depuis le store ne passent pas de signal d’annulation. En cas de navigation abandonnée, elles peuvent continuer à consommer API, Auth et SQL. L’écran observé en production affiche le texte technique Axios en anglais.

Correction proposée : budget explicite des lectures, transport annulable en tenant compte des consommateurs partageant le cache, message utilisateur compréhensible, réponse 503/Retry-After pour la saturation reconnue. Une annulation navigateur ne garantit pas l’arrêt du SQL serveur : conserver aussi les limites et le nettoyage côté API. Toute éventuelle reprise automatique doit rester bornée et réservée aux lectures idempotentes ; aucune répétition automatique des écritures dont le résultat peut être inconnu.

### P2 — Les logs ne permettent pas encore de séparer les temps

Les erreurs sont volontairement expurgées, ce qui est adapté aux données sensibles. En revanche, les logs applicatifs ne donnent ni durée par route, ni attente du pool, ni durée SQL, ni motif normalisé de saturation. Le message de démarrage suggère réseau/certificat alors que le pooler refuse ici faute de place.

Correction proposée : identifiant de requête, route normalisée, statut, durée totale, temps Auth, temps d’attente de connexion et temps SQL ; compteurs du pool et motifs d’erreur sur liste autorisée. Ne pas journaliser tokens, identités, SQL paramétré ou URL de connexion. Ces mesures permettraient de relier une sauvegarde à ses relectures et à l’incident sans exposer le contenu.

## Points secondaires et éléments qui fonctionnent

- Supabase remonte 7 avertissements d’index de clés étrangères, 6 de coût Auth/RLS, 11 de politiques permissives multiples et 4 index sans utilisation observée. Les détails sont dans `supabase-evidence.json`. Ce sont des pistes, pas une liste de migrations à appliquer mécaniquement. En particulier, `(parent_period_id, story_id)` existe sur `story_periods` et peut servir aux égalités sur ces deux colonnes ; ne pas créer un index inverse uniquement pour faire disparaître un lint.
- Le middleware vérifie chaque token auprès de Supabase Auth. Cela ajoute un appel distant aux lectures connectées. Coût non isolé ici ; priorité après pooling et SQL. Préserver l’application immédiate des suspensions et révocations si une optimisation est envisagée.
- Chaque lecture SQL protégée comporte actuellement BEGIN, rôle, claims, requête et COMMIT. Cette protection est nécessaire dans l’architecture actuelle ; un regroupement sûr de commandes peut être étudié après les causes majeures, sans faire fuir un principal entre deux emprunts du pool.
- Les routes Vue sont chargées à la demande et le cache client partage les lectures identiques. Les transactions rendent les réponses d’écriture après COMMIT et libèrent les clients en `finally`. Aucun délai artificiel de propagation post-sauvegarde n’a été trouvé dans le flux examiné.
- Brotli est actif sur l’API en production. Le build local reste découpé : HomeView ≈ 99 Ko bruts/32 Ko gzip, DatabaseView ≈ 117 Ko/35 Ko ; principal ≈ 346 Ko/124 Ko. Des chunks SDK supplémentaires existent et sont chargés selon les usages. Ces tailles ne suffisent pas à attribuer les secondes perdues au rendu.
- Aucun profil CPU, Lighthouse, LCP/INP ou test mobile ralenti n’a été obtenu. L’écran connecté ayant rencontré une erreur API, les coûts de layout/animation des grandes frises restent à mesurer après stabilisation. Aucune conclusion négative non mesurée sur les images, CSS ou animations.
- Les anciennes erreurs ESM Vercel du 9 novembre et les erreurs de proxy PM2 locales ne sont pas retenues comme cause de l’incident de production actuel : les preuves corrélées du 10 novembre pointent vers le pooler.

## Ordre de traitement et critères de recette

1. **Disponibilité** : bascule contrôlée du pooling de production, cycle de vie Vercel et réponse aux indisponibilités ; tester démarrage et récupération avec base momentanément indisponible, sans affaiblir le contrôle d’accès.
2. **SQL connecté** : séparer les politiques de lecture/écriture, adapter le preflight, réécrire le calcul des frises associées. Comparer les plans sous les mêmes rôles et vérifier tous les droits sur une base de test dédiée.
3. **Parcours et relectures** : alléger le graphe de navigation et le catalogue, limiter les rafales, annuler les lectures obsolètes, affiner les invalidations après écriture.
4. **Mesure utilisateur** : instrumenter les temps, puis profiler une grande frise rendue, en visiteur et connecté, sur ordinateur et mobile.

Cibles de recette proposées, **non encore obtenues** : aucune saturation/500 pendant un scénario borné ouverture → modification → réponse de succès → rechargement immédiat ; détail et liste SQL usuels sous 100 ms en régime chaud ; navigation n’attendant pas le téléchargement de détails de nombreuses frises pour construire son chemin. Recueillir au moins 30 observations représentatives pour juger la variabilité HTTP ; effectuer les scénarios d’écriture sur des données de test et vérifier leur persistance après COMMIT. Comparer le rendu avant/après en conservant les fonctionnalités.

## Vérifications et preuves livrées

- `yarn test` : **178 fichiers, 1 914 tests réussis**, 26,1 secondes. Un message `AggregateError` jsdom apparaît sur stderr ; le runner termine avec succès. Ce résultat ne constitue pas un test de charge ou de production.
- `yarn build` : types frontend et build Vite réussis.
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json` : réussi.
- [http-measurements.json](http-measurements.json) et [measure-http.mjs](measure-http.mjs) : mesures HTTP reproductibles, GET uniquement.
- [db-plans.json](db-plans.json) et [measure-db.mjs](measure-db.mjs) : six plans SQL, transactions en lecture seule. Relance depuis la racine : `node --import ./server/node_modules/tsx/dist/loader.mjs audits/performance-2026-11-10/measure-db.mjs`. Utilise la connexion locale existante sans afficher ses secrets.
- [supabase-evidence.json](supabase-evidence.json) : agrégat des refus de connexion, statistiques SQL historiques et avis de performance.
- Journaux de production consultés : [Vercel](https://vercel.com/flobutbuts-projects/universaltimeline/logs). Le détail pourra expirer selon la rétention du service ; les motifs et horaires utiles sont retranscrits dans ce rapport.

Limites : audit ponctuel et ciblé, pas une garantie d’absence d’autres défauts. Pas de modification de configuration distante, de schéma, de contenu ou de code applicatif. Les recommandations sont à implémenter et à recetter ; les chiffres de comparaison ne sont pas des gains déjà livrés.
