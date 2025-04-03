import type { Period } from '../types/geological';
import { DateFormatter } from '../utils/dateFormatter';

export class TimelineScalingService {
  /**
   * Convertit une date en années avant aujourd'hui
   */
  convertDateToYearsBeforePresent(dateStr: string): number {
    // Si c'est une date ISO
    if (dateStr.includes('T')) {
      const match = dateStr.match(/(-?\d+)-/);
      if (match) {
        return Math.abs(parseInt(match[1]));
      }
    }

    // Si c'est une date géologique
    const match = dateStr.match(/(\d+(?:\.\d+)?)\s*ans/);
    if (match) {
      return parseFloat(match[1]);
    }

    return 0;
  }

  /**
   * Calcule la durée totale en années entre la première période et aujourd'hui/dernière date
   */
  calculateTotalDuration(periods: Period[]): number {
    if (periods.length === 0) return 0;

    // Trier les périodes par date de début (la plus récente en premier)
    const sortedPeriods = [...periods].sort((a, b) => {
      const aStart = this.convertDateToYearsBeforePresent(a.temporalData[0]?.startDate || '0 ans');
      const bStart = this.convertDateToYearsBeforePresent(b.temporalData[0]?.startDate || '0 ans');
      return bStart - aStart;
    });

    // Prendre la date de début de la première période (la plus récente)
    const firstPeriodStart = this.convertDateToYearsBeforePresent(sortedPeriods[0].temporalData[0]?.startDate || '0 ans');
    
    // Prendre la date de fin de la dernière période (la plus ancienne)
    const lastPeriodEnd = this.convertDateToYearsBeforePresent(sortedPeriods[sortedPeriods.length - 1].temporalData[0]?.endDate || '0 ans');

    // Calculer la durée totale
    return firstPeriodStart - lastPeriodEnd;
  }

  /**
   * Calcule la position relative (0-100%) d'une date par rapport à la durée totale
   */
  calculateRelativePosition(dateString: string, totalDuration: number, startYears: number): number {
    if (totalDuration === 0) return 0;
    
    const dateYears = this.convertDateToYearsBeforePresent(dateString);
    const position = ((startYears - dateYears) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position));
  }

  /**
   * Calcule la largeur relative (0-100%) d'une période par rapport à la durée totale
   */
  calculatePeriodWidth(period: Period, totalDuration: number): number {
    if (totalDuration === 0) return 0;
    
    const startYears = this.convertDateToYearsBeforePresent(period.temporalData[0]?.startDate || '0 ans');
    const endYears = this.convertDateToYearsBeforePresent(period.temporalData[0]?.endDate || '0 ans');
    const periodDuration = startYears - endYears;
    return (periodDuration / totalDuration) * 100;
  }

  /**
   * Calcule les styles CSS pour une période
   */
  calculatePeriodStyles(period: Period, totalDuration: number, startYears: number): {
    width: string;
    left: string;
  } {
    const width = this.calculatePeriodWidth(period, totalDuration);
    const left = this.calculateRelativePosition(
      period.temporalData[0]?.startDate || '0 ans',
      totalDuration,
      startYears
    );

    return {
      width: `${width}%`,
      left: `${left}%`
    };
  }
}