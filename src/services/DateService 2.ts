import type { NormalizedDate, DatePrecision, StorageDateString } from '@/types/date'

// ─── Constantes ──────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

// Seuils pour choisir l'unité G/M/K/A
const GA = 1_000_000_000
const MA = 1_000_000
const KA = 1_000

// ─── Patterns de reconnaissance ──────────────────────────────────────────────

// Format canonique G/M/K/A
const CANONICAL = /^([GMKA])(\d+(?:\.\d+)?)$/

// Wikidata ISO étendu : -65000000-01-01T00:00:00Z ou +1944-06-06T14:32:00Z
const WIKIDATA_ISO = /^([+-]?)(\d+)-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/

// Date calendaire ISO moderne (sans signe, CE uniquement)
const CALENDAR_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/

// Format géologique legacy : "4.6 Ga", "65 Ma", "11.7 ka", "230 ans"
const GEOLOGICAL_LEGACY = /^(\d+(?:\.\d+)?)\s*(Ga|Ma|ka|ans?)$/i

// Année seule : "1789"
const YEAR_ONLY = /^(\d{4})$/

// ─── Helpers internes ────────────────────────────────────────────────────────

function ybpToUnit(ybp: number): { value: number; unit: 'G' | 'M' | 'K' | 'A' } {
  if (ybp >= GA) return { value: ybp / GA, unit: 'G' }
  if (ybp >= MA) return { value: ybp / MA, unit: 'M' }
  if (ybp >= KA) return { value: ybp / KA, unit: 'K' }
  return { value: ybp, unit: 'A' }
}

function roundSig(n: number, sig: number): number {
  if (n === 0) return 0
  const d = Math.ceil(Math.log10(Math.abs(n)))
  const power = sig - d
  const magnitude = Math.pow(10, power)
  return Math.round(n * magnitude) / magnitude
}

/**
 * Date calendaire en UTC (ère commune). Contourne la règle ECMAScript sur les années 0–99
 * (interprétées comme 1900 + n dans Date.UTC, ex. 80 → 1980).
 */
function calendarUtcCE(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date {
  const d = new Date(Date.UTC(2000, month - 1, day, hour, minute))
  d.setUTCFullYear(year)
  return d
}

// ─── DateService ─────────────────────────────────────────────────────────────

export class DateService {
  // ── parse ────────────────────────────────────────────────────────────────

  /**
   * Convertit n'importe quelle représentation de date vers NormalizedDate.
   * Accepte : G/M/K/A, Wikidata ISO, calendrier ISO, géologique legacy, année seule, NOW/TODAY.
   */
  static parse(input: string): NormalizedDate {
    // Normaliser : remplacer espace par T pour les timestamps PostgreSQL "YYYY-MM-DD HH:MM:SS"
    const s = (input?.trim() ?? '').replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, '$1T$2')

    // Période en cours ou valeur inconnue/vide
    if (!s || s === 'NOW' || s === 'TODAY' || s.toLowerCase().includes('inconnue') || s.toLowerCase().includes('unknown')) {
      return { yearsBeforePresent: 0, precision: 'year', isCurrent: true, raw: s }
    }

    // ── Format canonique G/M/K/A ──
    const canonical = s.match(CANONICAL)
    if (canonical) {
      const unit = canonical[1]
      const value = parseFloat(canonical[2])
      let ybp: number
      let precision: DatePrecision
      switch (unit) {
        case 'G': ybp = value * GA; precision = 'Ga'; break
        case 'M': ybp = value * MA; precision = 'Ma'; break
        case 'K': ybp = value * KA; precision = 'ka'; break
        default:  ybp = value;      precision = 'year'
      }
      return { yearsBeforePresent: ybp, precision, isCurrent: false, raw: s }
    }

    // ── Wikidata ISO étendu ──
    const wikidata = s.match(WIKIDATA_ISO)
    if (wikidata) {
      const sign   = wikidata[1]
      const year   = parseInt(wikidata[2])
      const month  = parseInt(wikidata[3])
      const day    = parseInt(wikidata[4])
      const hour   = parseInt(wikidata[5])
      const minute = parseInt(wikidata[6])
      const isBCE  = sign === '-'

      if (isBCE) {
        // Date géologique/historique BCE
        const ybp = year + CURRENT_YEAR  // ex: 65 000 000 + 2026 ≈ 65 002 026
        let precision: DatePrecision = 'year'
        if (ybp >= GA)      precision = 'Ga'
        else if (ybp >= MA) precision = 'Ma'
        else if (ybp >= KA) precision = 'ka'
        return { yearsBeforePresent: ybp, precision, isCurrent: false, raw: s }
      } else {
        // Date CE avec précision calendaire — calendarDate toujours set
        const d =
          year < 100
            ? calendarUtcCE(year, month, day, hour, minute)
            : new Date(Date.UTC(year, month - 1, day, hour, minute))
        const ybp = Math.max(0, (Date.now() - d.getTime()) / MS_PER_YEAR)
        const precision: DatePrecision = minute > 0 ? 'minute' : hour > 0 ? 'hour' : day > 1 ? 'day' : month > 1 ? 'month' : 'year'
        return {
          yearsBeforePresent: ybp,
          precision,
          isCurrent: false,
          raw: s,
          calendarDate: d,
        }
      }
    }

    // ── Calendrier ISO moderne (CE, sans signe) ──
    const cal = s.match(CALENDAR_ISO)
    if (cal) {
      const year   = parseInt(cal[1])
      const month  = parseInt(cal[2])
      const day    = parseInt(cal[3])
      const hour   = cal[4] ? parseInt(cal[4]) : 0
      const minute = cal[5] ? parseInt(cal[5]) : 0
      const d =
        year < 100
          ? calendarUtcCE(year, month, day, hour, minute)
          : new Date(Date.UTC(year, month - 1, day, hour, minute))
      const ybp = Math.max(0, (Date.now() - d.getTime()) / MS_PER_YEAR)
      const precision: DatePrecision = minute > 0 ? 'minute' : hour > 0 ? 'hour' : day > 1 ? 'day' : month > 1 ? 'month' : 'year'
      return {
        yearsBeforePresent: ybp,
        precision,
        isCurrent: false,
        raw: s,
        calendarDate: d, // toujours set pour les dates calendaires CE
      }
    }

    // ── Format géologique legacy "4.6 Ga" ──
    const geo = s.match(GEOLOGICAL_LEGACY)
    if (geo) {
      const value = parseFloat(geo[1])
      const unit  = geo[2].toLowerCase()
      let ybp: number
      let precision: DatePrecision
      switch (unit) {
        case 'ga':            ybp = value * GA; precision = 'Ga'; break
        case 'ma':            ybp = value * MA; precision = 'Ma'; break
        case 'ka':            ybp = value * KA; precision = 'ka'; break
        default:              ybp = value;      precision = 'year'
      }
      return { yearsBeforePresent: ybp, precision, isCurrent: false, raw: s }
    }

    // ── Année seule ──
    const yr = s.match(YEAR_ONLY)
    if (yr) {
      const year = parseInt(yr[1])
      const ybp = Math.max(0, CURRENT_YEAR - year)
      return { yearsBeforePresent: ybp, precision: 'year', isCurrent: false, raw: s }
    }

    // ── Fallback : non reconnu, yearsBeforePresent = 0 ──
    console.warn(`[DateService] Format non reconnu: "${s}"`)
    return { yearsBeforePresent: 0, precision: 'year', isCurrent: false, raw: s }
  }

  // ── toStorageString ──────────────────────────────────────────────────────

  /**
   * Convertit un NormalizedDate vers le format canonique de stockage.
   * - Dates avec précision sub-année → ISO calendaire  ex: "1944-06-06T14:32:00"
   * - Autres → G/M/K/A                                 ex: "G4.6", "M65", "K11.7", "A230"
   * - Période en cours → "NOW"
   */
  static toStorageString(date: NormalizedDate): StorageDateString {
    if (date.isCurrent) return 'NOW'

    // Dates calendaires avec précision sub-année
    if (date.calendarDate && ['month', 'day', 'hour', 'minute', 'second'].includes(date.precision)) {
      return this.toCalendarISO(date.calendarDate, date.precision)
    }

    // Format G/M/K/A
    const { value, unit } = ybpToUnit(date.yearsBeforePresent)
    const rounded = roundSig(value, 4)
    // Supprimer les zéros inutiles après la virgule
    const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(
      unit === 'G' ? 2 : unit === 'M' ? 1 : 0
    ).replace(/\.?0+$/, '')
    return `${unit}${formatted}`
  }

  // ── format (affichage) ───────────────────────────────────────────────────

  /**
   * Produit une string lisible pour l'affichage.
   */
  static format(date: NormalizedDate, locale = 'fr-FR'): string {
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
    if (date.isCurrent) return "aujourd'hui"
    if (date.calendarDate) return this.formatCalendar(date.calendarDate, date.precision, locale)
    return this.formatGeologicalBound(date.yearsBeforePresent)
  }

  // ── toYearsBP (convenience) ──────────────────────────────────────────────

  /**
   * Parse une string et retourne directement yearsBeforePresent.
   * Utile pour le scaling et le tri.
   */
  static toYearsBP(input: string): number {
    return this.parse(input).yearsBeforePresent
  }

  // ── Helpers privés ───────────────────────────────────────────────────────

  private static toCalendarISO(d: Date, precision: DatePrecision): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    const Y = d.getUTCFullYear()
    const Mo = pad(d.getUTCMonth() + 1)
    const D = pad(d.getUTCDate())
    if (precision === 'month') return `${Y}-${Mo}`
    if (precision === 'day')   return `${Y}-${Mo}-${D}`
    const h = pad(d.getUTCHours())
    const m = pad(d.getUTCMinutes())
    if (precision === 'hour')   return `${Y}-${Mo}-${D}T${h}:00:00`
    if (precision === 'minute') return `${Y}-${Mo}-${D}T${h}:${m}:00`
    const s = pad(d.getUTCSeconds())
    return `${Y}-${Mo}-${D}T${h}:${m}:${s}`
  }

  private static formatCalendar(d: Date, precision: DatePrecision, locale: string): string {
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric' }
    if (['month', 'day', 'hour', 'minute', 'second'].includes(precision)) opts.month = 'long'
    if (['day', 'hour', 'minute', 'second'].includes(precision)) opts.day = 'numeric'
    if (['hour', 'minute', 'second'].includes(precision)) { opts.hour = '2-digit'; opts.minute = '2-digit' }
    return d.toLocaleDateString(locale, opts)
  }
}
