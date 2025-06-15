import { ref } from 'vue';
import type { GraphPeriod, GraphLink } from '../types/graph';
import type { Period } from '../types/database';
import { DatabaseQueryService } from './DatabaseQueryService';

export class GraphViewService {
  private static instance: GraphViewService;
  private periods = ref<GraphPeriod[]>([]);
  private links = ref<GraphLink[]>([]);
  private databaseQueryService = DatabaseQueryService.getInstance();

  private constructor() {}

  public static getInstance(): GraphViewService {
    if (!GraphViewService.instance) {
      GraphViewService.instance = new GraphViewService();
    }
    return GraphViewService.instance;
  }

  public getPeriods() {
    return this.periods.value;
  }

  public getLinks() {
    return this.links.value;
  }

  private convertToGraphPeriod(period: Period): GraphPeriod {
    return {
      id: period.id,
      label: period.label.fr,
      description: period.description?.fr,
      startDate: period.startDate,
      endDate: period.endDate,
      parentId: period.parentId,
      temporalData: [],
      hasChildren: false,
      isMainEon: false,
      categoryIds: period.categories.map(c => c.id),
      categoryLabels: period.categories.map(c => c.label.fr),
      children: [],
      loading: false,
      childrenPreloaded: true,
      locations: [],
      directLocations: [],
      x: undefined,
      y: undefined,
      fx: undefined,
      fy: undefined,
      vx: undefined,
      vy: undefined
    };
  }

  public async addPeriodToGraph(periodId: string): Promise<void> {
    try {
      // Vérifier si la période existe déjà dans le graph
      if (this.periods.value.some(p => p.id === periodId)) {
        console.log(`[GraphViewService] La période ${periodId} est déjà dans le graph`);
        return;
      }

      // Charger les détails de la période via DatabaseQueryService
      const period = await this.databaseQueryService.loadPeriod(periodId);
      
      // Convertir la période en format GraphPeriod
      const graphPeriod = this.convertToGraphPeriod(period);

      // Ajouter la période au graph
      this.periods.value.push(graphPeriod);

      // Si la période a des enfants, créer des liens
      if (period.children && period.children.length > 0) {
        period.children.forEach(childId => {
          const link: GraphLink = {
            source: period.id,
            target: childId,
            type: 'parent'
          };
          this.links.value.push(link);
        });
      }
    } catch (error) {
      console.error('[GraphViewService] Erreur lors de l\'ajout de la période au graph:', error);
      throw error;
    }
  }

  public removePeriodFromGraph(periodId: string): void {
    // Supprimer la période
    this.periods.value = this.periods.value.filter(p => p.id !== periodId);
    
    // Supprimer tous les liens associés
    this.links.value = this.links.value.filter(
      link => link.source !== periodId && link.target !== periodId
    );
  }

  public clearGraph(): void {
    this.periods.value = [];
    this.links.value = [];
  }
} 