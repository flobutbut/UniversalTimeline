import fs from 'node:fs/promises';

// Anonymous GETs only; no credentials, writes, or automatic retries.
const results = [];
for (const origin of ['http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'https://universaltimeline.net']) {
  for (const path of ['/api/access', '/api/stories', '/api/stories/1', '/api/stories/51', ...(origin.startsWith('https:') ? ['/timeline?story=1', '/timeline?story=51'] : [])]) {
    for (let sample = 1; sample <= 3; sample++) {
      const start = performance.now();
      try {
        const response = await fetch(origin + path, { signal: AbortSignal.timeout(20000) });
        const headersMs = performance.now() - start;
        const body = await response.text();
        const result = {
          origin, path, sample, status: response.status,
          headersMs: Math.round(headersMs), totalMs: Math.round(performance.now() - start),
          bytes: Buffer.byteLength(body), contentType: response.headers.get('content-type'),
          cache: response.headers.get('cache-control'), encoding: response.headers.get('content-encoding'),
          platformCache: response.headers.get('x-vercel-cache'),
        };
        if (response.ok && path === '/api/stories') result.storyCount = JSON.parse(body).length;
        results.push(result);
        console.log(JSON.stringify(result));
      } catch (error) {
        const result = { origin, path, sample, error: error.cause?.code ?? error.name, totalMs: Math.round(performance.now() - start) };
        results.push(result);
        console.log(JSON.stringify(result));
      }
    }
  }
}
await fs.writeFile(new URL('http-measurements.json', import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2));
