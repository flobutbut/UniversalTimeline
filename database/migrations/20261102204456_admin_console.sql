-- Admin console: platform indicators and account moderation, for verified admins only.
-- Same model as account_private: SECURITY DEFINER routines in a schema the Data API does not
-- expose, executable by `authenticated` only, each checking both the admin claim set by the API
-- and the role stored in auth.users. Admin actions are written to a journal that nobody else reads.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA admin_private;
REVOKE ALL ON SCHEMA admin_private FROM PUBLIC;
GRANT USAGE ON SCHEMA admin_private TO authenticated;

-- No foreign key: an entry outlives a deleted account. The username is a snapshot taken at the time.
CREATE TABLE admin_private.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('grant_admin', 'revoke_admin', 'suspend', 'reactivate', 'delete_user')),
  target_user_id uuid NOT NULL,
  target_username text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_target_idx ON admin_private.audit_log (target_user_id, created_at DESC);
REVOKE ALL ON admin_private.audit_log FROM PUBLIC, anon, authenticated, service_role;

-- Returns the caller when the API claim and the stored role both say admin.
CREATE FUNCTION admin_private.require_admin() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR ((SELECT auth.jwt())->'app_metadata'->>'role') IS DISTINCT FROM 'admin'
     OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = me AND u.raw_app_meta_data->>'role' = 'admin') THEN
    RAISE EXCEPTION 'Accès réservé à l’administrateur' USING ERRCODE = '42501';
  END IF;
  RETURN me;
END;
$function$;
REVOKE ALL ON FUNCTION admin_private.require_admin() FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION admin_private.dashboard() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  RETURN jsonb_build_object(
    'generatedAt', pg_catalog.now(),
    'users', (SELECT jsonb_build_object(
      'total', count(*),
      'confirmed', count(*) FILTER (WHERE u.email_confirmed_at IS NOT NULL),
      'withProfile', count(p.user_id),
      'creators', count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.stories s WHERE s.owner_user_id = u.id)),
      'new7d', count(*) FILTER (WHERE u.created_at >= pg_catalog.now() - interval '7 days'),
      'new30d', count(*) FILTER (WHERE u.created_at >= pg_catalog.now() - interval '30 days'),
      'active30d', count(*) FILTER (WHERE u.last_sign_in_at >= pg_catalog.now() - interval '30 days'),
      'admins', count(*) FILTER (WHERE u.raw_app_meta_data->>'role' = 'admin'),
      'suspended', count(*) FILTER (WHERE u.banned_until > pg_catalog.now()))
      FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE NOT coalesce(u.is_anonymous, false)),
    'stories', (SELECT jsonb_build_object(
      'total', count(*),
      'public', count(*) FILTER (WHERE s.is_public),
      'private', count(*) FILTER (WHERE NOT coalesce(s.is_public, false)),
      'roots', count(*) FILTER (WHERE s.parent_story_id IS NULL),
      'children', count(*) FILTER (WHERE s.parent_story_id IS NOT NULL),
      'empty', count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.story_periods sp WHERE sp.story_id = s.id)
        AND NOT EXISTS (SELECT 1 FROM public.story_events se WHERE se.story_id = s.id)),
      'created30d', count(*) FILTER (WHERE s.created_at >= pg_catalog.now() - interval '30 days'),
      'updated30d', count(*) FILTER (WHERE s.updated_at >= pg_catalog.now() - interval '30 days'))
      FROM public.stories s),
    'catalogue', jsonb_build_object(
      'periods', (SELECT count(*) FROM public.periods),
      'periodsWithQid', (SELECT count(*) FROM public.periods WHERE wikidata_id IS NOT NULL),
      'periodsUnused', (SELECT count(*) FROM public.periods p WHERE NOT EXISTS (SELECT 1 FROM public.story_periods sp WHERE sp.period_id = p.id)),
      'events', (SELECT count(*) FROM public.events),
      'eventsWithQid', (SELECT count(*) FROM public.events WHERE wikidata_id IS NOT NULL),
      'eventsUnused', (SELECT count(*) FROM public.events e WHERE NOT EXISTS (SELECT 1 FROM public.story_events se WHERE se.event_id = e.id)),
      'categories', (SELECT count(*) FROM public.categories)),
    'relations', jsonb_build_object(
      'storyPeriods', (SELECT count(*) FROM public.story_periods),
      'storyEvents', (SELECT count(*) FROM public.story_events),
      'childStories', (SELECT count(*) FROM public.stories WHERE parent_story_id IS NOT NULL),
      'anchors', (SELECT count(*) FROM public.story_anchors),
      'entryPoints', (SELECT count(*) FROM public.story_entry_points),
      'presentations', (SELECT count(*) FROM public.story_period_presentations),
      'categoryLinks', (SELECT count(*) FROM public.story_categories) + (SELECT count(*) FROM public.period_categories)
        + (SELECT count(*) FROM public.event_categories)),
    'topStories', coalesce((SELECT jsonb_agg(t ORDER BY t."size" DESC, t.id) FROM (
      SELECT s.id, coalesce(nullif(s.title_fr, ''), s.title_en) AS title, s.author, coalesce(s.is_public, false) AS "isPublic",
        (SELECT count(*) FROM public.story_periods sp WHERE sp.story_id = s.id) AS periods,
        (SELECT count(*) FROM public.story_events se WHERE se.story_id = s.id) AS events,
        (SELECT count(*) FROM public.story_periods sp WHERE sp.story_id = s.id) + (SELECT count(*) FROM public.story_events se WHERE se.story_id = s.id) AS "size"
      FROM public.stories s ORDER BY "size" DESC, s.id LIMIT 5) t), '[]'::jsonb),
    'recentUsers', coalesce((SELECT jsonb_agg(r ORDER BY r."createdAt" DESC) FROM (
      SELECT u.id, p.username, u.created_at AS "createdAt", u.email_confirmed_at IS NOT NULL AS confirmed
      FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
      WHERE NOT coalesce(u.is_anonymous, false) ORDER BY u.created_at DESC LIMIT 5) r), '[]'::jsonb),
    'recentActions', coalesce((SELECT jsonb_agg(a ORDER BY a."createdAt" DESC) FROM (
      SELECT l.action, l.target_user_id AS "targetId", l.target_username AS "targetUsername", ap.username AS "actorUsername", l.created_at AS "createdAt"
      FROM admin_private.audit_log l LEFT JOIN public.profiles ap ON ap.user_id = l.actor_user_id
      ORDER BY l.created_at DESC, l.id DESC LIMIT 10) a), '[]'::jsonb)
  );
END;
$function$;

-- One row per account, for the users table.
CREATE FUNCTION admin_private.user_summary(u auth.users) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT jsonb_build_object(
    'id', u.id, 'email', u.email, 'username', p.username, 'avatarColor', p.avatar_color, 'avatarIcon', p.avatar_icon,
    'createdAt', u.created_at, 'lastSignInAt', u.last_sign_in_at, 'confirmed', u.email_confirmed_at IS NOT NULL,
    'isAdmin', coalesce(u.raw_app_meta_data->>'role' = 'admin', false), 'suspended', coalesce(u.banned_until > pg_catalog.now(), false),
    'stories', (SELECT count(*) FROM public.stories s WHERE s.owner_user_id = u.id),
    'publicStories', (SELECT count(*) FROM public.stories s WHERE s.owner_user_id = u.id AND s.is_public))
  FROM (SELECT 1) one LEFT JOIN public.profiles p ON p.user_id = u.id;
$function$;
REVOKE ALL ON FUNCTION admin_private.user_summary(auth.users) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION admin_private.list_users() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  RETURN coalesce((SELECT jsonb_agg(admin_private.user_summary(u) ORDER BY u.created_at DESC, u.id)
    FROM auth.users u WHERE NOT coalesce(u.is_anonymous, false)), '[]'::jsonb);
END;
$function$;

CREATE FUNCTION admin_private.user_detail(target uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
DECLARE account auth.users;
BEGIN
  PERFORM admin_private.require_admin();
  SELECT * INTO account FROM auth.users WHERE id = target AND NOT coalesce(is_anonymous, false);
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable' USING ERRCODE = 'P0002'; END IF;
  RETURN admin_private.user_summary(account) || jsonb_build_object(
    'termsVersion', (SELECT p.terms_version FROM public.profiles p WHERE p.user_id = target),
    'termsAcceptedAt', (SELECT p.terms_accepted_at FROM public.profiles p WHERE p.user_id = target),
    'storyList', coalesce((SELECT jsonb_agg(st ORDER BY st."updatedAt" DESC NULLS LAST, st.id) FROM (
      SELECT s.id, coalesce(nullif(s.title_fr, ''), s.title_en) AS title, coalesce(s.is_public, false) AS "isPublic",
        s.parent_story_id AS "parentStoryId", s.updated_at AS "updatedAt",
        (SELECT count(*) FROM public.story_periods sp WHERE sp.story_id = s.id) AS periods,
        (SELECT count(*) FROM public.story_events se WHERE se.story_id = s.id) AS events
      FROM public.stories s WHERE s.owner_user_id = target) st), '[]'::jsonb),
    'history', coalesce((SELECT jsonb_agg(h ORDER BY h."createdAt" DESC) FROM (
      SELECT l.action, ap.username AS "actorUsername", l.created_at AS "createdAt"
      FROM admin_private.audit_log l LEFT JOIN public.profiles ap ON ap.user_id = l.actor_user_id
      WHERE l.target_user_id = target ORDER BY l.created_at DESC, l.id DESC LIMIT 20) h), '[]'::jsonb));
END;
$function$;

-- Locks the target and applies the shared rules: it exists, it is not the caller, and (unless the
-- action is about the role itself) it is not an admin, whose role must be withdrawn first.
CREATE FUNCTION admin_private.lock_target(target uuid, me uuid, allow_admin boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE account auth.users;
BEGIN
  SELECT * INTO account FROM auth.users WHERE id = target AND NOT coalesce(is_anonymous, false) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable' USING ERRCODE = 'P0002'; END IF;
  IF target = me THEN RAISE EXCEPTION 'Action impossible sur son propre compte' USING ERRCODE = 'UTA01'; END IF;
  IF NOT allow_admin AND account.raw_app_meta_data->>'role' = 'admin' THEN
    RAISE EXCEPTION 'Retirer d’abord le rôle administrateur' USING ERRCODE = 'UTA02';
  END IF;
  RETURN (SELECT p.username FROM public.profiles p WHERE p.user_id = target);
END;
$function$;
REVOKE ALL ON FUNCTION admin_private.lock_target(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION admin_private.set_admin(target uuid, enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := admin_private.require_admin(); label text := admin_private.lock_target(target, me, true);
BEGIN
  IF enabled AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Adresse non confirmée' USING ERRCODE = 'UTA03';
  END IF;
  IF enabled AND EXISTS (SELECT 1 FROM auth.users WHERE id = target AND banned_until > pg_catalog.now()) THEN
    RAISE EXCEPTION 'Compte suspendu' USING ERRCODE = 'UTA04';
  END IF;
  UPDATE auth.users SET raw_app_meta_data = CASE WHEN enabled
      THEN coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
      ELSE coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' END
    WHERE id = target;
  INSERT INTO admin_private.audit_log (actor_user_id, action, target_user_id, target_username)
    VALUES (me, CASE WHEN enabled THEN 'grant_admin' ELSE 'revoke_admin' END, target, label);
END;
$function$;

-- A suspension blocks sign-in and token refresh, and closes the open sessions; the API also
-- refuses a suspended account on its next request.
CREATE FUNCTION admin_private.set_suspended(target uuid, suspended boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := admin_private.require_admin(); label text := admin_private.lock_target(target, me, false);
BEGIN
  UPDATE auth.users SET banned_until = CASE WHEN suspended THEN pg_catalog.now() + interval '100 years' ELSE NULL END
    WHERE id = target;
  IF suspended THEN DELETE FROM auth.sessions WHERE user_id = target; END IF;
  INSERT INTO admin_private.audit_log (actor_user_id, action, target_user_id, target_username)
    VALUES (me, CASE WHEN suspended THEN 'suspend' ELSE 'reactivate' END, target, label);
END;
$function$;

-- Same erasure as the self-service one: frises, then the account (the profile cascades).
-- Shared catalogue periods and events are kept.
CREATE FUNCTION admin_private.delete_user(target uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := admin_private.require_admin(); label text := admin_private.lock_target(target, me, false);
BEGIN
  DELETE FROM public.stories WHERE owner_user_id = target;
  DELETE FROM auth.users WHERE id = target;
  INSERT INTO admin_private.audit_log (actor_user_id, action, target_user_id, target_username)
    VALUES (me, 'delete_user', target, label);
END;
$function$;

REVOKE ALL ON FUNCTION admin_private.dashboard(), admin_private.list_users(), admin_private.user_detail(uuid),
  admin_private.set_admin(uuid, boolean), admin_private.set_suspended(uuid, boolean), admin_private.delete_user(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_private.dashboard(), admin_private.list_users(), admin_private.user_detail(uuid),
  admin_private.set_admin(uuid, boolean), admin_private.set_suspended(uuid, boolean), admin_private.delete_user(uuid)
  TO authenticated;

COMMIT;
