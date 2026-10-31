import type { TransactionClient } from '../api/transaction.js';
import type { EventWrite, PeriodWrite } from '../domain/writeInputs.js';
import type { PeriodRow, PeriodRecord, EventRow, JoinedPeriodListRow, JoinedEventRow } from './rows.js';

export async function insertEvent(client: TransactionClient, data: EventWrite & { id: string }, yearsBP: number | null) {
  const { id, wikidata_id, label, description, date } = data;
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
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
    id, wikidata_id || null, label.fr, label.en || label.fr,
    description?.fr || null, description?.en || description?.fr || null, date, yearsBP,
  ])).rows[0];
}
export async function updateEvent(client: TransactionClient, id: string, data: EventWrite, yearsBP: number | null) {
  const { wikidata_id, label, description, date } = data;
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
    label.fr, label.en || label.fr, description?.fr, description?.en || description?.fr,
    wikidata_id, date, id, yearsBP,
  ])).rows[0];
}
export async function insertPeriod(client: TransactionClient, data: PeriodWrite & { id: string }, startBP: number | null, endBP: number | null) {
  const { id, wikidata_id, label, description, start_date, end_date } = data;
  return (await client.query<PeriodRecord>(`
      INSERT INTO public.periods (
        id, wikidata_id, label_fr, label_en,
        description_fr, description_en,
        start_date, end_date,
        start_years_bp, end_years_bp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
    id, wikidata_id, label.fr, label.en || label.fr, description?.fr,
    description?.en || description?.fr, start_date, end_date, startBP, endBP,
  ])).rows[0];
}
export async function updatePeriod(client: TransactionClient, id: string, data: PeriodWrite, startBP: number | null, endBP: number | null) {
  const { wikidata_id, label, description, start_date, end_date } = data;
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING target.*, EXISTS(SELECT 1 FROM public.periods child WHERE child.parent_id = target.id) AS has_children
    `, [
    label.fr, label.en || label.fr, description?.fr || null, description?.en || description?.fr || null,
    start_date || null, end_date, wikidata_id, startBP, endBP, id,
  ])).rows[0];
}
export async function deleteEvent(client: TransactionClient, id: string) {
  await client.query('DELETE FROM public.event_categories WHERE event_id = $1', [id]);
  return (await client.query<EventRow>('DELETE FROM public.events WHERE id = $1 RETURNING *', [id])).rows[0];
}
export async function listPeriods(db: TransactionClient, parentId: string | null) {
  return (await db.query<JoinedPeriodListRow>(`
    SELECT p.id, p.wikidata_id, p.label_fr, p.label_en, p.description_fr, p.description_en,
           p.start_date, p.end_date, p.parent_id, p.start_years_bp, p.end_years_bp,
           EXISTS(SELECT 1 FROM public.periods child WHERE child.parent_id = p.id) AS has_children,
           c.id AS category_id, c.label_fr AS category_label_fr, c.label_en AS category_label_en
    FROM public.periods p
    LEFT JOIN public.period_categories pc ON p.id = pc.period_id
    LEFT JOIN public.categories c ON pc.category_id = c.id
    WHERE ${parentId === null ? 'p.parent_id IS NULL' : 'p.parent_id = $1'}
    ORDER BY p.start_years_bp DESC NULLS LAST
  `, parentId === null ? [] : [parentId])).rows;
}
export async function listEvents(db: TransactionClient) {
  return (await db.query<JoinedEventRow>(`
    SELECT e.*, c.id AS category_id, c.label_fr AS category_label_fr, c.label_en AS category_label_en
    FROM public.events e
    LEFT JOIN public.event_categories ec ON e.id = ec.event_id
    LEFT JOIN public.categories c ON ec.category_id = c.id
    ORDER BY e.date_years_bp DESC NULLS LAST
  `)).rows;
}
export async function findPeriod(db: TransactionClient, value: string, by: 'id' | 'wikidata_id') {
  return (await db.query<PeriodRow>(`
    SELECT p.id, p.wikidata_id, p.label_fr, p.label_en, p.description_fr, p.description_en,
           p.start_date, p.end_date, p.parent_id, p.start_years_bp, p.end_years_bp,
           p.created_at, p.updated_at,
           EXISTS(SELECT 1 FROM public.periods child WHERE child.parent_id = p.id) AS has_children
    FROM public.periods p WHERE p.${by} = $1
  `, [value])).rows[0];
}
