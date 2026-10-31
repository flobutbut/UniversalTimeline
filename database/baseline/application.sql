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
    WHERE n.nspname='public' AND c.relname IN ('categories','event_categories','events','period_categories','periods','stories','story_anchors','story_categories','story_events','story_periods','stories_id_seq','story_anchors_id_seq')) THEN
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
  "parent_id" character varying,
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
ALTER TABLE public."periods" ADD CONSTRAINT "periods_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES periods(id) ON DELETE SET NULL;
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
CREATE INDEX idx_periods_parent_id ON public.periods USING btree (parent_id);
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
  ADD COLUMN parent_period_id character varying,
  ADD COLUMN parent_override boolean NOT NULL DEFAULT false;
ALTER TABLE public.story_periods
  ADD CONSTRAINT story_periods_parent_override_check CHECK (parent_period_id IS NULL OR parent_override),
  ADD CONSTRAINT story_periods_no_self_parent CHECK (parent_period_id IS DISTINCT FROM period_id),
  ADD CONSTRAINT story_periods_parent_period_id_fkey FOREIGN KEY (parent_period_id) REFERENCES public.periods(id) ON DELETE RESTRICT;
CREATE INDEX story_periods_parent_period_id_idx ON public.story_periods (parent_period_id, story_id);

-- Read-only search helpers, isolated from the application schema.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

COMMIT;
