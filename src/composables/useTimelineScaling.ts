/**
 * Composable : transformation des périodes / événements pour le layout timeline
 * (positions et largeurs en % selon l'échelle dérivée des dates).
 * Délègue au TimelineScalingService.
 */

import { ref, readonly } from 'vue';
import type { ScalablePeriod } from '@/services/TimelineScalingService';
import { TimelineScalingService } from '@/services/TimelineScalingService';
import { DateService } from '@/services/DateService';

const DEFAULT_ROW_HEIGHT = 48;

export function useTimelineScaling() {
  const scalingService = new TimelineScalingService();
  const totalDuration = ref(0);
  const startYears = ref(0);

  /**
   * Recalcule l'échelle à partir des périodes affichées.
   * Si `parent` est fourni, la fenêtre temporelle est calée sur ses bornes
   * (indépendamment des bornes des enfants).
   */
  const updateFromPeriods = (periods: ScalablePeriod[], parent?: ScalablePeriod) => {
    totalDuration.value = scalingService.calculateTotalDuration(periods, parent);
    if (parent || periods.length > 0) {
      startYears.value = scalingService.getWindowStart(periods, parent);
    } else {
      startYears.value = 0;
    }
  };

  /**
   * Styles de carte période (largeur / left %) + placement vertical par ligne.
   */
  const getPeriodLayoutStyle = (
    period: ScalablePeriod,
    options?: { row?: number; rowHeight?: number }
  ) => {
    const row = options?.row ?? (period as { row?: number }).row ?? 0;
    const rowHeight = options?.rowHeight ?? DEFAULT_ROW_HEIGHT;
    const base = scalingService.calculatePeriodStyles(period, totalDuration.value, startYears.value);
    return {
      ...base,
      position: 'absolute' as const,
      top: `${row * rowHeight}px`,
    };
  };

  /**
   * Position horizontale d'un événement sur la même échelle que les périodes.
   */
  const getEventLayoutStyle = (date: string, cardWidth = '0px') => {
    const dateYBP = DateService.toYearsBP(date);
    const positionPct = scalingService.calculateRelativePosition(
      dateYBP,
      totalDuration.value,
      startYears.value
    );
    return {
      width: cardWidth,
      left: `${positionPct}%`,
    };
  };

  /**
   * Tri chronologique décroissant (plus ancien en premier à gauche).
   */
  const sortPeriodsByStartDesc = (periods: ScalablePeriod[]): ScalablePeriod[] => {
    return [...periods].sort((a, b) => {
      const aY = a.startYearsBP ?? DateService.toYearsBP(a.temporalData?.[0]?.startDate ?? a.startDate ?? '');
      const bY = b.startYearsBP ?? DateService.toYearsBP(b.temporalData?.[0]?.startDate ?? b.startDate ?? '');
      return bY - aY;
    });
  };

  return {
    totalDuration: readonly(totalDuration),
    startYears: readonly(startYears),
    updateFromPeriods,
    getPeriodLayoutStyle,
    getEventLayoutStyle,
    sortPeriodsByStartDesc,
    convertDateToYearsBeforePresent: (dateStr: string) => DateService.toYearsBP(dateStr),
  };
}
