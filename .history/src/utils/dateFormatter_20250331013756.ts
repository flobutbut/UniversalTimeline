/**
 * Classe utilitaire pour le formatage des dates
 */
export class DateFormatter {
  private static readonly GA_PATTERN = /^(\d+(?:\.\d+)?)\s*Ga$/i;
  private static readonly MA_PATTERN = /^(\d+(?:\.\d+)?)\s*Ma$/i;
  private static readonly YEARS_PATTERN = /^(\d+(?:\.\d+)?)\s*ans$/i;

  /**
   * Convertit une date en années avant le présent (Ga, Ma, ans)
   */
  static formatGeologicalDate(dateString: string): string {
    try {
      console.log('Formatage de la date:', dateString);
      
      let years: number;

      // Extraction de l'année depuis la chaîne ISO
      if (dateString.includes('T') && dateString.endsWith('Z')) {
        // Format: -538800000-01-01T00:00:00Z
        years = Math.abs(parseInt(dateString.split('-')[1] || dateString.split('T')[0]));
        console.log('Année extraite:', years);
      }
      // Si c'est une date simple (YYYY-MM-DD)
      else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        years = Math.abs(parseInt(dateString.split('-')[0]));
        console.log('Année extraite:', years);
      }
      // Si c'est juste une année
      else if (dateString.match(/^\d{4}$/)) {
        years = Math.abs(parseInt(dateString));
        console.log('Année extraite:', years);
      }
      else {
        console.warn('Format de date non reconnu:', dateString);
        return dateString;
      }

      console.log('Années calculées:', years);

      // Conversion en années avant le présent
      if (years >= 1000000000) {
        // Milliards d'années (Ga)
        return `${(years / 1000000000).toFixed(2)} Ga`;
      } else if (years >= 1000000) {
        // Millions d'années (Ma)
        return `${(years / 1000000).toFixed(2)} Ma`;
      } else {
        // Années
        return `${years} ans`;
      }
    } catch (error) {
      console.error('Erreur de formatage de date géologique:', error);
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
      console.error('Erreur de formatage de date française:', error);
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
      console.error('Erreur de formatage de date anglaise:', error);
      return dateString;
    }
  }

  /**
   * Formate une date selon le format demandé
   */
  static format(date: string, format: 'geological' | 'french' | 'english' = 'geological'): string {
    if (!date) return '';

    // Gestion des formats géologiques (Ga, Ma, ans)
    if (format === 'geological') {
      const gaMatch = date.match(this.GA_PATTERN);
      if (gaMatch) {
        const value = parseFloat(gaMatch[1]);
        return `${(value * 1000000000).toFixed(0)} ans`;
      }

      const maMatch = date.match(this.MA_PATTERN);
      if (maMatch) {
        const value = parseFloat(maMatch[1]);
        return `${(value * 1000000).toFixed(0)} ans`;
      }

      const yearsMatch = date.match(this.YEARS_PATTERN);
      if (yearsMatch) {
        return date;
      }

      // Si le format n'est pas reconnu, on essaie de le convertir en années
      const numericValue = parseFloat(date);
      if (!isNaN(numericValue)) {
        return `${numericValue.toFixed(0)} ans`;
      }

      return date;
    }

    // Gestion des formats de date standards
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return date;
    }

    switch (format) {
      case 'french':
        return this.formatFrenchDate(date);
      case 'english':
        return this.formatEnglishDate(date);
      default:
        return date;
    }
  }
} 