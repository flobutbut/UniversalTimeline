import { principalContext } from '../../auth/context.js';
import { getPublicStoryMetadata, listPublicSitemapStories } from '../../services/storyService.js';
import { publicApiError } from '../errors.js';
import { parseStoryId } from '../inputValidation.js';
import type { FetchPublicResource } from './timelineResponse.js';

/** In-process public reads avoid a second HTTP invocation of the same Express service. */
export function createPublicSeoRead(fetchTemplate: FetchPublicResource = fetch): FetchPublicResource {
  return async (url, options) => {
    const match = /^\/api\/seo\/stories\/([1-9]\d*)$/.exec(url.pathname);
    if (url.pathname !== '/api/seo/stories' && !match) return fetchTemplate(url, options);
    let abort: (() => void) | undefined;
    try {
      options.signal?.throwIfAborted();
      const operation = principalContext.run({ userId: null, isAdmin: false }, () =>
        match ? getPublicStoryMetadata(parseStoryId(match[1])) : listPublicSitemapStories());
      const payload = options.signal ? await Promise.race([
        operation,
        new Promise<never>((_resolve, reject) => {
          abort = () => reject(new Error('Public SEO read timed out'));
          options.signal!.addEventListener('abort', abort, { once: true });
          if (options.signal!.aborted) abort();
        }),
      ]) : await operation;
      return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      const failure = publicApiError(error, 'Les informations publiques sont indisponibles.');
      return new Response(JSON.stringify({ error: failure.message }), { status: options.signal?.aborted ? 503 : failure.status, headers: { 'Content-Type': 'application/json' } });
    } finally { if (abort) options.signal?.removeEventListener('abort', abort); }
  };
}
