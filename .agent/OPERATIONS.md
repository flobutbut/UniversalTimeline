> Généré le : 2026-04-11 — Source : analyse du code source

# Opérations

## Scripts `package.json` (racine)

| Script | Commande observée |
|--------|-------------------|
| `dev` | `vite` |
| `dev:all` | `concurrently` — API (`yarn server`) + UI (`yarn dev`) dans **un seul** terminal (recommandé en local) |
| `dev:all:fresh` | `bash scripts/dev-all.sh` — libère les ports **3000** et **5173** puis lance `dev:all` (évite `EADDRINUSE` après un crash) |
| `daemon:up` | `bash scripts/daemon-up.sh` — libère **3000** / **5173**, puis **PM2** démarre `chronologie-api` + `chronologie-ui` (`ecosystem.config.cjs`) ; **survit à la fin d’une tâche agent** |
| `daemon:down` | `pm2 delete chronologie-api chronologie-ui` — arrêt |
| `daemon:restart` | `pm2 restart` les deux apps |
| `daemon:logs` | `pm2 logs` (api + ui) |
| `daemon:status` | `pm2 status` |
| `build` | `vue-tsc -b && vite build` |
| `verify` | Tests isolés bornés, configuration DB hors connexion, symboles inutilisés, builds front/API |
| `verify:clean` | Installation verrouillée dans Docker, même vérification et audits, suites PostgreSQL 17 jetables et restauration de données fictives ; aucun .env du poste |
| `verify:config` | Revue statique de server/.env et .env.local, sans valeur affichée ; --production exige le vrai domaine HTTPS |
| `preview` | `vite preview` |
| `test` | `vitest run` — **une passe** (adapté à l’agent / CI ; ne laisse pas de watch actif) |
| `test:watch` | `vitest` — mode watch interactif (TDD local) |
| `test:coverage` | `vitest run --coverage` |
| `test:ui` | `vitest --ui --api.host 127.0.0.1 --no-open` |
| `server` | `yarn --cwd server dev` |

**Historique :** avant **2026-04-16**, `yarn test` lançait `vitest` en watch par défaut (processus long + surveillance fichiers, concurrent du `yarn dev` / `yarn dev:all`). Désormais **`yarn test` = `vitest run`** ; le watch manuel est **`yarn test:watch`**.

### Suite Vitest

En **2026-04-12**, `yarn vitest run` passe au vert : alias `@` dans `vitest.config.ts`, attentes `DateFormatter` figées avec `vi.setSystemTime`, `DateConversionService` (jour/mois en date moderne + ISO8601), mocks axios par type de requête SPARQL (y compris `loadStory` / appels parallèles), suppression du fichier de test vide `GeologicalPeriodCard.test.ts`, repli `itemLabel` dans `transformToPeriod`. Ces suites temporelles isolées ont depuis été remplacées au lot 24 par server/test/temporal.test.ts ; relancer la suite courante après changements SPARQL ou logique de dates.

En **2026-04-16**, la suite inclut en outre des tests ciblant la navigation timeline : **`src/lib/__tests__/homeStoryPeriodNav.test.ts`**, **`src/composables/__tests__/useHomeNavigation.test.ts`** — à relancer après évolution des snapshots breadcrumb, de **`loadInitialData`** ou de **`expandSingleRoot`**.

## Scripts `server/package.json`

| Script | Commande observée |
|--------|-------------------|
| `dev` | `node --import tsx --watch src/index.ts` (redémarrage via **Node** ; plus stable que `tsx watch`) |
| `dev:tsx-watch` | `tsx watch src/index.ts` (ancien comportement, si besoin) |
| `build` | Nettoyage du dist généré puis `tsc` |
| `start` | `node dist/index.js` |

## Variables d’environnement référencées dans le code

### Frontend (`import.meta.env`)

| Variable | Fichier / contexte |
|----------|-------------------|
| `import.meta.env.DEV` | `src/services/wikidataTransport.ts` (choix URL SPARQL) et `WikidataQueryService.ts` (helper `wdLog`) |
| `import.meta.env.VITE_WIKIDATA_SPARQL_URL` | `src/services/wikidataTransport.ts` (URL personnalisée optionnelle, incluse dans la clé de cache) |

### Serveur (`process.env`)

| Variable | Fichier |
|----------|---------|
| `PORT` | `server/src/index.ts` (défaut `3000`) |
| `DATABASE_URL`, `DB_SSL_CA_PATH` (optionnel) | `server/src/config/database.ts` ; chargement de `server/.env` |

### Docker Compose

| Variable | Fichier |
|----------|---------|
| Variables chargées depuis `server/.env` | `docker-compose.yml` |

**Configuration :** `server/.env.example` fournit le modèle ; `server/.env` est ignoré par Git. Voir `server/SUPABASE.md`.

## Lancement local (observé README + config)

1. Node 22.23.1 et Yarn 1.22.22 ; `yarn install --frozen-lockfile --non-interactive` à la racine puis `yarn --cwd server install --frozen-lockfile --non-interactive`.
2. Terminal API : `yarn server` (équivalent `cd server && yarn dev`) — écoute **`PORT` ou 3000**.
3. Lancement durable depuis le répertoire projet : `yarn daemon:up` (PM2 7.1.1) ; `yarn daemon:status`, `yarn daemon:logs`, `yarn daemon:down`. Le front et l’API écoutent uniquement sur 127.0.0.1, ports 5173 et 3000.
4. Terminal UI : `yarn dev` — Vite ; proxy **`/api`** → `http://127.0.0.1:3000`, **`/api/wikidata`** → `https://query.wikidata.org` (`vite.config.ts`).

Sans serveur sur le port proxifié, les appels `/api` échoueront côté navigateur.

**Note agent :** les tâches shell en arrière-plan (`yarn dev:all` sans PM2) sont souvent **SIGTERM** à la fin de l’action — pour un besoin « lance les serveurs », exécuter **`yarn daemon:up`** (une commande qui se termine, processus gérés par PM2).

## Build / déploiement

- **Frontend :** `yarn build` (typecheck `vue-tsc` + bundle Vite).
- **Serveur :** `yarn build` dans `server/` produit `dist/` ; `yarn start` exécute `node dist/index.js`.
- **`server/Dockerfile` :** Node 22.23.1 Alpine, étapes de compilation et dépendances de production séparées, USER node, contrôle /health, exécution directe de Node. Compose : API seule, localhost:3000, lecture seule, /tmp temporaire, capacités retirées et arrêt de 20 secondes. Lot 27 : image construite et exécutée contre PostgreSQL TLS jetable, certificat non reconnu refusé, arrêt SIGTERM avec code 0 et nettoyage vérifiés. Le démarrage du compose contre Supabase n’a pas été exécuté ; PM2 occupe 3000.

CI dans `.github/workflows/checks.yml` : même entrée node scripts/check-clean.mjs que la passe locale vierge, avec installations verrouillées, audits des deux arbres, types, builds et PostgreSQL 17 jetable pour baseline/restauration/Auth/contraintes. Aucun push ni exécution GitHub effectués.

Les fournisseurs `@vitest/ui` et `@vitest/coverage-v8` sont verrouillés sur la même version que Vitest. `yarn test:coverage` produit `coverage/` ; le lot 5 vérifie ces commandes sans lancer de mutation distante.

Prisma, ts-node et Axios serveur ont été retirés au lot 27 ; la CI installe le verrou API sans génération Prisma. Les archives .txt et leurs checksums sont décrits dans database/archive/README.md. La baseline du lot 28 initialise seulement une cible Supabase vide ; elle comprend déjà l’état final des accès. Les trois migrations conservées sont historiques et ne se rejouent pas après la baseline. Voir database/baseline et Documentation/MISE-EN-SERVICE.md.


## Préparation Auth

Un seul interrupteur : `AUTH_ENABLED` dans `server/.env`, true sur le serveur courant après application confirmée de la migration 20261029090427 ; le garder false sur un environnement qui ne possède pas la migration. URL et clé publiable dans `server/.env` et `.env.local` (VITE_SUPABASE_* côté front). Aucun service_role/secret côté navigateur. Lire `server/AUTHENTICATION.md` avant toute activation ; le compte admin doit être créé et confirmé par l’utilisateur, sans mot de passe saisi par l’agent. La procédure d’attribution ne crée aucun compte et ne déplace pas les stories déjà attribuées.

État après lot 19 : compte administrateur confirmé et 11 stories historiques attribuées, toutes toujours publiques. Les opérations de rôle et de propriété sont séparées dans database/operations ; ne pas relancer une attribution globale sans autorisation explicite.


## Domaine partagé — lot 24

Le frontend et l’API utilisent server/src/shared/temporal.ts ; les builds habituels suffisent, sans étape de génération/copieur ou nouveau paquet. L’alias @temporal est défini dans Vite/Vitest/TypeScript frontend. La suite commune est dans server/test/temporal.test.ts, complétée par les tests de formulaires/frises et de vrais handlers PostgreSQL. Ne pas exécuter de rattrapage de dates sur Supabase : ce lot conserve la base et les bornes importées existantes.
