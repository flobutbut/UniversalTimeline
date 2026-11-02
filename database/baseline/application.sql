-- UniversalTimeline application baseline, reviewed from PostgreSQL 17 metadata on 2026-10-29.
-- Empty Supabase project ONLY. No accounts, application rows, passwords or live sequence values.
-- Current access rules are included: do NOT replay the three historical migrations afterwards.
-- Supabase supplies auth.users, auth.uid(), auth.jwt() and its API roles.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_catalog;
DO $baseline$
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'UniversalTimeline baseline requires PostgreSQL 17 or later';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('categories','event_categories','events','period_categories','periods','profiles','stories','story_anchors','story_categories','story_events','story_periods','stories_id_seq','story_anchors_id_seq')) THEN
    RAISE EXCEPTION 'Application objects already exist; baseline refused without modifying them';
  END IF;
  IF to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL OR to_regprocedure('auth.jwt()') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    RAISE EXCEPTION 'Supabase Auth schema and API roles are required';
  END IF;
END;
$baseline$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SEQUENCE public."story_anchors_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 NO CYCLE;

CREATE TABLE public."categories" (
  "id" character varying NOT NULL,
  "parent_id" character varying,
  "label_fr" text NOT NULL,
  "label_en" text NOT NULL,
  "description_fr" text,
  "description_en" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."event_categories" (
  "event_id" character varying NOT NULL,
  "category_id" character varying NOT NULL
);

CREATE TABLE public."events" (
  "id" character varying NOT NULL,
  "wikidata_id" character varying,
  "label_fr" text NOT NULL,
  "label_en" text NOT NULL,
  "description_fr" text,
  "description_en" text,
  "date" text,
  "date_years_bp" numeric,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."period_categories" (
  "period_id" character varying NOT NULL,
  "category_id" character varying NOT NULL
);

CREATE TABLE public."periods" (
  "id" character varying NOT NULL,
  "wikidata_id" character varying,
  "label_fr" text NOT NULL,
  "label_en" text NOT NULL,
  "description_fr" text,
  "description_en" text,
  "start_date" text,
  "end_date" text,
  "start_years_bp" numeric,
  "end_years_bp" numeric,
  "color" character varying,
  "image_url" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."stories" (
  "id" integer GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME public.stories_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 NO CYCLE) NOT NULL,
  "title_fr" text NOT NULL,
  "title_en" text NOT NULL,
  "description_fr" text,
  "description_en" text,
  "author" character varying NOT NULL,
  "is_public" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "parent_story_id" integer,
  "owner_user_id" uuid DEFAULT auth.uid()
);

CREATE TABLE public."story_anchors" (
  "id" integer DEFAULT nextval('story_anchors_id_seq'::regclass) NOT NULL,
  "story_id" integer NOT NULL,
  "anchor_type" text NOT NULL,
  "anchor_id" text NOT NULL
);

CREATE TABLE public."story_categories" (
  "story_id" integer NOT NULL,
  "category_id" character varying NOT NULL
);

CREATE TABLE public."story_events" (
  "story_id" integer NOT NULL,
  "event_id" character varying NOT NULL
);

CREATE TABLE public."story_periods" (
  "story_id" integer NOT NULL,
  "period_id" character varying NOT NULL
);

ALTER TABLE public."categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY (id);
ALTER TABLE public."event_categories" ADD CONSTRAINT "event_categories_pkey" PRIMARY KEY (event_id, category_id);
ALTER TABLE public."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY (id);
ALTER TABLE public."period_categories" ADD CONSTRAINT "period_categories_pkey" PRIMARY KEY (period_id, category_id);
ALTER TABLE public."periods" ADD CONSTRAINT "periods_pkey" PRIMARY KEY (id);
ALTER TABLE public."stories" ADD CONSTRAINT "stories_pkey" PRIMARY KEY (id);
ALTER TABLE public."story_anchors" ADD CONSTRAINT "story_anchors_pkey" PRIMARY KEY (id);
ALTER TABLE public."story_categories" ADD CONSTRAINT "story_categories_pkey" PRIMARY KEY (story_id, category_id);
ALTER TABLE public."story_events" ADD CONSTRAINT "story_events_pkey" PRIMARY KEY (story_id, event_id);
ALTER TABLE public."story_periods" ADD CONSTRAINT "story_periods_pkey" PRIMARY KEY (story_id, period_id);
ALTER TABLE public."events" ADD CONSTRAINT "events_wikidata_id_key" UNIQUE (wikidata_id);
ALTER TABLE public."periods" ADD CONSTRAINT "periods_wikidata_id_key" UNIQUE (wikidata_id);
ALTER TABLE public."stories" ADD CONSTRAINT "stories_id_owner_unique" UNIQUE (id, owner_user_id);
ALTER TABLE public."story_anchors" ADD CONSTRAINT "story_anchors_story_id_anchor_type_anchor_id_key" UNIQUE (story_id, anchor_type, anchor_id);
ALTER TABLE public."story_anchors" ADD CONSTRAINT "story_anchors_anchor_type_check" CHECK (anchor_type = ANY (ARRAY['period'::text, 'event'::text]));
ALTER TABLE public."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."event_categories" ADD CONSTRAINT "event_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public."event_categories" ADD CONSTRAINT "event_categories_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public."period_categories" ADD CONSTRAINT "period_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public."period_categories" ADD CONSTRAINT "period_categories_period_id_fkey" FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE;
ALTER TABLE public."stories" ADD CONSTRAINT "stories_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public."stories" ADD CONSTRAINT "stories_parent_same_owner" FOREIGN KEY (parent_story_id, owner_user_id) REFERENCES stories(id, owner_user_id);
ALTER TABLE public."stories" ADD CONSTRAINT "stories_parent_story_id_fkey" FOREIGN KEY (parent_story_id) REFERENCES stories(id);
ALTER TABLE public."story_anchors" ADD CONSTRAINT "story_anchors_story_id_fkey" FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;
ALTER TABLE public."story_categories" ADD CONSTRAINT "story_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public."story_categories" ADD CONSTRAINT "story_categories_story_id_fkey" FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;
ALTER TABLE public."story_events" ADD CONSTRAINT "story_events_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public."story_events" ADD CONSTRAINT "story_events_story_id_fkey" FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;
ALTER TABLE public."story_periods" ADD CONSTRAINT "story_periods_period_id_fkey" FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE;
ALTER TABLE public."story_periods" ADD CONSTRAINT "story_periods_story_id_fkey" FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

ALTER SEQUENCE public.story_anchors_id_seq OWNED BY public.story_anchors.id;

CREATE INDEX idx_events_date_years_bp ON public.events USING btree (date_years_bp DESC NULLS LAST);
CREATE INDEX idx_periods_end_years_bp ON public.periods USING btree (end_years_bp);
CREATE INDEX idx_periods_start_years_bp ON public.periods USING btree (start_years_bp DESC NULLS LAST);
CREATE INDEX idx_stories_is_public ON public.stories USING btree (is_public);
CREATE INDEX idx_stories_parent_story_id ON public.stories USING btree (parent_story_id);
CREATE INDEX stories_owner_user_id_idx ON public.stories USING btree (owner_user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_periods_updated_at BEFORE UPDATE ON periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stories_updated_at BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public."categories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."categories" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."categories" TO "anon";
GRANT SELECT ON public."categories" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."categories" TO "service_role";
ALTER TABLE public."event_categories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."event_categories" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."event_categories" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."event_categories" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."event_categories" TO "service_role";
ALTER TABLE public."events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."events" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."events" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."events" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."events" TO "service_role";
ALTER TABLE public."period_categories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."period_categories" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."period_categories" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."period_categories" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."period_categories" TO "service_role";
ALTER TABLE public."periods" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."periods" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."periods" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."periods" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."periods" TO "service_role";
ALTER TABLE public."stories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."stories" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."stories" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."stories" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."stories" TO "service_role";
ALTER TABLE public."story_anchors" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."story_anchors" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."story_anchors" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."story_anchors" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."story_anchors" TO "service_role";
ALTER TABLE public."story_categories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."story_categories" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."story_categories" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."story_categories" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."story_categories" TO "service_role";
ALTER TABLE public."story_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."story_events" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."story_events" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."story_events" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."story_events" TO "service_role";
ALTER TABLE public."story_periods" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."story_periods" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public."story_periods" TO "anon";
GRANT DELETE, INSERT, SELECT, UPDATE ON public."story_periods" TO "authenticated";
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."story_periods" TO "service_role";

-- Sequences have no RLS: clients only need nextval for authenticated inserts.
-- Tighter than historical sequence defaults; no change to the existing remote project.
REVOKE ALL ON SEQUENCE public."stories_id_seq" FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE public."stories_id_seq" TO authenticated;
GRANT ALL ON SEQUENCE public."stories_id_seq" TO service_role;
REVOKE ALL ON SEQUENCE public."story_anchors_id_seq" FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE public."story_anchors_id_seq" TO authenticated;
GRANT ALL ON SEQUENCE public."story_anchors_id_seq" TO service_role;

CREATE POLICY "ut_read_categories" ON public."categories" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (true);
CREATE POLICY "ut_read_event_categories" ON public."event_categories" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (true);
CREATE POLICY "ut_write_event_categories" ON public."event_categories" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_events" ON public."events" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (true);
CREATE POLICY "ut_write_events" ON public."events" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_period_categories" ON public."period_categories" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (true);
CREATE POLICY "ut_write_period_categories" ON public."period_categories" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_periods" ON public."periods" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (true);
CREATE POLICY "ut_write_periods" ON public."periods" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_delete_stories" ON public."stories" AS PERMISSIVE FOR DELETE TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = owner_user_id) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_insert_stories" ON public."stories" AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = owner_user_id) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_stories" ON public."stories" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (((is_public IS TRUE) OR (( SELECT auth.uid() AS uid) = owner_user_id)));
CREATE POLICY "ut_update_stories" ON public."stories" AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = owner_user_id) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((( SELECT auth.uid() AS uid) = owner_user_id) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_story_anchors" ON public."story_anchors" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM stories s
  WHERE (s.id = story_anchors.story_id))));
CREATE POLICY "ut_write_story_anchors" ON public."story_anchors" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_anchors.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_anchors.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_story_categories" ON public."story_categories" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM stories s
  WHERE (s.id = story_categories.story_id))));
CREATE POLICY "ut_write_story_categories" ON public."story_categories" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_categories.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_categories.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_story_events" ON public."story_events" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM stories s
  WHERE (s.id = story_events.story_id))));
CREATE POLICY "ut_write_story_events" ON public."story_events" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_events.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_events.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));
CREATE POLICY "ut_read_story_periods" ON public."story_periods" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM stories s
  WHERE (s.id = story_periods.story_id))));
CREATE POLICY "ut_write_story_periods" ON public."story_periods" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_periods.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_periods.story_id) AND (s.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT (auth.jwt() ->> 'is_anonymous'::text)) IS DISTINCT FROM 'true'::text)));

COMMENT ON COLUMN public.stories.owner_user_id IS 'UniversalTimeline access v1; NULL = legacy story pending explicit attribution';
-- Keep catalogue parentage unchanged; a frise can store its own placement.
ALTER TABLE public.story_periods
  ADD COLUMN parent_period_id character varying;
ALTER TABLE public.story_periods
  ADD CONSTRAINT story_periods_no_self_parent CHECK (parent_period_id IS DISTINCT FROM period_id),
  ADD CONSTRAINT story_periods_parent_in_same_story FOREIGN KEY (story_id, parent_period_id) REFERENCES public.story_periods(story_id, period_id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX story_periods_parent_period_id_idx ON public.story_periods (parent_period_id, story_id);

-- Read-only search helpers, isolated from the application schema.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

CREATE FUNCTION public.check_story_period_hierarchy() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  PERFORM 1 FROM public.stories WHERE id = NEW.story_id FOR UPDATE;
  IF TG_OP = 'UPDATE' AND (NEW.story_id, NEW.period_id) IS DISTINCT FROM (OLD.story_id, OLD.period_id) THEN
    RAISE EXCEPTION 'Remove and add a membership to change its identity' USING ERRCODE = '23514';
  END IF;
  IF NEW.parent_period_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE ancestors(id, parent_id) AS (
      SELECT sp.period_id, sp.parent_period_id FROM public.story_periods sp
      WHERE sp.story_id = NEW.story_id AND sp.period_id = NEW.parent_period_id
      UNION
      SELECT sp.period_id, sp.parent_period_id FROM public.story_periods sp
      JOIN ancestors a ON sp.period_id = a.parent_id WHERE sp.story_id = NEW.story_id
    ) SELECT 1 FROM ancestors WHERE id = NEW.period_id
  ) THEN RAISE EXCEPTION 'A frise cannot contain a period cycle' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.check_story_period_hierarchy() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_story_period_hierarchy
BEFORE INSERT OR UPDATE ON public.story_periods
FOR EACH ROW EXECUTE FUNCTION public.check_story_period_hierarchy();


CREATE TABLE public.story_entry_points (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_story_id integer NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  target_story_id integer NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  period_id varchar,
  event_id varchar,
  CONSTRAINT story_entry_points_location CHECK (num_nonnulls(period_id, event_id) = 1),
  CONSTRAINT story_entry_points_distinct_stories CHECK (source_story_id <> target_story_id),
  CONSTRAINT story_entry_points_unique UNIQUE NULLS NOT DISTINCT (source_story_id, target_story_id, period_id, event_id),
  CONSTRAINT story_entry_points_period FOREIGN KEY (source_story_id, period_id)
    REFERENCES public.story_periods(story_id, period_id) ON DELETE CASCADE,
  CONSTRAINT story_entry_points_event FOREIGN KEY (source_story_id, event_id)
    REFERENCES public.story_events(story_id, event_id) ON DELETE CASCADE
);
CREATE INDEX story_entry_points_target_idx ON public.story_entry_points(target_story_id);
CREATE INDEX story_entry_points_period_idx ON public.story_entry_points(source_story_id, period_id) WHERE period_id IS NOT NULL;
CREATE INDEX story_entry_points_event_idx ON public.story_entry_points(source_story_id, event_id) WHERE event_id IS NOT NULL;
ALTER TABLE public.story_entry_points ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_entry_points FROM anon, authenticated;
GRANT SELECT ON public.story_entry_points TO anon, authenticated;
GRANT INSERT, DELETE ON public.story_entry_points TO authenticated;
GRANT USAGE ON SEQUENCE public.story_entry_points_id_seq TO authenticated;
CREATE POLICY entry_points_read ON public.story_entry_points FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id)
     AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id));
CREATE POLICY entry_points_insert ON public.story_entry_points FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));
CREATE POLICY entry_points_delete ON public.story_entry_points FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = source_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));

-- Account routines live outside the schemas exposed by the Data API (migration 20261102110027).
CREATE SCHEMA account_private;
REVOKE ALL ON SCHEMA account_private FROM PUBLIC;
GRANT USAGE ON SCHEMA account_private TO anon, authenticated;
-- Account profiles (migration 20261102105902): unique username, avatar, terms acceptance, self-service erasure.
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
CREATE FUNCTION account_private.is_username_available(candidate text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username) = lower(btrim(candidate)) AND p.user_id IS DISTINCT FROM (SELECT auth.uid())
  );
$function$;
REVOKE ALL ON FUNCTION account_private.is_username_available(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION account_private.is_username_available(text) TO anon, authenticated;

-- A sign-up that carries a username creates its profile in the same transaction: a taken or
-- invalid username makes the sign-up fail. Sign-ups without username keep working (no profile).
CREATE FUNCTION account_private.create_profile_for_new_user() RETURNS trigger
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
REVOKE ALL ON FUNCTION account_private.create_profile_for_new_user() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION account_private.create_profile_for_new_user();

-- Right to erasure: the signed-in account deletes its frises, then itself (profile cascades).
-- Shared catalogue periods and events are kept.
CREATE FUNCTION account_private.delete_own_account() RETURNS void
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
REVOKE ALL ON FUNCTION account_private.delete_own_account() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION account_private.delete_own_account() TO authenticated;

COMMIT;
