-- Closed thematic tag grid for catalogue events, periods and stories (level 1, 16 domains).
-- Additive only: categories and their links stay untouched until the new grid is validated.
-- Policy names avoid the ut_ prefix on purpose: checkAccessSchema counts exactly 21 ut_ policies
-- before the production server listens, so this migration can land ahead of the code that reads it.
BEGIN;

CREATE TABLE public.tags (
  id character varying PRIMARY KEY CHECK (id ~ '^[a-z]+(-[a-z]+)*$'),
  parent_id character varying REFERENCES public.tags(id) ON DELETE RESTRICT,
  family text NOT NULL CHECK (family IN ('monde-vivant', 'societes', 'productions')),
  label_fr text NOT NULL,
  label_en text NOT NULL,
  description_fr text,
  description_en text,
  position smallint NOT NULL UNIQUE,
  taxonomy_version smallint NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_parent_is_other CHECK (parent_id IS NULL OR parent_id <> id)
);
COMMENT ON TABLE public.tags IS 'Closed thematic grid. A tag is a domain, never a place or an era. Level 2 uses parent_id; filtering on a parent includes its children.';
COMMENT ON COLUMN public.tags.family IS 'Display group only: a family is never attached to a record.';
COMMENT ON COLUMN public.tags.position IS 'Display order within the whole grid.';

CREATE TABLE public.event_tags (
  event_id character varying NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tag_id character varying NOT NULL REFERENCES public.tags(id) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  PRIMARY KEY (event_id, tag_id),
  UNIQUE (event_id, position)
);
CREATE INDEX event_tags_tag_id_idx ON public.event_tags(tag_id);
COMMENT ON COLUMN public.event_tags.position IS 'From 1 to 3 tags per record; the lowest position is the primary tag.';

CREATE TABLE public.period_tags (
  period_id character varying NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  tag_id character varying NOT NULL REFERENCES public.tags(id) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  PRIMARY KEY (period_id, tag_id),
  UNIQUE (period_id, position)
);
CREATE INDEX period_tags_tag_id_idx ON public.period_tags(tag_id);
COMMENT ON COLUMN public.period_tags.position IS 'From 1 to 3 tags per record; the lowest position is the primary tag.';

CREATE TABLE public.story_tags (
  story_id integer NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  tag_id character varying NOT NULL REFERENCES public.tags(id) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  PRIMARY KEY (story_id, tag_id),
  UNIQUE (story_id, position)
);
CREATE INDEX story_tags_tag_id_idx ON public.story_tags(tag_id);
COMMENT ON COLUMN public.story_tags.position IS 'From 1 to 3 tags per record; the lowest position is the primary tag.';

-- A period without tags is either not reviewed yet (false) or deliberately chronological (true).
ALTER TABLE public.periods ADD COLUMN non_thematic boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.periods.non_thematic IS 'True for an era, reign, dynasty or regime: reviewed and deliberately left without a domain.';

CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tags FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tags TO service_role;
CREATE POLICY tags_read ON public.tags AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_tags FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.event_tags TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.event_tags TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.event_tags TO service_role;
CREATE POLICY event_tags_read ON public.event_tags AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY event_tags_write ON public.event_tags AS PERMISSIVE FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true');

ALTER TABLE public.period_tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.period_tags FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.period_tags TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.period_tags TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.period_tags TO service_role;
CREATE POLICY period_tags_read ON public.period_tags AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY period_tags_write ON public.period_tags AS PERMISSIVE FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt())->>'is_anonymous') IS DISTINCT FROM 'true');

ALTER TABLE public.story_tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_tags FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.story_tags TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.story_tags TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.story_tags TO service_role;
CREATE POLICY story_tags_read ON public.story_tags AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_tags.story_id));
CREATE POLICY story_tags_write ON public.story_tags AS PERMISSIVE FOR ALL TO authenticated
  USING (access_private.can_edit_story(story_id))
  WITH CHECK (access_private.can_edit_story(story_id));

INSERT INTO public.tags (id, family, label_fr, label_en, description_fr, position) VALUES
  ('cosmos', 'monde-vivant', 'Cosmos', 'Cosmos', 'Univers, astres et phénomènes astronomiques.', 1),
  ('terre', 'monde-vivant', 'Terre', 'Earth', 'Géologie et climat, y compris les événements naturels sans société humaine touchée.', 2),
  ('vivant', 'monde-vivant', 'Vivant', 'Life', 'Évolution, espèces, écosystèmes et extinctions.', 3),
  ('peuplement-societe', 'societes', 'Peuplement & société', 'Peoples & society', 'Populations, migrations, modes de vie et structures sociales.', 4),
  ('pouvoir-institutions', 'societes', 'Pouvoir & institutions', 'Power & institutions', 'États, gouvernements, droit, traités et vie politique.', 5),
  ('conflits', 'societes', 'Conflits', 'Conflicts', 'Guerres, batailles, révoltes et violences armées.', 6),
  ('economie-echanges', 'societes', 'Économie & échanges', 'Economy & trade', 'Production, commerce, monnaie et crises économiques.', 7),
  ('territoires-exploration', 'societes', 'Territoires & exploration', 'Territories & exploration', 'Explorations, découvertes géographiques, conquêtes de territoires et colonisation.', 8),
  ('sante-corps', 'societes', 'Santé & corps', 'Health & body', 'Médecine, maladies et soins.', 9),
  ('catastrophes', 'societes', 'Catastrophes', 'Disasters', 'Catastrophes naturelles ou humaines touchant des sociétés : séismes, famines, accidents industriels, naufrages, incendies.', 10),
  ('techniques-inventions', 'productions', 'Techniques & inventions', 'Techniques & inventions', 'Outils, machines, inventions et infrastructures.', 11),
  ('sciences-savoirs', 'productions', 'Sciences & savoirs', 'Sciences & knowledge', 'Découvertes scientifiques, savoirs et éducation.', 12),
  ('philosophie-ideologies', 'productions', 'Philosophie & idéologies', 'Philosophy & ideologies', 'Courants de pensée et doctrines politiques ou sociales.', 13),
  ('religions-spiritualites', 'productions', 'Religions & spiritualités', 'Religions & spirituality', 'Croyances, cultes, institutions et textes religieux.', 14),
  ('arts-culture-loisirs', 'productions', 'Arts, culture & loisirs', 'Arts, culture & leisure', 'Œuvres, courants artistiques, langues, médias et loisirs.', 15),
  ('sport', 'productions', 'Sport', 'Sport', 'Compétitions et pratiques sportives.', 16);

COMMIT;
