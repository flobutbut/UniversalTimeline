import type { TransactionClient } from '../api/transaction.js';
import type { PeriodRow, EventRow, StoryRow } from './rows.js';

export async function findGeneratedCatalogueRows(db: TransactionClient, kind: 'periods', keys: string[], qids: string[]): Promise<PeriodRow[]>;
export async function findGeneratedCatalogueRows(db: TransactionClient, kind: 'events', keys: string[], qids: string[]): Promise<EventRow[]>;
export async function findGeneratedCatalogueRows(db: TransactionClient, kind: 'periods' | 'events', keys: string[], qids: string[]) {
  return (await db.query<PeriodRow & EventRow>(
    `SELECT *, NULL::varchar AS parent_id, false AS has_children FROM public.${kind} WHERE source_key = ANY($1::text[]) OR wikidata_id = ANY($2::text[])`, [keys, qids],
  )).rows;
}

export type SearchStoryRow = Pick<StoryRow, 'id' | 'title_fr' | 'title_en' | 'description_fr' | 'description_en'> & {
  matched_on: 'title' | 'description' | 'content';
  matched_type: 'period' | 'event' | null;
  matched_label_fr: string | null;
  matched_label_en: string | null;
};

/** One result per accessible story. The caller's transaction applies its RLS role. */
export async function searchStories(db: TransactionClient, pattern: string) {
  return (await db.query<SearchStoryRow>(`
    SELECT s.id, s.title_fr, s.title_en, s.description_fr, s.description_en,
           CASE WHEN s.title_fr ILIKE $1 OR s.title_en ILIKE $1 THEN 'title'
                WHEN s.description_fr ILIKE $1 OR s.description_en ILIKE $1 THEN 'description'
                ELSE 'content' END AS matched_on,
           matched.kind AS matched_type, matched.label_fr AS matched_label_fr, matched.label_en AS matched_label_en
    FROM public.stories s
    LEFT JOIN LATERAL (
      SELECT candidates.* FROM (
        SELECT p.id, 'period' AS kind, p.label_fr, p.label_en,
               CASE WHEN p.label_fr ILIKE $1 OR p.label_en ILIKE $1 THEN 0 ELSE 1 END AS priority
        FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id
        WHERE sp.story_id = s.id AND (p.label_fr ILIKE $1 OR p.label_en ILIKE $1
          OR p.description_fr ILIKE $1 OR p.description_en ILIKE $1 OR p.wikidata_id ILIKE $1)
        UNION ALL
        SELECT e.id, 'event' AS kind, e.label_fr, e.label_en,
               CASE WHEN e.label_fr ILIKE $1 OR e.label_en ILIKE $1 THEN 0 ELSE 1 END AS priority
        FROM public.story_events se JOIN public.events e ON e.id = se.event_id
        WHERE se.story_id = s.id AND (e.label_fr ILIKE $1 OR e.label_en ILIKE $1
          OR e.description_fr ILIKE $1 OR e.description_en ILIKE $1 OR e.wikidata_id ILIKE $1)
      ) candidates
      ORDER BY priority, kind, label_fr, id LIMIT 1
    ) matched ON true
    WHERE s.title_fr ILIKE $1 OR s.title_en ILIKE $1
       OR s.description_fr ILIKE $1 OR s.description_en ILIKE $1
       OR matched.id IS NOT NULL
    ORDER BY CASE WHEN s.title_fr ILIKE $1 OR s.title_en ILIKE $1 THEN 0
                  WHEN s.description_fr ILIKE $1 OR s.description_en ILIKE $1 THEN 1 ELSE 2 END,
             s.title_fr, s.id
    LIMIT 20
  `, [pattern])).rows;
}
export type SearchPeriodRow = Pick<PeriodRow, 'id' | 'wikidata_id' | 'label_fr' | 'label_en' | 'start_date' | 'end_date' | 'parent_id' | 'start_years_bp' | 'end_years_bp' | 'has_children'>;
export type SearchEventRow = Pick<EventRow, 'id' | 'wikidata_id' | 'label_fr' | 'label_en' | 'description_fr' | 'date' | 'date_years_bp'>;
/** Accent-insensitive words, French lexemes and typo tolerance; all user text stays bound. */
function catalogueSearch(kind: 'periods' | 'events', categoryId: string, limit: number, byQids = false) {
  const period = kind === 'periods';
  const alias = period ? 'p' : 'e';
  const columns = period
    ? `p.id, p.wikidata_id, p.label_fr, p.label_en, p.start_date, p.end_date, NULL::varchar AS parent_id,
       p.start_years_bp, p.end_years_bp,
       false AS has_children`
    : 'e.id, e.wikidata_id, e.label_fr, e.label_en, e.description_fr, e.date, e.date_years_bp';
  return `WITH query_text AS (
    SELECT extensions.unaccent(lower($1::text)) AS text,
      plainto_tsquery('french', extensions.unaccent($1::text)) AS words
  ), documents AS (
    SELECT ${columns},
      extensions.unaccent(lower(concat_ws(' ', ${alias}.label_fr, ${alias}.label_en))) AS title,
      extensions.unaccent(lower(concat_ws(' ', ${alias}.label_fr, ${alias}.label_en, ${alias}.description_fr, ${alias}.description_en, ${alias}.wikidata_id, ${alias}.id::text))) AS document
    FROM public.${kind} ${alias}
    ${byQids ? `WHERE ${alias}.wikidata_id=ANY($2::text[])` : categoryId ? `WHERE EXISTS(SELECT 1 FROM public.${period ? 'period_categories' : 'event_categories'} cat WHERE cat.${period ? 'period_id' : 'event_id'}=${alias}.id AND cat.category_id=$2)` : ''}
  ), scored AS (
    SELECT d.*, CASE WHEN lower(d.id::text)=q.text OR lower(d.wikidata_id)=q.text THEN 100 ELSE 0 END
      + CASE WHEN strpos(d.title,q.text)>0 THEN 12 ELSE 0 END
      + 8 * ts_rank_cd(to_tsvector('french', d.title),q.words)
      + 4 * ts_rank_cd(to_tsvector('french', d.document),q.words)
      + extensions.word_similarity(q.text,d.title) AS search_score
    FROM documents d CROSS JOIN query_text q
    WHERE ${byQids ? 'true' : `strpos(d.document,q.text)>0 OR to_tsvector('french',d.document) @@ q.words
      OR (length(q.text)>=4 AND extensions.word_similarity(q.text,d.document)>=CASE WHEN length(q.text)=4 THEN 0.55 ELSE 0.4 END)`}
  ) SELECT * FROM scored ORDER BY search_score DESC, label_fr, id LIMIT ${limit}`;
}
export async function searchPeriods(db: TransactionClient, query: string, categoryId: string, limit: 120 | 300, qids?: string[]) {
  return (await db.query<SearchPeriodRow>(catalogueSearch('periods', categoryId, limit, !!qids?.length), qids?.length ? [query, qids] : categoryId ? [query, categoryId] : [query])).rows;
}
export async function searchEvents(db: TransactionClient, query: string, categoryId: string, limit: 20 | 300, qids?: string[]) {
  return (await db.query<SearchEventRow>(catalogueSearch('events', categoryId, limit, !!qids?.length), qids?.length ? [query, qids] : categoryId ? [query, categoryId] : [query])).rows;
}
