import type { TransactionClient } from '../api/transaction.js';
import type { EventImportance, StoryWrite } from '../domain/writeInputs.js';
import type { StoryRow, JoinedStoryRow, JoinedPeriodRow, JoinedEventRow, ChildStoryRow, TemporalCandidate, PeriodRow, CategoryRow, TagColumns } from './rows.js';
import { tagsColumn } from './tagRepository.js';

interface StorySnapshotRow extends StoryRow, TagColumns {
  categories: CategoryRow[];
  periods: Array<JoinedPeriodRow & Pick<PeriodRow, 'has_children'>>;
  events: Array<JoinedEventRow & { importance: EventImportance }>;
  child_stories: ChildStoryRow[];
  parent_stories?: Array<Pick<StoryRow, 'id' | 'title_fr' | 'title_en' | 'owner_user_id' | 'is_public'> & { at_root?: boolean; anchors: Array<{ type: 'period' | 'event'; id: string; label_fr: string; label_en: string | null }> }>;
  navigation_contexts?: Array<{
    id: number; title_fr: string; title_en: string;
    periods: Array<Pick<PeriodRow, 'id' | 'label_fr' | 'label_en' | 'start_date' | 'end_date' | 'start_years_bp' | 'end_years_bp'> & { story_parent_id: string | null }>;
    presentations: Array<{ period_id: string; story_id: number; title_fr: string; title_en: string }>;
  }>;
  related_stories: Array<Pick<StoryRow, 'id' | 'title_fr' | 'title_en'> & { period_ids: string[]; event_ids: string[] }>;
}

/** Explicit public predicate also protects the response for authenticated callers. */
export async function findPublicStoryMetadata(db: TransactionClient, id: string) {
  return (await db.query<Pick<StoryRow, 'id' | 'title_fr' | 'title_en' | 'description_fr' | 'description_en'>>(`
    SELECT id, title_fr, title_en, description_fr, description_en
    FROM public.stories WHERE id = $1 AND is_public = true
  `, [id])).rows[0];
}

export async function listPublicSitemapStories(db: TransactionClient) {
  return (await db.query<Pick<StoryRow, 'id'>>(`
    SELECT id FROM public.stories
    WHERE is_public = true AND btrim(COALESCE(NULLIF(title_fr, ''), title_en, '')) <> ''
      AND btrim(COALESCE(NULLIF(description_fr, ''), description_en, '')) <> ''
    ORDER BY id
  `)).rows.map(row => String(row.id));
}

/** One statement and one RLS snapshot for the whole frise, including its navigation links. */
export async function findStorySnapshot(db: TransactionClient, id: string) {
  return (await db.query<StorySnapshotRow>(`
    WITH entry_links AS (
      SELECT source_story_id, target_story_id,
        CASE WHEN period_id IS NOT NULL THEN 'period' WHEN event_id IS NOT NULL THEN 'event' END AS anchor_type,
        COALESCE(period_id, event_id) AS anchor_id
      FROM public.story_entry_points WHERE source_story_id = $1 OR target_story_id = $1
      UNION
      SELECT child.parent_story_id, child.id, a.anchor_type, a.anchor_id
      FROM public.stories child JOIN public.story_anchors a ON a.story_id = child.id
      WHERE child.parent_story_id IS NOT NULL AND (child.parent_story_id = $1 OR child.id = $1)
      UNION
      SELECT v.context_story_id, v.target_story_id, 'period', v.period_id
      FROM public.story_period_presentations v WHERE v.context_story_id=$1 OR v.target_story_id=$1
    )
    SELECT s.*,
      (SELECT COALESCE(jsonb_agg(to_jsonb(ctx) ORDER BY ctx.id), '[]') FROM (
        SELECT context.id, context.title_fr, context.title_en,
          (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id',p.id,'label_fr',p.label_fr,'label_en',p.label_en,
            'start_date',p.start_date,'end_date',p.end_date,'start_years_bp',p.start_years_bp,'end_years_bp',p.end_years_bp,
            'wikipedia_title_fr',p.wikipedia_title_fr,'wikipedia_title_en',p.wikipedia_title_en,
            'story_parent_id',sp.parent_period_id) ORDER BY p.id), '[]')
           FROM public.story_periods sp JOIN public.periods p ON p.id=sp.period_id WHERE sp.story_id=context.id) AS periods,
          (SELECT COALESCE(jsonb_agg(jsonb_build_object('period_id',v.period_id,'story_id',target.id,
            'title_fr',target.title_fr,'title_en',target.title_en) ORDER BY v.period_id,target.id), '[]')
           FROM public.story_period_presentations v JOIN public.stories target ON target.id=v.target_story_id
           WHERE v.context_story_id=context.id) AS presentations
        FROM public.stories context WHERE EXISTS (
          SELECT 1 FROM public.story_period_presentations v
          WHERE v.context_story_id=context.id AND (v.target_story_id=s.id OR context.id=s.id)
        )
      ) ctx) AS navigation_contexts,
      (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]')
       FROM public.story_categories sc JOIN public.categories c ON c.id = sc.category_id
       WHERE sc.story_id = s.id) AS categories,
      ${tagsColumn('story', 's.id')},
      (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.start_date, p.id, p.category_id), '[]') FROM (
        SELECT p.*, NULL::varchar AS parent_id, sp.parent_period_id AS story_parent_id,
          EXISTS(SELECT 1 FROM public.story_periods child
                 WHERE child.story_id = sp.story_id AND child.parent_period_id = p.id) AS has_children,
          ${tagsColumn('period', 'p.id')},
          c.id AS category_id, c.label_fr AS category_label_fr, c.label_en AS category_label_en
        FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id
        LEFT JOIN public.period_categories pc ON pc.period_id = p.id
        LEFT JOIN public.categories c ON c.id = pc.category_id
        WHERE sp.story_id = s.id
      ) p) AS periods,
      (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.date, e.id, e.category_id), '[]') FROM (
        SELECT e.*, se.importance, ${tagsColumn('event', 'e.id')}, c.id AS category_id, c.label_fr AS category_label_fr, c.label_en AS category_label_en
        FROM public.story_events se JOIN public.events e ON e.id = se.event_id
        LEFT JOIN public.event_categories ec ON ec.event_id = e.id
        LEFT JOIN public.categories c ON c.id = ec.category_id
        WHERE se.story_id = s.id
      ) e) AS events,
      (SELECT COALESCE(jsonb_agg(to_jsonb(child) ORDER BY child.id), '[]') FROM (
        SELECT child.id, child.title_fr, child.title_en,
          EXISTS(SELECT 1 FROM public.story_entry_points d WHERE d.source_story_id=s.id AND d.target_story_id=child.id
            AND d.period_id IS NULL AND d.event_id IS NULL AND d.display_as_period) AS root_display_as_period,
          (EXISTS(SELECT 1 FROM entry_links root WHERE root.source_story_id=s.id AND root.target_story_id=child.id AND root.anchor_id IS NULL)
            OR (child.parent_story_id IS NOT DISTINCT FROM s.id AND NOT EXISTS(SELECT 1 FROM public.story_anchors a WHERE a.story_id=child.id))) AS at_root,
          (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', a.anchor_type, 'id', a.anchor_id) || CASE WHEN EXISTS(
            SELECT 1 FROM public.story_entry_points d WHERE d.source_story_id=a.source_story_id AND d.target_story_id=a.target_story_id AND d.display_as_period
              AND ((a.anchor_type='period' AND d.period_id=a.anchor_id) OR (a.anchor_type='event' AND d.event_id=a.anchor_id)))
            THEN '{"displayAsPeriod":true}'::jsonb ELSE '{}'::jsonb END ORDER BY a.anchor_type, a.anchor_id), '[]')
           FROM entry_links a WHERE a.target_story_id = child.id AND a.source_story_id = s.id AND a.anchor_id IS NOT NULL) AS anchors
        FROM public.stories child WHERE child.parent_story_id = s.id
          OR EXISTS (SELECT 1 FROM entry_links a WHERE a.source_story_id = s.id AND a.target_story_id = child.id)
      ) child) AS child_stories,
      (SELECT COALESCE(jsonb_agg(to_jsonb(parent) ORDER BY parent.title_fr, parent.id), '[]') FROM (
        SELECT parent.id, parent.title_fr, parent.title_en, parent.owner_user_id, parent.is_public,
          (EXISTS(SELECT 1 FROM entry_links root WHERE root.source_story_id=parent.id AND root.target_story_id=s.id AND root.anchor_id IS NULL)
            OR (s.parent_story_id IS NOT DISTINCT FROM parent.id AND NOT EXISTS(SELECT 1 FROM public.story_anchors a WHERE a.story_id=s.id))) AS at_root,
          (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', a.anchor_type, 'id', a.anchor_id,
            'label_fr', COALESCE(p.label_fr, e.label_fr, a.anchor_id), 'label_en', COALESCE(p.label_en, e.label_en))
            ORDER BY a.anchor_type, a.anchor_id), '[]')
           FROM entry_links a LEFT JOIN public.periods p ON a.anchor_type = 'period' AND p.id = a.anchor_id
           LEFT JOIN public.events e ON a.anchor_type = 'event' AND e.id = a.anchor_id
           WHERE a.source_story_id = parent.id AND a.target_story_id = s.id AND a.anchor_id IS NOT NULL) AS anchors
        FROM public.stories parent WHERE parent.id = s.parent_story_id
          OR EXISTS (SELECT 1 FROM entry_links a WHERE a.source_story_id = parent.id AND a.target_story_id = s.id)
      ) parent) AS parent_stories,
      (SELECT COALESCE(jsonb_agg(to_jsonb(related) ORDER BY related.id), '[]') FROM (
        SELECT other.id, other.title_fr, other.title_en,
          COALESCE(array_agg(DISTINCT shared.entity_id ORDER BY shared.entity_id) FILTER (WHERE shared.kind='period'), ARRAY[]::varchar[]) AS period_ids,
          COALESCE(array_agg(DISTINCT shared.entity_id ORDER BY shared.entity_id) FILTER (WHERE shared.kind='event'), ARRAY[]::varchar[]) AS event_ids
        FROM (
          SELECT link.story_id, link.period_id AS entity_id, 'period' AS kind
          FROM public.story_periods current JOIN public.story_periods link ON link.period_id=current.period_id
          WHERE current.story_id=s.id AND link.story_id<>s.id
          UNION ALL
          SELECT link.story_id, link.event_id, 'event'
          FROM public.story_events current JOIN public.story_events link ON link.event_id=current.event_id
          WHERE current.story_id=s.id AND link.story_id<>s.id
        ) shared JOIN public.stories other ON other.id=shared.story_id
        GROUP BY other.id, other.title_fr, other.title_en
      ) related) AS related_stories
    FROM public.stories s WHERE s.id = $1
  `, [id])).rows[0];
}

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
          'start_years_bp', p.start_years_bp, 'end_years_bp', p.end_years_bp, 'parent_id', NULL, 'story_parent_id', sp.parent_period_id
        ) ORDER BY p.id), '[]') FROM public.story_periods sp JOIN public.periods p ON p.id = sp.period_id WHERE sp.story_id = s.id) AS preview_periods,
        (SELECT COALESCE(json_agg(json_build_object(
          'id', e.id, 'date', e.date, 'date_years_bp', e.date_years_bp
        ) ORDER BY e.id), '[]') FROM public.story_events se JOIN public.events e ON e.id = se.event_id WHERE se.story_id = s.id) AS preview_events,
        ${tagsColumn('story', 's.id')},
        c.id as category_id,
        c.label_fr as category_label_fr,
        c.label_en as category_label_en
      FROM public.stories s
      LEFT JOIN public.story_categories sc ON s.id = sc.story_id
      LEFT JOIN public.categories c ON sc.category_id = c.id
      ORDER BY s.created_at DESC
    `)).rows;
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
        ${tagsColumn('event', 'e.id')},
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
      SELECT p.source_key, p.wikidata_source, p.id, p.wikidata_id, p.label_fr, p.label_en, p.description_fr, p.description_en,
             p.start_date, p.end_date, NULL::varchar AS parent_id, sp.parent_period_id AS story_parent_id,
             p.start_years_bp, p.end_years_bp,
             EXISTS(SELECT 1 FROM public.story_periods c WHERE c.story_id = sp.story_id AND c.parent_period_id = p.id) AS has_children
      FROM public.periods p
      JOIN public.story_periods sp ON p.id = sp.period_id
      WHERE sp.story_id = $1
      ORDER BY p.start_years_bp DESC NULLS LAST
    `, [storyId])).rows;
}
export async function insertStory(client: TransactionClient, data: StoryWrite & { author: string }) {
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
    title.fr, title.en, description?.fr || null,
    description?.en || null, author, isPublic ?? false,
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
        author = COALESCE($5, author),
        is_public = COALESCE($6, is_public),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
    title.fr, title.en, description?.fr || null,
    description?.en || null, author, isPublic ?? null, id,
  ])).rows[0];
}
export async function lockOwnedStory(client: TransactionClient, id: string, userId: string) {
  return (await client.query('SELECT id FROM public.stories WHERE id=$1 AND owner_user_id=$2 FOR UPDATE', [id, userId])).rows[0];
}
export async function deleteStory(client: TransactionClient, id: string) {
  await client.query('DELETE FROM public.story_events WHERE story_id = $1', [id]);
  await client.query('DELETE FROM public.story_periods WHERE story_id = $1', [id]);
  await client.query('DELETE FROM public.story_categories WHERE story_id = $1', [id]);
  return (await client.query<StoryRow>('DELETE FROM public.stories WHERE id = $1 RETURNING *', [id])).rows[0];
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
    WITH entry_links AS (
      SELECT child.id AS story_id, child.parent_story_id AS source_story_id, a.anchor_type, a.anchor_id
      FROM public.stories child JOIN public.story_anchors a ON a.story_id = child.id
      WHERE child.parent_story_id = $1
      UNION
      SELECT target_story_id, source_story_id, CASE WHEN period_id IS NOT NULL THEN 'period' ELSE 'event' END, COALESCE(period_id, event_id)
      FROM public.story_entry_points WHERE source_story_id = $1
      UNION
      SELECT target_story_id,context_story_id,'period',period_id FROM public.story_period_presentations WHERE context_story_id=$1
    )
    SELECT DISTINCT s.id, s.title_fr, s.title_en, s.description_fr, s.description_en, sa.source_story_id AS parent_story_id
    FROM public.stories s JOIN entry_links sa ON sa.story_id = s.id
    JOIN public.stories source ON source.id = sa.source_story_id
    WHERE sa.source_story_id = $1 AND (${conditions.join(' OR ')}) ORDER BY s.id
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
/** Importance de l'événement dans cette frise ; aucune ligne si l'événement n'y figure pas. */
export async function updateEventImportance(db: TransactionClient, storyId: string, eventId: string, importance: EventImportance) {
  return (await db.query<{ importance: EventImportance }>(
    'UPDATE public.story_events SET importance = $3 WHERE story_id = $1 AND event_id = $2 RETURNING importance',
    [storyId, eventId, importance],
  )).rows[0];
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
