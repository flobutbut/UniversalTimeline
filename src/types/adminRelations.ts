import type { EventImportance } from './database';

export type RelationEntityKind = 'period' | 'event';
export type RelationLinkKind = 'entry' | 'presentation' | 'legacy';
export interface RelationStory { id: string; title: string; isPublic: boolean; periods: number; events: number }
export interface RelationAnchor { kind: RelationEntityKind; id: string; title: string }
export interface RelationLink { id: string; type: RelationLinkKind; source: string; target: string; anchor: RelationAnchor | null }
export interface RelationsOverview { generatedAt: string; stories: RelationStory[]; links: RelationLink[] }
export interface RelationMembership { storyId: string; kind: RelationEntityKind; entityId: string; parentId: string | null; importance: EventImportance | null }
export interface RelationsNetwork extends RelationsOverview {
  periods: Array<{id:string;title:string}>;
  events: Array<{id:string;title:string}>;
  memberships: RelationMembership[];
}
export interface RelationPeriod { id: string; title: string; startDate: string; endDate: string; wikidataId: string | null; parentId: string | null; uses: number }
export interface RelationEvent { id: string; title: string; date: string; wikidataId: string | null; importance: EventImportance; uses: number }
export interface RelationsContent { storyId: string; periods: RelationPeriod[]; events: RelationEvent[] }
export interface RelationUsage { id: string; title: string; isPublic: boolean; parentId?: string | null; parentTitle?: string | null; importance?: EventImportance }
export interface RelationEntity { kind: RelationEntityKind; id: string; title: string; startDate: string; endDate: string | null; wikidataId: string | null; stories: RelationUsage[] }
export interface RelationCatalogue { total: number; items: Array<{ id: string; title: string; uses: number }> }
export const relationLinkLabels: Record<RelationLinkKind, string> = {
  entry: 'Point d’entrée', presentation: 'Vue détaillée', legacy: 'Rattachement historique',
};
