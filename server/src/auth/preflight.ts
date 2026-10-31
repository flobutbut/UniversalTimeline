import type { TransactionClient } from '../api/transaction.js';

/** Activation must fail before listening if the ownership migration is absent. */
export async function checkAccessSchema(client: TransactionClient): Promise<void> {
  const result = await client.query(`
    SELECT
      col_description('public.stories'::regclass, a.attnum) AS version,
      (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'ut_%') AS policies,
      (SELECT count(*)=10 AND bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname IN ('periods','events','categories','period_categories','event_categories','stories','story_periods','story_events','story_categories','story_anchors')) AS tables_guarded,
      (SELECT count(*)=2 AND bool_and(NOT rolbypassrls AND NOT rolsuper) FROM pg_roles WHERE rolname IN ('anon','authenticated')) AS restricted_roles
    FROM pg_attribute a WHERE a.attrelid='public.stories'::regclass AND a.attname='owner_user_id' AND NOT a.attisdropped
  `);
  const row = result.rows[0];
  if (!row?.version?.startsWith('UniversalTimeline access v1;') || row.policies !== 21 || !row.restricted_roles || !row.tables_guarded) {
    throw new Error('Migration de propriété des frises requise avant activation.');
  }
}
