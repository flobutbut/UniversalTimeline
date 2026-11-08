import type { TransactionClient } from '../api/transaction.js';
import type { EventWrite, PeriodWrite } from '../domain/writeInputs.js';
import type { PeriodRow, PeriodRecord, EventRow, JoinedPeriodListRow, JoinedEventRow } from './rows.js';
import { tagsColumn } from './tagRepository.js';

export async function insertEvent(client: TransactionClient, data: EventWrite & { id: string }, yearsBP: number | null) {
  const { id, wikidata_id, label, description, date, wikipedia } = data;
  return (await client.query<EventRow>(`
      INSERT INTO public.events (
        id,
        wikidata_id,
        label_fr,
        label_en,
        description_fr,
        description_en,
        date,
        date_years_bp,
        wikipedia_title_fr,
        wikipedia_title_en,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
    id, wikidata_id || null, label.fr, label.en || label.fr,
    description?.fr || null, description?.en || description?.fr || null, date, yearsBP,
    wikipedia?.fr ?? null, wikipedia?.en ?? null,
  ])).rows[0];
}
export async function updateEvent(client: TransactionClient, id: string, data: EventWrite, yearsBP: number | null) {
  const { wikidata_id, label, description, date, wikipedia } = data;
  return (await client.query<EventRow>(`
      UPDATE public.events
      SET
        label_fr = $1,
        label_en = $2,
        description_fr = $3,
        description_en = $4,
        wikidata_id = $5,
        date = $6,
        date_years_bp = $8,
        wikipedia_title_fr = CASE WHEN $9::boolean THEN $10 ELSE wikipedia_title_fr END,
        wikipedia_title_en = CASE WHEN $9::boolean THEN $11 ELSE wikipedia_title_en END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
    label.fr, label.en || label.fr, description?.fr, description?.en || description?.fr,
    wikidata_id, date, id, yearsBP, wikipedia !== undefined, wikipedia?.fr ?? null, wikipedia?.en ?? null,
  ])).rows[0];
}
export async function insertPeriod(client: TransactionClient, data: PeriodWrite & { id: string }, startBP: number | null, endBP: number | null) {
  const { id, wikidata_id, label, description, start_date, end_date, wikipedia } = data;
  return (await client.query<PeriodRecord>(`
      INSERT INTO public.periods (
        id, wikidata_id, label_fr, label_en,
        description_fr, description_en,
        start_date, end_date,
        start_years_bp, end_years_bp,
        wikipedia_title_fr, wikipedia_title_en
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *, NULL::varchar AS parent_id, false AS has_children
    `, [
    id, wikidata_id, label.fr, label.en || label.fr, description?.fr,
    description?.en || description?.fr, start_date, end_date, startBP, endBP,
    wikipedia?.fr ?? null, wikipedia?.en ?? null,
  ])).rows[0];
}
export async function updatePeriod(client: TransactionClient, id: string, data: PeriodWrite, startBP: number | null, endBP: number | null) {
  const { wikidata_id, label, description, start_date, end_date, wikipedia } = data;
  return (await client.query<PeriodRow>(`
      UPDATE public.periods AS target
      SET
        label_fr = $1,
        label_en = $2,
        description_fr = $3,
        description_en = $4,
        start_date = NULLIF($5, ''),
        end_date = $6,
        wikidata_id = $7,
        start_years_bp = $8,
        end_years_bp = $9,
        wikipedia_title_fr = CASE WHEN $11::boolean THEN $12 ELSE target.wikipedia_title_fr END,
        wikipedia_title_en = CASE WHEN $11::boolean THEN $13 ELSE target.wikipedia_title_en END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING target.*, NULL::varchar AS parent_id, false AS has_children
    `, [
    label.fr, label.en || label.fr, description?.fr || null, description?.en || description?.fr || null,
    start_date || null, end_date, wikidata_id, startBP, endBP, id,
    wikipedia !== undefined, wikipedia?.fr ?? null, wikipedia?.en ?? null,
  ])).rows[0];
}
export async function deleteEvent(client: TransactionClient, id: string) {
  await client.query('DELETE FROM public.event_categories WHERE event_id = $1', [id]);
  return (await client.query<EventRow>('DELETE FROM public.events WHERE id = $1 RETURNING *', [id])).rows[0];
}
export async function listPeriods(db: TransactionClient) {
  return (await db.query<JoinedPeriodListRow>(`
    SELECT p.source_key, p.wikidata_source, p.wikipedia_title_fr, p.wikipedia_title_en, p.id, p.wikidata_id, p.label_fr, p.label_en, p.description_fr, p.description_en,
           p.start_date, p.end_date, NULL::varchar AS parent_id, p.start_years_bp, p.end_years_bp,
           false AS has_children, p.non_thematic, ${tagsColumn('period', 'p.id')},
           c.id AS category_id, c.label_fr AS category_label_fr, c.label_en AS category_label_en
    FROM public.periods p
    LEFT JOIN public.period_categories pc ON p.id = pc.period_id
    LEFT JOIN public.categories c ON pc.category_id = c.id
    ORDER BY p.start_years_bp DESC NULLS LAST
  `, [])).rows;
}
export async function listEvents(db: TransactionClient) {
  return (await db.query<JoinedEventRow>(`
    SELECT e.*, ${tagsColumn('event', 'e.id')}, c.id AS category_id, c.label_fr AS category_label_fr, c.label_en AS category_label_en
    FROM public.events e
    LEFT JOIN public.event_categories ec ON e.id = ec.event_id
    LEFT JOIN public.categories c ON ec.category_id = c.id
    ORDER BY e.date_years_bp DESC NULLS LAST
  `)).rows;
}
export async function findEvent(db: TransactionClient, id: string) {
  return (await db.query<EventRow>(`SELECT e.*, ${tagsColumn('event', 'e.id')} FROM public.events e WHERE e.id = $1`, [id])).rows[0];
}
export async function findPeriod(db: TransactionClient, value: string, by: 'id' | 'wikidata_id') {
  return (await db.query<PeriodRow>(`
    SELECT p.source_key, p.wikidata_source, p.wikipedia_title_fr, p.wikipedia_title_en, p.id, p.wikidata_id, p.label_fr, p.label_en, p.description_fr, p.description_en,
           p.start_date, p.end_date, NULL::varchar AS parent_id, p.start_years_bp, p.end_years_bp, p.non_thematic, ${tagsColumn('period', 'p.id')},
           p.created_at, p.updated_at,
           false AS has_children
    FROM public.periods p WHERE p.${by} = $1
  `, [value])).rows[0];
}
