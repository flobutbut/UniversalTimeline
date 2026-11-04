import type { ApiId, ApiText, ApiTimestamp, CategoryDto, PeriodDto, EventDto, StoryDto } from '@/types/api';
import type { Category, MultilingualText, Period, Event, Story, StorySummary, StorySuggestion } from '@/types/database';
import { resolveYearsBeforePresent } from '@temporal';
import { EVENT_IMPORTANCES } from '@/lib/eventImportance';

export function apiId(value: ApiId): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error('Réponse API invalide : identifiant absent ou mal formé.');
}
function text(value: ApiText | null | undefined, fr?: string | null, en?: string | null): MultilingualText {
  const french = fr ?? value?.fr ?? '';
  return { fr: french, en: en ?? value?.en ?? french };
}
function description(value: { description?: ApiText | null; description_fr?: string | null; description_en?: string | null }): MultilingualText | undefined {
  return value.description || value.description_fr != null || value.description_en != null
    ? text(value.description, value.description_fr, value.description_en) : undefined;
}
function timestamp(value: ApiTimestamp | undefined): Date | undefined {
  if (value == null || value === '') return undefined;
  const date = new Date(value instanceof Date ? value.getTime() : value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function temporal(value: ApiTimestamp | undefined): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  return value?.trim() ?? '';
}
function years(value: number | string | null | undefined, date: string): number | undefined {
  return resolveYearsBeforePresent(date, value) ?? undefined;
}
function categories(rows: CategoryDto[] | null | undefined): Category[] {
  if (rows == null) return [];
  if (!Array.isArray(rows)) throw new Error('Réponse API invalide : catégories mal formées.');
  return rows.map(mapToCategory);
}
export function mapToCategory(row: CategoryDto): Category {
  const details = description(row);
  return {
    id: apiId(row.id), label: text(typeof row.label === 'string' ? { fr: row.label } : row.label, row.label_fr, row.label_en),
    ...(details ? { description: details } : {}),
  };
}
function metadata(row: PeriodDto | EventDto | StoryDto) {
  return {
    id: apiId(row.id), categories: categories(row.categories), description: description(row),
    createdAt: timestamp(row.created_at ?? row.createdAt), updatedAt: timestamp(row.updated_at ?? row.updatedAt),
  };
}

export function mapToPeriod(row: PeriodDto): Period {
  const startDate = temporal(row.start_date ?? row.startDate); const endDate = temporal(row.end_date ?? row.endDate);
  const rawParent = Object.prototype.hasOwnProperty.call(row, 'parent_id') ? row.parent_id : row.parentId;
  const parentId = rawParent != null && rawParent !== '' ? apiId(rawParent) : null;
  return {
    ...metadata(row), wikidata_id: row.wikidata_id ?? '', label: text(row.label, row.label_fr, row.label_en),
    startDate, endDate,
    startYearsBP: years(row.start_years_bp ?? row.startYearsBP, startDate), endYearsBP: years(row.end_years_bp ?? row.endYearsBP, endDate),
    ...(row.story_parent_id !== undefined || row.storyParentId !== undefined ? { storyParentId: (row.story_parent_id !== undefined ? row.story_parent_id : row.storyParentId) == null ? null : apiId((row.story_parent_id !== undefined ? row.story_parent_id : row.storyParentId)!) } : {}),
    parentId, hasParent: !!parentId || (row.has_parent ?? row.hasParent ?? false),
    hasChildren: row.has_children ?? row.hasChildren ?? undefined,
    children: (row.children ?? []).map(apiId), temporalLocation: row.temporal_location ?? row.temporalLocation ?? '',
  };
}
export function mapToEvent(row: EventDto): Event {
  const date = temporal(row.date);
  // Absente hors détail de frise ; une valeur inconnue n'est pas transformée en niveau.
  const importance = EVENT_IMPORTANCES.find(level => level === row.importance);
  return { ...metadata(row), wikidata_id: row.wikidata_id ?? '', label: text(row.label, row.label_fr, row.label_en), date, dateYearsBP: years(row.date_years_bp ?? row.dateYearsBP, date),
    ...(importance ? { importance } : {}) };
}
function parentStoryId(row: StoryDto): string | null {
  return row.parent_story_id == null || row.parent_story_id === '' ? null : apiId(row.parent_story_id);
}
export function mapToListStory(row: StoryDto): StorySummary {
  const startDate = temporal(row.start_date ?? row.startDate); const endDate = temporal(row.end_date ?? row.endDate);
  return {
    ...metadata(row), title: text(row.title, row.title_fr, row.title_en), author: row.author ?? '', isPublic: row.is_public ?? row.isPublic ?? false,
    ownerUserId: row.owner_user_id ?? row.ownerUserId ?? null,
    ...(row.parent_story_id !== undefined ? { parentStoryId: parentStoryId(row) } : {}),
    ...(row.preview_periods ? { previewPeriods: row.preview_periods.map(mapToPeriod) } : {}),
    ...(row.preview_events ? { previewEvents: row.preview_events.map(mapToEvent) } : {}),
    ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}),
  };
}
export function mapToStory(row: StoryDto): Story {
  if (!Array.isArray(row.periods) || !Array.isArray(row.events)) throw new Error('Réponse API invalide : détail de frise incomplet.');
  return {
    ...mapToListStory(row), periods: row.periods.map(mapToPeriod), events: row.events.map(mapToEvent),
    navigationContexts: row.navigationContexts?.map(context => ({ id: apiId(context.id), title: text(context.title),
      periods: context.periods.map(mapToPeriod), presentations: context.presentations.map(view => ({ periodId: view.periodId, storyId: apiId(view.storyId), title: text(view.title) })) })),
    childStories: row.childStories?.map(child => ({ id: apiId(child.id), title: text(child.title, child.title_fr, child.title_en), ...(child.atRoot !== undefined ? {atRoot:child.atRoot} : {}), ...(child.rootDisplayAsPeriod ? {rootDisplayAsPeriod:true} : {}), anchors: (child.anchors ?? []).map(anchor => ({ ...anchor, id: apiId(anchor.id) })) })),
    parentStories: row.parentStories?.map(parent => ({ id: apiId(parent.id), title: text(parent.title, parent.title_fr, parent.title_en), ownerUserId: parent.ownerUserId, isPublic: parent.isPublic, ...(parent.atRoot !== undefined ? {atRoot:parent.atRoot} : {}),
      anchors: parent.anchors.map(anchor => ({ type: anchor.type, id: apiId(anchor.id), label: text(anchor.label) })) })),
    relatedStories: row.relatedStories?.map(story => ({ id: apiId(story.id), title: text(story.title, story.title_fr, story.title_en), periodIds: story.periodIds.map(apiId), eventIds: story.eventIds.map(apiId) })),
  };
}
export function mapToStorySuggestion(row: StoryDto): StorySuggestion {
  const summary = mapToListStory(row);
  return { id: summary.id, title: summary.title, description: summary.description, parentStoryId: parentStoryId(row) };
}
