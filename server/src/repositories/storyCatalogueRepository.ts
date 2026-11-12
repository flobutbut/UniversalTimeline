import type { TransactionClient } from '../api/transaction.js';
import type { StoryRow, TagColumns, TagRow } from './rows.js';
import type { StoryCatalogueQuery } from '../shared/storyCatalogue.js';
import type { TemporalCandidate } from '../shared/temporal.js';
import { tagsColumn } from './tagRepository.js';

export interface CatalogueCandidate extends StoryRow, TagColumns { temporal_candidates: TemporalCandidate[] }

// All text, tags and positions stay bound. The ID order uses the existing primary key and
// remains stable when another frise is published or deleted between two requests.
const matching = `
  NOT EXISTS (
    SELECT 1 FROM regexp_split_to_table(extensions.unaccent(lower($1::text)), '\\s+') word
    WHERE word <> '' AND strpos(extensions.unaccent(lower(concat_ws(' ', s.title_fr, s.title_en, s.description_fr, s.description_en))), word) = 0
  ) AND (cardinality($2::text[]) = 0 OR EXISTS (
    SELECT 1 FROM public.story_tags st JOIN public.tags t ON t.id = st.tag_id
    WHERE st.story_id = s.id AND (t.id = ANY($2::text[]) OR t.parent_id = ANY($2::text[]))
  ))`;

export async function listCatalogueCandidates(db: TransactionClient, input: StoryCatalogueQuery, cursor: string | null, limit: number) {
  return (await db.query<CatalogueCandidate>(`
    WITH page AS (
      SELECT s.* FROM public.stories s
      WHERE s.is_public = true AND ${matching} AND ($3::integer IS NULL OR s.id < $3)
      ORDER BY s.id DESC LIMIT $4
    )
    SELECT page.*, ${tagsColumn('story', 'page.id')},
      (SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM (
        SELECT p.start_date, p.end_date, p.start_years_bp, p.end_years_bp
        FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id WHERE sp.story_id = page.id
        UNION ALL
        SELECT e.date, e.date, e.date_years_bp, e.date_years_bp
        FROM public.story_events se JOIN public.events e ON e.id = se.event_id WHERE se.story_id = page.id
      ) d) AS temporal_candidates
    FROM page ORDER BY page.id DESC
  `, [input.search, input.tagIds, cursor, limit])).rows;
}

export async function readCatalogueFacets(db: TransactionClient, input: StoryCatalogueQuery) {
  return (await db.query<{ public_total: number; matching_total: number; tags: TagRow[] }>(`
    SELECT (SELECT count(*)::int FROM public.stories WHERE is_public = true) AS public_total,
      (SELECT count(*)::int FROM public.stories s WHERE s.is_public = true AND ${matching}) AS matching_total,
      (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.position), '[]'::jsonb) FROM public.tags t
       WHERE t.parent_id IS NULL AND EXISTS (
         SELECT 1 FROM public.story_tags st JOIN public.stories s ON s.id = st.story_id
         WHERE s.is_public = true AND st.tag_id = t.id
       )) AS tags
  `, [input.search, input.tagIds])).rows[0];
}

/** Decorative previews are bounded too, independently of the size of a frise's contents. */
export async function readCataloguePreviews(db: TransactionClient, ids: number[]) {
  if (!ids.length) return [];
  return (await db.query<{ id: number; preview_periods: Record<string, unknown>[]; preview_events: Record<string, unknown>[] }>(`
    WITH periods AS (
      SELECT sp.story_id, p.id, p.label_fr, p.label_en, p.start_date, p.end_date, p.start_years_bp, p.end_years_bp,
        sp.parent_period_id AS story_parent_id, row_number() OVER (PARTITION BY sp.story_id ORDER BY p.start_years_bp DESC NULLS LAST, p.id) AS rank
      FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id WHERE sp.story_id = ANY($1::int[])
    ), events AS (
      SELECT se.story_id, e.id, e.date, e.date_years_bp,
        row_number() OVER (PARTITION BY se.story_id ORDER BY e.date_years_bp DESC NULLS LAST, e.id) AS rank
      FROM public.story_events se JOIN public.events e ON e.id = se.event_id WHERE se.story_id = ANY($1::int[])
    )
    SELECT s.id,
      (SELECT COALESCE(jsonb_agg(to_jsonb(p) - 'story_id' - 'rank' ORDER BY p.rank), '[]'::jsonb) FROM periods p WHERE p.story_id = s.id AND p.rank <= 12) AS preview_periods,
      (SELECT COALESCE(jsonb_agg(to_jsonb(e) - 'story_id' - 'rank' ORDER BY e.rank), '[]'::jsonb) FROM events e WHERE e.story_id = s.id AND e.rank <= 12) AS preview_events
    FROM public.stories s WHERE s.is_public = true AND s.id = ANY($1::int[])
  `, [ids])).rows;
}
