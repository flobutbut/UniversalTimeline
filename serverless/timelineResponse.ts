import { pageMetadata, renderMetadata, timelineStoryId, type PublicStoryMetadata } from '../src/seo/metadata.js';

export type FetchPublicResource = (url: URL, options: RequestInit) => Promise<Response>;

/** Anonymous, same-deployment reads only. Neither cookies nor Authorization are forwarded. */
export async function timelineResponse(request: Request, read: FetchPublicResource = fetch, allowIndexing = true): Promise<Response | undefined> {
  if (!['GET', 'HEAD'].includes(request.method)) return undefined;
  const url = new URL(request.url);
  const id = timelineStoryId(url.searchParams);
  const options: RequestInit = { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(2500) };
  const templateUrl = new URL('/__seo__/timeline.html', url.origin);
  const storyPromise = id ? read(new URL(`/api/seo/stories/${id}`, url.origin), { ...options, signal: AbortSignal.timeout(1500) })
    .then(async response => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Public metadata unavailable');
      const value: unknown = await response.json();
      if (!value || typeof value !== 'object') throw new Error('Invalid public metadata');
      const story = value as Partial<PublicStoryMetadata>;
      if (story.id !== id || typeof story.title !== 'string' || typeof story.description !== 'string') throw new Error('Invalid public metadata');
      return story as PublicStoryMetadata;
    }).then(story => ({ story, unavailable: false }), () => ({ story: null, unavailable: true })) : Promise.resolve({ story: null, unavailable: false });
  try {
    const [template, result] = await Promise.all([read(templateUrl, options), storyPromise]);
    if (!template.ok || !template.headers.get('content-type')?.includes('text/html')) throw new Error('Template unavailable');
    const metadata = pageMetadata(url, result.story, allowIndexing);
    return new Response(request.method === 'HEAD' ? null : renderMetadata(await template.text(), metadata), {
      // Do not teach crawlers a temporary noindex when the metadata service is down.
      // The unchanged app still runs for visitors; crawlers retry a temporary 503.
      status: result.unavailable ? 503 : 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', ...(result.unavailable ? { 'Retry-After': '60' } : {}) },
    });
  } catch {
    // Continue to the existing static application if the head enrichment is unavailable.
    return undefined;
  }
}
