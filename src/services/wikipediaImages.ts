import { createReadCache } from '@/lib/readCache';
import { preferredWikipediaArticle, type WikipediaLanguage } from '@/lib/wikipedia';
import type { WikipediaTitles } from '@/types/database';
import { ReadFailure, readOperation, retryAfterMilliseconds } from '../../server/src/shared/readOperation';

/**
 * Vignette de l'image principale d'un article Wikipédia, lue à la demande (API PageImages).
 * Rien n'est stocké en base : seul le titre de l'article sert de clé ; cache public en mémoire.
 */
export interface WikipediaThumbnail { src: string; width: number; height: number }

/** Largeur demandée : nette dans une bulle de 360 px sur écran haute densité. */
export const WIKIPEDIA_THUMBNAIL_WIDTH = 640;

const cache = createReadCache<WikipediaThumbnail | null>({ maxEntries: 300, ttlMs: 30 * 60000, copy: value => value && { ...value } });
const unavailable = () => new ReadFailure('Wikipédia est momentanément indisponible.', true);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function wikipediaThumbnailUrl(language: WikipediaLanguage, title: string): string {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', redirects: '1',
    prop: 'pageimages', piprop: 'thumbnail', pilicense: 'free', pithumbsize: String(WIKIPEDIA_THUMBNAIL_WIDTH), titles: title,
  });
  return `https://${language}.wikipedia.org/w/api.php?${params}`;
}

/** null = l'article n'a pas d'image libre ; une réponse illisible est une erreur, pas une absence. */
export function readWikipediaThumbnail(data: unknown): WikipediaThumbnail | null {
  if (!record(data) || data.error || !record(data.query) || !Array.isArray(data.query.pages)) throw new ReadFailure('La réponse Wikipédia est invalide.');
  const page = data.query.pages[0];
  const thumbnail = record(page) ? page.thumbnail : undefined;
  if (!record(thumbnail)) return null;
  const { source, width, height } = thumbnail;
  if (typeof source !== 'string' || !/^https:\/\/[a-z0-9.-]+\.wikimedia\.org\//i.test(source)
    || typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return null;
  return { src: source, width, height };
}

export function fetchWikipediaThumbnail(titles: Partial<WikipediaTitles> | null | undefined, options: { signal?: AbortSignal } = {}): Promise<WikipediaThumbnail | null> {
  const article = preferredWikipediaArticle(titles);
  if (!article) return Promise.resolve(null);
  const url = wikipediaThumbnailUrl(article.language, article.title);
  return cache.read(url, signal => readOperation(async active => {
    let response: Response;
    try { response = await fetch(url, { signal: active, headers: { 'Api-User-Agent': 'UniversalTimeline/1.0' } }); }
    catch (error) { if (active.aborted) throw error; throw unavailable(); }
    if (!response.ok) throw new ReadFailure('Wikipédia est momentanément indisponible.', response.status === 429 || response.status >= 500, retryAfterMilliseconds(response.headers?.get('Retry-After')));
    let data: unknown;
    try { data = await response.json(); } catch { throw new ReadFailure('La réponse Wikipédia est invalide.'); }
    return readWikipediaThumbnail(data);
  }, { signal, timeoutMs: 10000 }), options);
}
