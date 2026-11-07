import { describe, expect, it } from 'vitest';
import { applyMetadata, pageMetadata, renderMetadata, SITE_ORIGIN, timelineStoryId } from '../metadata';

const url = (path: string) => new URL(path, SITE_ORIGIN);
const story = { id: '22', title: 'Les cinq grandes extinctions', description: 'Les crises du vivant, leurs causes et leurs reprises.' };

describe('SEO policy without changing the app', () => {
  it('replaces only managed head tags, escapes public text and preserves the entire body', () => {
    const html = '<html><head><title>Old</title><meta name="description" content="Old"><meta name="robots" content="index"><link rel="canonical" href="https://old.example"><link rel="stylesheet" href="/assets/app.css"></head><body><div id="app"></div><script src="/assets/app.js"></script></body></html>';
    const result = renderMetadata(html, pageMetadata(url('/timeline?story=22'), { ...story, title: '</title><script>alert("x")</script>', description: 'A "quote" & B' }));
    expect(result.slice(result.indexOf('<body>'))).toBe(html.slice(html.indexOf('<body>')));
    document.documentElement.innerHTML = result;
    expect(document.head.querySelectorAll('title')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector('script')).toBeNull();
    expect(document.title).toContain('</title><script>alert("x")</script>');
    expect(document.head.querySelector('link[rel="stylesheet"]')?.getAttribute('href')).toBe('/assets/app.css');
  });
  it.each(['/search?q=secret', '/generate?wikidata=Q123', '/login?redirect=/database', '/reset-password#access_token=secret', '/database?story=55', '/profile', '/admin', '/periods', '/graph', '/events', '/design-system', '/voyage', '/forbidden', '/unknown'])('excludes a utility or unknown page (%s)', path => {
    const metadata = pageMetadata(url(path));
    expect(metadata.robots).toBe('noindex, follow');
    expect(metadata.canonical).toBeUndefined();
    expect(metadata.title + metadata.description).not.toContain('secret');
  });
  it('consolidates campaign parameters without changing the requested URL', () => {
    const requested = url('/timeline?utm_source=example&story=22&view=overview#marker');
    const original = requested.href;
    const metadata = pageMetadata(requested, story);
    expect(metadata.canonical).toBe(`${SITE_ORIGIN}/timeline?story=22&view=overview`);
    expect(metadata.robots).toBe('index, follow');
    expect(metadata.title).toContain(story.title);
    expect(requested.href).toBe(original);
  });
  it.each(['period=p1', 'context=3', 'reference=p1', 'compare=9', 'view=unknown', 'view=overview&period=p1', 'entry=unknown', 'view=overview&view=overview'])('keeps navigation variants out of Search without misidentifying another view (%s)', query => {
    const metadata = pageMetadata(url(`/timeline?story=22&${query}`), story);
    expect(metadata.robots).toBe('noindex, follow');
    expect(metadata.canonical).toBeUndefined();
  });
  it('never treats an unrelated or missing public record as the requested frise', () => {
    expect(pageMetadata(url('/timeline?story=23'), story).title).not.toContain(story.title);
    expect(pageMetadata(url('/timeline?story=22'), null).robots).toBe('noindex, follow');
  });
  it('excludes preview deployments even when a public frise is available', () => {
    const metadata = pageMetadata(url('/timeline?story=22'), story, false);
    expect(metadata.robots).toBe('noindex, follow');
    expect(metadata.canonical).toBeUndefined();
  });
  it('removes a public canonical and title when navigating back to account pages', () => {
    applyMetadata(pageMetadata(url('/timeline?story=22'), story));
    expect(document.title).toContain(story.title);
    applyMetadata(pageMetadata(url('/login')));
    expect(document.title).toContain('Connexion');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
  });
  it.each(['story=0', 'story=01', 'story=-1', 'story=2147483648', 'story=1&story=2', 'story='])('rejects invalid or ambiguous identifiers (%s)', query => {
    expect(timelineStoryId(new URLSearchParams(query))).toBeNull();
  });
});
