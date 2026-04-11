import { DateService } from './DateService'

/**
 * Élément minimal requis par le service de scaling.
 * PeriodApiService.mapToPeriod() expose startYearsBP et endYearsBP,
 * mais on accepte aussi les anciens objets avec startDate/endDate comme fallback.
 */
export interface ScalablePeriod {
  startYearsBP?: number
  endYearsBP?: number
  startDate?: string
  endDate?: string
  // Accès legacy via temporalData (HomeView)
  temporalData?: Array<{ startDate?: string; endDate?: string }>
}

function getStartYBP(p: ScalablePeriod): number {
  if (p.startYearsBP != null) return p.startYearsBP
  const raw = p.startDate ?? p.temporalData?.[0]?.startDate ?? ''
  return DateService.toYearsBP(raw)
}

function getEndYBP(p: ScalablePeriod): number {
  if (p.endYearsBP != null) return p.endYearsBP
  const raw = p.endDate ?? p.temporalData?.[0]?.endDate ?? 'NOW'
  return DateService.toYearsBP(raw)
}

export class TimelineScalingService {
  /**
   * Durée totale couverte par un ensemble de périodes enfants.
   * Prend la période parente si disponible pour être robuste aux enfants
   * avec des dates manquantes.
   */
  calculateTotalDuration(periods: ScalablePeriod[], parent?: ScalablePeriod): number {
    if (parent) {
      const parentStart = getStartYBP(parent)
      const parentEnd   = getEndYBP(parent)
      return Math.max(0, parentStart - parentEnd)
    }

    if (periods.length === 0) return 0

    const starts = periods.map(getStartYBP)
    const ends   = periods.map(getEndYBP)
    const maxStart = Math.max(...starts)
    const minEnd   = Math.min(...ends)
    return Math.max(0, maxStart - minEnd)
  }

  /**
   * Calcule la position relative (0–100%) d'une date dans la fenêtre temporelle.
   *   0% = bord gauche (date la plus ancienne = startYears)
   * 100% = bord droit (aujourd'hui ou fin de la période parente)
   */
  calculateRelativePosition(
    dateYBP: number,
    totalDuration: number,
    windowStartYBP: number
  ): number {
    if (totalDuration === 0) return 0
    const position = ((windowStartYBP - dateYBP) / totalDuration) * 100
    return Math.max(0, Math.min(100, position))
  }

  /**
   * Largeur relative (0–100%) d'une période dans la fenêtre temporelle.
   */
  calculatePeriodWidth(period: ScalablePeriod, totalDuration: number): number {
    if (totalDuration === 0) return 0
    const start = getStartYBP(period)
    const end   = getEndYBP(period)
    const duration = Math.max(0, start - end)
    return Math.min(100, (duration / totalDuration) * 100)
  }

  /**
   * Styles CSS (left + width) pour positionner une période sur la frise.
   */
  calculatePeriodStyles(
    period: ScalablePeriod,
    totalDuration: number,
    windowStartYBP: number
  ): { width: string; left: string } {
    const left  = this.calculateRelativePosition(getStartYBP(period), totalDuration, windowStartYBP)
    const width = Math.min(this.calculatePeriodWidth(period, totalDuration), 100 - left)
    return { width: `${width}%`, left: `${left}%` }
  }

  /**
   * Fenêtre de départ : le point le plus ancien parmi les périodes affichées.
   */
  getWindowStart(periods: ScalablePeriod[], parent?: ScalablePeriod): number {
    if (parent) return getStartYBP(parent)
    if (periods.length === 0) return 0
    return Math.max(...periods.map(getStartYBP))
  }
}
