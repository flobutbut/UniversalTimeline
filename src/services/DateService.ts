import { parseTemporal, yearsBeforePresent, type NormalizedDate, type DatePrecision } from '@temporal';
const GA = 1_000_000_000;
const MA = 1_000_000;
/** Presentation adapter; parsing and chronological comparisons use the shared pure domain. */
export class DateService {
  static parse(input: string): NormalizedDate { return parseTemporal(input); }
  static tryToYearsBP(input: string): number | null { return yearsBeforePresent(input); }
  // ── format (affichage) ───────────────────────────────────────────────────

  /**
   * Produit une string lisible pour l'affichage.
   */
  static format(date: NormalizedDate, locale = 'fr-FR'): string {
    if (date.kind === 'unknown') return date.raw || 'Date inconnue'
    if (date.approximate) return date.raw
    if (date.isCurrent) return "Aujourd'hui"

    // Si calendarDate est défini, c'est une date calendaire (CE) — toujours formater comme telle
    if (date.calendarDate) {
      return this.formatCalendar(date.calendarDate, date.precision, locale)
    }

    // Format géologique (pas de calendarDate = date trop ancienne ou purement en years BP)
    return this.formatGeological(date.yearsBeforePresent)
  }

  /**
   * Affichage géologique : "4.6 Ga", "65 Ma", "11.7 ka", "230 ans"
   */
  static formatGeological(ybp: number): string {
    if (ybp >= GA) return `il y a ${(ybp / GA).toFixed(2)} Ga`
    if (ybp >= MA) return `il y a ${(ybp / MA).toFixed(1)} Ma`
    return `il y a ${Math.round(ybp).toLocaleString('fr-FR')} ans`
  }

  /**
   * Comme formatGeological mais sans "il y a" — pour les bornes de périodes
   * utilisées dans un contexte "De X à Y".
   */
  static formatGeologicalBound(ybp: number): string {
    if (ybp >= GA) return `${(ybp / GA).toFixed(2)} Ga`
    if (ybp >= MA) return `${(ybp / MA).toFixed(1)} Ma`
    return `${Math.round(ybp).toLocaleString('fr-FR')} ans`
  }

  /**
   * Format court pour les bornes de périodes : sans "il y a".
   */
  static formatBound(date: NormalizedDate, locale = 'fr-FR'): string {
    if (date.kind === 'unknown') return date.raw || 'Date inconnue'
    if (date.approximate) return date.raw
    if (date.isCurrent) return "aujourd'hui"
    if (date.calendarDate) return this.formatCalendar(date.calendarDate, date.precision, locale)
    return this.formatGeologicalBound(date.yearsBeforePresent)
  }

  private static formatCalendar(d: Date, precision: DatePrecision, locale: string): string {
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', timeZone: 'UTC', ...(d.getUTCFullYear() <= 0 ? { era: 'short' } : {}) }
    if (['month', 'day', 'hour', 'minute', 'second'].includes(precision)) opts.month = 'long'
    if (['day', 'hour', 'minute', 'second'].includes(precision)) opts.day = 'numeric'
    // Imported date-only values are often stored as ISO timestamps at midnight.
    // Their storage precision should not add an uninformative time to the label.
    const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0
    if (hasTime && ['hour', 'minute', 'second'].includes(precision)) { opts.hour = '2-digit'; opts.minute = '2-digit' }
    if (hasTime && precision === 'second' && (d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0)) opts.second = '2-digit'
    return new Intl.DateTimeFormat(locale, opts).format(d)
  }
}
