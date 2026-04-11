# Chronologie univers — Wikidata & base locale

Application web pour explorer une **chronologie des périodes** (dont géologiques), alimentée par **Wikidata** et une **API REST** persistante sur **PostgreSQL** : navigation, graphe type finder, événements, stories et édition des données.

## Fonctionnalités (aperçu)

- Timeline interactive (grille de périodes, navigation hiérarchique)
- Vue graphe / finder (colonnes, relations, drag & drop selon contexte)
- Vue base de données (stories, détail, modales d’édition)
- Liste événements et filtres par période (select mode période)
- Import et recherche **Wikidata** (SPARQL, résolution de conflits)
- Multilingue (français / anglais), thème clair / sombre, design system

## Stack technique

| Couche | Technologies |
|--------|----------------|
| Frontend | Vue 3, TypeScript, Composition API, Pinia, Vue Router, Vite |
| Visualisation | D3 (selon les vues) |
| Backend | Node.js, Express, TypeScript |
| Données | PostgreSQL ; scripts SQL sous `database/` (voir doc base) |
| Tests | Vitest |
| Paquets | Yarn |

Les requêtes frontend vers `/api` sont **proxifiées** par Vite vers `http://localhost:3000` (voir `vite.config.ts`).

## Prérequis

- Node.js compatible avec les versions du dépôt
- Yarn
- PostgreSQL configuré (variable `DATABASE_URL` côté serveur — voir [Documentation base de données](Documentation/Documentation-database.md))

## Installation

```bash
git clone <url-de-votre-depot>.git
cd web-chronologie-univers-2

# Frontend (racine)
yarn install

# API (dossier server)
cd server && yarn install && cd ..
```

## Lancer en développement

Deux processus sont nécessaires pour l’UI + l’API locale :

```bash
# Terminal 1 — API Express (port 3000 par défaut, surchargeable via PORT)
yarn server

# Terminal 2 — Vite (frontend)
yarn dev
```

Équivalent : `cd server && yarn dev`.

Sans API, le proxy Vite vers `/api` échouera tant que rien n’écoute sur le port backend.

Autres scripts utiles (racine) : `yarn build`, `yarn preview`, `yarn test`.

## Structure du dépôt (résumé)

```
src/           # App Vue : components, composables, lib, services, stores, styles, types, utils, views
server/        # Express : routes API, connexion PostgreSQL, Prisma (usage partiel — voir doc)
database/      # Scripts SQL d’init / migrations
config/        # Gabarits pgAdmin (non utilisés par le compose racine — voir doc base)
Documentation/ # Spécifications et état du projet
audits/        # Audits (imports, CSS, doc, etc.)
```

## Design system

Police de base ~13px, espacements sur une grille 8px, tokens dans `src/styles/variables.css`, composants sous `src/components/base/`. Aperçu : route **Design system** dans l’app (`/design-system`).

## Documentation

- [Documentation technique](Documentation/Documentation-technique.md)
- [Documentation fonctionnelle](Documentation/Documentation-fonctionnelle.md)
- [Base de données & serveur](Documentation/Documentation-database.md)
- [Flux de données](Documentation/Documentation-flux-donnees.md)
- [État du projet](Documentation/Documentation-status.md)

## Contribution

Les contributions sont les bienvenues. Ouvrez une issue ou une pull request.

## Licence

MIT
