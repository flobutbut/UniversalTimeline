import type { TransactionClient } from '../api/transaction.js';
import type { StoryWrite } from '../domain/writeInputs.js';
import type { StoryRow, StorySummaryRow, JoinedStoryRow, JoinedPeriodRow, JoinedEventRow, ChildStoryRow, TemporalCandidate, PeriodRow } from './rows.js';

export async function listStories(db: TransactionClient) {
  return (await db.query<JoinedStoryRow>(`
      SELECT
        s.id,
        s.title_fr,
        s.title_en,
        s.description_fr,
        s.description_en,
        s.author,
        s.is_public,
        to_jsonb(s)->>'owner_user_id' AS owner_user_id,
        s.parent_story_id,
        s.created_at,
        s.updated_at,
        (SELECT COALESCE(json_agg(json_build_object(
          'id', p.id, 'label_fr', p.label_fr, 'label_en', p.label_en,
          'start_date', p.start_date, 'end_date', p.end_date,
          'start_years_bp', p.start_years_bp, 'end_years_bp', p.end_years_bp, 'parent_id', p.parent_id, 'story_parent_id', CASE WHEN COALESCE((to_jsonb(sp)->>'parent_override')::boolean, false) THEN to_jsonb(sp)->>'parent_period_id' ELSE p.parent_id END
        ) ORDER BY p.id), '[]') FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id WHERE sp.story_id = s.id) AS preview_periods,
        (SELECT COALESCE(json_agg(json_build_object(
          'id', e.id, 'date', e.date, 'date_years_bp', e.date_years_bp
        ) ORDER BY e.id), '[]') FROM public.story_events se JOIN public.events e ON e.id = se.event_id WHERE se.story_id = s.id) AS preview_events,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.stories s
      LEFT JOIN public.story_categories sc ON s.id = sc.story_id
      LEFT JOIN public.categories c ON sc.category_id = c.id
      ORDER BY s.created_at DESC
    `)).rows;
}
export async function findStory(db: TransactionClient, id: string) {
  return (await db.query<StorySummaryRow>(`
      SELECT
        s.id,
        s.title_fr,
        s.title_en,
        s.description_fr,
        s.description_en,
        s.author,
        s.is_public,
        to_jsonb(s)->>'owner_user_id' AS owner_user_id,
        s.created_at,
        s.updated_at
      FROM public.stories s
      WHERE s.id = $1
    `, [id])).rows[0];
}
export async function listStoryPeriods(db: TransactionClient, id: string) {
  return (await db.query<JoinedPeriodRow>(`
      SELECT
        p.*, CASE WHEN COALESCE((to_jsonb(sp)->>'parent_override')::boolean, false) THEN to_jsonb(sp)->>'parent_period_id' ELSE p.parent_id END AS story_parent_id,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.periods p
      JOIN public.story_periods sp ON p.id = sp.period_id
      LEFT JOIN public.period_categories pc ON p.id = pc.period_id
      LEFT JOIN public.categories c ON pc.category_id = c.id
      WHERE sp.story_id = $1
      ORDER BY p.start_date
    `, [id])).rows;
}
const storyLinkTables = {
  event: { table: 'story_events', column: 'event_id' },
  period: { table: 'story_periods', column: 'period_id' },
} as const;
/** Memberships in the stories readable by the current principal (RLS on both tables). */
export async function listStoryLinks<K extends keyof typeof storyLinkTables>(db: TransactionClient, kind: K) {
  const { table, column } = storyLinkTables[kind];
  return (await db.query<Record<typeof storyLinkTables[K]['column'] | 'story_id', string>>(`
      SELECT link.${column}, s.id::text AS story_id
      FROM public.${table} link
      JOIN public.stories s ON s.id = link.story_id
      ORDER BY link.${column}, s.id
    `)).rows;
}
export async function listStoryEvents(db: TransactionClient, id: string) {
  return (await db.query<JoinedEventRow>(`
      SELECT
        e.*,
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.events e
      JOIN public.story_events se ON e.id = se.event_id
      LEFT JOIN public.event_categories ec ON e.id = ec.event_id
      LEFT JOIN public.categories c ON ec.category_id = c.id
      WHERE se.story_id = $1
      ORDER BY e.date
    `, [id])).rows;
}
export async function listAssociatedPeriods(db: TransactionClient, storyId: string) {
  return (await db.query<Pick<PeriodRow, 'id' | 'wikidata_id' | 'label_fr' | 'label_en' | 'description_fr' | 'description_en' | 'start_date' | 'end_date' | 'parent_id' | 'story_parent_id' | 'start_years_bp' | 'end_years_bp' | 'has_children'>>(`
      SELECT p.id, p.wikidata_id, p.label_fr, p.label_en, p.description_fr, p.description_en,
             p.start_date, p.end_date, p.parent_id, CASE WHEN COALESCE((to_jsonb(sp)->>'parent_override')::boolean, false) THEN to_jsonb(sp)->>'parent_period_id' ELSE p.parent_id END AS story_parent_id,
             p.start_years_bp, p.end_years_bp,
             EXISTS(SELECT 1 FROM public.periods c WHERE c.parent_id = p.id) AS has_children
      FROM public.periods p
      JOIN public.story_periods sp ON p.id = sp.period_id
      WHERE sp.story_id = $1
      ORDER BY p.start_years_bp DESC NULLS LAST
    `, [storyId])).rows;
}
export async function insertStory(client: TransactionClient, data: StoryWrite) {
  const { title, description, author, isPublic } = data;
  return (await client.query<StoryRow>(`
      INSERT INTO public.stories (
        title_fr,
        title_en,
        description_fr,
        description_en,
        author,
        is_public
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
    title.fr, title.en || title.fr, description?.fr || null,
    description?.en || description?.fr || null, author, isPublic ?? false,
  ])).rows[0];
}
export async function updateStory(client: TransactionClient, id: string, data: StoryWrite) {
  const { title, description, author, isPublic } = data;
  return (await client.query<StoryRow>(`
      UPDATE public.stories
      SET
        title_fr = $1,
        title_en = $2,
        description_fr = $3,
        description_en = $4,
        author = $5,
        is_public = COALESCE($6, is_public),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
    title.fr, title.en || title.fr, description?.fr || null,
    description?.en || description?.fr || null, author, isPublic ?? null, id,
  ])).rows[0];
}
export async function deleteStory(client: TransactionClient, id: string) {
  await client.query('DELETE FROM public.story_events WHERE story_id = $1', [id]);
  await client.query('DELETE FROM public.story_periods WHERE story_id = $1', [id]);
  await client.query('DELETE FROM public.story_categories WHERE story_id = $1', [id]);
  return (await client.query<StoryRow>('DELETE FROM public.stories WHERE id = $1 RETURNING *', [id])).rows[0];
}
export async function listChildStories(db: TransactionClient, id: string) {
  return (await db.query<ChildStoryRow>(`
    SELECT s.id, s.title_fr, s.title_en,
           json_agg(json_build_object('type', sa.anchor_type, 'id', sa.anchor_id) ORDER BY sa.id)
             FILTER (WHERE sa.id IS NOT NULL) AS anchors
    FROM public.stories s LEFT JOIN public.story_anchors sa ON sa.story_id = s.id
    WHERE s.parent_story_id = $1 GROUP BY s.id, s.title_fr, s.title_en ORDER BY s.id
  `, [id])).rows;
}
export async function listTemporalCandidates(db: TransactionClient) {
  return (await db.query<TemporalCandidate>(`
    SELECT sp.story_id, p.start_date, p.end_date, p.start_years_bp, p.end_years_bp
    FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id
    UNION ALL
    SELECT se.story_id, e.date AS start_date, e.date AS end_date,
           e.date_years_bp AS start_years_bp, e.date_years_bp AS end_years_bp
    FROM public.story_events se JOIN public.events e ON e.id = se.event_id
    ORDER BY story_id, start_date, end_date
  `)).rows;
}
export async function findSuggestedStories(db: TransactionClient, storyId: string, periodIds: string[], eventIds: string[]) {
  const params = [storyId];
  const conditions: string[] = [];
  for (const [type, ids] of [['period', periodIds], ['event', eventIds]] as const) {
    if (!ids.length) continue;
    const ph = ids.map((_, i) => `$${params.length + i + 1}`).join(', ');
    conditions.push(`(sa.anchor_type = '${type}' AND sa.anchor_id IN (${ph}))`);
    params.push(...ids);
  }
  return (await db.query<Pick<StoryRow, 'id' | 'title_fr' | 'title_en' | 'description_fr' | 'description_en' | 'parent_story_id'>>(`
    SELECT DISTINCT s.id, s.title_fr, s.title_en, s.description_fr, s.description_en, s.parent_story_id
    FROM public.stories s JOIN public.story_anchors sa ON sa.story_id = s.id
    WHERE s.parent_story_id = $1 AND (${conditions.join(' OR ')}) ORDER BY s.id
  `, params)).rows;
}
export async function insertAnchor(db: TransactionClient, storyId: string, anchorType: 'period' | 'event', anchorId: string) {
  return (await db.query<{ id: number; story_id: number; anchor_type: 'period' | 'event'; anchor_id: string }>(`
    INSERT INTO public.story_anchors (story_id, anchor_type, anchor_id)
    VALUES ($1, $2, $3) ON CONFLICT (story_id, anchor_type, anchor_id) DO NOTHING RETURNING *
  `, [storyId, anchorType, anchorId])).rows[0] ?? {};
}
export async function deleteAnchor(db: TransactionClient, storyId: string, anchorType: 'period' | 'event', anchorId: string) {
  await db.query('DELETE FROM public.story_anchors WHERE story_id = $1 AND anchor_type = $2 AND anchor_id = $3', [storyId, anchorType, anchorId]);
}
/** Compatibility endpoints use the same fixed relation map as batch writes. */
export async function changeSingleAssociation(db: TransactionClient, storyId: string, kind: 'period' | 'event', id: string, remove: boolean) {
  const table = kind === 'period' ? 'story_periods' : 'story_events';
  const column = kind === 'period' ? 'period_id' : 'event_id';
  const sql = remove
    ? `DELETE FROM public.${table} WHERE story_id = $1 AND ${column} = $2 RETURNING story_id, ${column}`
    : `INSERT INTO public.${table} (story_id, ${column}) VALUES ($1, $2) ON CONFLICT (story_id, ${column}) DO NOTHING RETURNING story_id, ${column}`;
  return (await db.query<{ story_id: number; period_id?: string; event_id?: string }>(sql, [storyId, id])).rows[0];
}
