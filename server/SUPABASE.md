# API Express et PostgreSQL Supabase

Le front appelle toujours `/api` via Vite. Express utilise le PostgreSQL du projet Supabase existant. Les routes valident les entrées et renvoient les réponses ; les services coordonnent les règles et transactions ; les repositories contiennent le SQL avec un client explicite. La configuration locale retrouvée dans l’ancien projet utilise une connexion directe, qui fonctionne sur cette machine ; le pooler de session reste une alternative pour les réseaux IPv4. Il ne faut ni réimporter les anciens dumps ni recréer les tables.

Projet vérifié : Universal-Timeline (`ftubzndxivponqoihrsu`). Les cinq requêtes de lecture principales du code ont été exécutées sur cette base le 28 octobre 2026 : périodes racines, événements, stories, bornes des stories et catégories.

## Configuration locale

1. Copier `.env.example` dans `.env` dans ce dossier si `.env` n'existe pas.
2. Supabase Dashboard → Universal-Timeline → Connect → Session pooler : copier l'URL réelle dans `DATABASE_URL`. Remplacer le mot de passe et encoder ses caractères réservés. Ne pas inventer le nom d'hôte du pooler.
3. Retirer les paramètres SSL éventuels de l'URL. La configuration du serveur impose TLS avec vérification du certificat. Le certificat racine public Supabase est fourni dans `certs/prod-ca-2021.crt`. Pour un certificat propre au projet, renseigner son chemin avec `DB_SSL_CA_PATH`.
4. Depuis la racine : `yarn --cwd server install`, puis `yarn server`. Dans un autre terminal : `yarn dev --host 127.0.0.1 --port 5173 --strictPort`.
5. Vérifier `http://127.0.0.1:3000/health`, puis `http://127.0.0.1:5173/api/periods`.

`/health` renvoie 200 seulement si une requête SQL réussit, sinon 503. Le serveur refuse de démarrer si sa connexion initiale échoue ou si les identifiants manquent. Aucun accès SQL n'est ouvert au navigateur. Le serveur écoute uniquement sur l'interface locale par défaut ; Docker publie également uniquement sur localhost.

Les variables `DB_HOST`, `DB_USER`, etc. ne sont plus utilisées. Les identifiants restent dans `.env`, ignoré par Git. Ne jamais placer `DATABASE_URL` ni une clé privilégiée dans une variable `VITE_*`.

## Vérification de la configuration

Avec Node 22.23 ou ultérieur, depuis ce dossier :

```sh
node --experimental-strip-types --test test/database.test.mjs
```

Ces tests ne contactent pas la base et n'effectuent aucune écriture.

## Docker

Le compose racine lance uniquement l'API, avec `server/.env`. Aucun PostgreSQL local et aucun script d'initialisation historique ne sont exécutés. Si un certificat CA personnalisé est utilisé dans Docker, il faut le monter en lecture seule et adapter `DB_SSL_CA_PATH` au chemin dans le conteneur.

L’image sépare compilation et dépendances de production ; elle exécute directement Node avec USER node et un contrôle /health. Compose ajoute lecture seule, /tmp temporaire, capacités retirées et délai d’arrêt de 20 secondes. Choisir l’API PM2 ou Docker pour le port 3000 ; ne pas lancer les deux simultanément. Docker reste optionnel pour le développement.

Lot 27 : construction réelle et démarrage avec PostgreSQL TLS jetable validés, sans réutiliser server/.env. Vérifiés : /health connecté, refus d’une CA non reconnue, UID 1000, absence de Prisma/TypeScript/tsx et des sources/secrets dans le runtime, écriture /app refusée, arrêt SIGTERM code 0. Cette recette ne valide pas un déploiement Compose contre Supabase.

Les anciens scripts et dumps sont hors exécution dans [database/archive](../database/archive/README.md). Les migrations conservées sont historiques ; une nouvelle cible vide utilise [la baseline validée](../database/baseline/README.md). Le projet existant ne doit recevoir ni baseline ni replay.

[Documentation de connexion Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) ; [images à plusieurs étapes Docker](https://docs.docker.com/build/building/multi-stage/).


## Accès utilisateurs

La connexion PostgreSQL ne constitue pas une authentification des utilisateurs. Les parcours Supabase Auth et les règles de propriété préparés dans les lots 17–18 sont décrits dans [AUTHENTICATION.md](AUTHENTICATION.md). La migration story_access est appliquée et le serveur courant utilise AUTH_ENABLED=true ; le premier compte est confirmé/admin et les stories historiques lui sont attribuées. La procédure reste la référence pour un autre environnement ; traiter les points Supabase encore ouverts avant exposition réseau.


## Préparation de livraison — lot 28

`yarn verify:config` depuis la racine contrôle les fichiers locaux sans valeur affichée ni requête réseau. L’API refuse désormais NODE_ENV=production si AUTH_ENABLED n’est pas explicitement true ; en développement local, le mode historique reste disponible. La CI et `yarn verify:clean` utilisent le même environnement vierge, sans .env du poste et avec bases PostgreSQL 17 jetables. Voir [MISE-EN-SERVICE.md](../Documentation/MISE-EN-SERVICE.md) pour les URL Auth, le domaine réel, le proxy et les limites de restauration. Aucune configuration de livraison distante n’est appliquée automatiquement.
