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

export type SearchStoryEventRow = Pick<EventRow, 'id' | 'label_fr' | 'label_en' | 'description_fr' | 'description_en' | 'date'> & {
  story_id: number;
  story_title_fr: string;
  story_title_en: string | null;
};

const STOP_WORDS = ['la', 'le', 'les', 'de', 'du', 'des', 'en', 'au', 'aux', 'sur', 'et', 'un', 'une', 'the', 'of', 'in', 'on', 'an', 'and'];
const normalized = (...columns: string[]) => `extensions.unaccent(lower(concat_ws(' ', ${columns.join(', ')})))`;
/** Words of the query ($1), without accents, final plural or small words; only small words are kept if nothing else remains. */
const QUERY_TERMS = `terms AS (
    SELECT extensions.unaccent(lower($1::text)) AS text,
      ARRAY(SELECT CASE WHEN length(word) >= 5 THEN regexp_replace(word, 's$', '') ELSE word END
        FROM regexp_split_to_table(extensions.unaccent(lower($1::text)), '[^a-z0-9]+') word WHERE length(word) >= 2) AS words
  ), q AS (
    SELECT text, COALESCE(NULLIF(ARRAY(SELECT word FROM unnest(words) word WHERE word <> ALL($2::text[])), '{}'::text[]), words) AS tokens FROM terms
  )`;
/** Every word starts a word of the document. */
const hasWords = (document: string) => `NOT EXISTS (SELECT 1 FROM unnest(q.tokens) token WHERE ${document} !~ ('\\m' || token))`;
/** Same, with typo tolerance on the words long enough to tell apart. */
const resemblesWords = (document: string) => `NOT EXISTS (SELECT 1 FROM unnest(q.tokens) token WHERE ${document} !~ ('\\m' || token) AND (length(token) < 5 OR extensions.word_similarity(token, ${document}) < 0.5))`;
const inputs = (query: string) => [query, STOP_WORDS];

/**
 * One result per accessible story; the caller's transaction applies its RLS role. Typo-tolerant
 * results only appear when no exact word matched, so a correct word never brings near neighbours.
 */
export async function searchStories(db: TransactionClient, query: string) {
  return (await db.query<SearchStoryRow>(`
    WITH ${QUERY_TERMS}, story_text AS (
      SELECT s.id, s.title_fr, s.title_en, s.description_fr, s.description_en,
             ${normalized('s.title_fr', 's.title_en')} AS title,
             ${normalized('s.title_fr', 's.title_en', 's.description_fr', 's.description_en')} AS document
      FROM public.stories s
    ), content AS (
      SELECT sp.story_id, p.id, 'period' AS kind, p.label_fr, p.label_en, ${normalized('p.label_fr', 'p.label_en')} AS title,
             ${normalized('p.label_fr', 'p.label_en', 'p.description_fr', 'p.description_en', 'p.wikidata_id')} AS document
      FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id
      UNION ALL
      SELECT se.story_id, e.id, 'event' AS kind, e.label_fr, e.label_en, ${normalized('e.label_fr', 'e.label_en')} AS title,
             ${normalized('e.label_fr', 'e.label_en', 'e.description_fr', 'e.description_en', 'e.wikidata_id')} AS document
      FROM public.story_events se JOIN public.events e ON e.id = se.event_id
    ), candidates AS (
      SELECT s.*, q.text, matched.kind AS matched_type, matched.label_fr AS matched_label_fr, matched.label_en AS matched_label_en,
             CASE WHEN ${hasWords('s.document')} OR matched.exact THEN 0 ELSE 1 END AS tier,
             CASE WHEN ${resemblesWords('s.title')} THEN 'title' WHEN ${resemblesWords('s.document')} THEN 'description' ELSE 'content' END AS matched_on
      FROM story_text s CROSS JOIN q
      LEFT JOIN LATERAL (
        SELECT c.id, c.kind, c.label_fr, c.label_en, ${hasWords('c.document')} AS exact
        FROM content c WHERE c.story_id = s.id AND ${resemblesWords('c.document')}
        ORDER BY ${hasWords('c.document')} DESC, ${hasWords('c.title')} DESC, extensions.word_similarity(q.text, c.title) DESC, c.kind, c.label_fr, c.id LIMIT 1
      ) matched ON true
      WHERE cardinality(q.tokens) > 0 AND (${resemblesWords('s.document')} OR matched.id IS NOT NULL)
    )
    SELECT id, title_fr, title_en, description_fr, description_en, matched_on, matched_type, matched_label_fr, matched_label_en
    FROM candidates WHERE tier = (SELECT min(tier) FROM candidates)
    ORDER BY CASE matched_on WHEN 'title' THEN 0 WHEN 'description' THEN 1 ELSE 2 END,
             strpos(title, text) > 0 DESC, extensions.word_similarity(text, title) DESC, title_fr, id
    LIMIT 20
  `, inputs(query))).rows;
}

/** Events of accessible stories only, each opened in its most relevant frise: major there first, then the most focused. */
export async function searchStoryEvents(db: TransactionClient, query: string) {
  return (await db.query<SearchStoryEventRow>(`
    WITH ${QUERY_TERMS}, event_text AS (
      SELECT e.id, e.label_fr, e.label_en, e.description_fr, e.description_en, e.date,
             ${normalized('e.label_fr', 'e.label_en')} AS title,
             ${normalized('e.label_fr', 'e.label_en', 'e.description_fr', 'e.description_en', 'e.wikidata_id')} AS document
      FROM public.events e
    ), candidates AS (
      SELECT e.*, q.text, CASE WHEN ${hasWords('e.document')} THEN 0 ELSE 1 END AS tier, ${hasWords('e.title')} AS in_title,
             home.id AS story_id, home.title_fr AS story_title_fr, home.title_en AS story_title_en
      FROM event_text e CROSS JOIN q
      JOIN LATERAL (
        SELECT s.id, s.title_fr, s.title_en
        FROM public.story_events se JOIN public.stories s ON s.id = se.story_id
        WHERE se.event_id = e.id
        ORDER BY CASE se.importance WHEN 'major' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                 (SELECT count(*) FROM public.story_events siblings WHERE siblings.story_id = s.id), s.id
        LIMIT 1
      ) home ON true
      WHERE cardinality(q.tokens) > 0 AND ${resemblesWords('e.document')}
    )
    SELECT id, label_fr, label_en, description_fr, description_en, date, story_id, story_title_fr, story_title_en
    FROM candidates WHERE tier = (SELECT min(tier) FROM candidates)
    ORDER BY in_title DESC, strpos(title, text) > 0 DESC, extensions.word_similarity(text, title) DESC, label_fr, id
    LIMIT 12
  `, inputs(query))).rows;
}
export type SearchPeriodRow = Pick<PeriodRow, 'id' | 'wikidata_id' | 'label_fr' | 'label_en' | 'start_date' | 'end_date' | 'parent_id' | 'start_years_bp' | 'end_years_bp' | 'has_children'>;
export type SearchEventRow = Pick<EventRow, 'id' | 'wikidata_id' | 'label_fr' | 'label_en' | 'description_fr' | 'date' | 'date_years_bp'>;
/** Accent-insensitive words, French lexemes and typo tolerance; all user text stays bound. */
function catalogueSearch(kind: 'periods' | 'events', tagId: string, limit: number, byQids = false) {
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
    ${byQids ? `WHERE ${alias}.wikidata_id=ANY($2::text[])` : tagId ? `WHERE EXISTS(SELECT 1 FROM public.${period ? 'period_tags' : 'event_tags'} link JOIN public.tags t ON t.id=link.tag_id WHERE link.${period ? 'period_id' : 'event_id'}=${alias}.id AND (t.id=$2 OR t.parent_id=$2))` : ''}
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
export async function searchPeriods(db: TransactionClient, query: string, tagId: string, limit: 120 | 300, qids?: string[]) {
  return (await db.query<SearchPeriodRow>(catalogueSearch('periods', tagId, limit, !!qids?.length), qids?.length ? [query, qids] : tagId ? [query, tagId] : [query])).rows;
}
export async function searchEvents(db: TransactionClient, query: string, tagId: string, limit: 20 | 300, qids?: string[]) {
  return (await db.query<SearchEventRow>(catalogueSearch('events', tagId, limit, !!qids?.length), qids?.length ? [query, qids] : tagId ? [query, tagId] : [query])).rows;
}
