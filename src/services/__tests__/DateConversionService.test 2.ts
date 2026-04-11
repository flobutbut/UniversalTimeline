/**
 * Tests pour le service de conversion de dates
 */

import { describe, it, expect } from 'vitest';
import { DateConversionService } from '../DateConversionService';

describe('DateConversionService', () => {
  describe('convertDate', () => {
    describe('Format ISO8601', () => {
      it('devrait convertir une date ISO8601 négative vers tous les formats', () => {
        const result = DateConversionService.convertDate('-3600000000-01-01T00:00:00Z');
        
        expect(result.isValid).toBe(true);
        expect(result.iso8601).toBe('-3600000000-01-01T00:00:00Z');
        expect(result.isBCE).toBe(true);
        expect(result.years).toBe(3600000000);
        expect(result.geological).toBe('3.60 Ga');
      });

      it('devrait convertir une date ISO8601 positive vers tous les formats', () => {
        const result = DateConversionService.convertDate('+1923-04-18T00:00:00Z');
        
        expect(result.isValid).toBe(true);
        expect(result.iso8601).toBe('+0000001923-01-01T00:00:00Z');
        expect(result.isBCE).toBe(false);
        expect(result.years).toBe(1923);
        expect(result.modern).toContain('1923');
      });
    });

    describe('Format moderne', () => {
      it('devrait convertir une date moderne française', () => {
        const result = DateConversionService.convertDate('18 avril 1923');
        
        expect(result.isValid).toBe(true);
        expect(result.modern).toContain('1923');
        expect(result.isBCE).toBe(false);
        expect(result.years).toBe(1923);
      });

      it('devrait gérer les dates avec mois en minuscules', () => {
        const result = DateConversionService.convertDate('15 janvier 2024');
        
        expect(result.isValid).toBe(true);
        expect(result.modern).toContain('2024');
        expect(result.years).toBe(2024);
      });
    });

    describe('Format BCE', () => {
      it('devrait convertir une date BCE simple', () => {
        const result = DateConversionService.convertDate('-800');
        
        expect(result.isValid).toBe(true);
        expect(result.isBCE).toBe(true);
        expect(result.years).toBe(800);
        expect(result.bce).toBe('800 BCE');
      });

      it('devrait convertir une date BCE avec texte', () => {
        const result = DateConversionService.convertDate('800 BCE');
        
        expect(result.isValid).toBe(true);
        expect(result.isBCE).toBe(true);
        expect(result.years).toBe(800);
        expect(result.bce).toBe('800 BCE');
      });

      it('devrait convertir une date BCE en français', () => {
        const result = DateConversionService.convertDate('800 avant J.-C.');
        
        expect(result.isValid).toBe(true);
        expect(result.isBCE).toBe(true);
        expect(result.years).toBe(800);
      });
    });

    describe('Format géologique', () => {
      it('devrait convertir une date en millions d\'années', () => {
        const result = DateConversionService.convertDate('4 Ma');
        
        expect(result.isValid).toBe(true);
        expect(result.years).toBe(4000000);
        expect(result.geological).toBe('4.00 Ma');
        expect(result.isBCE).toBe(true);
      });

      it('devrait convertir une date en milliards d\'années', () => {
        const result = DateConversionService.convertDate('4.5 Ga');
        
        expect(result.isValid).toBe(true);
        expect(result.years).toBe(4500000000);
        expect(result.geological).toBe('4.50 Ga');
        expect(result.isBCE).toBe(true);
      });

      it('devrait convertir une date en milliers d\'années', () => {
        const result = DateConversionService.convertDate('40 ka');
        
        expect(result.isValid).toBe(true);
        expect(result.years).toBe(40000);
        expect(result.geological).toBe('40.00 ka');
        expect(result.isBCE).toBe(true);
      });

      it('devrait convertir une date en années simples', () => {
        const result = DateConversionService.convertDate('40000 ans');
        
        expect(result.isValid).toBe(true);
        expect(result.years).toBe(40000);
        expect(result.geological).toBe('40.00 ka');
        expect(result.isBCE).toBe(true);
      });
    });

    describe('Format année simple', () => {
      it('devrait convertir une année positive', () => {
        const result = DateConversionService.convertDate('1923');
        
        expect(result.isValid).toBe(true);
        expect(result.years).toBe(1923);
        expect(result.isBCE).toBe(false);
      });

      it('devrait convertir une année négative', () => {
        const result = DateConversionService.convertDate('-800');
        
        expect(result.isValid).toBe(true);
        expect(result.years).toBe(800);
        expect(result.isBCE).toBe(true);
      });
    });

    describe('Gestion d\'erreurs', () => {
      it('devrait gérer une date invalide', () => {
        const result = DateConversionService.convertDate('date invalide');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('devrait gérer une chaîne vide', () => {
        const result = DateConversionService.convertDate('');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('convertDateRange', () => {
    it('devrait convertir une plage de dates', () => {
      const result = DateConversionService.convertDateRange('4 Ma', '2 Ma');
      
      expect(result.start.isValid).toBe(true);
      expect(result.end.isValid).toBe(true);
      expect(result.duration).toBeDefined();
      expect(result.duration?.years).toBe(2000000);
      expect(result.duration?.geological).toBe('2.00 Ma');
    });

    it('devrait gérer une plage avec dates invalides', () => {
      const result = DateConversionService.convertDateRange('date invalide', '2 Ma');
      
      expect(result.start.isValid).toBe(false);
      expect(result.end.isValid).toBe(true);
      expect(result.duration).toBeUndefined();
    });
  });

  describe('formatForDisplay', () => {
    it('devrait formater pour timeline', () => {
      const result = DateConversionService.formatForDisplay('4 Ma', 'timeline');
      expect(result).toBe('4.00 Ma');
    });

    it('devrait formater pour détail', () => {
      const result = DateConversionService.formatForDisplay('18 avril 1923', 'detail');
      expect(result).toContain('1923');
    });

    it('devrait formater pour recherche', () => {
      const result = DateConversionService.formatForDisplay('800 BCE', 'search');
      expect(result).toContain('→');
    });
  });

  describe('isValidDateRange', () => {
    it('devrait valider une date dans la plage acceptable', () => {
      expect(DateConversionService.isValidDateRange('4 Ma')).toBe(true);
      expect(DateConversionService.isValidDateRange('18 avril 1923')).toBe(true);
      expect(DateConversionService.isValidDateRange('800 BCE')).toBe(true);
    });

    it('devrait rejeter une date hors plage', () => {
      expect(DateConversionService.isValidDateRange('10 Ga')).toBe(false); // Trop ancien
      expect(DateConversionService.isValidDateRange('date invalide')).toBe(false);
    });
  });

  describe('Conversions croisées', () => {
    it('devrait maintenir la cohérence entre formats', () => {
      const original = '4 Ma';
      const converted = DateConversionService.convertDate(original);
      
      // Reconversion vers ISO8601 puis vers géologique
      const backToGeological = DateConversionService.convertDate(converted.iso8601, { inputFormat: 'iso8601' });
      
      expect(backToGeological.geological).toBe('4.00 Ma');
      expect(backToGeological.years).toBe(4000000);
    });

    it('devrait gérer les conversions BCE', () => {
      const original = '800 BCE';
      const converted = DateConversionService.convertDate(original);
      
      expect(converted.isBCE).toBe(true);
      expect(converted.years).toBe(800);
      expect(converted.bce).toBe('800 BCE');
    });
  });

  /**
   * Teste la conversion d'une liste de dates issues d'un tableau (capture d'écran)
   */
  describe('Conversion de masse (tableau screenshot)', () => {
    const datesATester = [
      "-538800000-01-01T00:00:00Z",
      "-251902000-01-01T00:00:00Z",
      "-299800000-01-01T00:00:00Z",
      "-419200000-01-01T00:00:00Z",
      "-358900000-01-01T00:00:00Z",
      "-320000000-01-01T00:00:00Z",
      "-280000000-01-01T00:00:00Z",
      "0476-01-01T00:00:00Z",
      "1453-01-01T00:00:00Z",
      "-250000000-01-01T00:00:00Z",
      "1848-02-24T00:00:00Z",
      "1852-01-01T00:00:00Z",
      "1946-01-01T00:00:00Z",
      "1958-01-01T00:00:00Z",
      "1799-11-09T00:00:00Z",
      "1804-05-18T00:00:00Z",
      "1958-10-04T00:00:00Z",
      "TODAY",
      "-403100000-01-01T00:00:00Z",
      "-4567300000-01-01T00:00:00Z",
      "-160000000-01-01T00:00:00Z",
      "-100000000-01-01T00:00:00Z",
      "-145000000-01-01T00:00:00Z",
      "-66000000-01-01T00:00:00Z"
    ];

    it('doit convertir toutes les dates sans erreur bloquante', () => {
      datesATester.forEach(date => {
        let toConvert = date;
        if (date === 'TODAY') {
          const now = new Date();
          toConvert = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + 'T00:00:00Z';
        }
        const result = DateConversionService.convertDate(toConvert);
        expect(result).toBeDefined();
        expect(result.isValid).toBe(true);
        // Affichage console pour debug
        // eslint-disable-next-line no-console
        console.log(`Entrée : ${date} => Moderne: ${result.modern} | Géologique: ${result.geological} | ISO8601: ${result.iso8601} | BCE: ${result.bce}`);
      });
    });
  });

  describe('Conversion bidirectionnelle date française complète', () => {
    it('devrait convertir "14 juillet 1969" en "1969-07-14T00:00:00Z"', () => {
      const { toISO8601 } = require('@/composables/useDateConversion');
      const iso = toISO8601('14 juillet 1969');
      expect(iso).toBe('1969-07-14T00:00:00Z');
    });
  });

  describe('Conversion ISO8601 complète vers date moderne', () => {
    it('devrait convertir "1969-08-01T00:00:00Z" en "1 août 1969"', () => {
      const result = DateConversionService.convertDate('1969-08-01T00:00:00Z');
      expect(result.modern).toMatch(/1\s*août\s*1969/);
    });
  });
}); 