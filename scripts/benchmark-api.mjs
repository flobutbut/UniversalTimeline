// Read-only public API sample. No account token, database connection or application .env.
const base = new URL(process.argv[2] || 'https://universaltimeline.net');
if (base.username || base.password || !['http:', 'https:'].includes(base.protocol)) throw new Error('A public HTTP(S) origin is required.');
const routes = ['/stories', '/stories/1', '/stories/1/periods', '/stories/1/events'];
const samples = [];
for (let round = 0; round < 3; round++) {
  samples.push(...await Promise.all(routes.map(async route => {
    const start = performance.now();
    const response = await fetch(new URL(`/api${route}`, base), { signal: AbortSignal.timeout(30000) });
    const headersMs = Math.round(performance.now() - start);
    if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
    const body = await response.text();
    return { round, route, status: response.status, headersMs, totalMs: Math.round(performance.now() - start), bodyBytes: Buffer.byteLength(body), vercelId: response.headers.get('x-vercel-id') };
  })));
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), origin: base.origin, samples,
  medians: Object.fromEntries(routes.map(route => [route, median(samples.filter(sample => sample.route === route).map(sample => sample.totalMs))])),
}, null, 2));
