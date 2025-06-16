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
}

export type LinkType = 'parent' | 'child';

export interface GraphLink {
  source: string;
  target: string;
  type: LinkType;
} 