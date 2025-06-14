import { ref } from 'vue';
import type { GraphPeriod, GraphLink } from '../types/graph';

export class GraphDataService {
  private static instance: GraphDataService;
  private periods = ref<GraphPeriod[]>([]);
  private links = ref<GraphLink[]>([]);

  private constructor() {}

  public static getInstance(): GraphDataService {
    if (!GraphDataService.instance) {
      GraphDataService.instance = new GraphDataService();
    }
    return GraphDataService.instance;
  }

  public getPeriods(): GraphPeriod[] {
    return this.periods.value;
  }

  public getLinks(): GraphLink[] {
    return this.links.value;
  }

  public addPeriod(period: GraphPeriod): void {
    // Vérifier si la période existe déjà
    const existingPeriod = this.periods.value.find(p => p.id === period.id);
    if (!existingPeriod) {
      this.periods.value.push({
        ...period,
        x: undefined,
        y: undefined,
        fx: undefined,
        fy: undefined,
        vx: undefined,
        vy: undefined
      });
    }
  }

  public removePeriod(periodId: string): void {
    this.periods.value = this.periods.value.filter(p => p.id !== periodId);
    // Supprimer également les liens associés
    this.links.value = this.links.value.filter(
      link => link.source !== periodId && link.target !== periodId
    );
  }

  public addLink(sourceId: string, targetId: string, type: string = 'parent'): void {
    // Vérifier si le lien existe déjà
    const existingLink = this.links.value.find(
      link => link.source === sourceId && link.target === targetId
    );
    if (!existingLink) {
      this.links.value.push({
        source: sourceId,
        target: targetId,
        type
      });
    }
  }

  public removeLink(sourceId: string, targetId: string): void {
    this.links.value = this.links.value.filter(
      link => !(link.source === sourceId && link.target === targetId)
    );
  }

  public clear(): void {
    this.periods.value = [];
    this.links.value = [];
  }
} 