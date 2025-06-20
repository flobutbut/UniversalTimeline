import { DatabaseQueryService } from './DatabaseQueryService';

export interface ConflictInfo {
  hasConflict: boolean;
  existingItem: any;
  conflictType: 'period' | 'event' | 'story';
  message: string;
}

export interface ResolutionStrategy {
  action: 'keep' | 'replace' | 'merge' | 'cancel';
  message: string;
  requiresConfirmation: boolean;
}

export class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private queryService: DatabaseQueryService;

  private constructor() {
    this.queryService = DatabaseQueryService.getInstance();
  }

  public static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  // Détection de conflit pour une période
  async detectPeriodConflict(qid: string, currentItemId?: string): Promise<ConflictInfo> {
    try {
      const periods = await this.queryService.getAllPeriods();
      const existingPeriod = periods.find(p => p.wikidata_id === qid);

      if (!existingPeriod) {
        return {
          hasConflict: false,
          existingItem: null,
          conflictType: 'period',
          message: ''
        };
      }

      // Si c'est le même élément en cours d'édition, pas de conflit
      if (currentItemId && existingPeriod.id === currentItemId) {
        return {
          hasConflict: false,
          existingItem: existingPeriod,
          conflictType: 'period',
          message: ''
        };
      }

      return {
        hasConflict: true,
        existingItem: existingPeriod,
        conflictType: 'period',
        message: `Une période avec le Q-id ${qid} existe déjà dans la base de données.`
      };
    } catch (error: any) {
      console.error('[ConflictResolutionService] Erreur lors de la détection de conflit pour période:', error);
      throw new Error('Erreur lors de la vérification des conflits');
    }
  }

  // Détection de conflit pour un événement
  async detectEventConflict(qid: string, currentItemId?: string): Promise<ConflictInfo> {
    try {
      let existingEvent = null;
      try {
        existingEvent = await this.queryService.getEventById(qid);
      } catch (e) {
        // L'événement n'existe pas
      }

      if (!existingEvent) {
        return {
          hasConflict: false,
          existingItem: null,
          conflictType: 'event',
          message: ''
        };
      }

      // Si c'est le même élément en cours d'édition, pas de conflit
      if (currentItemId && existingEvent.id === currentItemId) {
        return {
          hasConflict: false,
          existingItem: existingEvent,
          conflictType: 'event',
          message: ''
        };
      }

      return {
        hasConflict: true,
        existingItem: existingEvent,
        conflictType: 'event',
        message: `Un événement avec le Q-id ${qid} existe déjà dans la base de données.`
      };
    } catch (error: any) {
      console.error('[ConflictResolutionService] Erreur lors de la détection de conflit pour événement:', error);
      throw new Error('Erreur lors de la vérification des conflits');
    }
  }

  // Détection de conflit générique
  async detectConflict(qid: string, type: 'period' | 'event' | 'story', currentItemId?: string): Promise<ConflictInfo> {
    switch (type) {
      case 'period':
        return this.detectPeriodConflict(qid, currentItemId);
      case 'event':
        return this.detectEventConflict(qid, currentItemId);
      case 'story':
        // Les stories n'ont pas de Q-id Wikidata
        return {
          hasConflict: false,
          existingItem: null,
          conflictType: 'story',
          message: ''
        };
      default:
        throw new Error('Type de conflit non supporté');
    }
  }

  // Résolution automatique des conflits (comportement actuel)
  async resolveConflictAutomatically(conflictInfo: ConflictInfo): Promise<boolean> {
    if (!conflictInfo.hasConflict) {
      return true;
    }

    try {
      console.log('[ConflictResolutionService] Résolution automatique du conflit:', conflictInfo);

      if (conflictInfo.conflictType === 'period') {
        await this.queryService.deletePeriod(conflictInfo.existingItem.id);
        console.log('[ConflictResolutionService] Période existante supprimée automatiquement');
      } else if (conflictInfo.conflictType === 'event') {
        await this.queryService.deleteEvent(conflictInfo.existingItem.id);
        console.log('[ConflictResolutionService] Événement existant supprimé automatiquement');
      }

      return true;
    } catch (error: any) {
      console.error('[ConflictResolutionService] Erreur lors de la résolution automatique:', error);
      throw new Error('Erreur lors de la résolution du conflit');
    }
  }

  // Résolution avec stratégie personnalisée
  async resolveConflictWithStrategy(conflictInfo: ConflictInfo, strategy: ResolutionStrategy): Promise<boolean> {
    if (!conflictInfo.hasConflict) {
      return true;
    }

    try {
      console.log('[ConflictResolutionService] Résolution avec stratégie:', strategy);

      switch (strategy.action) {
        case 'replace':
          if (conflictInfo.conflictType === 'period') {
            await this.queryService.deletePeriod(conflictInfo.existingItem.id);
          } else if (conflictInfo.conflictType === 'event') {
            await this.queryService.deleteEvent(conflictInfo.existingItem.id);
          }
          break;

        case 'merge':
          // Logique de fusion à implémenter selon les besoins
          console.log('[ConflictResolutionService] Fusion non implémentée');
          break;

        case 'keep':
          // Garder l'élément existant, annuler la création
          console.log('[ConflictResolutionService] Conservation de l\'élément existant');
          break;

        case 'cancel':
          // Annuler l'opération
          console.log('[ConflictResolutionService] Opération annulée');
          return false;

        default:
          throw new Error('Stratégie de résolution non supportée');
      }

      return true;
    } catch (error: any) {
      console.error('[ConflictResolutionService] Erreur lors de la résolution avec stratégie:', error);
      throw new Error('Erreur lors de la résolution du conflit');
    }
  }

  // Génération de stratégies de résolution recommandées
  generateResolutionStrategies(conflictInfo: ConflictInfo): ResolutionStrategy[] {
    if (!conflictInfo.hasConflict) {
      return [];
    }

    const strategies: ResolutionStrategy[] = [];

    if (conflictInfo.conflictType === 'period' || conflictInfo.conflictType === 'event') {
      strategies.push({
        action: 'replace',
        message: 'Remplacer l\'élément existant par le nouveau',
        requiresConfirmation: true
      });

      strategies.push({
        action: 'keep',
        message: 'Conserver l\'élément existant et annuler la création',
        requiresConfirmation: false
      });

      strategies.push({
        action: 'cancel',
        message: 'Annuler l\'opération',
        requiresConfirmation: false
      });
    }

    return strategies;
  }

  // Validation de la cohérence des données avant résolution
  async validateDataConsistency(newData: any, existingData: any, type: 'period' | 'event'): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    try {
      if (type === 'period') {
        // Vérifier la cohérence des dates
        if (newData.startDate && existingData.startDate) {
          const newStart = new Date(newData.startDate);
          const existingStart = new Date(existingData.startDate);
          
          if (Math.abs(newStart.getTime() - existingStart.getTime()) > 24 * 60 * 60 * 1000) { // 1 jour
            warnings.push('Les dates de début diffèrent significativement');
          }
        }

        if (newData.endDate && existingData.endDate) {
          const newEnd = new Date(newData.endDate);
          const existingEnd = new Date(existingData.endDate);
          
          if (Math.abs(newEnd.getTime() - existingEnd.getTime()) > 24 * 60 * 60 * 1000) { // 1 jour
            warnings.push('Les dates de fin diffèrent significativement');
          }
        }

        // Vérifier la cohérence des titres
        if (newData.title?.fr && existingData.label?.fr && newData.title.fr !== existingData.label.fr) {
          warnings.push('Les titres en français diffèrent');
        }

      } else if (type === 'event') {
        // Vérifier la cohérence des dates
        if (newData.date && existingData.date) {
          const newDate = new Date(newData.date);
          const existingDate = new Date(existingData.date);
          
          if (Math.abs(newDate.getTime() - existingDate.getTime()) > 24 * 60 * 60 * 1000) { // 1 jour
            warnings.push('Les dates diffèrent significativement');
          }
        }

        // Vérifier la cohérence des titres
        if (newData.title?.fr && existingData.label?.fr && newData.title.fr !== existingData.label.fr) {
          warnings.push('Les titres en français diffèrent');
        }
      }

      return {
        valid: true,
        warnings
      };
    } catch (error: any) {
      console.error('[ConflictResolutionService] Erreur lors de la validation de cohérence:', error);
      return {
        valid: false,
        warnings: ['Erreur lors de la validation de cohérence']
      };
    }
  }
} 