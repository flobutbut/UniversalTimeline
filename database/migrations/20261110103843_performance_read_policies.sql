-- Keep the historical policy name for UPDATE so existing startup preflights
-- remain compatible (21 ut_* policies). Extra INSERT/DELETE policies do not
-- participate in SELECT. Copy predicates verbatim: no access is broadened.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $policies$
DECLARE item record; policy record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('periods','ut_write_periods'), ('events','ut_write_events'),
    ('period_categories','ut_write_period_categories'), ('event_categories','ut_write_event_categories'),
    ('story_periods','ut_write_story_periods'), ('story_events','ut_write_story_events'),
    ('story_categories','ut_write_story_categories'), ('story_anchors','ut_write_story_anchors'),
    ('period_tags','period_tags_write'), ('event_tags','event_tags_write'), ('story_tags','story_tags_write')
  ) AS targets(table_name, policy_name)
  LOOP
    SELECT * INTO STRICT policy FROM pg_policies
      WHERE schemaname='public' AND tablename=item.table_name AND policyname=item.policy_name AND cmd='ALL';
    IF policy.roles <> ARRAY['authenticated']::name[] OR policy.qual IS NULL OR policy.with_check IS NULL THEN
      RAISE EXCEPTION 'Unexpected access policy on %', item.table_name;
    END IF;
    EXECUTE format('DROP POLICY %I ON public.%I', item.policy_name, item.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      item.policy_name, item.table_name, policy.qual, policy.with_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      'write_insert_'||item.table_name, item.table_name, policy.with_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
      'write_delete_'||item.table_name, item.table_name, policy.qual);
  END LOOP;
END;
$policies$;
COMMIT;
