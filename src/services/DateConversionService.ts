/**
 * Service de conversion de dates pour gérer différents formats temporels
 * - Dates ISO8601 (-3600000000-01-01T00:00:00Z)
 * - Dates modernes (18 avril 1923)
 * - Dates BCE (-800)
 * - Dates géologiques très anciennes (40 000 ans, 400 000 ans, 4Ma, 4Ga)
 */

export interface DateConversionOptions {
  inputFormat?: 'iso8601' | 'modern' | 'bce' | 'geological' | 'auto';
  outputFormat?: 'iso8601' | 'modern' | 'bce' | 'geological' | 'years';
  precision?: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
  locale?: string;
  includeTime?: boolean;
}

export interface ConvertedDate {
  original: string;
  iso8601: string;
  modern: string;
  bce: string;
  geological: string;
  years: number;
  yearsFromNow: number;
  isBCE: boolean;
  precision: string;
  isValid: boolean;
  error?: string;
}

export interface DateRange {
  start: ConvertedDate;
  end: ConvertedDate;
  duration?: {
    years: number;
    geological: string;
    modern: string;
  };
}

export class DateConversionService {
  // Constantes pour les conversions
  private static readonly CURRENT_YEAR = new Date().getFullYear();
  private static readonly GEOLOGICAL_THRESHOLDS = {
    GA: 1000000000, // 1 milliard d'années
    MA: 1000000,    // 1 million d'années
    KA: 1000        // 1 millier d'années
  };

  // Patterns de reconnaissance
  private static readonly PATTERNS = {
    ISO8601: /^([+-]?\d+)-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/,
    MODERN_DATE: /^(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})$/i,
    BCE_DATE: /^-?\d+(\.\d+)?\s*(BCE|BC|BP|avant\s+J\.-C\.?|avant\s+Jésus-Christ)$/i,
    GEOLOGICAL: /^(\d+(?:\.\d+)?)\s*(Ga|Ma|ka|ans?)\s*(ago|avant|BP)?$/i,
    YEAR_ONLY: /^(\d{4})$/
  };

  /**
   * Convertit une date depuis n'importe quel format vers tous les formats supportés
   */
  static convertDate(dateString: string, options: DateConversionOptions = {}): ConvertedDate {
    const defaultOptions: DateConversionOptions = {
      inputFormat: 'auto',
      outputFormat: 'modern',
      precision: 'year',
      locale: 'fr-FR',
      includeTime: false
    };

    const opts = { ...defaultOptions, ...options };

    try {
      // Détection automatique du format si nécessaire
      const detectedFormat = opts.inputFormat === 'auto' 
        ? this.detectFormat(dateString) 
        : opts.inputFormat;

      // Parsing selon le format détecté
      const parsed = this.parseDate(dateString, detectedFormat || 'modern');
      
      if (!parsed.isValid) {
        return {
          original: dateString,
          iso8601: '',
          modern: '',
          bce: '',
          geological: '',
          years: 0,
          yearsFromNow: 0,
          isBCE: false,
          precision: 'unknown',
          isValid: false,
          error: parsed.error
        };
      }

      // Conversion vers tous les formats
      return {
        original: dateString,
        iso8601: this.toISO8601(parsed),
        modern: this.toModern(parsed, opts),
        bce: this.toBCE(parsed),
        geological: this.toGeological(parsed),
        years: parsed.years,
        yearsFromNow: parsed.yearsFromNow,
        isBCE: parsed.isBCE,
        precision: parsed.precision,
        isValid: true
      };

    } catch (error) {
      return {
        original: dateString,
        iso8601: '',
        modern: '',
        bce: '',
        geological: '',
        years: 0,
        yearsFromNow: 0,
        isBCE: false,
        precision: 'unknown',
        isValid: false,
        error: error instanceof Error ? error.message : 'Erreur de conversion inconnue'
      };
    }
  }

  /**
   * Détecte automatiquement le format d'une date
   */
  private static detectFormat(dateString: string): 'iso8601' | 'modern' | 'bce' | 'geological' | 'year' {
    if (this.PATTERNS.ISO8601.test(dateString)) return 'iso8601';
    if (this.PATTERNS.MODERN_DATE.test(dateString)) return 'modern';
    if (this.PATTERNS.BCE_DATE.test(dateString)) return 'bce';
    if (this.PATTERNS.GEOLOGICAL.test(dateString)) return 'geological';
    if (this.PATTERNS.YEAR_ONLY.test(dateString)) return 'year';
    
    // Tentative de parsing comme année simple
    const year = parseInt(dateString);
    if (!isNaN(year) && year > -10000 && year < 10000) return 'year';
    
    return 'modern'; // Par défaut
  }

  /**
   * Parse une date selon son format
   */
  private static parseDate(dateString: string, format: string): {
    years: number;
    yearsFromNow: number;
    isBCE: boolean;
    precision: string;
    isValid: boolean;
    error?: string;
  } {
    switch (format) {
      case 'iso8601':
        return this.parseISO8601(dateString);
      case 'modern':
        return this.parseModern(dateString);
      case 'bce':
        return this.parseBCE(dateString);
      case 'geological':
        return this.parseGeological(dateString);
      case 'year':
        return this.parseYear(dateString);
      default:
        return {
          years: 0,
          yearsFromNow: 0,
          isBCE: false,
          precision: 'unknown',
          isValid: false,
          error: `Format non supporté: ${format}`
        };
    }
  }

  /**
   * Parse une date ISO8601 (-3600000000-01-01T00:00:00Z)
   */
  private static parseISO8601(dateString: string) {
    const match = dateString.match(this.PATTERNS.ISO8601);
    if (!match) {
      return {
        years: 0,
        yearsFromNow: 0,
        isBCE: false,
        precision: 'unknown',
        isValid: false,
        error: 'Format ISO8601 invalide'
      };
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    const isBCE = year < 0;
    const absoluteYear = Math.abs(year);
    const yearsFromNow = isBCE ? absoluteYear + this.CURRENT_YEAR : this.CURRENT_YEAR - absoluteYear;

    return {
      years: absoluteYear,
      yearsFromNow,
      isBCE,
      precision: 'day',
      isValid: true,
      month,
      day
    };
  }

  /**
   * Parse une date moderne (18 avril 1923)
   */
  private static parseModern(dateString: string) {
    const match = dateString.match(this.PATTERNS.MODERN_DATE);
    if (!match) {
      return {
        years: 0,
        yearsFromNow: 0,
        isBCE: false,
        precision: 'unknown',
        isValid: false,
        error: 'Format de date moderne invalide'
      };
    }

    const year = parseInt(match[3]);
    
    const isBCE = year < 0;
    const absoluteYear = Math.abs(year);
    const yearsFromNow = isBCE ? absoluteYear + this.CURRENT_YEAR : this.CURRENT_YEAR - absoluteYear;

    return {
      years: absoluteYear,
      yearsFromNow,
      isBCE,
      precision: 'day',
      isValid: true
    };
  }

  /**
   * Parse une date BCE (-800, 800 BCE, etc.)
   */
  private static parseBCE(dateString: string) {
    // Extraction du nombre d'années
    const yearMatch = dateString.match(/(\d+(?:\.\d+)?)/);
    if (!yearMatch) {
      return {
        years: 0,
        yearsFromNow: 0,
        isBCE: false,
        precision: 'unknown',
        isValid: false,
        error: 'Format BCE invalide'
      };
    }

    const years = parseFloat(yearMatch[1]);
    const yearsFromNow = years + this.CURRENT_YEAR;

    return {
      years,
      yearsFromNow,
      isBCE: true,
      precision: 'year',
      isValid: true
    };
  }

  /**
   * Parse une date géologique (4Ma, 4Ga, 40000 ans, etc.)
   */
  private static parseGeological(dateString: string) {
    const match = dateString.match(this.PATTERNS.GEOLOGICAL);
    if (!match) {
      return {
        years: 0,
        yearsFromNow: 0,
        isBCE: false,
        precision: 'unknown',
        isValid: false,
        error: 'Format géologique invalide'
      };
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    let years: number;
    switch (unit) {
      case 'ga':
        years = value * this.GEOLOGICAL_THRESHOLDS.GA;
        break;
      case 'ma':
        years = value * this.GEOLOGICAL_THRESHOLDS.MA;
        break;
      case 'ka':
        years = value * this.GEOLOGICAL_THRESHOLDS.KA;
        break;
      case 'ans':
      case 'an':
        years = value;
        break;
      default:
        years = value;
    }

    return {
      years,
      yearsFromNow: years,
      isBCE: true,
      precision: 'year',
      isValid: true
    };
  }

  /**
   * Parse une année simple
   */
  private static parseYear(dateString: string) {
    const year = parseInt(dateString);
    if (isNaN(year)) {
      return {
        years: 0,
        yearsFromNow: 0,
        isBCE: false,
        precision: 'unknown',
        isValid: false,
        error: 'Année invalide'
      };
    }

    const isBCE = year < 0;
    const absoluteYear = Math.abs(year);
    const yearsFromNow = isBCE ? absoluteYear + this.CURRENT_YEAR : this.CURRENT_YEAR - absoluteYear;

    return {
      years: absoluteYear,
      yearsFromNow,
      isBCE,
      precision: 'year',
      isValid: true
    };
  }

  /**
   * Convertit vers le format ISO8601
   */
  private static toISO8601(parsed: any): string {
    const sign = parsed.isBCE ? '-' : '+';
    const year = parsed.isBCE ? parsed.years : parsed.years;
    return `${sign}${year.toString().padStart(10, '0')}-01-01T00:00:00Z`;
  }

  /**
   * Convertit vers le format moderne
   */
  private static toModern(parsed: any, options: DateConversionOptions): string {
    // Si la date est très ancienne, on affiche le format géologique
    if (parsed.years >= this.GEOLOGICAL_THRESHOLDS.MA) {
      return this.toGeological(parsed);
    }

    // Si on a le jour et le mois, on les utilise
    if (parsed.day && parsed.month) {
      // On construit une date JS pour le formatage localisé (années CE 0–99 : pas Date.UTC(y) seul → 1900+y)
      let date: Date;
      if (!parsed.isBCE && parsed.years < 100) {
        date = new Date(Date.UTC(2000, parsed.month - 1, parsed.day));
        date.setUTCFullYear(parsed.years);
      } else {
        const year = parsed.isBCE ? -parsed.years : parsed.years;
        date = new Date(Date.UTC(year, parsed.month - 1, parsed.day));
      }
      return date.toLocaleDateString(options.locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Sinon, on affiche juste l'année
    const year = parsed.isBCE ? -parsed.years : parsed.years;
    if (!parsed.isBCE && parsed.years < 100) {
      const d = new Date(2000, 0, 1);
      d.setFullYear(parsed.years);
      return d.toLocaleDateString(options.locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return new Date(year, 0, 1).toLocaleDateString(options.locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Convertit vers le format BCE
   */
  private static toBCE(parsed: any): string {
    if (parsed.years >= this.GEOLOGICAL_THRESHOLDS.MA) {
      return this.toGeological(parsed);
    }
    return `${parsed.years} BCE`;
  }

  /**
   * Convertit vers le format géologique
   */
  private static toGeological(parsed: any): string {
    const years = parsed.years;
    
    if (years >= this.GEOLOGICAL_THRESHOLDS.GA) {
      return `${(years / this.GEOLOGICAL_THRESHOLDS.GA).toFixed(2)} Ga`;
    } else if (years >= this.GEOLOGICAL_THRESHOLDS.MA) {
      return `${(years / this.GEOLOGICAL_THRESHOLDS.MA).toFixed(2)} Ma`;
    } else if (years >= this.GEOLOGICAL_THRESHOLDS.KA) {
      return `${(years / this.GEOLOGICAL_THRESHOLDS.KA).toFixed(2)} ka`;
    } else {
      return `${Math.round(years)} ans`;
    }
  }

  /**
   * Convertit une plage de dates
   */
  static convertDateRange(startDate: string, endDate: string, options: DateConversionOptions = {}): DateRange {
    const start = this.convertDate(startDate, options);
    const end = this.convertDate(endDate, options);

    let duration;
    if (start.isValid && end.isValid) {
      const durationYears = Math.abs(end.years - start.years);
      duration = {
        years: durationYears,
        geological: this.toGeological({ years: durationYears }),
        modern: `${durationYears} ans`
      };
    }

    return { start, end, duration };
  }

  /**
   * Formate une date pour l'affichage selon le contexte
   */
  static formatForDisplay(dateString: string, context: 'timeline' | 'detail' | 'search' = 'timeline'): string {
    const converted = this.convertDate(dateString);
    
    if (!converted.isValid) {
      return dateString;
    }

    switch (context) {
      case 'timeline':
        // Format compact pour les timelines
        if (converted.years >= this.GEOLOGICAL_THRESHOLDS.MA) {
          return converted.geological;
        } else if (converted.isBCE) {
          return converted.bce;
        } else {
          return converted.modern;
        }
      
      case 'detail':
        // Format détaillé avec toutes les informations
        return `${converted.modern} (${converted.geological})`;
      
      case 'search':
        // Format pour la recherche
        return `${converted.original} → ${converted.modern}`;
      
      default:
        return converted.modern;
    }
  }

  /**
   * Utilitaires
   */
  private static getMonthNumber(monthName: string): number {
    const months: Record<string, number> = {
      'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
      'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
      'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };
    return months[monthName.toLowerCase()] || 0;
  }

  /**
   * Valide si une date est dans une plage acceptable
   */
  static isValidDateRange(dateString: string): boolean {
    const converted = this.convertDate(dateString);
    return converted.isValid && converted.years > 0 && converted.years < 5000000000; // 5 milliards d'années max
  }
} 