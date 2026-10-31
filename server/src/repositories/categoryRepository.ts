import type { TransactionClient } from '../api/transaction.js';
import type { CategoryRow } from './rows.js';

const associations = {
  event: { table: 'event_categories', column: 'event_id' },
  period: { table: 'period_categories', column: 'period_id' },
  story: { table: 'story_categories', column: 'story_id' },
} as const;

export async function replaceEntityCategories(
  client: TransactionClient,
  entity: keyof typeof associations,
  id: string | number,
  categoryIds: string[] | undefined,
): Promise<void> {
  if (categoryIds === undefined) return;
  const { table, column } = associations[entity];
  // Identifiers come only from the fixed map above; all values are parameterized.
  await client.query(`DELETE FROM public.${table} WHERE ${column} = $1`, [id]);
  if (categoryIds.length === 0) return;
  const values = categoryIds.map((_, index) => `($1, $${index + 2})`).join(',');
  await client.query(
    `INSERT INTO public.${table} (${column}, category_id) VALUES ${values}`,
    [id, ...categoryIds],
  );
}

export async function readEntityCategories(client: TransactionClient, entity: keyof typeof associations, id: string | number) {
  const { table, column } = associations[entity];
  const result = await client.query<Pick<CategoryRow, 'id' | 'label_fr' | 'label_en'>>(`
    SELECT c.id, c.label_fr, c.label_en
    FROM public.${table} link JOIN public.categories c ON c.id = link.category_id
    WHERE link.${column} = $1 ORDER BY c.id
  `, [id]);
  return result.rows;
}

export async function listCategories(db: TransactionClient) {
  return (await db.query<Pick<CategoryRow, 'id' | 'label_fr' | 'description_fr'>>(`
    SELECT c.id, c.label_fr, c.description_fr FROM public.categories c ORDER BY c.label_fr
  `)).rows;
}
export async function listDetailedCategories(db: TransactionClient, entity: 'story' | 'period', id: string) {
  const { table, column } = associations[entity];
  return (await db.query<CategoryRow>(`
    SELECT c.id, c.label_fr, c.label_en, c.description_fr, c.description_en
    FROM public.categories c JOIN public.${table} link ON c.id = link.category_id
    WHERE link.${column} = $1 ORDER BY c.label_fr
  `, [id])).rows;
}
