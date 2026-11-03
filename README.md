# Chronologie univers — Wikidata & base locale

Application web pour explorer une **chronologie des périodes** (dont géologiques), alimentée par **Wikidata** et une **API REST** persistante sur **PostgreSQL** : navigation, graphe type finder, événements, stories et édition des données.

## Fonctionnalités (aperçu)

- Timeline interactive (grille de périodes, navigation hiérarchique)
- Vue graphe / finder (colonnes, relations, drag & drop selon contexte)
- Vue base de données (stories, détail, modales d’édition)
- Liste événements et filtres par période et catégorie
- Import et recherche **Wikidata** (SPARQL, résolution de conflits)
- Multilingue (français / anglais), thème clair / sombre, design system

## Stack technique

| Couche | Technologies |
|--------|----------------|
| Frontend | Vue 3, TypeScript, Composition API, Pinia, Vue Router, Vite |
| Visualisation | Composants Vue et grilles CSS |
| Backend | Node.js, Express, TypeScript |
| Données | PostgreSQL ; scripts SQL sous `database/` (voir doc base) |
| Tests | Vitest |
| Paquets | Yarn |

Les requêtes frontend vers `/api` sont **proxifiées** par Vite vers `http://127.0.0.1:3000` (voir `vite.config.ts`).

## Répertoire de travail

La version consolidée du 29 octobre 2026 se trouve dans `/Users/florianbutour/Desktop/Developpement/web-chronologie-univers-2`. Elle réunit les évolutions Desktop et les huit lots d’audit précédemment travaillés dans Documents/Codex. Ce dossier est désormais la référence pour le code, les tests et les serveurs. Le suivi est dans `SUIVI-AUDIT.md`.

## Prérequis

- Node.js 22.23.1 (version de référence dans `.nvmrc`, la CI et Docker ; minimum déclaré dans les manifestes)
- Yarn Classic 1.22.22
- Projet Supabase existant et chaîne PostgreSQL dans `server/.env` (`DATABASE_URL`). Voir [Connexion Supabase](server/SUPABASE.md).

## Installation

```bash
git clone https://github.com/flobutbut/UniversalTimeline.git
cd UniversalTimeline

# Frontend (racine)
yarn install --frozen-lockfile --non-interactive

# API (dossier server)
yarn --cwd server install --frozen-lockfile --non-interactive
```

La procédure complète distingue [projet Supabase existant, nouvelle base et préparation de livraison](Documentation/MISE-EN-SERVICE.md). Conserver les fichiers de connexion présents. La [baseline](database/baseline/README.md) est réservée à une cible vide et refuse une installation existante ; ne pas rejouer les migrations historiques pour démarrer ce projet.

## Lancer en développement

L’UI et l’API locale doivent tourner en parallèle.

**Recommandé — lancer une fois et ne plus s’en occuper (PM2)**
Les processus restent sous le démon PM2 (`~/.pm2`) : tu peux demander à l’agent d’exécuter `yarn daemon:up` ; la commande se termine tout de suite, les serveurs continuent. Arrêt : `yarn daemon:down` ; logs : `yarn daemon:logs` ; état : `yarn daemon:status`.

```bash
yarn daemon:up
```

*(Première utilisation : `yarn install` si `pm2` n’est pas encore présent.)*

**Mode interactif — un terminal** (logs colorés API + UI ; à garder ouvert) :

```bash
yarn dev:all
```

Si les ports **3000** / **5173** sont encore occupés :

```bash
yarn dev:all:fresh
```

**Alternative — deux terminaux :**

```bash
# Terminal 1 — API Express (port 3000 par défaut, surchargeable via PORT)
yarn server

# Terminal 2 — Vite (frontend)
yarn dev
```

Équivalent API : `cd server && yarn dev`.

Sans API, le proxy Vite vers `/api` échouera tant que rien n’écoute sur le port backend.

Autres scripts utiles (racine) : `yarn build`, `yarn preview`, `yarn test` (une passe de tests), `yarn test:watch` (Vitest en mode watch pour le TDD).

Vérifications courantes : `yarn verify` pour tests, types et builds ; `yarn verify:config` pour les fichiers de connexion, sans afficher leurs valeurs. `yarn verify:clean` rejoue installation verrouillée, tests, audits, builds, baseline et restauration fictive sur PostgreSQL 17 dans Docker, sans fichier .env du poste. Les audits seuls restent `yarn audit` et `yarn --cwd server audit`. `yarn test:ui` ouvre le serveur de tests sur la boucle locale ; son URL est affichée dans le terminal. Les audits couvrent aussi les dépendances de développement et sont prévus dans la CI.

Les dépendances HTTP/PostgreSQL se trouvent dans `server/`. Prisma, ts-node et Axios côté serveur ont été retirés au lot 27. Le schéma Prisma, son updater et les anciens scripts SQL/Docker sont conservés comme textes hors exécution dans [les archives](database/archive/README.md), avec manifeste d’intégrité. Ils ne sont pas compatibles avec la base actuelle et ne constituent pas une chaîne de migrations. L’API HTTP utilise `pg` : routes/validation dans `server/src/api`, métier/transactions dans `server/src/services`, SQL dans `server/src/repositories` et règles pures dans `server/src/domain`. Les formats de réponse et les droits Supabase sont conservés. Les dates sont interprétées par le module pur partagé `server/src/shared/temporal.ts` (alias frontend `@temporal`) ; `DateService` assure seulement l’affichage. Formats, convention BP et limites de provenance sont décrits dans [le guide des dates](src/services/README-DateConversion.md).

Les lectures publiques Wikidata passent par `src/services/wikidataTransport.ts`. Le cache reste en mémoire dans le navigateur : recherches pendant une minute, autres réponses pendant cinq minutes, sans données de compte. Les demandes identiques partagent leur transport ; erreurs et annulations ne sont pas conservées. Chaque lecture et ses reprises sont bornées (15 secondes MediaWiki, 30 secondes SPARQL). Le formulaire conserve les données principales lorsqu’un complément échoue et propose une reprise explicite, sans sauvegarde automatique.

L’organisation des périodes et événements est désormais définie uniquement dans les frises ; le catalogue rassemble les fiches communes sans arbre global. Voir [Relations au sein des frises](Documentation/RELATIONS-FRISES.md).

## Structure du dépôt (résumé)

```
src/           # App Vue : components, composables, lib, services, stores, styles, types, utils, views
server/        # Express, pg, connexion Supabase et image API de production
database/      # Migrations appliquées, opérations explicites et archives hors exécution
Documentation/ # Spécifications et état du projet
audits/        # Audits (imports, CSS, doc, etc.)
```

## Docker optionnel

Docker peut empaqueter l’API ; Supabase reste la base distante. Le développement courant avec PM2 ne requiert pas Docker. Le compose ne lance ni PostgreSQL ni pgAdmin. Image à plusieurs étapes : compilation séparée, dépendances de production seulement, utilisateur node, contrôle de santé et arrêt direct de Node. Compose publie uniquement 127.0.0.1:3000 et monte un système de fichiers en lecture seule.

L’image de production exige AUTH_ENABLED=true ; le mode historique sans compte reste limité au développement local. Pour choisir ce mode, arrêter d’abord l’API PM2 qui utilise le même port, puis lancer `docker compose up --build -d`. Garder Vite pour le frontend et `server/.env` pour la connexion existante ; monter toute CA personnalisée en lecture seule. Ne pas lancer les deux API en parallèle sur 3000. Voir [connexion Supabase](server/SUPABASE.md) et [état des migrations](database/README.md).

## Navigation

Les pages sont chargées à la demande par Vue Router. Les URL existantes sont conservées : `/timeline`, `/database` (Stories), `/periods` (Periods, alias `/graph`), `/events`, `/design-system`. `/` présente la landing page publique (exploration proportionnelle depuis le Big Bang, cinq échelles jusqu’aux inventions, sources des repères, présentation de Wikidata, frises publiques/privées et FAQ). Les boutons d’exploration ouvrent `/timeline` ; la création de frise ouvre l’inscription avec retour vers `/database`, ou cet espace directement si le compte est connecté. Un second concept se teste sur `/voyage` : une animation au scroll passe des durées cosmiques à une seconde, avec des liens vers les frises publiques associées et une lecture sans animation. Le premier concept reste à `/`. Un lien inconnu affiche une page avec retour à la timeline.

La recherche globale renvoie des frises via leur titre, leur description et les périodes/événements associés, ainsi que des sujets Wikidata dans une section indépendante. Une frise ouvre `/timeline?story=<id>` ; un sujet ouvre l’aperçu public `/generate?wikidata=<Q-id>`. Les visiteurs ne voient que les frises publiques ; les sessions connectées peuvent également retrouver leurs propres frises privées. La génération propose les éléments directement liés au sujet, avec dates, sources, sélection et corrections avant une sauvegarde explicite en privé. Les fiches du catalogue sont réutilisées sans modification ; la frise, les nouvelles fiches et leurs associations sont enregistrées dans une seule transaction. Voir [Génération Wikidata](Documentation/GENERATION-WIKIDATA.md). Les outils de recherche/import des formulaires restent disponibles dans les vues de gestion protégées.

La position de la timeline est portée par l’URL : `story` désigne la frise, `period` la période et `context` le parcours explicite éventuel ; `view=overview` ouvre sa vue d’ensemble. Les clics, déplacements précédent/suivant et retours aux parents alimentent l’historique du navigateur et se restaurent au rechargement. Le lien Timeline de l’en-tête reprend la dernière position consultée pendant la session. Deux fils d’Ariane séparent le chemin entre frises et la hiérarchie des périodes de la frise courante. Rouvrir une frise déjà visitée raccourcit le chemin jusqu’à elle. Le premier fil et les associations retrouvent sa dernière position ; une URL explicitement demandée conserve sa propre position. L’ouverture depuis Frises (`entry=universe`) remplace le chemin précédent par le plus court chemin navigable depuis l’Univers, s’il est trouvé ; sinon elle conserve uniquement la destination. Les points d’entrée et les associations par périodes ou événements fournissent ces passages ; un parent éditorial seul ne suffit pas. Les badges prolongent ensuite ce nouveau chemin. Un lien direct ordinaire conserve son comportement d’entrée propre. Précédent/suivant fait glisser la vue entière des périodes et des événements dans le sens du temps, après chargement de la destination ; le mouvement est supprimé si le navigateur demande une réduction des animations. Le clic descend uniquement dans les périodes avec enfants. Les périodes sans enfants se parcourent avec précédent/suivant, ou servent de point de départ pour choisir une frise associée. Les directions indisponibles sont masquées. Une frise associée conserve la période source si elle y possède des enfants ; sinon elle s’ouvre en vue d’ensemble. Les autres pages sont démontées à leur sortie. Pour un hébergement de production utilisant l’historique HTML5, prévoir un repli vers `index.html` pour les URL front directes.

## Design system

Police de base ~13px, espacements sur une grille 8px, tokens dans `src/styles/variables.css`, composants sous `src/components/base/`. Aperçu : route **Design system** dans l’app (`/design-system`).

## Documentation

- [Documentation technique](Documentation/Documentation-technique.md)
- [Documentation fonctionnelle](Documentation/Documentation-fonctionnelle.md)
- [Base de données & serveur](Documentation/Documentation-database.md)
- [Flux de données](Documentation/Documentation-flux-donnees.md)
- [État du projet](Documentation/Documentation-status.md)
- [Serveur MCP — cadrage](Documentation/MCP.md)
- [Rôles, contenus personnels et partage — cadrage](Documentation/ROLES-ET-PARTAGE.md)

## Contribution

Les contributions sont les bienvenues. Ouvrez une issue ou une pull request.

## Licence

MIT


### Authentification en préparation

Les lots 17–19 ajoutent les parcours Supabase Auth et l’isolation des stories. La migration a été appliquée et la connexion est activée sur le serveur local ; le compte administrateur est confirmé et les 11 stories historiques lui sont rattachées en conservant leur visibilité publique. Voir [la procédure et l’état réel](server/AUTHENTICATION.md). Ne pas exposer l’API sur le réseau en mode historique.
