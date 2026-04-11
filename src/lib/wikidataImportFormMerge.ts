/** Brouillon de formulaire modifiable par un import Wikidata (EditModal). */
export interface WikidataImportFormDraft {
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  startDate: string;
  endDate: string;
  date: string;
  location: string;
  categories: string[];
}

export interface WikidataImportPayload {
  title?: { fr?: string; en?: string };
  description?: { fr?: string; en?: string };
  startDate?: string;
  endDate?: string;
  date?: string;
  location?: string;
  childrenCount?: number;
  suggestedCategoryIds?: string[];
}

export function mergeSuggestedCategoriesFromWikidata(
  current: readonly string[],
  suggested: readonly string[] | undefined,
  availableIds: ReadonlySet<string>
): string[] | null {
  if (!suggested?.length) return null;
  const matched = suggested.filter((id) => availableIds.has(id));
  if (matched.length === 0) return null;
  return [...new Set([...current, ...matched])];
}

/** Applique les champs reconnus d’un import Wikidata au brouillon (mutation). */
export function applyWikidataImportPayloadToFormDraft(
  form: WikidataImportFormDraft,
  data: WikidataImportPayload,
  ctx: {
    availableCategoryIds: ReadonlySet<string>;
    onChildrenCount?: (count: number) => void;
  }
): void {
  if (data.title) {
    form.title.fr = data.title.fr || '';
    form.title.en = data.title.en || '';
  }
  if (data.description) {
    form.description.fr = data.description.fr || '';
    form.description.en = data.description.en || '';
  }
  if (data.startDate) form.startDate = data.startDate;
  if (data.endDate) form.endDate = data.endDate;
  if (data.date) form.date = data.date;
  if (data.location) form.location = data.location;
  if (data.childrenCount && ctx.onChildrenCount) {
    ctx.onChildrenCount(data.childrenCount);
  }
  const merged = mergeSuggestedCategoriesFromWikidata(
    form.categories,
    data.suggestedCategoryIds,
    ctx.availableCategoryIds
  );
  if (merged) form.categories = merged;
}
