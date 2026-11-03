-- Editors can maintain public frises without acquiring ownership, private access or deletion rights.
-- Rollout: deploy the API's ownership-before-deletion check before enabling these association policies.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA access_private;
REVOKE ALL ON SCHEMA access_private FROM PUBLIC;
GRANT USAGE ON SCHEMA access_private TO authenticated;

-- Recheck the stored role as well as the verified claim: revocation and suspension apply immediately.
CREATE FUNCTION access_private.is_public_editor() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND ((SELECT auth.jwt())->'app_metadata'->>'role') IN ('editor', 'admin')
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (SELECT auth.uid())
      AND u.raw_app_meta_data->>'role' IN ('editor', 'admin')
      AND NOT coalesce(u.is_anonymous, false)
      AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now()));
$function$;
REVOKE ALL ON FUNCTION access_private.is_public_editor() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION access_private.is_public_editor() TO authenticated;

CREATE FUNCTION access_private.can_edit_story(target integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target
      AND (s.owner_user_id = (SELECT auth.uid()) OR (s.is_public IS TRUE AND (SELECT access_private.is_public_editor()))));
$function$;
REVOKE ALL ON FUNCTION access_private.can_edit_story(integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION access_private.can_edit_story(integer) TO authenticated;

ALTER POLICY ut_update_stories ON public.stories
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND (owner_user_id = (SELECT auth.uid()) OR (is_public IS TRUE AND (SELECT access_private.is_public_editor()))))
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND (owner_user_id = (SELECT auth.uid()) OR (is_public IS TRUE AND (SELECT access_private.is_public_editor()))));

-- A public-content editor cannot steal a frise, change its signature/visibility, or attach it to a private parent.
CREATE FUNCTION access_private.guard_story_ownership() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND OLD.owner_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
      OR NEW.author IS DISTINCT FROM OLD.author OR NEW.is_public IS DISTINCT FROM OLD.is_public
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Cette opération est réservée au propriétaire de la frise' USING ERRCODE = '42501';
    END IF;
    IF NEW.parent_story_id IS DISTINCT FROM OLD.parent_story_id AND (
      (OLD.parent_story_id IS NOT NULL AND NOT access_private.can_edit_story(OLD.parent_story_id)) OR
      (NEW.parent_story_id IS NOT NULL AND NOT access_private.can_edit_story(NEW.parent_story_id))) THEN
      RAISE EXCEPTION 'Ce rattachement concerne une frise non modifiable' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION access_private.guard_story_ownership() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER guard_story_ownership BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION access_private.guard_story_ownership();

ALTER POLICY ut_write_story_periods ON public.story_periods
  USING (access_private.can_edit_story(story_id)) WITH CHECK (access_private.can_edit_story(story_id));
ALTER POLICY ut_write_story_events ON public.story_events
  USING (access_private.can_edit_story(story_id)) WITH CHECK (access_private.can_edit_story(story_id));
ALTER POLICY ut_write_story_categories ON public.story_categories
  USING (access_private.can_edit_story(story_id)) WITH CHECK (access_private.can_edit_story(story_id));
ALTER POLICY ut_write_story_anchors ON public.story_anchors
  USING (access_private.can_edit_story(story_id)) WITH CHECK (access_private.can_edit_story(story_id));
ALTER POLICY entry_points_insert ON public.story_entry_points
  WITH CHECK (access_private.can_edit_story(source_story_id) AND access_private.can_edit_story(target_story_id));
ALTER POLICY entry_points_delete ON public.story_entry_points
  USING (access_private.can_edit_story(source_story_id) AND access_private.can_edit_story(target_story_id));
ALTER POLICY presentations_insert ON public.story_period_presentations
  WITH CHECK (access_private.can_edit_story(context_story_id) AND access_private.can_edit_story(target_story_id));
ALTER POLICY presentations_delete ON public.story_period_presentations
  USING (access_private.can_edit_story(context_story_id) AND access_private.can_edit_story(target_story_id));

ALTER TABLE admin_private.audit_log DROP CONSTRAINT audit_log_action_check;
ALTER TABLE admin_private.audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('grant_admin','revoke_admin','grant_editor','revoke_editor','suspend','reactivate','delete_user'));

CREATE FUNCTION admin_private.set_editor(target uuid, enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := admin_private.require_admin(); label text := admin_private.lock_target(target, me, false);
BEGIN
  IF enabled AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Adresse non confirmée' USING ERRCODE = 'UTA03';
  END IF;
  IF enabled AND EXISTS (SELECT 1 FROM auth.users WHERE id = target AND banned_until > pg_catalog.now()) THEN
    RAISE EXCEPTION 'Compte suspendu' USING ERRCODE = 'UTA04';
  END IF;
  UPDATE auth.users SET raw_app_meta_data = CASE WHEN enabled
    THEN coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'editor')
    WHEN raw_app_meta_data->>'role' = 'editor' THEN coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
    ELSE raw_app_meta_data END WHERE id = target;
  INSERT INTO admin_private.audit_log(actor_user_id, action, target_user_id, target_username)
    VALUES(me, CASE WHEN enabled THEN 'grant_editor' ELSE 'revoke_editor' END, target, label);
END;
$function$;
REVOKE ALL ON FUNCTION admin_private.set_editor(uuid, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_private.set_editor(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION admin_private.user_summary(u auth.users) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT jsonb_build_object(
    'id', u.id, 'email', u.email, 'username', p.username, 'avatarColor', p.avatar_color, 'avatarIcon', p.avatar_icon,
    'createdAt', u.created_at, 'lastSignInAt', u.last_sign_in_at, 'confirmed', u.email_confirmed_at IS NOT NULL,
    'isAdmin', coalesce(u.raw_app_meta_data->>'role' = 'admin', false),
    'isEditor', coalesce(u.raw_app_meta_data->>'role' = 'editor', false),
    'suspended', coalesce(u.banned_until > pg_catalog.now(), false),
    'stories', (SELECT count(*) FROM public.stories s WHERE s.owner_user_id = u.id),
    'publicStories', (SELECT count(*) FROM public.stories s WHERE s.owner_user_id = u.id AND s.is_public))
  FROM (SELECT 1) one LEFT JOIN public.profiles p ON p.user_id = u.id;
$function$;
COMMIT;
