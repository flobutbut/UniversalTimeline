BEGIN;
-- One complete, compact snapshot. Catalogue entities have one identity regardless of reuse.
CREATE FUNCTION admin_private.relations_network() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  RETURN admin_private.relations_overview() || jsonb_build_object(
    'periods', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.label_fr) ORDER BY p.id),'[]') FROM public.periods p),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'title',e.label_fr) ORDER BY e.id),'[]') FROM public.events e),
    'memberships', (SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m."storyId",m.kind,m."entityId"),'[]') FROM (
      SELECT sp.story_id::text AS "storyId",'period' AS kind,sp.period_id AS "entityId",sp.parent_period_id AS "parentId",NULL::text AS importance FROM public.story_periods sp
      UNION ALL
      SELECT se.story_id::text,'event',se.event_id,NULL::varchar,se.importance FROM public.story_events se
    ) m));
END;
$function$;
REVOKE ALL ON FUNCTION admin_private.relations_network() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_private.relations_network() TO authenticated;
COMMIT;
