-- The account routines run only through the API's PostgreSQL connection, never through the Data API:
-- keep them in a schema that Supabase does not expose (same approach as the extensions schema).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA account_private;
REVOKE ALL ON SCHEMA account_private FROM PUBLIC;
GRANT USAGE ON SCHEMA account_private TO anon, authenticated;
ALTER FUNCTION public.is_username_available(text) SET SCHEMA account_private;
ALTER FUNCTION public.delete_own_account() SET SCHEMA account_private;
ALTER FUNCTION public.create_profile_for_new_user() SET SCHEMA account_private;
COMMIT;
