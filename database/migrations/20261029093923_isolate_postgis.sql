-- Supabase-supported rebuild for a database without PostGIS application columns.
-- Back up schema, roles and data and pause application traffic before applying.
-- RESTRICT deliberately refuses dependent objects; never replace it with CASCADE.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
  installed_schema text;
  installed_version text;
  available_version text;
BEGIN
  SELECT n.nspname, e.extversion, a.default_version
    INTO installed_schema, installed_version, available_version
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  JOIN pg_available_extensions a ON a.name = e.extname
  WHERE e.extname = 'postgis';
  IF installed_schema IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Expected PostGIS in public; review this migration for this database';
  END IF;
  IF installed_version IS DISTINCT FROM available_version THEN
    RAISE EXCEPTION 'PostGIS default version changed; review compatibility before rebuilding';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE a.attnum > 0 AND NOT a.attisdropped AND n.nspname = 'public'
      -- Composite result types owned by PostGIS are not application tables/views.
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND t.typname IN ('geometry', 'geography')
  ) THEN
    RAISE EXCEPTION 'PostGIS application columns exist; request a move from Supabase Support';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_depend d
    WHERE d.refclassid = 'pg_extension'::regclass
      AND d.refobjid = (SELECT oid FROM pg_extension WHERE extname = 'postgis')
      AND d.deptype <> 'e'
  ) THEN
    RAISE EXCEPTION 'Objects explicitly depend on PostGIS; review them before rebuilding';
  END IF;
END;
$$;

CREATE TEMP TABLE timeline_spatial_ref_sys_backup ON COMMIT DROP AS TABLE public.spatial_ref_sys;
DROP EXTENSION postgis RESTRICT;
CREATE EXTENSION postgis WITH SCHEMA extensions;

-- Preserve every existing reference definition, including custom SRIDs and edits.
INSERT INTO extensions.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
SELECT srid, auth_name, auth_srid, srtext, proj4text FROM timeline_spatial_ref_sys_backup
ON CONFLICT (srid) DO UPDATE SET
  auth_name = EXCLUDED.auth_name,
  auth_srid = EXCLUDED.auth_srid,
  srtext = EXCLUDED.srtext,
  proj4text = EXCLUDED.proj4text;

DO $$
BEGIN
  IF EXISTS (
    (SELECT * FROM extensions.spatial_ref_sys EXCEPT SELECT * FROM timeline_spatial_ref_sys_backup)
    UNION ALL
    (SELECT * FROM timeline_spatial_ref_sys_backup EXCEPT SELECT * FROM extensions.spatial_ref_sys)
  ) THEN
    RAISE EXCEPTION 'Spatial reference definitions changed; rolling back the rebuild';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
