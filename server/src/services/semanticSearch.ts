import { ReadFailure, readOperation } from '../shared/readOperation.js';

export interface SemanticCandidate { id: string; score: number }
const cache = new Map<string, { at: number; value: SemanticCandidate[] }>();
/** Public, read-only candidates. No account data or credentials are forwarded upstream. */
export async function semanticSearch(query: string, signal?: AbortSignal): Promise<SemanticCandidate[]> {
  const key = query.trim();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 5 * 60000) return cached.value.map(row => ({ ...row }));
  const result = await readOperation(async active => {
    const url = new URL('https://wd-vectordb.wmcloud.org/item/query/');
    url.search = new URLSearchParams({ query: key, lang: 'all', K: '20', scope: 'with_sitelinks', rerank: 'false' }).toString();
    const response = await fetch(url, { signal: active, headers: { Accept: 'application/json', 'User-Agent': 'UniversalTimeline/1.0 (historical timeline editor; Wikidata entity discovery)' } });
    if (!response.ok) throw new ReadFailure('La recherche par sens est momentanément indisponible.', response.status === 429 || response.status >= 500);
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.some(row => !row || typeof row.QID !== 'string' || !/^Q[1-9]\d*$/.test(row.QID) || typeof row.similarity_score !== 'number' || !Number.isFinite(row.similarity_score))) throw new ReadFailure('La réponse de recherche par sens est invalide.');
    return data.map(row => ({ id: row.QID as string, score: row.similarity_score as number }));
  }, { signal, timeoutMs: 18000, attempts: 1 });
  cache.delete(key); cache.set(key, { at: Date.now(), value: result });
  while (cache.size > 100) cache.delete(cache.keys().next().value!);
  return result.map(row => ({ ...row }));
}
