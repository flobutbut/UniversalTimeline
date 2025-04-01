/**
 * Classe utilitaire pour le formatage des dates
 */
export class DateFormatter {
  private static readonly GEOLOGICAL_DATE_PATTERN = /^(\d+(?:\.\d+)?)\s*(Ga|Ma|ka|ans)$/;
  private static readonly RECENT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

  /**
   * Convertit une date en années avant le présent (Ga, Ma, ans)
   */
  static formatGeologicalDate(dateString: string): string {
    try {
      console.log('Formatage de la date:', dateString);
      
      // Si la date est déjà formatée avec Ga, Ma, ka ou ans, on la retourne telle quelle
      if (dateString.endsWith(' Ga') || dateString.endsWith(' Ma') || dateString.endsWith(' ka') || dateString.endsWith(' ans')) {
        return dateString;
      }

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
      } else if (years >= 1000) {
        // Milliers d'années (ka)
        return `${(years / 1000).toFixed(2)} ka`;
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
  static format(date: string, type: 'geological' | 'recent' = 'geological'): string {
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
} 