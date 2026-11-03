-- Converting a catalogue period into an event (or the reverse) replaces the record everywhere.
-- The API runs under RLS and cannot see private frises of other accounts, while deleting the old
-- record cascades into them. This guard counts, without exposing them, the frises of other owners
-- that reference the record and the chronological views built on a period; the API refuses the
-- conversion when either is non-zero. Not exposed by the Data API.
BEGIN;
CREATE SCHEMA catalogue_private;
REVOKE ALL ON SCHEMA catalogue_private FROM PUBLIC;
GRANT USAGE ON SCHEMA catalogue_private TO authenticated;

CREATE FUNCTION catalogue_private.conversion_blockers(kind text, entity_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR ((SELECT auth.jwt())->>'is_anonymous') IS NOT DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Compte requis' USING ERRCODE = '42501';
  END IF;
  IF kind = 'period' THEN
    RETURN jsonb_build_object(
      'foreign_stories', (SELECT count(*)::int FROM public.stories s WHERE s.owner_user_id IS DISTINCT FROM me AND (
        EXISTS (SELECT 1 FROM public.story_periods sp WHERE sp.story_id = s.id AND sp.period_id = entity_id)
        OR EXISTS (SELECT 1 FROM public.story_anchors a WHERE a.story_id = s.id AND a.anchor_type = 'period' AND a.anchor_id = entity_id)
        OR EXISTS (SELECT 1 FROM public.story_entry_points ep WHERE s.id IN (ep.source_story_id, ep.target_story_id) AND ep.period_id = entity_id))),
      'presentations', (SELECT count(*)::int FROM public.story_period_presentations p WHERE p.period_id = entity_id));
  ELSIF kind = 'event' THEN
    RETURN jsonb_build_object(
      'foreign_stories', (SELECT count(*)::int FROM public.stories s WHERE s.owner_user_id IS DISTINCT FROM me AND (
        EXISTS (SELECT 1 FROM public.story_events se WHERE se.story_id = s.id AND se.event_id = entity_id)
        OR EXISTS (SELECT 1 FROM public.story_anchors a WHERE a.story_id = s.id AND a.anchor_type = 'event' AND a.anchor_id = entity_id)
        OR EXISTS (SELECT 1 FROM public.story_entry_points ep WHERE s.id IN (ep.source_story_id, ep.target_story_id) AND ep.event_id = entity_id))),
      'presentations', 0);
  END IF;
  RAISE EXCEPTION 'Type inconnu' USING ERRCODE = '22023';
END;
$function$;
REVOKE ALL ON FUNCTION catalogue_private.conversion_blockers(text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION catalogue_private.conversion_blockers(text, text) TO authenticated;
COMMIT;
