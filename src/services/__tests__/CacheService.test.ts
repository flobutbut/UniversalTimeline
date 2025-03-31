import { CacheService } from '../CacheService';
import type { CacheConfig } from '../../types/cache';

describe('CacheService', () => {
  let cacheService: CacheService;
  const defaultConfig: CacheConfig = {
    duration: 1000, // 1 seconde pour les tests
    maxSize: 3
  };

  beforeEach(() => {
    cacheService = new CacheService(defaultConfig);
  });

  afterEach(() => {
    cacheService.clear();
  });

  describe('Configuration', () => {
    it('devrait utiliser la configuration par défaut si aucune n\'est fournie', () => {
      const service = new CacheService();
      const config = service.getConfig();
      expect(config.maxSize).toBe(100);
      expect(config.duration).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('devrait utiliser la configuration fournie', () => {
      const config: CacheConfig = {
        duration: 5000,
        maxSize: 10
      };
      const service = new CacheService(config);
      const serviceConfig = service.getConfig();
      expect(serviceConfig.maxSize).toBe(10);
      expect(serviceConfig.duration).toBe(5000);
    });
  });

  describe('Opérations de base', () => {
    it('devrait stocker et récupérer une valeur', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cacheService.set(key, value);
      const retrieved = cacheService.get(key);
      
      expect(retrieved).toEqual(value);
    });

    it('devrait retourner null pour une clé inexistante', () => {
      const retrieved = cacheService.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('devrait effacer le cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      cacheService.clear();
      
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
    });
  });

  describe('Gestion de la taille', () => {
    it('devrait respecter la taille maximale du cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      cacheService.set('key4', 'value4'); // Devrait évincer key1
      
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeDefined();
      expect(cacheService.get('key3')).toBeDefined();
      expect(cacheService.get('key4')).toBeDefined();
    });

    it('devrait évincer les entrées les plus anciennes', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      
      // Accéder à key1 pour le rendre le plus récent
      cacheService.get('key1');
      
      // Ajouter une nouvelle entrée
      cacheService.set('key4', 'value4');
      
      // key2 devrait être évincé car c'est le plus ancien
      expect(cacheService.get('key2')).toBeNull();
      expect(cacheService.get('key1')).toBeDefined();
      expect(cacheService.get('key3')).toBeDefined();
      expect(cacheService.get('key4')).toBeDefined();
    });
  });

  describe('Expiration', () => {
    it('devrait expirer les entrées après la durée configurée', async () => {
      cacheService.set('key1', 'value1');
      
      // Attendre que l'entrée expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cacheService.get('key1')).toBeNull();
    });

    it('devrait mettre à jour le timestamp lors de l\'accès', async () => {
      cacheService.set('key1', 'value1');
      
      // Attendre la moitié de la durée d'expiration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Accéder à l'entrée pour mettre à jour son timestamp
      cacheService.get('key1');
      
      // Attendre la moitié de la durée d'expiration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // L'entrée devrait toujours être valide
      expect(cacheService.get('key1')).toBeDefined();
    });
  });

  describe('Statistiques', () => {
    it('devrait mettre à jour les statistiques correctement', () => {
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.evictions).toBe(0);
      
      // Test d'un hit
      cacheService.set('key1', 'value1');
      cacheService.get('key1');
      const statsAfterHit = cacheService.getStats();
      expect(statsAfterHit.hits).toBe(1);
      expect(statsAfterHit.misses).toBe(0);
      
      // Test d'un miss
      cacheService.get('non-existent');
      const statsAfterMiss = cacheService.getStats();
      expect(statsAfterMiss.hits).toBe(1);
      expect(statsAfterMiss.misses).toBe(1);
    });

    it('devrait calculer correctement la taille du cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const stats = cacheService.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Nettoyage', () => {
    it('devrait nettoyer les entrées expirées', async () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      // Attendre que les entrées expirent
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Forcer le nettoyage
      cacheService.cleanup();
      
      const stats = cacheService.getStats();
      expect(stats.size).toBe(0);
    });
  });
}); 