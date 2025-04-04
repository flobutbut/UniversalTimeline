# Documentation du Serveur

## Architecture

Le serveur est une application Node.js avec Express.js qui fournit une API REST pour accéder aux données géologiques et historiques. Il est écrit en TypeScript et utilise PostgreSQL comme base de données. L'application utilise le système de modules ES (ECMAScript Modules).

### Structure des Dossiers
```
server/
├── src/
│   ├── api/          # Routes et configuration DB
│   │   ├── database.ts    # Configuration PostgreSQL
│   │   └── routes.ts      # Routes de l'API
│   ├── types/        # Types TypeScript
│   │   └── geological.ts  # Types pour les données géologiques
│   └── index.ts      # Point d'entrée de l'application
├── dist/             # Fichiers compilés
├── package.json      # Dépendances et scripts
└── tsconfig.json     # Configuration TypeScript
```

## Configuration

### TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "module": "ESNext",           // Utilisation de ES Modules
    "moduleResolution": "node",   // Résolution des modules style Node.js
    "target": "ES2020",          // Version cible de JavaScript
    "outDir": "dist",            // Dossier de sortie des fichiers compilés
    "esModuleInterop": true,     // Interopérabilité avec les modules ES
    "allowJs": true,             // Permet l'utilisation de fichiers .js
    "resolveJsonModule": true,   // Permet l'import de fichiers JSON
    "strict": true,              // Mode strict TypeScript
    "skipLibCheck": true,        // Skip la vérification des fichiers .d.ts
    "forceConsistentCasingInFileNames": true  // Sensible à la casse
  },
  "include": ["src/**/*"],       // Fichiers à inclure
  "exclude": ["node_modules"]    // Fichiers à exclure
}
```

### Dépendances (package.json)
```json
{
  "type": "module",              // Utilisation de ES Modules
  "dependencies": {
    "axios": "^1.8.4",        // Client HTTP pour Wikidata
    "cors": "^2.8.5",         // Middleware CORS
    "express": "^4.18.2",     // Framework web
    "pg": "^8.11.3"          // Client PostgreSQL
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.24",
    "@types/pg": "^8.11.2",
    "tsx": "^4.7.1",          // Exécuteur TypeScript
    "typescript": "^5.3.3"
  }
}
```

### Base de Données (database.ts)
- Configuration PostgreSQL avec pool de connexions
- Gestion des transactions
- Support multilingue (fr, en)
- Fonctions utilitaires pour les requêtes

### Routes API (routes.ts)
- Endpoints REST pour les périodes, événements, stories et catégories
- Intégration avec Wikidata pour les dates d'événements
- Gestion des erreurs et validation des données
- Support multilingue

## API Endpoints

### Périodes
- `GET /api/periods`
  - Retourne toutes les périodes avec leurs catégories
  - Inclut les informations temporelles et la hiérarchie

### Événements
- `GET /api/events`
  - Retourne tous les événements avec leurs catégories
  - Inclut les dates Wikidata

### Stories
- `GET /api/stories`
  - Retourne toutes les stories avec leurs catégories
  - Inclut les relations avec les périodes et événements

### Catégories
- `GET /api/categories`
  - Retourne toutes les catégories
  - Inclut la hiérarchie des catégories

## Scripts Disponibles

### Développement
```bash
# Installation des dépendances
yarn install

# Démarrage en mode développement avec hot-reload
yarn dev

# Compilation TypeScript
yarn build

# Démarrage en production
yarn start
```

### Base de Données
```bash
# Initialisation de la base de données
docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < database/init-all.sql
```

## Bonnes Pratiques

### Code
- Utilisation de TypeScript strict
- Documentation des fonctions
- Gestion des erreurs
- Validation des données
- Support multilingue

### Base de Données
- Utilisation de transactions
- Indexation optimisée
- Pool de connexions
- Gestion des erreurs
- Contraintes d'intégrité

### API
- Documentation des endpoints
- Validation des entrées
- Gestion des erreurs HTTP
- Support multilingue
- Performance et optimisation

## Sécurité

### Base de Données
- Utilisateur dédié pour l'application
- Permissions minimales requises
- Protection contre les injections SQL
- Validation des données

### API
- Validation des entrées
- Gestion des erreurs
- Rate limiting
- CORS configuré

## Monitoring

### Logs
- Logs des requêtes API
- Logs des erreurs
- Logs de performance
- Logs de connexion DB

### Métriques
- Temps de réponse
- Utilisation mémoire
- Charge CPU
- Connexions DB

## État du Projet

### Fonctionnalités Implémentées
- [x] Configuration TypeScript
- [x] Base de données PostgreSQL
- [x] Routes API de base
- [x] Intégration Wikidata
- [x] Support multilingue
- [x] Gestion des erreurs

### Problèmes Connus
- Optimisation des requêtes Wikidata
- Cache des dates d'événements
- Performance des requêtes complexes

### Prochaines Étapes
- Implémentation du cache
- Optimisation des performances
- Tests d'intégration
- Documentation API
- Monitoring
- Sécurité renforcée 