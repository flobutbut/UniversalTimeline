-- Account profiles: unique username (frise byline), editable avatar, recorded terms acceptance,
-- and self-service erasure. Additive: existing stories, policies and the ut_% preflight count are unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_color text NOT NULL DEFAULT 'blue',
  avatar_icon text NOT NULL DEFAULT 'initial',
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{2,29}$'),
  CONSTRAINT profiles_username_reserved CHECK (lower(username) <> ALL (ARRAY['admin','administrateur','anonyme','anonymous','moderateur','support','universaltimeline','system'])),
  CONSTRAINT profiles_avatar_color CHECK (avatar_color = ANY (ARRAY['blue','green','amber','red','violet','pink','teal','slate'])),
  CONSTRAINT profiles_avatar_icon CHECK (avatar_icon = ANY (ARRAY['initial','telescope','earth','temple','dna','rocket','book','compass'])),
  CONSTRAINT profiles_terms_pair CHECK ((terms_version IS NULL) = (terms_accepted_at IS NULL))
);
-- Usernames are unique regardless of case.
CREATE UNIQUE INDEX profiles_username_key ON public.profiles (lower(username));
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (user_id, username, avatar_color, avatar_icon, terms_version, terms_accepted_at) ON public.profiles TO authenticated;
GRANT UPDATE (username, avatar_color, avatar_icon, terms_version, terms_accepted_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Sign-up availability check: answers only "taken or not", never lists profiles.
CREATE FUNCTION public.is_username_available(candidate text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username) = lower(btrim(candidate)) AND p.user_id IS DISTINCT FROM (SELECT auth.uid())
  );
$function$;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

-- A sign-up that carries a username creates its profile in the same transaction: a taken or
-- invalid username makes the sign-up fail. Sign-ups without username keep working (no profile).
CREATE FUNCTION public.create_profile_for_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  wanted text := nullif(btrim(NEW.raw_user_meta_data->>'username'), '');
  terms text := nullif(btrim(NEW.raw_user_meta_data->>'terms_version'), '');
BEGIN
  IF wanted IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, username, terms_version, terms_accepted_at)
    VALUES (NEW.id, wanted, terms, CASE WHEN terms IS NULL THEN NULL ELSE pg_catalog.now() END);
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_profile_for_new_user() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();

-- Right to erasure: the signed-in account deletes its frises, then itself (profile cascades).
-- Shared catalogue periods and events are kept.
CREATE FUNCTION public.delete_own_account() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR ((SELECT auth.jwt())->>'is_anonymous') IS NOT DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.stories WHERE owner_user_id = me;
  DELETE FROM auth.users WHERE id = me;
END;
$function$;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMIT;
