# État de l'art - Projet Timeline Géologique

## Objectifs du projet

1. Créer une interface utilisateur interactive pour explorer les périodes géologiques
2. Implémenter un chargement progressif des données pour optimiser les performances
3. Gérer efficacement le cache pour réduire les appels à l'API Wikidata
4. Assurer une expérience utilisateur fluide avec des transitions naturelles

## État actuel

### Architecture actuelle
- Service principal `WikidataTimelineService` qui gère :
  - Les requêtes SPARQL vers Wikidata
  - La transformation des données
  - La gestion du cache
  - La gestion des erreurs et des retries

### Fonctionnalités implémentées
1. Chargement initial des éons principaux
2. Chargement des enfants d'une période
3. Système de cache basique
4. Gestion des erreurs et retries
5. Support multilingue

### Problèmes rencontrés

1. **Gestion du cache**
   - Problèmes de typage avec la structure du cache
   - Difficulté à maintenir la cohérence des types entre les différentes méthodes
   - Risque de fuites mémoire avec le cache actuel

2. **Performance**
   - Chargement initial peut être lent avec beaucoup de données
   - Pas de gestion optimisée des requêtes parallèles
   - Absence de stratégie de préchargement

3. **Maintenance**
   - Code complexe à maintenir avec toutes les responsabilités dans un seul service
   - Difficulté à tester les différentes parties du système
   - Manque de séparation des préoccupations

## Solutions envisagées

### 1. Séparation du cache dans un service dédié

```typescript
// Nouveau service CacheService
interface CacheConfig {
  duration: number;
  maxSize: number;
}

class CacheService {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  clear(): void;
  // Méthodes de gestion de la mémoire
  // Méthodes de monitoring
}
```

### 2. Architecture en couches

1. **Service de données (DataService)**
   - Gestion des requêtes SPARQL
   - Transformation des données
   - Gestion des erreurs

2. **Service de cache (CacheService)**
   - Gestion du stockage
   - Stratégies d'éviction
   - Monitoring

3. **Service de chargement progressif (ProgressiveLoadingService)**
   - Gestion des priorités de chargement
   - Préchargement intelligent
   - Gestion des états de chargement

### 3. Améliorations techniques

1. **Typage plus strict**
   ```typescript
   type CacheKey = 'period' | 'children' | 'details';
   interface CacheEntry<T> {
     value: T;
     timestamp: number;
     metadata?: {
       size: number;
       lastAccessed: number;
     };
   }
   ```

2. **Gestion de la mémoire**
   - Implémentation d'une stratégie LRU (Least Recently Used)
   - Limitation de la taille du cache
   - Nettoyage automatique

3. **Monitoring et debugging**
   - Métriques de performance
   - Logs détaillés
   - Outils de diagnostic

## Prochaines étapes

1. Création du `CacheService`
2. Refactoring du `WikidataTimelineService`
3. Implémentation du `ProgressiveLoadingService`
4. Tests et validation
5. Documentation technique

## Notes importantes

- Maintenir la compatibilité avec le code existant pendant la transition
- Assurer une dégradation gracieuse en cas d'erreur
- Préserver les fonctionnalités existantes
- Documenter les changements pour faciliter la maintenance 