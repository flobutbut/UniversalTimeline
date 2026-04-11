/**
 * Classe utilitaire pour le formatage des dates
 */

// Types pour le format ISO8602
type TimeScale = 'G' | 'H' | 'M';
type TimeUnit = 'Y' | 'M' | 'D' | 'h' | 'm' | 's' | 'ms';
type Precision = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface ISO8602Date {
  timeScale: TimeScale;
  sign: '+' | '-';
  value: number;
  unit: TimeUnit;
  precision: Precision;
  timezone?: string;
}

interface ParsedDate {
  year: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
  timezone?: string;
  isBCE: boolean;
}

interface DateConversionResult {
  original: string;
  iso8602: string;
  geological: string;
  french: string;
  frenchTime: string;
  years: string;
  isISO8602: boolean;
  numericValues: {
    year: number;
    yearsFromNow: number;  // Nombre d'années depuis aujourd'hui (positif pour le passé)
    totalYears: number;    // Nombre total d'années (pour les dates géologiques)
  };
}

interface FormattedDateResult {
  timeElapsed: string;    // "Il y a X ans" ou "Il y a X Ma"
  duration?: string;      // "(durée: Y ans)" uniquement pour les périodes
  rawDate: string;        // Date brute pour référence
  type: 'period' | 'event'; // Type pour le composant
}

export interface DateFormattingOptions {
  type: 'person' | 'period' | 'event';
  startDate?: string;
  endDate?: string;
  format?: 'geological' | 'french';
}

export interface FormattedPersonDate {
  timeElapsed: string;    // "Il y a X ans"
  age?: string;          // "Y ans"
  rawDate: string;       // Date brute
}

export interface FormattedPeriodDate {
  timeElapsed: string;    // "Il y a X ans"
  duration: string;      // "durée: Y ans"
  rawDate: string;       // Date brute
}

export interface FormattedEventDate {
  timeElapsed: string;    // "Il y a X ans" ou "Il y a X Ma"
  rawDate: string;       // Date brute
}

export class DateFormatter {
  // Constantes pour le format ISO8602
  public static readonly TIME_SCALE = {
    GEOLOGICAL: 'G',
    HISTORICAL: 'H',
    MODERN: 'M'
  } as const;

  public static readonly TIME_UNITS = {
    YEARS: 'Y',
    MONTHS: 'M',
    DAYS: 'D',
    HOURS: 'h',
    MINUTES: 'm',
    SECONDS: 's',
    MILLISECONDS: 'ms'
  } as const;

  public static readonly PRECISION = {
    YEAR: 0,
    DECADE: 1,
    CENTURY: 2,
    MILLENNIUM: 3,
    DAY: 4,
    HOUR: 5,
    MINUTE: 6,
    SECOND: 7,
    MILLISECOND: 8
  } as const;

  // Patterns de reconnaissance des différents formats
  private static readonly PATTERNS = {
    WIKIDATA: /^([+-]?\d+)-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/,
    ISO8601: /^[+-]?\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/,
    FRENCH_DATE: /^(\d{2})\/(\d{2})\/(\d{4})$/,
    ENGLISH_DATE: /^(\d{2})\/(\d{2})\/(\d{4})$/,
    BCE_DATE: /^-?\d+(\.\d+)?\s*(BCE|BC|BP)$/i,
    MILLENNIUM: /^(\d+(?:\.\d+)?)\s*(millennium|millénaire)\s*(BCE|BC|BP)$/i,
    GEOLOGICAL: /^(\d+(?:\.\d+)?)\s*(Ga|Ma|ka|ans)$/,
    RELATIVE: /^(\d+(?:\.\d+)?)\s*(years?|ans?)\s*(ago|avant)$/i
  } as const;

  private static readonly RECENT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

  /**
   * Convertit une date en années avant le présent (Ga, Ma, ans)
   */
  static formatGeologicalDate(dateString: string): string {
    try {
      // Si la date est déjà formatée avec Ga, Ma, ka ou ans, on la retourne telle quelle
      if (dateString.endsWith(' Ga') || dateString.endsWith(' Ma') || dateString.endsWith(' ka') || dateString.endsWith(' ans')) {
        return dateString;
      }

      let years: number;

      // Extraction de l'année depuis une date ISO / Wikidata (éviter split('-')[1] = mois pour 1990-05-01T…Z)
      if (dateString.includes('T') && dateString.endsWith('Z')) {
        const datePart = dateString.split('T')[0];
        years = Math.abs(parseInt(datePart.replace(/^\+/, ''), 10));
      }
      else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        years = Math.abs(parseInt(dateString.split('-')[0]));
      }
      else if (dateString.match(/^\d{4}$/)) {
        years = Math.abs(parseInt(dateString));
      }
      else {
        return dateString;
      }

      // Conversion en années avant le présent
      if (years >= 1000000000) {
        // Milliards d'années (Ga)
        return `${(years / 1000000000).toFixed(2)} Ga`;
      } else if (years >= 1000000) {
        // Millions d'années (Ma)
        return `${(years / 1000000).toFixed(2)} Ma`;
      } else {
        // Pour toutes les années inférieures à 1 million
        // On retourne simplement le nombre d'années
        return `${years} ans`;
      }
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Formate une date en format français (JJ/MM/AAAA)
   */
  static formatFrenchDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Formate une date en format anglais (MM/DD/YYYY)
   */
  static formatEnglishDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Formate une date selon le format demandé
   */
  static format(date: string): string {
    // Si la date est déjà formatée avec Ga, Ma, ka ou ans, on la retourne telle quelle
    if (date.endsWith(' Ga') || date.endsWith(' Ma') || date.endsWith(' ka') || date.endsWith(' ans')) {
      return date;
    }

    // Si la date est au format ISO (YYYY-MM-DD), on utilise le formatage récent
    if (this.RECENT_DATE_PATTERN.test(date)) {
      return this.formatRecentDate(date);
    }

    // Sinon, on utilise le formatage géologique
    return this.formatGeologicalDate(date);
  }

  private static formatRecentDate(date: string): string {
    const match = date.match(this.RECENT_DATE_PATTERN);
    if (!match) return date;

    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  /**
   * Convertit une date en format ISO8602
   */
  public static parseToISO8602(date: string): string {
    try {
      // Détecter le format d'entrée
      const parsedDate = this.detectAndParseDate(date);
      if (!parsedDate) {
        console.error(`Format de date non reconnu: ${date}`);
        throw new Error(`Format de date non reconnu: ${date}`);
      }

      // Convertir en format ISO8602
      const iso8602Date = this.convertToISO8602(parsedDate);
      const result = this.formatISO8602(iso8602Date);
      console.log(`Conversion réussie: ${date} -> ${result}`);
      return result;
    } catch (error) {
      console.error(`Erreur lors de la conversion de la date ${date}:`, error);
      throw error;
    }
  }

  /**
   * Détecte et parse une date selon son format
   */
  private static detectAndParseDate(date: string): ParsedDate | null {
    // Vérifier chaque pattern
    if (this.PATTERNS.WIKIDATA.test(date)) {
      return this.parseWikidataDate(date);
    }
    if (this.PATTERNS.ISO8601.test(date)) {
      return this.parseISO8601(date);
    }
    if (this.PATTERNS.FRENCH_DATE.test(date)) {
      return this.parseFrenchDate(date);
    }
    if (this.PATTERNS.ENGLISH_DATE.test(date)) {
      return this.parseEnglishDate(date);
    }
    if (this.PATTERNS.BCE_DATE.test(date)) {
      return this.parseBCEDate(date);
    }
    if (this.PATTERNS.MILLENNIUM.test(date)) {
      return this.parseMillenniumDate(date);
    }
    if (this.PATTERNS.GEOLOGICAL.test(date)) {
      return this.parseGeologicalDate(date);
    }
    if (this.PATTERNS.RELATIVE.test(date)) {
      return this.parseRelativeDate(date);
    }
    return null;
  }

  /**
   * Parse une date au format Wikidata
   */
  private static parseWikidataDate(date: string): ParsedDate {
    const match = date.match(this.PATTERNS.WIKIDATA);
    if (!match) throw new Error(`Format Wikidata invalide: ${date}`);

    const [, yearStr, month, day, hour, minute, second, millisStr] = match;
    const year = parseInt(yearStr);
    const millis = millisStr ? parseInt(millisStr.padEnd(3, '0').slice(0, 3)) : undefined;

    return {
      year: Math.abs(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute),
      second: parseInt(second),
      millisecond: millis,
      isBCE: year < 0
    };
  }

  /**
   * Convertit une date parsée en format ISO8602
   */
  private static convertToISO8602(parsedDate: ParsedDate): ISO8602Date {
    // Déterminer l'échelle de temps
    let timeScale: TimeScale;
    if (parsedDate.year > 10000) {
      timeScale = 'G'; // Géologique
    } else if (parsedDate.year > 1000) {
      timeScale = 'H'; // Historique
    } else {
      timeScale = 'M'; // Moderne
    }

    // Déterminer la précision
    let precision: Precision = DateFormatter.PRECISION.YEAR;
    if (parsedDate.millisecond !== undefined) precision = DateFormatter.PRECISION.MILLISECOND;
    else if (parsedDate.second !== undefined) precision = DateFormatter.PRECISION.SECOND;
    else if (parsedDate.minute !== undefined) precision = DateFormatter.PRECISION.MINUTE;
    else if (parsedDate.hour !== undefined) precision = DateFormatter.PRECISION.HOUR;
    else if (parsedDate.day !== undefined) precision = DateFormatter.PRECISION.DAY;

    return {
      timeScale,
      sign: parsedDate.isBCE ? '-' : '+',
      value: parsedDate.year,
      unit: DateFormatter.TIME_UNITS.YEARS,
      precision,
      timezone: parsedDate.timezone
    };
  }

  /**
   * Formate une date ISO8602 en chaîne de caractères
   */
  private static formatISO8602(date: ISO8602Date): string {
    let result = `${date.timeScale}${date.sign}${date.value}${date.unit}${date.precision}`;
    if (date.timezone) {
      result += `T${date.timezone}`;
    }
    return result;
  }

  /**
   * Parse une date au format ISO8601
   */
  private static parseISO8601(date: string): ParsedDate {
    // Gérer le signe négatif ou positif au début
    const isNegative = date.startsWith('-');
    const isPositive = date.startsWith('+');
    const cleanDate = isNegative || isPositive ? date.substring(1) : date;

    const [datePart, timePart] = cleanDate.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const result: ParsedDate = {
      year: isNegative ? -year : year,
      isBCE: isNegative
    };

    if (month) result.month = month;
    if (day) result.day = day;

    if (timePart) {
      const [time, timezone] = timePart.split(/[Z+-]/);
      const [hour, minute, second] = time.split(':').map(Number);
      
      if (hour !== undefined) result.hour = hour;
      if (minute !== undefined) result.minute = minute;
      if (second !== undefined) {
        const [whole, decimal] = second.toString().split('.');
        result.second = parseInt(whole);
        if (decimal) result.millisecond = parseInt(decimal.padEnd(3, '0').slice(0, 3));
      }
      if (timezone) result.timezone = timezone;
    }

    return result;
  }

  /**
   * Parse une date au format français
   */
  private static parseFrenchDate(date: string): ParsedDate {
    const [day, month, year] = date.split('/').map(Number);
    return {
      year,
      month,
      day,
      isBCE: false
    };
  }

  /**
   * Parse une date au format anglais
   */
  private static parseEnglishDate(date: string): ParsedDate {
    const [month, day, year] = date.split('/').map(Number);
    return {
      year,
      month,
      day,
      isBCE: false
    };
  }

  /**
   * Parse une date BCE/BC
   */
  private static parseBCEDate(date: string): ParsedDate {
    const match = date.match(/^-?(\d+(?:\.\d+)?)\s*(BCE|BC|BP)$/i);
    if (!match) throw new Error(`Format BCE invalide: ${date}`);
    
    return {
      year: parseInt(match[1]),
      isBCE: true
    };
  }

  /**
   * Parse une date en millénaire
   */
  private static parseMillenniumDate(date: string): ParsedDate {
    const match = date.match(/^(\d+(?:\.\d+)?)\s*(millennium|millénaire)\s*(BCE|BC|BP)$/i);
    if (!match) throw new Error(`Format millénaire invalide: ${date}`);
    
    const millennium = parseFloat(match[1]);
    return {
      year: millennium * 1000,
      isBCE: true
    };
  }

  /**
   * Parse une date géologique
   */
  private static parseGeologicalDate(date: string): ParsedDate {
    const match = date.match(/^(\d+(?:\.\d+)?)\s*(Ga|Ma|ka|ans)$/);
    if (!match) throw new Error(`Format géologique invalide: ${date}`);
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    let years: number;
    switch (unit) {
      case 'Ga':
        years = value * 1000000000;
        break;
      case 'Ma':
        years = value * 1000000;
        break;
      case 'ka':
        years = value * 1000;
        break;
      case 'ans':
        years = value;
        break;
      default:
        throw new Error(`Unité géologique non supportée: ${unit}`);
    }
    
    return {
      year: years,
      isBCE: false
    };
  }

  /**
   * Parse une date relative
   */
  private static parseRelativeDate(date: string): ParsedDate {
    const match = date.match(/^(\d+(?:\.\d+)?)\s*(years?|ans?)\s*(ago|avant)$/i);
    if (!match) throw new Error(`Format relatif invalide: ${date}`);
    
    const years = parseInt(match[1]);
    return {
      year: years,
      isBCE: true
    };
  }

  /**
   * Convertit une date ISO8602 en format demandé
   */
  public static formatFromISO8602(iso8602Date: string, format: 'geological' | 'french' | 'french-time' | 'years'): string {
    try {
      const parsed = this.parseISO8602(iso8602Date);
      if (!parsed) {
        throw new Error(`Format ISO8602 invalide: ${iso8602Date}`);
      }

      switch (format) {
        case 'geological':
          return this.formatToGeological(parsed);
        case 'french':
          return this.formatToFrench(parsed);
        case 'french-time':
          return this.formatToFrenchWithTime(parsed);
        case 'years':
          return this.formatToYears(parsed);
        default:
          throw new Error(`Format de sortie non supporté: ${format}`);
      }
    } catch (error) {
      console.error(`Erreur lors de la conversion de la date ${iso8602Date}:`, error);
      return iso8602Date;
    }
  }

  /**
   * Parse une date ISO8602
   */
  private static parseISO8602(date: string): ISO8602Date | null {
    const match = date.match(/^([GHM])([+-])(\d+)([YMDhms])(\d)(?:T(.+))?$/);
    if (!match) return null;

    const [, timeScale, sign, value, unit, precision, timezone] = match;
    return {
      timeScale: timeScale as TimeScale,
      sign: sign as '+' | '-',
      value: parseInt(value),
      unit: unit as TimeUnit,
      precision: parseInt(precision) as Precision,
      timezone
    };
  }

  /**
   * Convertit en format géologique (Ga, Ma, ans)
   */
  private static formatToGeological(date: ISO8602Date): string {
    const years = date.value;
    if (years >= 1000000000) {
      return `${(years / 1000000000).toFixed(2)} Ga`;
    } else if (years >= 1000000) {
      return `${(years / 1000000).toFixed(2)} Ma`;
    } else {
      return `${years} ans`;
    }
  }

  /**
   * Convertit en format français (JJ/MM/AAAA)
   */
  private static formatToFrench(date: ISO8602Date): string {
    const year = date.sign === '-' ? -date.value : date.value;
    const currentYear = new Date().getFullYear();
    
    // Si la date est dans le futur ou très ancienne, on utilise le format géologique
    if (year > currentYear + 1000 || year < -10000) {
      return this.formatToGeological(date);
    }

    // Pour les dates historiques et modernes
    const dateObj = new Date(year, 0, 1);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Convertit en format français avec heure (JJ/MM/AAAA - HH:mm)
   */
  private static formatToFrenchWithTime(date: ISO8602Date): string {
    const baseDate = this.formatToFrench(date);
    
    // Si la précision n'inclut pas l'heure, on retourne juste la date
    if (date.precision < DateFormatter.PRECISION.HOUR) {
      return baseDate;
    }

    // On utilise l'heure actuelle si non spécifiée
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${baseDate} - ${time}`;
  }

  /**
   * Convertit en format années simples
   */
  private static formatToYears(date: ISO8602Date): string {
    const year = date.sign === '-' ? -date.value : date.value;
    return `${year} ans`;
  }

  /**
   * Traite une date et retourne tous les formats
   */
  public static processDate(date: string): DateConversionResult {
    try {
      // Vérifier si la date est déjà au format ISO8602
      const isISO8602 = this.isISO8602(date);
      const iso8602Date = isISO8602 ? date : this.parseToISO8602(date);

      // Extraire l'année pour les calculs
      const parsedISO8602 = this.parseISO8602(iso8602Date);
      if (!parsedISO8602) {
        throw new Error(`Impossible de parser la date ISO8602: ${iso8602Date}`);
      }

      const year = parsedISO8602.sign === '-' ? -parsedISO8602.value : parsedISO8602.value;
      const currentYear = new Date().getFullYear();
      const yearsFromNow = currentYear - year;
      const totalYears = Math.abs(year);

      // Convertir dans tous les formats demandés
      return {
        original: date,
        iso8602: iso8602Date,
        geological: this.formatFromISO8602(iso8602Date, 'geological'),
        french: this.formatFromISO8602(iso8602Date, 'french'),
        frenchTime: this.formatFromISO8602(iso8602Date, 'french-time'),
        years: `${yearsFromNow} ans`,
        isISO8602,
        numericValues: {
          year,
          yearsFromNow,
          totalYears
        }
      };
    } catch (error) {
      console.error(`Erreur lors du traitement de la date ${date}:`, error);
      return {
        original: date,
        iso8602: date,
        geological: date,
        french: date,
        frenchTime: date,
        years: date,
        isISO8602: false,
        numericValues: {
          year: 0,
          yearsFromNow: 0,
          totalYears: 0
        }
      };
    }
  }

  /**
   * Vérifie si une date est au format ISO8602
   */
  private static isISO8602(date: string): boolean {
    return /^[GHM][+-]\d+[YMDhms]\d(?:T.+)?$/.test(date);
  }

  /**
   * Convertit directement un nombre d'années en format géologique
   */
  public static formatYearsToGeological(years: number): string {
    if (years >= 1000000000) {
      return `${(years / 1000000000).toFixed(2)} Ga`;
    } else if (years >= 1000000) {
      return `${(years / 1000000).toFixed(2)} Ma`;
    } else {
      // Pour les milliers d'années et moins, on affiche simplement le nombre d'années
      return `${Math.round(years)} ans`;
    }
  }

  /**
   * Formate une date pour l'affichage, en prenant en compte le type (période ou événement)
   */
  public static formatForDisplay(
    date: string,
    type: 'period' | 'event'
  ): FormattedDateResult {
    try {
      const processedDate = this.processDate(date);
      const isGeological = processedDate.numericValues.totalYears >= 1000000;

      // Format de base pour le temps écoulé
      const timeElapsed = isGeological
        ? processedDate.geological
        : processedDate.years;

      // Pour les périodes, calculer la durée si nous avons une date de fin
      let duration: string | undefined;
      if (type === 'period' && processedDate.numericValues.totalYears > 0) {
        duration = `(durée: ${processedDate.geological})`;
      }

      return {
        timeElapsed,
        duration,
        rawDate: date,
        type
      };
    } catch (error) {
      console.error(`Erreur lors du formatage de la date ${date}:`, error);
      return {
        timeElapsed: date,
        rawDate: date,
        type
      };
    }
  }

  /**
   * Formate une date selon son type et ses options
   */
  public static formatDate(options: DateFormattingOptions): FormattedPersonDate | FormattedPeriodDate | FormattedEventDate {
    const { type, startDate, endDate, format = 'geological' } = options;

    switch (type) {
      case 'person':
        return this.formatPersonDate(startDate, endDate);
      case 'period':
        return this.formatPeriodDate(startDate, endDate);
      case 'event':
        return this.formatEventDate(startDate);
      default:
        throw new Error(`Type de date non supporté: ${type}`);
    }
  }

  /**
   * Formate une date pour une personne
   */
  private static formatPersonDate(birthDate?: string, deathDate?: string): FormattedPersonDate {
    if (!birthDate && !deathDate) {
      return {
        timeElapsed: 'Dates inconnues',
        rawDate: ''
      };
    }

    const birth = birthDate ? this.processDate(birthDate) : null;
    const death = deathDate ? this.processDate(deathDate) : null;

    if (birth && death) {
      const age = Math.abs(death.numericValues.year - birth.numericValues.year);
      return {
        timeElapsed: this.formatYearsToGeological(death.numericValues.yearsFromNow),
        age: `${age} ans`,
        rawDate: `${birthDate} - ${deathDate}`
      };
    } else if (birth) {
      return {
        timeElapsed: this.formatYearsToGeological(birth.numericValues.yearsFromNow),
        rawDate: birthDate || ''
      };
    } else {
      return {
        timeElapsed: this.formatYearsToGeological(death!.numericValues.yearsFromNow),
        rawDate: deathDate || ''
      };
    }
  }

  /**
   * Formate une date pour une période
   */
  private static formatPeriodDate(start?: string, end?: string): FormattedPeriodDate {
    if (!start) {
      return {
        timeElapsed: 'Date inconnue',
        duration: '',
        rawDate: ''
      };
    }

    if (!end) {
      const result = this.processDate(start);
      return {
        timeElapsed: result.geological,
        duration: '',
        rawDate: start
      };
    }

    const startResult = this.processDate(start);
    const endResult = this.processDate(end);
    
    const duration = Math.abs(endResult.numericValues.year - startResult.numericValues.year);
    const durationFormatted = this.formatYearsToGeological(duration);
    const yearsAgo = endResult.numericValues.yearsFromNow;
    const yearsAgoFormatted = this.formatYearsToGeological(yearsAgo);

    return {
      timeElapsed: yearsAgoFormatted,
      duration: `durée: ${durationFormatted}`,
      rawDate: `${start} - ${end}`
    };
  }

  /**
   * Formate une date pour un événement
   */
  private static formatEventDate(date?: string): FormattedEventDate {
    if (!date) {
      return {
        timeElapsed: 'Date inconnue',
        rawDate: ''
      };
    }

    const result = this.processDate(date);
    
    if (result.geological.includes('Ga') || result.geological.includes('Ma') || result.geological.includes('ka')) {
      return {
        timeElapsed: result.geological,
        rawDate: date
      };
    }
    
    return {
      timeElapsed: `${result.numericValues.yearsFromNow} ans`,
      rawDate: date
    };
  }

  /**
   * Formate une date pour l'affichage dans les résultats de recherche
   */
  public static formatForSearch(
    date: string,
    type: 'period' | 'event' | 'person',
    options?: {
      startDate?: string,
      endDate?: string
    }
  ): string {
    try {
      const formatted = this.formatDate({
        type,
        startDate: options?.startDate || date,
        endDate: options?.endDate
      });

      switch (type) {
        case 'person':
          const personDate = formatted as FormattedPersonDate;
          return personDate.age 
            ? `Il y a ${personDate.timeElapsed} (${personDate.age})`
            : `Il y a ${personDate.timeElapsed}`;
        case 'period':
          const periodDate = formatted as FormattedPeriodDate;
          return periodDate.duration
            ? `Il y a ${periodDate.timeElapsed} (${periodDate.duration})`
            : `Il y a ${periodDate.timeElapsed}`;
        case 'event':
          return `Il y a ${(formatted as FormattedEventDate).timeElapsed}`;
        default:
          return 'Date inconnue';
      }
    } catch (error) {
      console.error(`Erreur lors du formatage de la date ${date}:`, error);
      return 'Date inconnue';
    }
  }
} 