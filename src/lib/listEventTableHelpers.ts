import { DateService } from '@/services/DateService';
import type { ListEvent } from '@/types/database';

/** Années BP pour tri / filtre (champ enrichi ou calcul depuis la date). */
export function listEventYearsBP(e: Pick<ListEvent, 'date' | 'dateYearsBP'>): number {
  return e.dateYearsBP != null ? Number(e.dateYearsBP) : DateService.toYearsBP(e.date ?? '');
}

/** Si `dateYearsBP` est absent ou ≤ 0, recalcul depuis `date` (ex. filtre picker). */
export function listEventYearsBPFallbackToDate(e: Pick<ListEvent, 'date' | 'dateYearsBP'>): number {
  if (e.dateYearsBP != null && Number(e.dateYearsBP) > 0) return Number(e.dateYearsBP);
  return DateService.toYearsBP(e.date ?? '');
}

/** Clé de tri stable sur les libellés de catégories (FR). */
export function listEventCategoriesSortKey(e: Pick<ListEvent, 'categories'>): string {
  return [...(e.categories ?? [])]
    .map((c) => c.label.fr || '')
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
    .join('\u0001');
}

/** Horodatage `updatedAt` en ms pour tri (0 si absent / invalide). */
export function listEventUpdatedTimestampMs(e: Pick<ListEvent, 'updatedAt'>): number {
  const u = e.updatedAt;
  if (!u) return 0;
  const d = u instanceof Date ? u : new Date(u);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Date d’événement affichée (liste / table). `whenEmpty` : libellé si chaîne vide. */
export function formatEventListDateForDisplay(raw: string, whenEmpty = '—'): string {
  if (!raw) return whenEmpty;
  return DateService.format(DateService.parse(raw));
}

/** Ligne picker : pas de tiret cadratin, chaîne vide si pas de date. */
export function formatEventPickerListDate(raw: string): string {
  return formatEventListDateForDisplay(raw, '');
}

/** « Dernière modification » courte (locale fr). */
export function formatListEventLastEditFr(e: Pick<ListEvent, 'updatedAt'>): string {
  const u = e.updatedAt;
  if (!u) return '—';
  const d = u instanceof Date ? u : new Date(u);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
