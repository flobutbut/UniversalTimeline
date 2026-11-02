-- Audit en lecture seule. Ne contient que des SELECT.
-- Conserver les résultats ensemble pour éviter de comparer des instants différents.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT now() AS audited_at, current_setting('server_version') AS postgres_version;

SELECT s.id,s.title_fr,s.parent_story_id,s.is_public,
 (SELECT count(*) FROM public.story_periods sp WHERE sp.story_id=s.id) AS periods,
 (SELECT count(*) FROM public.story_events se WHERE se.story_id=s.id) AS events
FROM public.stories s ORDER BY s.id;

SELECT s.parent_story_id AS source,a.story_id AS target,a.anchor_type,a.anchor_id
FROM public.story_anchors a JOIN public.stories s ON s.id=a.story_id ORDER BY a.story_id,a.id;

SELECT jsonb_build_object(
 'periods',(SELECT jsonb_agg(jsonb_build_object('id',p.id,'wikidata',p.wikidata_id,'label',p.label_fr,'start',p.start_date,'end',p.end_date,'startBP',p.start_years_bp,'endBP',p.end_years_bp,'categories',(SELECT jsonb_agg(c.label_fr ORDER BY c.id) FROM public.period_categories pc JOIN public.categories c ON c.id=pc.category_id WHERE pc.period_id=p.id)) ORDER BY p.id) FROM public.periods p),
 'placements',(SELECT jsonb_agg(jsonb_build_object('story',story_id,'period',period_id,'parent',parent_period_id) ORDER BY story_id,period_id) FROM public.story_periods),
 'entries',(SELECT COALESCE(jsonb_agg(jsonb_build_object('source',source_story_id,'target',target_story_id,'period',period_id,'event',event_id)),'[]') FROM public.story_entry_points)
) AS data;
SELECT jsonb_build_object(
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',cl.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND cl.relname IN ('stories','story_periods','story_anchors','story_entry_points')),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'definition',indexdef)) FROM pg_indexes WHERE schemaname='public' AND tablename IN ('stories','story_periods','story_anchors','story_entry_points')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',event_object_table,'trigger',trigger_name,'statement',action_statement)) FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table IN ('stories','story_periods','story_anchors','story_entry_points')),
 'policies',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'qual',qual,'check',with_check)) FROM pg_policies WHERE schemaname='public' AND tablename IN ('stories','story_periods','story_anchors','story_entry_points'))
) AS schema;

SELECT jsonb_build_object(
 'periods_without_membership',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'label',p.label_fr)),'[]') FROM public.periods p WHERE NOT EXISTS(SELECT 1 FROM public.story_periods sp WHERE sp.period_id=p.id)),
 'case_targets',(SELECT jsonb_agg(jsonb_build_object('story',s.id,'title',s.title_fr,'period',p.id,'label',p.label_fr,'parent',sp.parent_period_id)) FROM public.story_periods sp JOIN public.periods p ON p.id=sp.period_id JOIN public.stories s ON s.id=sp.story_id WHERE p.id IN ('Q40244','Q12554','Q7432','Q11769')),
 'parent_story_trigger_functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('check_story_period_hierarchy')),
 'tables_rls',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('stories','story_periods','story_entry_points','story_anchors'))
) AS validation;
COMMIT;
