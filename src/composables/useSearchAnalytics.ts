import { onScopeDispose, watch, type Ref } from 'vue';
import { track, type SearchCompletedProperties } from '@/lib/analytics';
import { announceTimelineEntry } from '@/lib/explorationAnalytics';
import type { GlobalSearchResult, StorySearchResult } from '@/services/SearchApiService';

/**
 * A number that can identify someone: six digits in a row, or six digits or more written in groups of two or three
 * (phone, account). Years and year ranges (1914-1918, 1789 1799) are kept, a chronology needs them.
 */
function identifyingNumber(term: string) {
  return (term.match(/\d+(?:[ .-]\d+)*/g) ?? []).some(run => {
    const groups = run.split(/[ .-]/);
    return groups.some(group => group.length >= 6) || (groups.join('').length >= 6 && groups.every(group => group.length <= 3));
  });
}

/** Term of a search that found no frise, or null when it may hold personal data: an address, a link or such a number. */
export function searchTermForAnalytics(text: string): string | null {
  const term = text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');
  if (!term || term.includes('@') || /https?:|www\.|\.(com|fr|net|org|io)\b/.test(term) || identifyingNumber(term)) return null;
  return term.slice(0, 50);
}

interface SourceState<T> { results: Ref<T[]>; loading: Ref<boolean>; error: Ref<string | null> }

/**
 * One `search_completed` per search: from the first query of two characters to a chosen result or an abandonment.
 * Counts come from the last settled query, captured before the field is cleared or the requests are cancelled.
 */
export function useSearchAnalytics(options: {
  surface: () => 'header' | 'page';
  query: () => string;
  enabled: () => boolean;
  stories: SourceState<unknown>;
  wikidata: SourceState<unknown>;
}) {
  let active = false;
  const queries = new Set<string>();
  let settled: { query: string; stories: number | null; wikidata: number | null } | null = null;

  watch(options.query, value => { if (value.trim().length >= 2) active = true; });
  function record(source: 'stories' | 'wikidata', state: SourceState<unknown>) {
    watch([state.loading, state.error, state.results], () => {
      const query = options.query().trim();
      // A cancellation (closed field, cleared query) resets the results: it is not an answer.
      if (state.loading.value || !options.enabled() || query.length < 2) return;
      if (settled?.query !== query) settled = { query, stories: null, wikidata: null };
      settled[source] = state.error.value ? null : state.results.value.length;
      queries.add(query);
    });
  }
  record('stories', options.stories);
  record('wikidata', options.wikidata);

  function finish(outcome: SearchCompletedProperties['outcome'], extra: Partial<SearchCompletedProperties> = {}, transport?: 'sendBeacon') {
    if (!active) return;
    const query = options.query().trim();
    const last = settled?.query === query ? settled : null;
    const properties: SearchCompletedProperties = {
      surface: options.surface(), outcome, query_length: query.length, reformulations: Math.max(0, queries.size - 1),
      story_results: last?.stories ?? null, wikidata_results: last?.wikidata ?? null, ...extra,
    };
    if (properties.story_results === 0) {
      const term = searchTermForAnalytics(query);
      if (term) properties.query = term; else properties.query_redacted = true;
    }
    active = false; queries.clear(); settled = null;
    track('search_completed', properties, transport ? { transport } : undefined);
  }

  function selected(hit: GlobalSearchResult, position: number) {
    if ('fromWikidata' in hit && hit.fromWikidata) {
      finish('wikidata', { position, wikidata_id: hit.id, wikidata_label: hit.label.slice(0, 100) });
    } else {
      // The frise is identified (when public) by the timeline event that follows, marked as coming from the search.
      announceTimelineEntry('search');
      finish('story', { position, matched_on: (hit as StorySearchResult).matchedOn });
    }
  }

  const leavePage = () => finish('abandon', {}, 'sendBeacon');
  window.addEventListener('pagehide', leavePage);
  onScopeDispose(() => { window.removeEventListener('pagehide', leavePage); finish('abandon'); });
  return {
    selected,
    abandoned: () => finish('abandon'),
    /** Back in a field that still holds a query: a new search starts from it. */
    resumed: () => { if (options.query().trim().length >= 2) active = true; },
  };
}
