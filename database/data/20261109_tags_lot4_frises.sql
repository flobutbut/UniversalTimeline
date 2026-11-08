-- Lot 4 de la taxonomie thématique : tags des frises thématiques et dernière période non classée.
-- 35 frises sur 51 reçoivent des tags. Les 16 autres sont définies par un lieu ou une époque et n'en reçoivent pas.
-- « Égypte et Levant » est un chapitre géographique : la période est marquée non thématique, sans changer sa date « Modifié ».
-- La frise est reconnue par son identifiant et son titre exact : une différence annule tout le lot.
-- Les catégories historiques ne sont pas modifiées. Annulation : 20261109_tags_lot4_frises_rollback.sql.
-- À exécuter seulement après relecture et accord.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE story_tags_batch (story_id integer PRIMARY KEY, title text NOT NULL, tags text[] NOT NULL) ON COMMIT DROP;
INSERT INTO story_tags_batch (story_id, title, tags) VALUES
  (1, 'Univers moderne', ARRAY['cosmos','terre']),
  (2, 'Histoire de la vie sur Terre', ARRAY['vivant']),
  (3, 'Big Bang et ères primordiales', ARRAY['cosmos']),
  (4, 'Guerres modernes', ARRAY['conflits']),
  (5, 'Genre Homo', ARRAY['vivant','peuplement-societe']),
  (8, 'Première Guerre mondiale', ARRAY['conflits']),
  (9, 'Seconde Guerre mondiale', ARRAY['conflits']),
  (11, 'Histoire géologique de la Terre', ARRAY['terre']),
  (12, 'Guerre froide', ARRAY['pouvoir-institutions','conflits']),
  (14, 'Conquête spatiale', ARRAY['techniques-inventions','territoires-exploration']),
  (17, 'Renaissance', ARRAY['arts-culture-loisirs','sciences-savoirs']),
  (18, 'Invasion de l''Ukraine par la Russie', ARRAY['conflits']),
  (19, 'Néolithique et âges des métaux', ARRAY['techniques-inventions','peuplement-societe']),
  (20, 'Néolithique', ARRAY['techniques-inventions','peuplement-societe']),
  (21, 'Âges des métaux', ARRAY['techniques-inventions','peuplement-societe']),
  (22, 'Les cinq grandes extinctions', ARRAY['vivant','terre']),
  (23, 'Histoire du climat', ARRAY['terre']),
  (25, 'Révolutions industrielles et énergie', ARRAY['techniques-inventions','economie-echanges']),
  (27, 'L’âge des révolutions', ARRAY['pouvoir-institutions','conflits']),
  (29, 'Le temps des dinosaures', ARRAY['vivant']),
  (30, 'Révolution française', ARRAY['pouvoir-institutions','conflits']),
  (32, 'Les croisades', ARRAY['conflits','religions-spiritualites']),
  (33, 'La guerre de Cent Ans', ARRAY['conflits']),
  (34, 'Grandes découvertes et empires coloniaux', ARRAY['territoires-exploration','economie-echanges']),
  (35, 'Régimes politiques en France depuis l’Empire', ARRAY['pouvoir-institutions']),
  (36, 'Napoléon et le Premier Empire', ARRAY['pouvoir-institutions','conflits']),
  (38, 'Les premiers hominines', ARRAY['vivant']),
  (39, 'Histoire des techniques', ARRAY['techniques-inventions']),
  (40, 'Histoire de l’art', ARRAY['arts-culture-loisirs']),
  (41, 'L’esclavage', ARRAY['peuplement-societe','economie-echanges']),
  (42, 'Guerre d’indépendance des États-Unis', ARRAY['conflits','pouvoir-institutions']),
  (46, 'Les grandes migrations humaines', ARRAY['peuplement-societe']),
  (47, 'Pablo Picasso', ARRAY['arts-culture-loisirs']),
  (56, 'Décolonisation', ARRAY['territoires-exploration','pouvoir-institutions']),
  (57, 'L’Empire britannique', ARRAY['territoires-exploration','pouvoir-institutions']);
DO $guard$
DECLARE problem text;
BEGIN
  SELECT string_agg(b.title, ' | ') INTO problem FROM story_tags_batch b
    WHERE NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.id = b.story_id AND s.title_fr = b.title);
  IF problem IS NOT NULL THEN RAISE EXCEPTION 'Frise absente ou renommée, lot refusé : %', problem; END IF;
  SELECT string_agg(b.title, ' | ') INTO problem FROM story_tags_batch b JOIN public.story_tags t ON t.story_id = b.story_id;
  IF problem IS NOT NULL THEN RAISE EXCEPTION 'Frise déjà taguée, lot refusé : %', problem; END IF;
  IF (SELECT count(*) FROM public.periods p WHERE p.label_fr = 'Égypte et Levant') <> 1
    OR EXISTS (SELECT 1 FROM public.periods p JOIN public.period_tags t ON t.period_id = p.id WHERE p.label_fr = 'Égypte et Levant') THEN
    RAISE EXCEPTION 'Période « Égypte et Levant » absente, ambiguë ou déjà taguée, lot refusé';
  END IF;
END $guard$;
INSERT INTO public.story_tags (story_id, tag_id, position)
  SELECT b.story_id, t.tag_id, t.position
  FROM story_tags_batch b CROSS JOIN LATERAL unnest(b.tags) WITH ORDINALITY AS t(tag_id, position);
ALTER TABLE public.periods DISABLE TRIGGER trg_periods_updated_at;
UPDATE public.periods SET non_thematic = true WHERE label_fr = 'Égypte et Levant' AND non_thematic = false;
ALTER TABLE public.periods ENABLE TRIGGER trg_periods_updated_at;
SELECT (SELECT count(DISTINCT story_id) FROM public.story_tags) AS tagged_stories, (SELECT count(*) FROM public.story_tags) AS links, (SELECT count(*) FROM public.periods WHERE non_thematic) AS non_thematic;
COMMIT;
