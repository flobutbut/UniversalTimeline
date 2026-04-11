import { DateService } from '@/services/DateService';
import type { ListPeriod } from '@/types/database';

export function sortListPeriodsByLabel(list: ListPeriod[]): ListPeriod[] {
  return [...list].sort((a, b) => a.label.fr.localeCompare(b.label.fr, 'fr'));
}

export function formatSelectListPeriodDateBound(raw: string): string {
  if (!raw) return '—';
  return DateService.formatBound(DateService.parse(raw));
}

export function formatSelectListPeriodLine(p: ListPeriod): string {
  const start = formatSelectListPeriodDateBound(p.startDate ?? '');
  const end = formatSelectListPeriodDateBound(p.endDate ?? '');
  return `${p.label.fr} (de ${start} à ${end})`;
}

/** Chaîne d’ids racine → feuille pour une période sélectionnée. */
export function buildPeriodAncestorPathFromLeaf(
  id: string,
  periodById: (id: string) => ListPeriod | null | undefined
): string[] {
  const out: string[] = [];
  let cur: ListPeriod | null | undefined = periodById(id);
  while (cur) {
    out.unshift(cur.id);
    const parentId: string | null | undefined = cur.parentId;
    cur = parentId ? periodById(parentId) : null;
  }
  return out;
}

export function listPeriodShowsDrillChevron(period: ListPeriod, allPeriods: ListPeriod[]): boolean {
  if (period.hasChildren) return true;
  return allPeriods.some((c) => c.parentId === period.id);
}

export interface SelectListOptionLike {
  value: string | number;
  disabled?: boolean;
}

export function isSelectListOptionSelected(
  option: SelectListOptionLike,
  multiple: boolean,
  modelValue: string | number | (string | number)[] | null
): boolean {
  if (multiple) {
    const values = Array.isArray(modelValue) ? modelValue : [];
    return values.includes(option.value);
  }
  return modelValue === option.value;
}
