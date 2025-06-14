import type { Period as GeologicalPeriod } from './geological';
import type { Period as DatabasePeriod } from './database';

// Version unifiée pour le graph
export interface GraphPeriod {
  id: string;
  label: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  parentId?: string | null;
  temporalData?: any[];
  hasChildren?: boolean;
  isMainEon?: boolean;
  categoryIds?: string[];
  categoryLabels?: string[];
  children?: GraphPeriod[];
  loading?: boolean;
  childrenPreloaded?: boolean;
  locations?: string[];
  directLocations?: string[];
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
}

export type LinkType = 'parent' | 'child';

export interface GraphLink {
  source: string;
  target: string;
  type: LinkType;
}

// Types adaptés pour D3 (pas d'extends direct pour éviter les conflits)
export interface D3GraphNode {
  id: string;
  label: string;
  description?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
  isMainEon?: boolean;
  // Ajoutez ici d'autres propriétés utiles pour l'affichage
}

export interface D3GraphLink {
  source: string | D3GraphNode;
  target: string | D3GraphNode;
  type: LinkType;
  index?: number;
} 