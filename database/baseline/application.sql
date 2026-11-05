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
    WHERE n.nspname='public' AND c.relname IN ('categories','event_categories','events','period_categories','periods','profiles','stories','story_anchors','story_period_presentations','story_categories','story_events','story_periods','stories_id_seq','story_anchors_id_seq')) THEN
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
  "event_id" character varying NOT NULL,
  "importance" text NOT NULL DEFAULT 'normal'::text
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
ALTER TABLE public."story_events" ADD CONSTRAINT "story_events_importance_check" CHECK (importance = ANY (ARRAY['major'::text, 'normal'::text, 'minor'::text]));
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
  display_as_period boolean NOT NULL DEFAULT false,
  CONSTRAINT story_entry_points_location CHECK (num_nonnulls(period_id, event_id) <= 1),
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

-- A presentation is a view of a period in a specific chronological context.
-- Existing thematic entry points keep their original meaning.
CREATE TABLE public.story_period_presentations (
  context_story_id integer NOT NULL,
  period_id varchar NOT NULL,
  target_story_id integer NOT NULL,
  CONSTRAINT story_period_presentations_pkey PRIMARY KEY (context_story_id, period_id, target_story_id),
  CONSTRAINT story_period_presentations_context FOREIGN KEY (context_story_id, period_id)
    REFERENCES public.story_periods(story_id, period_id) ON DELETE CASCADE,
  CONSTRAINT story_period_presentations_target FOREIGN KEY (target_story_id)
    REFERENCES public.stories(id) ON DELETE CASCADE,
  CONSTRAINT story_period_presentations_distinct CHECK (context_story_id <> target_story_id)
);
CREATE INDEX story_period_presentations_target_idx ON public.story_period_presentations(target_story_id, period_id);
ALTER TABLE public.story_period_presentations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_period_presentations FROM anon, authenticated;
GRANT SELECT ON public.story_period_presentations TO anon, authenticated;
GRANT INSERT, DELETE ON public.story_period_presentations TO authenticated;
CREATE POLICY presentations_read ON public.story_period_presentations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = context_story_id)
     AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id));
CREATE POLICY presentations_insert ON public.story_period_presentations FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = context_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));
CREATE POLICY presentations_delete ON public.story_period_presentations FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true'
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = context_story_id AND s.owner_user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = target_story_id AND s.owner_user_id = (SELECT auth.uid())));

-- Admin console (migration 20261102204456_admin_console): indicators and account moderation for
-- verified admins only, in a schema the Data API does not expose; actions are journaled.
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

-- Catalogue conversion guard (migration 20261103112451_catalogue_conversion_guard): counts the frises of
-- other owners and the chronological views that a period/event conversion would silently cascade into.
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
-- Editors can maintain public frises without acquiring ownership, private access or deletion rights.
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

-- Administration: read-only relation graph.
-- Read-only admin graph. No change to ordinary story access or catalogue facts.

CREATE INDEX IF NOT EXISTS story_periods_entity_story_idx ON public.story_periods(period_id, story_id);
CREATE INDEX IF NOT EXISTS story_events_entity_story_idx ON public.story_events(event_id, story_id);

CREATE FUNCTION admin_private.relations_overview() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  RETURN jsonb_build_object(
    'generatedAt', now(),
    'stories', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id::text, 'title', s.title_fr, 'isPublic', s.is_public,
      'periods', coalesce(p.n, 0), 'events', coalesce(e.n, 0)
    ) ORDER BY s.title_fr, s.id), '[]') FROM public.stories s
      LEFT JOIN (SELECT story_id, count(*) n FROM public.story_periods GROUP BY story_id) p ON p.story_id=s.id
      LEFT JOIN (SELECT story_id, count(*) n FROM public.story_events GROUP BY story_id) e ON e.story_id=s.id),
    'links', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'type', l.kind, 'source', l.source::text, 'target', l.target::text,
      'anchor', CASE WHEN l.anchor_id IS NULL THEN NULL ELSE jsonb_build_object(
        'kind', l.anchor_kind, 'id', l.anchor_id, 'title', coalesce(p.label_fr, e.label_fr, l.anchor_id)) END
    ) ORDER BY l.id), '[]') FROM (
      SELECT 'entry:'||ep.id id, 'entry' kind, ep.source_story_id source, ep.target_story_id target,
        CASE WHEN ep.period_id IS NOT NULL THEN 'period' ELSE 'event' END anchor_kind,
        coalesce(ep.period_id,ep.event_id) anchor_id FROM public.story_entry_points ep
      UNION ALL
      SELECT 'presentation:'||v.context_story_id||':'||v.target_story_id||':'||v.period_id,
        'presentation', v.context_story_id, v.target_story_id, 'period', v.period_id FROM public.story_period_presentations v
      UNION ALL
      SELECT 'legacy:'||s.id||':'||coalesce(a.id::text,'root'), 'legacy', s.parent_story_id, s.id, a.anchor_type, a.anchor_id
        FROM public.stories s LEFT JOIN public.story_anchors a ON a.story_id=s.id WHERE s.parent_story_id IS NOT NULL
    ) l LEFT JOIN public.periods p ON l.anchor_kind='period' AND p.id=l.anchor_id
        LEFT JOIN public.events e ON l.anchor_kind='event' AND e.id=l.anchor_id));
END;
$function$;

CREATE FUNCTION admin_private.relations_story(story integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.id=story) THEN
    RAISE EXCEPTION 'Frise absente' USING ERRCODE='P0002';
  END IF;
  RETURN jsonb_build_object('storyId', story::text,
    'periods', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'title', p.label_fr, 'startDate', p.start_date, 'endDate', p.end_date, 'wikidataId', p.wikidata_id,
      'parentId', sp.parent_period_id, 'uses', (SELECT count(*) FROM public.story_periods u WHERE u.period_id=p.id)
    ) ORDER BY p.label_fr, p.id), '[]') FROM public.story_periods sp JOIN public.periods p ON p.id=sp.period_id WHERE sp.story_id=story),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.label_fr, 'date', e.date, 'wikidataId', e.wikidata_id, 'importance', se.importance,
      'uses', (SELECT count(*) FROM public.story_events u WHERE u.event_id=e.id)
    ) ORDER BY e.label_fr, e.id), '[]') FROM public.story_events se JOIN public.events e ON e.id=se.event_id WHERE se.story_id=story));
END;
$function$;

CREATE FUNCTION admin_private.relations_entity(kind text, entity text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM admin_private.require_admin();
  IF kind='period' THEN
    SELECT jsonb_build_object('kind',kind,'id',p.id,'title',p.label_fr,'startDate',p.start_date,'endDate',p.end_date,
      'wikidataId',p.wikidata_id,'stories',(SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',s.id::text,'title',s.title_fr,'isPublic',s.is_public,'parentId',sp.parent_period_id,
        'parentTitle',parent.label_fr) ORDER BY s.title_fr,s.id),'[]')
        FROM public.story_periods sp JOIN public.stories s ON s.id=sp.story_id
        LEFT JOIN public.periods parent ON parent.id=sp.parent_period_id WHERE sp.period_id=p.id))
      INTO result FROM public.periods p WHERE p.id=entity;
  ELSIF kind='event' THEN
    SELECT jsonb_build_object('kind',kind,'id',e.id,'title',e.label_fr,'startDate',e.date,'endDate',NULL,
      'wikidataId',e.wikidata_id,'stories',(SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',s.id::text,'title',s.title_fr,'isPublic',s.is_public,'importance',se.importance) ORDER BY s.title_fr,s.id),'[]')
        FROM public.story_events se JOIN public.stories s ON s.id=se.story_id WHERE se.event_id=e.id))
      INTO result FROM public.events e WHERE e.id=entity;
  ELSE RAISE EXCEPTION 'Type invalide' USING ERRCODE='22023';
  END IF;
  IF result IS NULL THEN RAISE EXCEPTION 'Fiche absente' USING ERRCODE='P0002'; END IF;
  RETURN result;
END;
$function$;

CREATE FUNCTION admin_private.relations_catalogue(kind text, usage_filter text, search_text text, page_offset integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM admin_private.require_admin();
  IF kind NOT IN ('period','event') OR usage_filter NOT IN ('shared','unused','all')
    OR page_offset < 0 OR page_offset > 1000000 OR length(search_text)>200 THEN
    RAISE EXCEPTION 'Filtre invalide' USING ERRCODE='22023';
  END IF;
  WITH entities AS (
    SELECT p.id,p.label_fr title,(SELECT count(*) FROM public.story_periods u WHERE u.period_id=p.id) uses
      FROM public.periods p WHERE kind='period'
    UNION ALL
    SELECT e.id,e.label_fr,(SELECT count(*) FROM public.story_events u WHERE u.event_id=e.id)
      FROM public.events e WHERE kind='event'
  ), filtered AS (
    SELECT * FROM entities WHERE (usage_filter='all' OR (usage_filter='shared' AND uses>1) OR (usage_filter='unused' AND uses=0))
      AND (search_text='' OR strpos(lower(title),lower(search_text))>0)
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',coalesce((
    SELECT jsonb_agg(to_jsonb(page) ORDER BY page.title,page.id) FROM (
      SELECT * FROM filtered ORDER BY title,id LIMIT 50 OFFSET page_offset
    ) page),'[]')) INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION admin_private.relations_overview(), admin_private.relations_story(integer),
  admin_private.relations_entity(text,text), admin_private.relations_catalogue(text,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_private.relations_overview(), admin_private.relations_story(integer),
  admin_private.relations_entity(text,text), admin_private.relations_catalogue(text,text,text,integer) TO authenticated;

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

-- Public Wikidata provenance. Existing catalogue rows and access policies are preserved.
BEGIN;
ALTER TABLE public.events ADD COLUMN source_key text, ADD COLUMN wikidata_source jsonb;
ALTER TABLE public.periods ADD COLUMN source_key text, ADD COLUMN wikidata_source jsonb;
CREATE UNIQUE INDEX events_source_key_unique ON public.events(source_key) WHERE source_key IS NOT NULL;
CREATE UNIQUE INDEX periods_source_key_unique ON public.periods(source_key) WHERE source_key IS NOT NULL;
ALTER TABLE public.events ADD CONSTRAINT events_wikidata_source_object CHECK (wikidata_source IS NULL OR jsonb_typeof(wikidata_source) = 'object');
ALTER TABLE public.periods ADD CONSTRAINT periods_wikidata_source_object CHECK (wikidata_source IS NULL OR jsonb_typeof(wikidata_source) = 'object');
ALTER TABLE public.events ADD CONSTRAINT events_fact_identity CHECK (source_key IS NULL OR coalesce(
  wikidata_id IS NULL AND source_key = 'fact:' || (wikidata_source->>'qid') || ':' || (wikidata_source->>'property') || ':' || lower(wikidata_source->>'statementId')
  AND (wikidata_source->>'qid') ~ '^Q[1-9][0-9]*$'
  AND (wikidata_source->>'property') ~ '^P[1-9][0-9]*$'
  AND length(source_key) <= 200, false));
ALTER TABLE public.periods ADD CONSTRAINT periods_fact_identity CHECK (source_key IS NULL OR coalesce(
  wikidata_id IS NULL AND source_key = 'fact:' || (wikidata_source->>'qid') || ':' || (wikidata_source->>'property') || ':' || lower(wikidata_source->>'statementId')
  AND (wikidata_source->>'qid') ~ '^Q[1-9][0-9]*$'
  AND (wikidata_source->>'property') ~ '^P[1-9][0-9]*$'
  AND length(source_key) <= 200, false));
COMMENT ON COLUMN public.events.source_key IS 'Stable statement identity for derived Wikidata facts; native entities keep wikidata_id.';
COMMENT ON COLUMN public.periods.source_key IS 'Stable statement identity for derived Wikidata facts; native entities keep wikidata_id.';
COMMENT ON COLUMN public.events.wikidata_source IS 'Public Wikidata declaration and original date precision; catalogue corrections do not rewrite the source.';
COMMENT ON COLUMN public.periods.wikidata_source IS 'Public Wikidata declaration and original date precision; catalogue corrections do not rewrite the source.';
COMMIT;
