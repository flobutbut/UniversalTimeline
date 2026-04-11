/**
 * Précision d'une date — du plus grossier au plus fin
 */
export type DatePrecision =
  | 'Ga'       // milliards d'années
  | 'Ma'       // millions d'années
  | 'ka'       // milliers d'années
  | 'year'     // année
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'

/**
 * Format canonique interne — toute date du système est convertie vers ce type
 */
export interface NormalizedDate {
  /** Années avant le présent, toujours >= 0. 0 = maintenant. */
  yearsBeforePresent: number
  precision: DatePrecision
  /** true pour "NOW" / périodes encore en cours */
  isCurrent: boolean
  /** String originale, pour traçabilité et stockage */
  raw: string
  /**
   * Uniquement pour les dates contemporaines avec précision ≤ day.
   * Permet un affichage calendaire précis (heure, minute…).
   */
  calendarDate?: Date
}

/**
 * Format de stockage en base de données (colonne TEXT existante)
 *
 * Règles :
 *   G{n}  → n × 10⁹ années avant le présent  ex: G4.6
 *   M{n}  → n × 10⁶ années avant le présent  ex: M65
 *   K{n}  → n × 10³ années avant le présent  ex: K11.7
 *   A{n}  → n années avant le présent         ex: A230
 *   ISO   → date calendaire CE précise         ex: 1944-06-06T14:32:00
 *   NOW   → période encore en cours
 */
export type StorageDateString = string
