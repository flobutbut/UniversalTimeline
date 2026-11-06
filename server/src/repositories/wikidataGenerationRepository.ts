import type { TransactionClient } from '../api/transaction.js';
import type { GeneratedItem } from '../api/wikidataGenerationInput.js';
import { storedYearsBeforePresent } from '../shared/temporal.js';

/** Same ordering for every generation; a fresh lookup follows both locks. */
export async function lockGeneratedStoryTopic(client: TransactionClient, qid: string, title: string) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('wikidata-generation-subject'), hashtext($1))", [qid]);
  await client.query("SELECT pg_advisory_xact_lock(hashtext('wikidata-generation-title'), hashtext(lower(extensions.unaccent(btrim($1::text)))))", [title]);
}

/** Only an explicit source or identical title is a conflict; membership alone is not. Caller RLS applies. */
export async function findGeneratedStoryMatches(client: TransactionClient, qid: string, title: string) {
  const rows = (await client.query<{ id: number; title_fr: string; reason: 'subject' | 'title' }>(`
    WITH candidates AS (
      SELECT s.id, s.title_fr,
        (concat_ws(' ', s.description_fr, s.description_en) ~* ('https?://(www\\.)?wikidata\\.org/(wiki/|entity/)' || $1 || '([^0-9]|$)')) AS subject_match,
        (lower(extensions.unaccent(btrim(s.title_fr))) = lower(extensions.unaccent(btrim($2::text)))
         OR lower(extensions.unaccent(btrim(s.title_en))) = lower(extensions.unaccent(btrim($2::text)))) AS title_match
      FROM public.stories s
    )
    SELECT id, title_fr, CASE WHEN subject_match THEN 'subject' ELSE 'title' END AS reason
    FROM candidates WHERE subject_match OR title_match
    ORDER BY subject_match DESC, id LIMIT 20
  `, [qid, title])).rows;
  return rows.map(row => ({ id: String(row.id), title: row.title_fr, reason: row.reason }));
}

/** Reuse a concurrent or existing import without modifying the shared catalogue. */
export async function insertOrReuseGeneratedItem(client: TransactionClient, item: GeneratedItem): Promise<string> {
  const { data } = item;
  // A derived fact has no article of its own: only an entity keeps its Wikipedia titles.
  const titles = data.wikidata_id ? data.wikipedia : undefined;
  const common = [data.id, data.wikidata_id, data.label.fr, data.label.en, data.description.fr, data.description.en, titles?.fr ?? null, titles?.en ?? null];
  const conflict = data.wikidata_id ? '(wikidata_id)' : '(source_key) WHERE source_key IS NOT NULL';
  const storedKey = data.wikidata_id ? null : item.sourceKey;
  let inserted: string | undefined;
  const now = Date.now();
  if (item.type === 'period') {
    inserted = (await client.query<{ id: string }>(`
      INSERT INTO public.periods (id, wikidata_id, label_fr, label_en, description_fr, description_en, wikipedia_title_fr, wikipedia_title_en, start_date, end_date, start_years_bp, end_years_bp, source_key, wikidata_source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT ${conflict} DO NOTHING RETURNING id
    `, [...common, item.data.start_date, item.data.end_date, storedYearsBeforePresent(item.data.start_date, now), storedYearsBeforePresent(item.data.end_date, now), storedKey, item.source ?? null])).rows[0]?.id;
  } else {
    inserted = (await client.query<{ id: string }>(`
      INSERT INTO public.events (id, wikidata_id, label_fr, label_en, description_fr, description_en, wikipedia_title_fr, wikipedia_title_en, date, date_years_bp, source_key, wikidata_source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT ${conflict} DO NOTHING RETURNING id
    `, [...common, item.data.date, storedYearsBeforePresent(item.data.date, now), storedKey, item.source ?? null])).rows[0]?.id;
  }
  if (inserted) return inserted;
  // A fresh statement sees the committed row after ON CONFLICT waited for another import.
  const table = item.type === 'period' ? 'periods' : 'events';
  const existing = (await client.query<{ id: string }>(`SELECT id FROM public.${table} WHERE ${data.wikidata_id ? 'wikidata_id' : 'source_key'} = $1 FOR KEY SHARE`, [data.wikidata_id ?? item.sourceKey])).rows[0];
  if (!existing) throw new Error('Impossible de retrouver l’élément Wikidata après son import.');
  return existing.id;
}
