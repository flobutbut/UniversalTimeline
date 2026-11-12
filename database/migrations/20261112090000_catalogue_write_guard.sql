-- The catalogue of periods and events is shared by every frise. Until now any signed-in account
-- could rewrite or delete any record, hence the content of frises it does not own.
-- From now on a record is modified or deleted only by an editor/admin, or by the account that
-- created it while no frise of another account uses it. Creation stays open: personal frises and
-- Wikidata generation need it. The creator is kept in a private table (never exposed by the Data
-- API, removed with the account). Existing records have no creator: editors and admins only.
--
-- The UPDATE policies of periods/events are left as they are on purpose: row locks
-- (SELECT … FOR UPDATE / FOR KEY SHARE, taken when a shared record joins a frise) are checked
-- against them. The rule is enforced by triggers, which row locks do not fire.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE catalogue_private.record_creators (
  kind text NOT NULL CHECK (kind IN ('period', 'event')),
  entity_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (kind, entity_id)
);
CREATE INDEX record_creators_user_idx ON catalogue_private.record_creators (user_id);
ALTER TABLE catalogue_private.record_creators ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE catalogue_private.record_creators FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION catalogue_private.can_edit_record(kind text, entity_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND ((SELECT access_private.is_public_editor()) OR (
      EXISTS (SELECT 1 FROM catalogue_private.record_creators c
        WHERE c.kind = can_edit_record.kind AND c.entity_id = can_edit_record.entity_id AND c.user_id = (SELECT auth.uid()))
      AND NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.owner_user_id IS DISTINCT FROM (SELECT auth.uid()) AND (
        (can_edit_record.kind = 'period' AND (
          EXISTS (SELECT 1 FROM public.story_periods sp WHERE sp.story_id = s.id AND sp.period_id = can_edit_record.entity_id)
          OR EXISTS (SELECT 1 FROM public.story_anchors a WHERE a.story_id = s.id AND a.anchor_type = 'period' AND a.anchor_id = can_edit_record.entity_id)
          OR EXISTS (SELECT 1 FROM public.story_entry_points ep WHERE s.id IN (ep.source_story_id, ep.target_story_id) AND ep.period_id = can_edit_record.entity_id)))
        OR (can_edit_record.kind = 'event' AND (
          EXISTS (SELECT 1 FROM public.story_events se WHERE se.story_id = s.id AND se.event_id = can_edit_record.entity_id)
          OR EXISTS (SELECT 1 FROM public.story_anchors a WHERE a.story_id = s.id AND a.anchor_type = 'event' AND a.anchor_id = can_edit_record.entity_id)
          OR EXISTS (SELECT 1 FROM public.story_entry_points ep WHERE s.id IN (ep.source_story_id, ep.target_story_id) AND ep.event_id = can_edit_record.entity_id)))))));
$function$;
REVOKE ALL ON FUNCTION catalogue_private.can_edit_record(text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION catalogue_private.can_edit_record(text, text) TO authenticated;

-- Maintenance scripts run without an account (no auth.uid()) and are not concerned, as for frises.
CREATE FUNCTION catalogue_private.guard_record_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NOT catalogue_private.can_edit_record(TG_ARGV[0], OLD.id::text) THEN
    RAISE EXCEPTION 'Cette fiche du catalogue partagé est réservée à son auteur ou à un éditeur' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE FUNCTION catalogue_private.track_record_creator() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (SELECT auth.uid()) IS NOT NULL THEN
      INSERT INTO catalogue_private.record_creators (kind, entity_id, user_id)
        VALUES (TG_ARGV[0], NEW.id::text, (SELECT auth.uid()))
        ON CONFLICT (kind, entity_id) DO UPDATE SET user_id = EXCLUDED.user_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE catalogue_private.record_creators SET entity_id = NEW.id::text WHERE kind = TG_ARGV[0] AND entity_id = OLD.id::text;
  ELSE
    DELETE FROM catalogue_private.record_creators WHERE kind = TG_ARGV[0] AND entity_id = OLD.id::text;
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION catalogue_private.guard_record_write() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION catalogue_private.track_record_creator() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER guard_period_write BEFORE UPDATE OR DELETE ON public.periods
  FOR EACH ROW EXECUTE FUNCTION catalogue_private.guard_record_write('period');
CREATE TRIGGER guard_event_write BEFORE UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION catalogue_private.guard_record_write('event');
CREATE TRIGGER track_period_creator AFTER INSERT OR DELETE ON public.periods
  FOR EACH ROW EXECUTE FUNCTION catalogue_private.track_record_creator('period');
CREATE TRIGGER track_period_creator_id AFTER UPDATE OF id ON public.periods
  FOR EACH ROW WHEN (OLD.id IS DISTINCT FROM NEW.id) EXECUTE FUNCTION catalogue_private.track_record_creator('period');
CREATE TRIGGER track_event_creator AFTER INSERT OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION catalogue_private.track_record_creator('event');
CREATE TRIGGER track_event_creator_id AFTER UPDATE OF id ON public.events
  FOR EACH ROW WHEN (OLD.id IS DISTINCT FROM NEW.id) EXECUTE FUNCTION catalogue_private.track_record_creator('event');

-- Classification links follow their record. Policy names are kept (startup preflight counts ut_*).
ALTER POLICY ut_write_period_categories ON public.period_categories
  USING (catalogue_private.can_edit_record('period', period_id::text)) WITH CHECK (catalogue_private.can_edit_record('period', period_id::text));
ALTER POLICY write_insert_period_categories ON public.period_categories WITH CHECK (catalogue_private.can_edit_record('period', period_id::text));
ALTER POLICY write_delete_period_categories ON public.period_categories USING (catalogue_private.can_edit_record('period', period_id::text));
ALTER POLICY period_tags_write ON public.period_tags
  USING (catalogue_private.can_edit_record('period', period_id::text)) WITH CHECK (catalogue_private.can_edit_record('period', period_id::text));
ALTER POLICY write_insert_period_tags ON public.period_tags WITH CHECK (catalogue_private.can_edit_record('period', period_id::text));
ALTER POLICY write_delete_period_tags ON public.period_tags USING (catalogue_private.can_edit_record('period', period_id::text));
ALTER POLICY ut_write_event_categories ON public.event_categories
  USING (catalogue_private.can_edit_record('event', event_id::text)) WITH CHECK (catalogue_private.can_edit_record('event', event_id::text));
ALTER POLICY write_insert_event_categories ON public.event_categories WITH CHECK (catalogue_private.can_edit_record('event', event_id::text));
ALTER POLICY write_delete_event_categories ON public.event_categories USING (catalogue_private.can_edit_record('event', event_id::text));
ALTER POLICY event_tags_write ON public.event_tags
  USING (catalogue_private.can_edit_record('event', event_id::text)) WITH CHECK (catalogue_private.can_edit_record('event', event_id::text));
ALTER POLICY write_insert_event_tags ON public.event_tags WITH CHECK (catalogue_private.can_edit_record('event', event_id::text));
ALTER POLICY write_delete_event_tags ON public.event_tags USING (catalogue_private.can_edit_record('event', event_id::text));
COMMIT;
