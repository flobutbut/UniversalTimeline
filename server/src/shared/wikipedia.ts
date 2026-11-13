/** Wikipedia article titles shared by the API and the page; no application dependency. */
export type WikipediaLanguage = 'fr' | 'en';
export interface WikipediaTitles { fr: string | null; en: string | null }

export const WIKIPEDIA_TITLE_MAX = 255;
/** Characters MediaWiki refuses in a title, plus control characters (same rule as the database CHECK). */
const FORBIDDEN = /[[\]#<>|{}\u0000-\u001f\u007f]/;

/**
 * Stored form of a title: spaces instead of underscores, trimmed. Returns null for an empty value
 * and undefined when the text cannot be a Wikipedia title.
 */
export function normalizeWikipediaTitle(value: string): string | null | undefined {
  const title = value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!title) return null;
  if (title.length > WIKIPEDIA_TITLE_MAX || FORBIDDEN.test(title)) return undefined;
  return title;
}

/** Accepts a title or an article URL of that language (pasted from the browser). */
export function wikipediaTitleFromInput(value: string, language: WikipediaLanguage): string | null | undefined {
  const text = value.trim();
  const match = /^https?:\/\/([a-z-]+)(?:\.m)?\.wikipedia\.org\/wiki\/([^?#]+)(?:[?#].*)?$/i.exec(text);
  if (!match) return /^https?:\/\//i.test(text) ? undefined : normalizeWikipediaTitle(text);
  if (match[1].toLowerCase() !== language) return undefined;
  try { return normalizeWikipediaTitle(decodeURIComponent(match[2])); } catch { return undefined; }
}

export function wikipediaArticleUrl(language: WikipediaLanguage, title: string): string {
  const path = encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/').replace(/%3A/g, ':');
  return `https://${language}.wikipedia.org/wiki/${path}`;
}

/** Prefer the requested edition, then use the other available article. */
export function preferredWikipediaArticle(titles: Partial<WikipediaTitles> | null | undefined, preferred: WikipediaLanguage = 'fr'): { language: WikipediaLanguage; title: string; url: string } | null {
  for (const language of [preferred, preferred === 'fr' ? 'en' : 'fr'] as const) {
    const title = titles?.[language];
    if (title) return { language, title, url: wikipediaArticleUrl(language, title) };
  }
  return null;
}
