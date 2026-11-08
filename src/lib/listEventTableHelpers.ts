import { resolveYearsBeforePresent } from '@temporal';
import { DateService } from '@/services/DateService';
import type { ListEvent } from '@/types/database';

/** Unknown dates stay null for filtering/sorting; both event pickers share this conversion. */
export function listEventYearsBP(e: Pick<ListEvent, 'date' | 'dateYearsBP'>): number | null {
  return resolveYearsBeforePresent(e.date, e.dateYearsBP);
}

/** Horodatage `updatedAt` en ms pour tri (0 si absent / invalide). */
export function listEventUpdatedTimestampMs(e: Pick<ListEvent, 'updatedAt'>): number {
  const u = e.updatedAt;
  if (!u) return 0;
  const d = u instanceof Date ? u : new Date(u);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Date d'événement affichée (liste / table). `whenEmpty` : libellé si chaîne vide. */
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
