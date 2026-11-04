-- Reviewed prototype scope only. Catalogue facts and all events are preserved.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.stories,public.story_periods,public.story_entry_points,public.story_anchors,public.story_period_presentations IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE _navigation_expected(story_title text,period_title text,start_date text,end_date text) ON COMMIT DROP;
INSERT INTO _navigation_expected VALUES ('Époque contemporaine','Histoire contemporaine','1789','TODAY'),
('Moyen Âge','Moyen Âge','0476-09-04','1492-10-12'),
('Antiquité et premières civilisations','Antiquité','3200 BCE','0476-09-04'),
('Époque moderne','Époque moderne','1492-10-12','1789');
CREATE TEMP TABLE _navigation_wrappers ON COMMIT DROP AS
SELECT s.id story_id,p.id period_id FROM _navigation_expected e
JOIN public.stories s ON s.title_fr=e.story_title
JOIN public.story_periods sp ON sp.story_id=s.id
JOIN public.periods p ON p.id=sp.period_id AND p.label_fr=e.period_title AND p.start_date IS NOT DISTINCT FROM e.start_date AND p.end_date IS NOT DISTINCT FROM e.end_date;
DO $$ BEGIN
  IF (SELECT count(*) FROM _navigation_wrappers)<>4 OR (SELECT count(DISTINCT story_id) FROM _navigation_wrappers)<>4 THEN
    RAISE EXCEPTION 'The four reviewed memberships changed. Re-audit before applying.';
  END IF;
  IF EXISTS(SELECT 1 FROM story_period_presentations v JOIN _navigation_wrappers c ON c.story_id=v.context_story_id AND c.period_id=v.period_id) THEN
    RAISE EXCEPTION 'A wrapper is now a source context. Preserve it and review the plan.';
  END IF;
  IF EXISTS(SELECT 1 FROM _navigation_wrappers c WHERE NOT EXISTS(SELECT 1 FROM story_period_presentations v WHERE v.target_story_id=c.story_id AND v.period_id=c.period_id)) THEN
    RAISE EXCEPTION 'A reviewed chronological presentation changed.';
  END IF;
END $$;
CREATE TEMP TABLE _navigation_control ON COMMIT DROP AS SELECT
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.periods t) periods,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.events t) events,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY story_id,event_id)::text,'')) FROM public.story_events t) story_events,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.stories t) stories,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY context_story_id,period_id,target_story_id)::text,'')) FROM public.story_period_presentations t) presentations;
INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id)
SELECT DISTINCT s.parent_story_id,s.id,NULL,NULL FROM public.stories s JOIN public.story_anchors a ON a.story_id=s.id
JOIN _navigation_wrappers c ON c.story_id=s.parent_story_id AND a.anchor_type='period' AND a.anchor_id=c.period_id
ON CONFLICT ON CONSTRAINT story_entry_points_unique DO NOTHING;
INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id)
SELECT DISTINCT e.source_story_id,e.target_story_id,NULL,NULL FROM public.story_entry_points e
JOIN _navigation_wrappers c ON c.story_id=e.source_story_id AND c.period_id=e.period_id ON CONFLICT ON CONSTRAINT story_entry_points_unique DO NOTHING;
DELETE FROM public.story_anchors a USING public.stories s,_navigation_wrappers c
WHERE a.story_id=s.id AND s.parent_story_id=c.story_id AND a.anchor_type='period' AND a.anchor_id=c.period_id;
UPDATE public.story_periods sp SET parent_period_id=NULL FROM _navigation_wrappers c WHERE sp.story_id=c.story_id AND sp.parent_period_id=c.period_id;
DELETE FROM public.story_periods sp USING _navigation_wrappers c WHERE sp.story_id=c.story_id AND sp.period_id=c.period_id;
DO $$ DECLARE source_id integer;target_id integer; BEGIN
  SELECT id INTO STRICT source_id FROM public.stories WHERE title_fr='Genre Homo';
  SELECT id INTO STRICT target_id FROM public.stories WHERE title_fr='Histoire des techniques';
  IF NOT EXISTS(SELECT 1 FROM public.stories a JOIN public.stories b ON a.owner_user_id=b.owner_user_id WHERE a.id=source_id AND b.id=target_id) THEN
    RAISE EXCEPTION 'The reviewed root entry ownership changed.';
  END IF;
  INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id) VALUES(source_id,target_id,NULL,NULL) ON CONFLICT ON CONSTRAINT story_entry_points_unique DO NOTHING;
END $$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Époque contemporaine' AND t.title_fr='Conquête spatiale' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Époque contemporaine' AND t.title_fr='Guerres modernes' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Époque contemporaine' AND t.title_fr='Révolutions industrielles et énergie' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Antiquité et premières civilisations' AND t.title_fr='Mésopotamie' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Époque moderne' AND t.title_fr='L’âge des révolutions' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Moyen Âge' AND t.title_fr='Empire byzantin' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Époque moderne' AND t.title_fr='Grandes découvertes et empires coloniaux' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Époque contemporaine' AND t.title_fr='Régimes politiques en France depuis l’Empire' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.story_entry_points e JOIN public.stories s ON s.id=e.source_story_id JOIN public.stories t ON t.id=e.target_story_id WHERE s.title_fr='Genre Homo' AND t.title_fr='Histoire des techniques' AND e.period_id IS NULL AND e.event_id IS NULL) THEN RAISE EXCEPTION 'A required root entry is missing.'; END IF;
 IF EXISTS(SELECT 1 FROM _navigation_control b WHERE
  b.periods IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.periods t) OR
  b.events IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.events t) OR
  b.story_events IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY story_id,event_id)::text,'')) FROM public.story_events t) OR
  b.stories IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) FROM public.stories t) OR
  b.presentations IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY context_story_id,period_id,target_story_id)::text,'')) FROM public.story_period_presentations t)) THEN
    RAISE EXCEPTION 'Facts, event memberships, stories or chronological presentations changed unexpectedly.';
 END IF;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
