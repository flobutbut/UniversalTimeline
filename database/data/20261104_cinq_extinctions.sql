-- Frise 22 « Les cinq grandes extinctions » : causes, vagues, reprises et découvertes.
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
  IF NOT EXISTS(SELECT 1 FROM public.stories WHERE id=22 AND title_fr='Les cinq grandes extinctions' AND description_fr='Cinq fois en 540 millions d’années, plus des trois quarts des espèces ont disparu en peu de temps. La frise situe chaque crise dans son époque, avec ses causes probables (glaciation, volcanisme géant, impact d’astéroïde), jusqu’à la sixième extinction en cours.') THEN
    RAISE EXCEPTION 'La frise 22 a changé depuis la relecture.';
  END IF;
  IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=22)=(SELECT count(*) FROM _ext_before)
    AND NOT EXISTS(SELECT 1 FROM _ext_before x LEFT JOIN public.story_periods sp ON sp.story_id=22 AND sp.period_id=x.period_id
      WHERE sp.period_id IS NULL OR sp.parent_period_id IS DISTINCT FROM x.parent_period_id)) THEN RAISE EXCEPTION 'Les périodes de la frise 22 ont changé depuis la relecture.'; END IF;
  IF NOT ((SELECT count(*) FROM public.story_events WHERE story_id=22)=(SELECT count(*) FROM _ext_before_events)
    AND NOT EXISTS(SELECT 1 FROM _ext_before_events x LEFT JOIN public.story_events se ON se.story_id=22 AND se.event_id=x.event_id
      WHERE se.event_id IS NULL OR se.importance IS DISTINCT FROM x.importance)) THEN RAISE EXCEPTION 'Les événements de la frise 22 ont changé depuis la relecture.'; END IF;
  IF EXISTS(SELECT 1 FROM public.periods WHERE wikidata_id IN ('Q5599717','Q138658650','Q844933','Q5044049','Q1759232'))
    OR EXISTS(SELECT 1 FROM public.events WHERE wikidata_id IN ('Q5038049','Q683975','Q63535006')) THEN
    RAISE EXCEPTION 'Un Q-id du lot existe déjà : réutiliser la fiche au lieu de la créer.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.periods WHERE id IN ('1577f981-d388-4211-b26d-db695cd31d4d','14bee4a4-4462-4b33-96cc-99e06881d7c6','243c2f0a-c36b-4ea8-8497-75a5e3900bf4','0560995c-c751-4707-a5cd-5a09c848aae6','5ff185a7-c45a-42e5-bcbd-be08740280e7')) OR EXISTS(SELECT 1 FROM public.events WHERE id IN ('36a78d32-7142-4a81-a183-49c098e3e06a','0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','88936004-e14d-4cea-bac8-d28a867a8994','d4b971a3-c72b-4090-899f-7319742c723f','ebbc05e8-1c24-4829-9c21-88e04fa28e98','fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','edaea2eb-dd10-478b-9572-698ec9039d13','1e5686ea-89c0-4895-b5fa-bfb03798d66d','bc8e79c9-ca2a-45e2-9a36-cf702151b12f','42f7e177-d333-4746-803d-f61be911a85c')) THEN
    RAISE EXCEPTION 'Identifiant déjà présent.';
  END IF;
  IF (SELECT count(*) FROM public.periods WHERE (id,start_date,end_date) IN (('PER_PALEOZOIC','M538.8','M251.902'),('00cc0d70-f486-4516-9d8f-739ea30442b6','M251.902','M247.2'),('1bed4622-1d47-46da-9249-a7e10b676ab8','M56','M55.8'),('ec055b57-d7d5-40da-91dd-2f82b4154371','1950','TODAY')))<>4
    OR (SELECT count(*) FROM public.events WHERE (id,date) IN (('b3a00018-db06-45e9-ae56-d21916ccf2b1','M231.4'),('bc607aed-30d0-4d26-91e6-6410addd2011','K70')))<>2 THEN
    RAISE EXCEPTION 'Une fiche réutilisée a changé.';
  END IF;
END $guard$;

INSERT INTO public.periods(id,wikidata_id,label_fr,label_en,description_fr,description_en,start_date,end_date,start_years_bp,end_years_bp) VALUES
('1577f981-d388-4211-b26d-db695cd31d4d','Q5599717','Grande biodiversification ordovicienne','Great Ordovician Biodiversification Event','Les espèces marines se multiplient (brachiopodes, trilobites, coraux, bryozoaires) : c’est cette diversité que la crise de la fin de l’Ordovicien va décimer.','Marine species multiply (brachiopods, trilobites, corals, bryozoans): this is the diversity that the end-Ordovician crisis will decimate.','M486.85','M445.2',486850000,445200000),
('14bee4a4-4462-4b33-96cc-99e06881d7c6','Q138658650','Trapps de Viluy','Viluy Traps','Province volcanique de Sibérie orientale, dont les émissions sont l’une des causes avancées de la crise du Dévonien tardif.','Large igneous province in eastern Siberia whose emissions are one of the proposed causes of the Late Devonian crisis.','M376.7','M364.4',376700000,364400000),
('243c2f0a-c36b-4ea8-8497-75a5e3900bf4','Q844933','Trapps d’Emeishan','Emeishan Traps','Province volcanique du sud-ouest de la Chine, associée à l’extinction du Capitanien.','Large igneous province in south-western China, linked to the Capitanian extinction.','M260','M259',260000000,259000000),
('0560995c-c751-4707-a5cd-5a09c848aae6','Q5044049','Épisode pluvial du Carnien','Carnian Pluvial Event','Crise climatique humide liée au volcanisme de Wrangellia, après laquelle les dinosaures se diversifient.','Humid climate crisis linked to Wrangellia volcanism, after which dinosaurs diversify.','M234','M232',234000000,232000000),
('5ff185a7-c45a-42e5-bcbd-be08740280e7','Q1759232','Extinction de la mégafaune du Quaternaire','Quaternary megafauna extinction','Disparition de la plupart des grands mammifères (mammouths, paresseux géants, diprotodons), attribuée à la chasse humaine et aux changements climatiques.','Loss of most large mammals (mammoths, giant sloths, diprotodons), attributed to human hunting and climate change.','K50','K10',50000,10000);
INSERT INTO public.period_categories(period_id,category_id) VALUES
('1577f981-d388-4211-b26d-db695cd31d4d','CAT_BIO_EVO'),
('1577f981-d388-4211-b26d-db695cd31d4d','CAT_PALEO'),
('1577f981-d388-4211-b26d-db695cd31d4d','CAT_OCEAN'),
('14bee4a4-4462-4b33-96cc-99e06881d7c6','CAT_GEO'),
('14bee4a4-4462-4b33-96cc-99e06881d7c6','CAT_PALEO'),
('243c2f0a-c36b-4ea8-8497-75a5e3900bf4','CAT_GEO'),
('243c2f0a-c36b-4ea8-8497-75a5e3900bf4','CAT_PALEO'),
('0560995c-c751-4707-a5cd-5a09c848aae6','CAT_PALEO'),
('0560995c-c751-4707-a5cd-5a09c848aae6','CAT_GEO'),
('0560995c-c751-4707-a5cd-5a09c848aae6','CAT_BIO_EVO'),
('5ff185a7-c45a-42e5-bcbd-be08740280e7','CAT_PALEO'),
('5ff185a7-c45a-42e5-bcbd-be08740280e7','CAT_ECO_SYS'),
('5ff185a7-c45a-42e5-bcbd-be08740280e7','CAT_ANTHRO');
INSERT INTO public.events(id,wikidata_id,label_fr,label_en,description_fr,description_en,date,date_years_bp) VALUES
('36a78d32-7142-4a81-a183-49c098e3e06a',NULL,'Seconde vague de l’extinction ordovicienne','Second pulse of the Ordovician extinction','La fonte de la calotte du Gondwana réchauffe les mers et prive leurs fonds d’oxygène, frappant les espèces qui avaient survécu au froid.','The melting of the Gondwana ice sheet warms the seas and strips their floors of oxygen, striking the species that had survived the cold.','M443.8',443800000),
('0f1e8bb1-1882-49e1-aa3b-f5f75df4422a',NULL,'Premières forêts','First forests','Les premiers arbres forment des forêts ; leurs racines accélèrent l’altération des sols, une cause avancée de l’anoxie des mers du Dévonien.','The first trees form forests; their roots speed up soil weathering, a proposed cause of Devonian ocean anoxia.','M385',385000000),
('88936004-e14d-4cea-bac8-d28a867a8994','Q5038049','Effondrement de la forêt tropicale du Carbonifère','Carboniferous rainforest collapse','L’assèchement du climat fragmente les forêts houillères d’Euramérique et fait disparaître de nombreuses plantes et amphibiens.','A drying climate breaks up the coal forests of Euramerica and wipes out many plants and amphibians.','M307',307000000),
('d4b971a3-c72b-4090-899f-7319742c723f',NULL,'Cuvier établit la réalité des extinctions','Cuvier establishes that extinction is real','En comparant les mammouths aux éléphants actuels, Georges Cuvier montre que des espèces ont disparu pour de bon.','By comparing mammoths with living elephants, Georges Cuvier shows that species can vanish for good.','1796',230.838931094602),
('ebbc05e8-1c24-4829-9c21-88e04fa28e98',NULL,'Dernière observation du dodo','Last sighting of the dodo','Chassé et concurrencé par les animaux introduits à Maurice, l’oiseau est vu pour la dernière fois de façon certaine.','Hunted and outcompeted by animals introduced to Mauritius, the bird is reliably seen for the last time.','1662',364.834824318421),
('fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8',NULL,'Mort de Martha, dernière tourte voyageuse','Death of Martha, the last passenger pigeon','L’oiseau le plus abondant d’Amérique du Nord, décimé par la chasse et la déforestation, s’éteint au zoo de Cincinnati.','Once North America’s most abundant bird, decimated by hunting and deforestation, the species dies out at the Cincinnati Zoo.','1914-09-01',112.177740129509),
('edaea2eb-dd10-478b-9572-698ec9039d13','Q683975','Hypothèse d’Alvarez','Alvarez hypothesis','Une couche riche en iridium à la limite Crétacé-Paléogène conduit Luis et Walter Alvarez à proposer l’impact d’un astéroïde.','An iridium-rich layer at the Cretaceous–Paleogene boundary leads Luis and Walter Alvarez to propose an asteroid impact.','1980-06-06',46.4145642225961),
('1e5686ea-89c0-4895-b5fa-bfb03798d66d',NULL,'Raup et Sepkoski distinguent cinq grandes extinctions','Raup and Sepkoski identify the Big Five','En comptant les familles marines fossiles, David Raup et Jack Sepkoski isolent cinq extinctions de masse au-dessus du rythme ordinaire des disparitions.','By counting fossil marine families, David Raup and Jack Sepkoski single out five mass extinctions above the background rate.','1982-03',44.6815046743415),
('bc8e79c9-ca2a-45e2-9a36-cf702151b12f',NULL,'Identification du cratère de Chicxulub','Chicxulub crater identified','Le cratère enfoui sous le Yucatán est reconnu comme la trace de l’impact, ce qui confirme l’hypothèse d’Alvarez.','The crater buried beneath Yucatán is recognised as the impact site, confirming the Alvarez hypothesis.','1991-09',35.178424592206),
('42f7e177-d333-4746-803d-f61be911a85c','Q63535006','Rapport mondial de l’IPBES sur la biodiversité','IPBES Global Assessment on biodiversity','Les experts mandatés par l’ONU estiment qu’environ un million d’espèces animales et végétales sont menacées d’extinction.','UN-mandated experts estimate that around one million animal and plant species are threatened with extinction.','2019-05-06',7.50149098508759);
INSERT INTO public.event_categories(event_id,category_id) VALUES
('36a78d32-7142-4a81-a183-49c098e3e06a','CAT_PALEO'),
('36a78d32-7142-4a81-a183-49c098e3e06a','CAT_OCEAN'),
('0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','CAT_BOT'),
('0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','CAT_PALEO'),
('0f1e8bb1-1882-49e1-aa3b-f5f75df4422a','CAT_ECO_SYS'),
('88936004-e14d-4cea-bac8-d28a867a8994','CAT_BOT'),
('88936004-e14d-4cea-bac8-d28a867a8994','CAT_PALEO'),
('88936004-e14d-4cea-bac8-d28a867a8994','CAT_ECO_SYS'),
('d4b971a3-c72b-4090-899f-7319742c723f','CAT_PALEO'),
('d4b971a3-c72b-4090-899f-7319742c723f','CAT_BIO_EVO'),
('ebbc05e8-1c24-4829-9c21-88e04fa28e98','CAT_ECO_SYS'),
('ebbc05e8-1c24-4829-9c21-88e04fa28e98','CAT_BIO_EVO'),
('fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','CAT_ECO_SYS'),
('fabfa8b3-08b2-4e31-9ff5-4b1ea20250f8','CAT_BIO_EVO'),
('edaea2eb-dd10-478b-9572-698ec9039d13','CAT_PALEO'),
('edaea2eb-dd10-478b-9572-698ec9039d13','CAT_GEO'),
('1e5686ea-89c0-4895-b5fa-bfb03798d66d','CAT_PALEO'),
('1e5686ea-89c0-4895-b5fa-bfb03798d66d','CAT_BIO_EVO'),
('bc8e79c9-ca2a-45e2-9a36-cf702151b12f','CAT_PALEO'),
('bc8e79c9-ca2a-45e2-9a36-cf702151b12f','CAT_GEO'),
('42f7e177-d333-4746-803d-f61be911a85c','CAT_ECO_SYS'),
('42f7e177-d333-4746-803d-f61be911a85c','CAT_BIO_EVO');

-- Racines d'abord, puis les enfants : aucune référence locale pendante.
INSERT INTO public.story_periods(story_id,period_id,parent_period_id) VALUES (22,'PER_PALEOZOIC',NULL);
UPDATE public.story_periods sp SET parent_period_id=a.parent_period_id FROM _ext_after a
  WHERE sp.story_id=22 AND sp.period_id=a.period_id AND sp.parent_period_id IS DISTINCT FROM a.parent_period_id;
DELETE FROM public.story_periods WHERE story_id=22 AND period_id='Q101313';
INSERT INTO public.story_periods(story_id,period_id,parent_period_id)
  SELECT 22,a.period_id,a.parent_period_id FROM _ext_after a
  WHERE NOT EXISTS(SELECT 1 FROM public.story_periods sp WHERE sp.story_id=22 AND sp.period_id=a.period_id);
UPDATE public.story_events se SET importance=a.importance FROM _ext_after_events a
  WHERE se.story_id=22 AND se.event_id=a.event_id AND se.importance IS DISTINCT FROM a.importance;
INSERT INTO public.story_events(story_id,event_id,importance)
  SELECT 22,a.event_id,a.importance FROM _ext_after_events a
  WHERE NOT EXISTS(SELECT 1 FROM public.story_events se WHERE se.story_id=22 AND se.event_id=a.event_id);
UPDATE public.stories SET description_fr='Cinq fois en 540 millions d’années, plus des trois quarts des espèces ont disparu en peu de temps. Pour chaque crise, la frise montre ce qui précède, les causes (glaciation, volcanisme géant, impact), les vagues d’extinction et la reprise, jusqu’à la sixième extinction en cours et la façon dont on les a découvertes.',description_en='Five times in 540 million years, more than three quarters of species vanished in a short time. For each crisis, the timeline shows what came before, the causes (glaciation, giant volcanism, impact), the extinction pulses and the recovery, up to the ongoing sixth extinction and how scientists uncovered them.' WHERE id=22;

DO $check$ BEGIN
  IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=22)=(SELECT count(*) FROM _ext_after)
    AND NOT EXISTS(SELECT 1 FROM _ext_after x LEFT JOIN public.story_periods sp ON sp.story_id=22 AND sp.period_id=x.period_id
      WHERE sp.period_id IS NULL OR sp.parent_period_id IS DISTINCT FROM x.parent_period_id)) THEN RAISE EXCEPTION 'Périodes finales inattendues.'; END IF;
  IF NOT ((SELECT count(*) FROM public.story_events WHERE story_id=22)=(SELECT count(*) FROM _ext_after_events)
    AND NOT EXISTS(SELECT 1 FROM _ext_after_events x LEFT JOIN public.story_events se ON se.story_id=22 AND se.event_id=x.event_id
      WHERE se.event_id IS NULL OR se.importance IS DISTINCT FROM x.importance)) THEN RAISE EXCEPTION 'Événements finaux inattendus.'; END IF;
  IF EXISTS(SELECT 1 FROM public.story_periods c LEFT JOIN public.story_periods p ON p.story_id=22 AND p.period_id=c.parent_period_id
    WHERE c.story_id=22 AND c.parent_period_id IS NOT NULL AND p.period_id IS NULL) THEN RAISE EXCEPTION 'Parent local absent.'; END IF;
  IF EXISTS(SELECT 1 FROM public.periods WHERE id IN ('1577f981-d388-4211-b26d-db695cd31d4d','14bee4a4-4462-4b33-96cc-99e06881d7c6','243c2f0a-c36b-4ea8-8497-75a5e3900bf4','0560995c-c751-4707-a5cd-5a09c848aae6','5ff185a7-c45a-42e5-bcbd-be08740280e7') AND NOT (start_years_bp>end_years_bp)) THEN RAISE EXCEPTION 'Intervalle inversé.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.story_entry_points WHERE source_story_id=22 AND target_story_id=29 AND period_id='PER_MESOZOIC') THEN
    RAISE EXCEPTION 'Accès vers Le temps des dinosaures perdu.';
  END IF;
END $check$;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
