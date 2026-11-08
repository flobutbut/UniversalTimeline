import type { TagRef } from '@/types/database';

export const MAX_TAGS = 3;

/** Familles d'affichage : on ne les attache jamais à une fiche. */
export const TAG_FAMILIES = [
  { id: 'monde-vivant', label: 'Monde & vivant' },
  { id: 'societes', label: 'Sociétés' },
  { id: 'productions', label: 'Productions' },
] as const;

export interface Tagged { tags?: TagRef[] }
export interface TagFilterOption { value: string; label: string; group?: string }

const familyLabel = (family: string) => TAG_FAMILIES.find(item => item.id === family)?.label ?? family;
export const tagLabel = (tag: Pick<TagRef, 'id' | 'label'>) => tag.label.fr || tag.label.en || tag.id;

/** Le tag principal, qui donne la couleur, est le premier de la liste. */
export const primaryTag = (item: Tagged): TagRef | null => item.tags?.[0] ?? null;

/** OU à l'intérieur des tags ; filtrer sur un domaine inclut ses sous-domaines. */
export function matchesTags(item: Tagged, selected: readonly string[]): boolean {
  if (!selected.length) return true;
  return item.tags?.some(tag => selected.includes(tag.id) || (tag.parentId !== null && selected.includes(tag.parentId))) ?? false;
}

/** Seuls les domaines portés par au moins une fiche sont proposés, groupés par famille. */
export function tagFilterOptions(items: readonly Tagged[]): TagFilterOption[] {
  const tags = new Map(items.flatMap(item => item.tags ?? []).filter(tag => tag.parentId === null).map(tag => [tag.id, tag]));
  return [...tags.values()].sort((a, b) => a.position - b.position)
    .map(tag => ({ value: tag.id, label: tagLabel(tag), group: familyLabel(tag.family) }));
}

export function groupTagsByFamily<T extends { family: string }>(tags: readonly T[]) {
  return TAG_FAMILIES.map(family => ({ ...family, tags: tags.filter(tag => tag.family === family.id) })).filter(family => family.tags.length);
}

export const tagsSortKey = (item: Tagged) => (item.tags ?? []).map(tagLabel).join('\u0001');

/** Ajoute des suggestions après la saisie, sans dépasser la limite ni remplacer le tag principal choisi. */
export function mergeSuggestedTags(current: readonly string[], suggested: readonly string[] | undefined, available: ReadonlySet<string>): string[] | null {
  const matched = suggested?.filter(id => available.has(id)) ?? [];
  if (!matched.length) return null;
  return [...new Set([...current, ...matched])].slice(0, MAX_TAGS);
}
