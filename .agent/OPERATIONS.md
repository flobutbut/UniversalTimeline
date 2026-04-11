> Généré le : 2026-04-11 — Source : analyse du code source

# Opérations

## Scripts `package.json` (racine)

| Script | Commande observée |
|--------|-------------------|
| `dev` | `vite` |
| `build` | `vue-tsc -b && vite build` |
| `preview` | `vite preview` |
| `test` | `vitest` |
| `test:coverage` | `vitest run --coverage` |
| `test:ui` | `vitest --ui` |
| `server` | `yarn --cwd server dev` |

## Scripts `server/package.json`

| Script | Commande observée |
|--------|-------------------|
| `dev` | `tsx watch src/index.ts` |
| `build` | `tsc` |
| `start` | `node dist/src/index.js` |
| `update-dates` | `NODE_OPTIONS='--loader ts-node/esm' ts-node src/scripts/updateDates.ts` |

## Variables d’environnement référencées dans le code

### Frontend (`import.meta.env`)

| Variable | Fichier / contexte |
|----------|-------------------|
| `import.meta.env.DEV` | `src/services/WikidataQueryService.ts` (choix URL SPARQL) |
| `import.meta.env.VITE_WIKIDATA_SPARQL_URL` | idem (URL personnalisée optionnelle) |

### Serveur (`process.env`)

| Variable | Fichier |
|----------|---------|
| `PORT` | `server/src/index.ts` (défaut `3000`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` | `server/src/api/database.ts` |

### Prisma

| Variable | Fichier |
|----------|---------|
| `DATABASE_URL` | `server/prisma/schema.prisma` |

### Docker Compose

| Variable | Fichier |
|----------|---------|
| `DATABASE_URL` (valeur littérale d’exemple) | `docker-compose.yml` |

**Fichier `.env.example` à la racine :** absent lors du scan (non déterminé s’il existe ailleurs).

## Lancement local (observé README + config)

1. Dépendances : `yarn install` à la racine ; `cd server && yarn install` (selon `README.md`).
2. Terminal API : `yarn server` (équivalent `cd server && yarn dev`) — écoute **`PORT` ou 3000**.
3. Terminal UI : `yarn dev` — Vite ; proxy **`/api`** → `http://localhost:3000`, **`/api/wikidata`** → `https://query.wikidata.org` (`vite.config.ts`).

Sans serveur sur le port proxifié, les appels `/api` échoueront côté navigateur.

## Build / déploiement

- **Frontend :** `yarn build` (typecheck `vue-tsc` + bundle Vite).
- **Serveur :** `yarn build` dans `server/` produit `dist/` ; `yarn start` exécute `node dist/src/index.js`.
- **`server/Dockerfile` :** image Node 20, `npm install`, `npm run build`, `EXPOSE 3000`, `CMD ["npm", "start"]`.

Pipeline CI/CD ou hébergeur cible : **non déterminé** depuis les seuls fichiers listés.
