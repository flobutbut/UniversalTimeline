BEGIN;
SET LOCAL lock_timeout = '5s';

-- Trigger execution keeps the caller's privileges. Its only lookup is pg_catalog.now().
ALTER FUNCTION public.set_updated_at() SET search_path = '';
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;

-- Historical bulk repair, unused by the application and incompatible with the current schema.
-- Keep its definition for the maintenance audit, but make it unavailable to API roles.
ALTER FUNCTION public.maintain_period_relations() SET search_path = pg_catalog, public, pg_temp;
REVOKE ALL ON FUNCTION public.maintain_period_relations() FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
