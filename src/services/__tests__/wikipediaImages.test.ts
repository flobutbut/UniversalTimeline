import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWikipediaThumbnail, readWikipediaThumbnail, wikipediaThumbnailUrl } from '@/services/wikipediaImages';

const page = (thumbnail?: unknown) => ({ query: { pages: [{ title: 'X', ...(thumbnail ? { thumbnail } : {}) }] } });
const thumb = { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X.jpg/640px-X.jpg', width: 640, height: 480 };

afterEach(() => vi.unstubAllGlobals());

describe('wikipediaImages', () => {
  it('demande une vignette libre de l’article, redirections suivies', () => {
    const url = new URL(wikipediaThumbnailUrl('fr', 'Révolution française'));
    expect(url.host).toBe('fr.wikipedia.org');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ prop: 'pageimages', pilicense: 'free', redirects: '1', origin: '*', titles: 'Révolution française' });
  });

  it('distingue l’absence d’image d’une réponse illisible', () => {
    expect(readWikipediaThumbnail(page(thumb))).toEqual({ src: thumb.source, width: 640, height: 480 });
    expect(readWikipediaThumbnail(page())).toBeNull();
    expect(readWikipediaThumbnail(page({ ...thumb, source: 'https://example.org/x.jpg' }))).toBeNull();
    expect(() => readWikipediaThumbnail({ error: { code: 'x' } })).toThrow();
    expect(() => readWikipediaThumbnail(null)).toThrow();
  });

  it('ne lit rien sans article, préfère le français et met en cache', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(page(thumb)), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchWikipediaThumbnail({ fr: null, en: null })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    const titles = { fr: 'Test cache vignette', en: 'Cache test' };
    expect(await fetchWikipediaThumbnail(titles)).toMatchObject({ src: thumb.source });
    expect(await fetchWikipediaThumbnail(titles)).toMatchObject({ src: thumb.source });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('https://fr.wikipedia.org/');
  });

  it('ne mémorise pas une panne', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const titles = { fr: null, en: 'Failure not cached' };
    await expect(fetchWikipediaThumbnail(titles)).rejects.toThrow();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(page()), { status: 200 }));
    expect(await fetchWikipediaThumbnail(titles)).toBeNull();
  });
});
