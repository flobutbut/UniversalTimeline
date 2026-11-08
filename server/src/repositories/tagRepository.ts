import type { TransactionClient } from '../api/transaction.js';
import type { TagRow } from './rows.js';

const associations = {
  event: { table: 'event_tags', column: 'event_id' },
  period: { table: 'period_tags', column: 'period_id' },
  story: { table: 'story_tags', column: 'story_id' },
} as const;
export type TaggedEntity = keyof typeof associations;

/** SQL column with a record's tags, primary first. `owner` is always a fixed column reference, never user input. */
export function tagsColumn(entity: TaggedEntity, owner: string): string {
  const { table, column } = associations[entity];
  return `(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'parent_id', t.parent_id, 'family', t.family,
      'label_fr', t.label_fr, 'label_en', t.label_en, 'position', t.position) ORDER BY link.position), '[]'::jsonb)
    FROM public.${table} link JOIN public.tags t ON t.id = link.tag_id WHERE link.${column} = ${owner}) AS tags`;
}

/** Undefined preserves the current tags; an empty array clears them. The array order gives the rank. */
export async function replaceEntityTags(client: TransactionClient, entity: TaggedEntity, id: string | number, tagIds: string[] | undefined): Promise<void> {
  if (tagIds === undefined) return;
  const { table, column } = associations[entity];
  await client.query(`DELETE FROM public.${table} WHERE ${column} = $1`, [id]);
  if (tagIds.length === 0) return;
  const values = tagIds.map((_, index) => `($1, $${index + 2}, ${index + 1})`).join(',');
  await client.query(`INSERT INTO public.${table} (${column}, tag_id, position) VALUES ${values}`, [id, ...tagIds]);
}

export async function readEntityTags(client: TransactionClient, entity: TaggedEntity, id: string | number): Promise<TagRow[]> {
  const { table, column } = associations[entity];
  return (await client.query<TagRow>(`
    SELECT t.id, t.parent_id, t.family, t.label_fr, t.label_en, t.position
    FROM public.${table} link JOIN public.tags t ON t.id = link.tag_id
    WHERE link.${column} = $1 ORDER BY link.position
  `, [id])).rows;
}

export async function setPeriodNonThematic(client: TransactionClient, id: string, nonThematic: boolean): Promise<void> {
  await client.query('UPDATE public.periods SET non_thematic = $2 WHERE id = $1', [id, nonThematic]);
}

export async function listTags(db: TransactionClient) {
  return (await db.query<TagRow & { description_fr: string | null }>(`
    SELECT t.id, t.parent_id, t.family, t.label_fr, t.label_en, t.position, t.description_fr
    FROM public.tags t ORDER BY t.position
  `)).rows;
}
