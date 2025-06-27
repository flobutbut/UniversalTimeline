/**
 * Composable Vue 3 pour la conversion de dates
 * Utilise le DateConversionService pour gérer différents formats temporels
 */

import { ref, computed, readonly } from 'vue';
import { DateConversionService, type DateConversionOptions, type ConvertedDate, type DateRange } from '@/services/DateConversionService';

export interface UseDateConversionOptions {
  defaultLocale?: string;
  defaultPrecision?: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
  includeTime?: boolean;
}

export function useDateConversion(options: UseDateConversionOptions = {}) {
  const {
    defaultLocale = 'fr-FR',
    defaultPrecision = 'year',
    includeTime = false
  } = options;

  // État réactif
  const convertedDate = ref<ConvertedDate | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Options par défaut pour les conversions
  const defaultConversionOptions: DateConversionOptions = {
    locale: defaultLocale,
    precision: defaultPrecision,
    includeTime
  };

  /**
   * Convertit une date avec gestion d'erreur
   */
  const convertDate = (dateString: string, customOptions?: Partial<DateConversionOptions>) => {
    isLoading.value = true;
    error.value = null;

    try {
      const options = { ...defaultConversionOptions, ...customOptions };
      const result = DateConversionService.convertDate(dateString, options);
      
      convertedDate.value = result;
      
      if (!result.isValid) {
        error.value = result.error || 'Erreur de conversion inconnue';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de conversion inconnue';
      convertedDate.value = null;
    } finally {
      isLoading.value = false;
    }

    return convertedDate.value;
  };

  /**
   * Convertit une plage de dates
   */
  const convertDateRange = (startDate: string, endDate: string, customOptions?: Partial<DateConversionOptions>) => {
    const options = { ...defaultConversionOptions, ...customOptions };
    return DateConversionService.convertDateRange(startDate, endDate, options);
  };

  /**
   * Formate une date pour l'affichage
   */
  const formatForDisplay = (dateString: string, context: 'timeline' | 'detail' | 'search' = 'timeline') => {
    return DateConversionService.formatForDisplay(dateString, context);
  };

  /**
   * Valide si une date est dans une plage acceptable
   */
  const isValidDateRange = (dateString: string) => {
    return DateConversionService.isValidDateRange(dateString);
  };

  // Computed properties pour un accès facile aux propriétés converties
  const iso8601 = computed(() => convertedDate.value?.iso8601 || '');
  const modern = computed(() => convertedDate.value?.modern || '');
  const bce = computed(() => convertedDate.value?.bce || '');
  const geological = computed(() => convertedDate.value?.geological || '');
  const years = computed(() => convertedDate.value?.years || 0);
  const yearsFromNow = computed(() => convertedDate.value?.yearsFromNow || 0);
  const isBCE = computed(() => convertedDate.value?.isBCE || false);
  const precision = computed(() => convertedDate.value?.precision || 'unknown');
  const isValid = computed(() => convertedDate.value?.isValid || false);

  /**
   * Convertit une date ISO8601 vers un format lisible
   */
  const fromISO8601 = (iso8601Date: string, targetFormat: 'modern' | 'bce' | 'geological' = 'modern') => {
    const converted = convertDate(iso8601Date, { inputFormat: 'iso8601' });
    
    switch (targetFormat) {
      case 'modern':
        return converted?.modern || iso8601Date;
      case 'bce':
        return converted?.bce || iso8601Date;
      case 'geological':
        return converted?.geological || iso8601Date;
      default:
        return converted?.modern || iso8601Date;
    }
  };

  /**
   * Convertit une date lisible vers le format ISO8601
   */
  const toISO8601 = (readableDate: string, sourceFormat?: 'modern' | 'bce' | 'geological') => {
    // Gestion spéciale pour les dates françaises complètes (JJ mois AAAA)
    const frDatePattern = /^(\d{1,2})\s+([a-zéûîôàèù]+)\s+(\d{4})$/i;
    const months: Record<string, string> = {
      'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
    };
    const match = readableDate.match(frDatePattern);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = months[match[2].toLowerCase()] || '01';
      const year = match[3];
      return `${year}-${month}-${day}T00:00:00Z`;
    }
    // Sinon, fallback sur la conversion standard
    const converted = convertDate(readableDate, { 
      inputFormat: sourceFormat || 'auto',
      outputFormat: 'iso8601'
    });
    return converted?.iso8601 || readableDate;
  };

  /**
   * Formate une date pour différents contextes d'affichage
   */
  const formatForContext = {
    timeline: (dateString: string) => formatForDisplay(dateString, 'timeline'),
    detail: (dateString: string) => formatForDisplay(dateString, 'detail'),
    search: (dateString: string) => formatForDisplay(dateString, 'search')
  };

  /**
   * Utilitaires pour les conversions rapides
   */
  const quickConvert = {
    // Conversion rapide vers format moderne
    toModern: (dateString: string) => {
      const converted = convertDate(dateString);
      return converted?.modern || dateString;
    },
    
    // Conversion rapide vers format géologique
    toGeological: (dateString: string) => {
      const converted = convertDate(dateString);
      return converted?.geological || dateString;
    },
    
    // Conversion rapide vers format BCE
    toBCE: (dateString: string) => {
      const converted = convertDate(dateString);
      return converted?.bce || dateString;
    }
  };

  return {
    // État réactif
    convertedDate: readonly(convertedDate),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Propriétés calculées
    iso8601,
    modern,
    bce,
    geological,
    years,
    yearsFromNow,
    isBCE,
    precision,
    isValid,
    
    // Méthodes principales
    convertDate,
    convertDateRange,
    formatForDisplay,
    isValidDateRange,
    
    // Méthodes spécialisées
    fromISO8601,
    toISO8601,
    formatForContext,
    quickConvert
  };
} 