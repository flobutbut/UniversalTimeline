-- Retour arrière du lot 20261104_cinq_extinctions.sql (frise 22).
-- Généré le 2026-11-04 depuis 20261104_cinq_extinctions.json ; dates calculées par server/src/shared/temporal.ts.
-- Toute divergence avec l'état relu annule la transaction entière.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.stories,public.story_periods,public.story_events,public.periods,public.events,public.period_categories,public.event_categories IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE _ext_before(period_id text PRIMARY KEY,parent_period_id text) ON COMMIT DROP;
INSERT INTO _ext_before VALUES
('PER_CAMBRIAN',NULL),
('Q101313',NULL),
('PER_ORDOVICIAN',NULL),
('4cae203f-2aea-43af-8419-23fd4fe6b4fa','PER_ORDOVICIAN'),
('PER_SILURIAN',NULL),
('PER_DEVONIAN',NULL),
('092c5cb7-1142-44e2-b6fc-2e0f2e598270','PER_DEVONIAN'),
('PER_CARBONIFEROUS',NULL),
('PER_PERMIAN',NULL),
('48ba8ead-0f0f-4d67-bbcd-ff4d95ae2ee7','Q101313'),
('PER_TRIASSIC','PER_MESOZOIC'),
('PER_MESOZOIC','Q101313'),
('213d4f29-b839-4493-87e2-ab566d74734f','Q101313'),
('PER_JURASSIC','PER_MESOZOIC'),
('PER_CRETACEOUS','PER_MESOZOIC'),
('418dcf15-402a-42fa-b335-7e5984106dba','Q101313'),
('PER_PALEOGENE','PER_CENOZOIC'),
('PER_CENOZOIC','Q101313'),
('PER_NEOGENE','PER_CENOZOIC'),
('PER_QUATERNARY','PER_CENOZOIC'),
('f0caaebf-b94d-4fb4-bc4c-4a1c14c0f2e3','PER_QUATERNARY');
CREATE TEMP TABLE _ext_before_events(event_id text PRIMARY KEY,importance text) ON COMMIT DROP;
INSERT INTO _ext_before_events VALUES
('2360ae6d-a41b-4c49-b2e0-e023a8e91daa','normal'),
('2acad374-01eb-44d9-9eca-6e6fd46e4fae','normal'),
('469d4e69-dba2-45c4-88a4-369589b89701','major'),
('7144612b-d26b-464d-8cae-3b027103f113','normal'),
('abe3e9b7-1d46-40b8-a82d-1a4537338eff','normal'),
('f1d0dbe8-88cf-421e-9c4a-89f971d7c3b4','normal'),
('Q141118','normal'),
('Q55811','normal'),
('Q796140','normal');
CREATE TEMP TABLE _ext_after(period_id text PRIMARY KEY,parent_period_id text) ON COMMIT DROP;
INSERT INTO _ext_after VALUES
('PER_CAMBRIAN','PER_PALEOZOIC'),
('PER_ORDOVICIAN','PER_PALEOZOIC'),
('4cae203f-2aea-43af-8419-23fd4fe6b4fa','PER_ORDOVICIAN'),
('PER_SILURIAN','PER_PALEOZOIC'),
('PER_DEVONIAN','PER_PALEOZOIC'),
('092c5cb7-1142-44e2-b6fc-2e0f2e598270','PER_DEVONIAN'),
('PER_CARBONIFEROUS','PER_PALEOZOIC'),
('PER_PERMIAN','PER_PALEOZOIC'),
('48ba8ead-0f0f-4d67-bbcd-ff4d95ae2ee7','PER_PERMIAN'),
('PER_TRIASSIC','PER_MESOZOIC'),
('PER_MESOZOIC',NULL),
('213d4f29-b839-4493-87e2-ab566d74734f','PER_TRIASSIC'),
('PER_JURASSIC','PER_MESOZOIC'),
('PER_CRETACEOUS','PER_MESOZOIC'),
('418dcf15-402a-42fa-b335-7e5984106dba','PER_CRETACEOUS'),
('PER_PALEOGENE','PER_CENOZOIC'),
('PER_CENOZOIC',NULL),
('PER_NEOGENE','PER_CENOZOIC'),
('PER_QUATERNARY','PER_CENOZOIC'),
('f0caaebf-b94d-4fb4-bc4c-4a1c14c0f2e3','PER_QUATERNARY'),
('PER_PALEOZOIC',NULL),
('00cc0d70-f486-4516-9d8f-739ea30442b6','PER_TRIASSIC'),
('1bed4622-1d47-46da-9249-a7e10b676ab8','PER_PALEOGENE'),
('ec055b57-d7d5-40da-91dd-2f82b4154371','f0caaebf-b94d-4fb4-bc4c-4a1c14c0f2e3'),
('1577f981-d388-4211-b26d-db695cd31d4d','PER_ORDOVICIAN'),
('14bee4a4-4462-4b33-96cc-99e06881d7c6','PER_DEVONIAN'),
('243c2f0a-c36b-4ea8-8497-75a5e3900bf4','PER_PERMIAN'),
('0560995c-c751-4707-a5cd-5a09c848aae6','PER_TRIASSIC'),
('5ff185a7-c45a-42e5-bcbd-be08740280e7','PER_QUATERNARY');
CREATE TEMP TABLE _ext_after_events(event_id text PRIMARY KEY,importance text) ON COMMIT DROP;
INSERT INTO _ext_after_events VALUES
('2360ae6d-a41b-4c49-b2e0-e023a8e91daa','major'),
('2acad374-01eb-44d9-9eca-6e6fd46e4fae','normal'),
('469d4e69-dba2-45c4-88a4-369589b89701','major'),
('7144612b-d26b-464d-8cae-3b027103f113','major'),
('abe3e9b7-1d46-40b8-a82d-1a4537338eff','normal'),
('f1d0dbe8-88cf-421e-9c4a-89f971d7c3b4','major'),
('Q141118','major'),
('Q55811','major'),
('Q796140','major'),
('b3a00018-db06-45e9-ae56-d21916ccf2b1','normal'),
('bc607aed-30d0-4d26-91e6-6410addd2011','normal'),
('36a78d32-7142-4a81-a183-49c098e3e06a','normal'),
('0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','normal'),
('88936004-e14d-4cea-bac8-d28a867a8994','normal'),
('d4b971a3-c72b-4090-899f-7319742c723f','normal'),
('ebbc05e8-1c24-4829-9c21-88e04fa28e98','normal'),
('fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','normal'),
('edaea2eb-dd10-478b-9572-698ec9039d13','normal'),
('1e5686ea-89c0-4895-b5fa-bfb03798d66d','normal'),
('bc8e79c9-ca2a-45e2-9a36-cf702151b12f','normal'),
('42f7e177-d333-4746-803d-f61be911a85c','normal');
DO $guard$ BEGIN
  IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=22)=(SELECT count(*) FROM _ext_after)
    AND NOT EXISTS(SELECT 1 FROM _ext_after x LEFT JOIN public.story_periods sp ON sp.story_id=22 AND sp.period_id=x.period_id
      WHERE sp.period_id IS NULL OR sp.parent_period_id IS DISTINCT FROM x.parent_period_id)) OR NOT ((SELECT count(*) FROM public.story_events WHERE story_id=22)=(SELECT count(*) FROM _ext_after_events)
    AND NOT EXISTS(SELECT 1 FROM _ext_after_events x LEFT JOIN public.story_events se ON se.story_id=22 AND se.event_id=x.event_id
      WHERE se.event_id IS NULL OR se.importance IS DISTINCT FROM x.importance))
    OR NOT EXISTS(SELECT 1 FROM public.stories WHERE id=22 AND description_fr='Cinq fois en 540 millions d’années, plus des trois quarts des espèces ont disparu en peu de temps. Pour chaque crise, la frise montre ce qui précède, les causes (glaciation, volcanisme géant, impact), les vagues d’extinction et la reprise, jusqu’à la sixième extinction en cours et la façon dont on les a découvertes.') THEN
    RAISE EXCEPTION 'La frise 22 a changé depuis le lot : retour arrière à revoir.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.story_periods WHERE period_id IN ('1577f981-d388-4211-b26d-db695cd31d4d','14bee4a4-4462-4b33-96cc-99e06881d7c6','243c2f0a-c36b-4ea8-8497-75a5e3900bf4','0560995c-c751-4707-a5cd-5a09c848aae6','5ff185a7-c45a-42e5-bcbd-be08740280e7') AND story_id<>22)
    OR EXISTS(SELECT 1 FROM public.story_events WHERE event_id IN ('36a78d32-7142-4a81-a183-49c098e3e06a','0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','88936004-e14d-4cea-bac8-d28a867a8994','d4b971a3-c72b-4090-899f-7319742c723f','ebbc05e8-1c24-4829-9c21-88e04fa28e98','fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','edaea2eb-dd10-478b-9572-698ec9039d13','1e5686ea-89c0-4895-b5fa-bfb03798d66d','bc8e79c9-ca2a-45e2-9a36-cf702151b12f','42f7e177-d333-4746-803d-f61be911a85c') AND story_id<>22)
    OR EXISTS(SELECT 1 FROM public.story_entry_points WHERE period_id IN ('1577f981-d388-4211-b26d-db695cd31d4d','14bee4a4-4462-4b33-96cc-99e06881d7c6','243c2f0a-c36b-4ea8-8497-75a5e3900bf4','0560995c-c751-4707-a5cd-5a09c848aae6','5ff185a7-c45a-42e5-bcbd-be08740280e7') OR event_id IN ('36a78d32-7142-4a81-a183-49c098e3e06a','0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','88936004-e14d-4cea-bac8-d28a867a8994','d4b971a3-c72b-4090-899f-7319742c723f','ebbc05e8-1c24-4829-9c21-88e04fa28e98','fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','edaea2eb-dd10-478b-9572-698ec9039d13','1e5686ea-89c0-4895-b5fa-bfb03798d66d','bc8e79c9-ca2a-45e2-9a36-cf702151b12f','42f7e177-d333-4746-803d-f61be911a85c'))
    OR EXISTS(SELECT 1 FROM public.story_period_presentations WHERE period_id IN ('1577f981-d388-4211-b26d-db695cd31d4d','14bee4a4-4462-4b33-96cc-99e06881d7c6','243c2f0a-c36b-4ea8-8497-75a5e3900bf4','0560995c-c751-4707-a5cd-5a09c848aae6','5ff185a7-c45a-42e5-bcbd-be08740280e7')) THEN
    RAISE EXCEPTION 'Une fiche créée par le lot est utilisée ailleurs : ne pas la supprimer.';
  END IF;
END $guard$;
UPDATE public.stories SET description_fr='Cinq fois en 540 millions d’années, plus des trois quarts des espèces ont disparu en peu de temps. La frise situe chaque crise dans son époque, avec ses causes probables (glaciation, volcanisme géant, impact d’astéroïde), jusqu’à la sixième extinction en cours.',description_en='Five times in 540 million years, more than three quarters of species vanished in a short time. This frise places each crisis in its era with its likely causes (glaciation, giant volcanism, asteroid impact), up to the ongoing sixth extinction.' WHERE id=22;
DELETE FROM public.story_events se WHERE se.story_id=22 AND NOT EXISTS(SELECT 1 FROM _ext_before_events b WHERE b.event_id=se.event_id);
UPDATE public.story_events se SET importance=b.importance FROM _ext_before_events b WHERE se.story_id=22 AND se.event_id=b.event_id AND se.importance IS DISTINCT FROM b.importance;
INSERT INTO public.story_periods(story_id,period_id,parent_period_id) VALUES (22,'Q101313',NULL);
UPDATE public.story_periods sp SET parent_period_id=b.parent_period_id FROM _ext_before b
  WHERE sp.story_id=22 AND sp.period_id=b.period_id AND sp.parent_period_id IS DISTINCT FROM b.parent_period_id;
DELETE FROM public.story_periods sp WHERE sp.story_id=22 AND NOT EXISTS(SELECT 1 FROM _ext_before b WHERE b.period_id=sp.period_id);
DELETE FROM public.event_categories WHERE event_id IN ('36a78d32-7142-4a81-a183-49c098e3e06a','0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','88936004-e14d-4cea-bac8-d28a867a8994','d4b971a3-c72b-4090-899f-7319742c723f','ebbc05e8-1c24-4829-9c21-88e04fa28e98','fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','edaea2eb-dd10-478b-9572-698ec9039d13','1e5686ea-89c0-4895-b5fa-bfb03798d66d','bc8e79c9-ca2a-45e2-9a36-cf702151b12f','42f7e177-d333-4746-803d-f61be911a85c');
DELETE FROM public.events WHERE id IN ('36a78d32-7142-4a81-a183-49c098e3e06a','0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','88936004-e14d-4cea-bac8-d28a867a8994','d4b971a3-c72b-4090-899f-7319742c723f','ebbc05e8-1c24-4829-9c21-88e04fa28e98','fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','edaea2eb-dd10-478b-9572-698ec9039d13','1e5686ea-89c0-4895-b5fa-bfb03798d66d','bc8e79c9-ca2a-45e2-9a36-cf702151b12f','42f7e177-d333-4746-803d-f61be911a85c');
DELETE FROM public.period_categories WHERE period_id IN ('1577f981-d388-4211-b26d-db695cd31d4d','14bee4a4-4462-4b33-96cc-99e06881d7c6','243c2f0a-c36b-4ea8-8497-75a5e3900bf4','0560995c-c751-4707-a5cd-5a09c848aae6','5ff185a7-c45a-42e5-bcbd-be08740280e7');
DELETE FROM public.periods WHERE id IN ('1577f981-d388-4211-b26d-db695cd31d4d','14bee4a4-4462-4b33-96cc-99e06881d7c6','243c2f0a-c36b-4ea8-8497-75a5e3900bf4','0560995c-c751-4707-a5cd-5a09c848aae6','5ff185a7-c45a-42e5-bcbd-be08740280e7');
DO $check$ BEGIN
  IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=22)=(SELECT count(*) FROM _ext_before)
    AND NOT EXISTS(SELECT 1 FROM _ext_before x LEFT JOIN public.story_periods sp ON sp.story_id=22 AND sp.period_id=x.period_id
      WHERE sp.period_id IS NULL OR sp.parent_period_id IS DISTINCT FROM x.parent_period_id)) OR NOT ((SELECT count(*) FROM public.story_events WHERE story_id=22)=(SELECT count(*) FROM _ext_before_events)
    AND NOT EXISTS(SELECT 1 FROM _ext_before_events x LEFT JOIN public.story_events se ON se.story_id=22 AND se.event_id=x.event_id
      WHERE se.event_id IS NULL OR se.importance IS DISTINCT FROM x.importance)) THEN RAISE EXCEPTION 'État initial non restauré.'; END IF;
END $check$;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
