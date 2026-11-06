import { describe, expect, it } from 'vitest';
import { normalizeWikipediaTitle, preferredWikipediaArticle, wikipediaArticleUrl, wikipediaTitleFromInput } from '@/lib/wikipedia';

describe('titres Wikipédia', () => {
  it('stocke les espaces plutôt que les tirets bas et refuse les caractères interdits', () => {
    expect(normalizeWikipediaTitle('  Révolution_française ')).toBe('Révolution française');
    expect(normalizeWikipediaTitle('   ')).toBeNull();
    for (const title of ['Ancre#section', 'Crochet [x]', 'A|B', 'x'.repeat(256), 'Ligne\u0007']) expect(normalizeWikipediaTitle(title)).toBeUndefined();
  });

  it('accepte une adresse d’article de la bonne langue, y compris mobile', () => {
    expect(wikipediaTitleFromInput('https://fr.wikipedia.org/wiki/Course_%C3%A0_l%27espace', 'fr')).toBe('Course à l\'espace');
    expect(wikipediaTitleFromInput('https://fr.m.wikipedia.org/wiki/AC/DC#Histoire', 'fr')).toBe('AC/DC');
    expect(wikipediaTitleFromInput('https://en.wikipedia.org/wiki/Big_Bang', 'fr')).toBeUndefined();
    expect(wikipediaTitleFromInput('https://example.org/wiki/Big_Bang', 'en')).toBeUndefined();
    expect(wikipediaTitleFromInput('', 'en')).toBeNull();
  });

  it('construit une adresse lisible et préfère l’article français', () => {
    expect(wikipediaArticleUrl('fr', 'Course à l\'espace')).toBe('https://fr.wikipedia.org/wiki/Course_%C3%A0_l\'espace');
    expect(wikipediaArticleUrl('en', 'AC/DC: Live')).toBe('https://en.wikipedia.org/wiki/AC/DC:_Live');
    expect(preferredWikipediaArticle({ fr: 'Terre', en: 'Earth' })?.url).toBe('https://fr.wikipedia.org/wiki/Terre');
    expect(preferredWikipediaArticle({ fr: null, en: 'Earth' })).toMatchObject({ language: 'en', url: 'https://en.wikipedia.org/wiki/Earth' });
    expect(preferredWikipediaArticle({ fr: null, en: null })).toBeNull();
    expect(preferredWikipediaArticle(undefined)).toBeNull();
  });
});
