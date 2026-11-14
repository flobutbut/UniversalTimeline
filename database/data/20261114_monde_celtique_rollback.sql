-- Le monde celtique (frise 87), 14 novembre 2026. Retour arrière ciblé ; ne pas exécuter automatiquement.
-- Sources et décisions : audits/2026-11-14-monde-celtique.md, 20261114_monde_celtique_source/build.mjs.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_anchors,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;

DO $lot$ BEGIN
IF NOT ((SELECT count(*) FROM public.story_entry_points WHERE 87 IN (source_story_id,target_story_id))=10) THEN RAISE EXCEPTION 'Les accès de la frise 87 ont changé depuis le lot.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.story_periods WHERE period_id IN ('c5dfcbf0-5771-4a54-a674-530e68412196','5327c07d-c273-4403-a3ef-d43d89fd268d') AND story_id<>87) AND NOT EXISTS(SELECT 1 FROM public.story_events WHERE event_id IN ('59c3471e-cd45-4af8-be01-7f2a6110b9e6','6b3524ea-cd7c-4c12-bffb-4fe67d06e5d1','d0720059-a850-4b41-8567-6024dc300b24','8ade76aa-0192-402f-acbb-8a9b0e7081ff','0618479e-4bf3-41f5-a098-00e10618509c') AND story_id<>87)) THEN RAISE EXCEPTION 'Une fiche du lot est utilisée ailleurs.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.periods WHERE id='ce77a30d-1a24-4bd7-8a44-c814b843abc8' AND start_date='1350 BCE' AND end_date='800 BCE')) THEN RAISE EXCEPTION 'Période ce77a30d-1a24-4bd7-8a44-c814b843abc8 modifiée depuis le lot.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.periods WHERE id='9c0cb584-999b-4099-a3f1-e1b48bae4ba0' AND start_date='279 BCE' AND end_date='278 BCE')) THEN RAISE EXCEPTION 'Période 9c0cb584-999b-4099-a3f1-e1b48bae4ba0 modifiée depuis le lot.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='390747a8-8d55-477e-a9fc-294060fe1ff4' AND date='118 BCE')) THEN RAISE EXCEPTION 'Événement 390747a8-8d55-477e-a9fc-294060fe1ff4 modifié depuis le lot.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='673a1e79-e7a7-429c-b9bc-008a905414f2' AND date='225 BCE')) THEN RAISE EXCEPTION 'Événement 673a1e79-e7a7-429c-b9bc-008a905414f2 modifié depuis le lot.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='fd7dee80-a205-4eb2-867d-ba4faef3986d' AND date='390 BCE')) THEN RAISE EXCEPTION 'Événement fd7dee80-a205-4eb2-867d-ba4faef3986d modifié depuis le lot.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='3652c3a2-54c2-47bb-8773-1748645f5cb5' AND date='517 BCE')) THEN RAISE EXCEPTION 'Événement 3652c3a2-54c2-47bb-8773-1748645f5cb5 modifié depuis le lot.'; END IF;
DELETE FROM public.story_entry_points WHERE 87 IN (source_story_id,target_story_id);
DELETE FROM public.story_events WHERE story_id=87 AND event_id IN ('59c3471e-cd45-4af8-be01-7f2a6110b9e6','6b3524ea-cd7c-4c12-bffb-4fe67d06e5d1','d0720059-a850-4b41-8567-6024dc300b24','8ade76aa-0192-402f-acbb-8a9b0e7081ff','0618479e-4bf3-41f5-a098-00e10618509c','210a9912-6d85-4826-9b56-941ce6409aa2');
UPDATE public.story_periods SET parent_period_id=NULL WHERE story_id=87 AND period_id='9c0cb584-999b-4099-a3f1-e1b48bae4ba0';
UPDATE public.story_periods SET parent_period_id=NULL WHERE story_id=87 AND period_id='06454d26-49e3-4e67-9c5d-43f71efdb07b';
UPDATE public.story_periods SET parent_period_id=NULL WHERE story_id=87 AND period_id='871b6cbf-af81-4da4-a992-13a5cb10d694';
UPDATE public.story_periods SET parent_period_id=NULL WHERE story_id=87 AND period_id='c653e13b-be85-45b6-af45-353f8089df6c';
DELETE FROM public.story_periods WHERE story_id=87 AND period_id IN ('c5dfcbf0-5771-4a54-a674-530e68412196','5327c07d-c273-4403-a3ef-d43d89fd268d');
INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES (87,'697065a6-a932-4198-b99b-bed72fe8eb99',NULL);
DELETE FROM public.periods WHERE id IN ('c5dfcbf0-5771-4a54-a674-530e68412196','5327c07d-c273-4403-a3ef-d43d89fd268d');
DELETE FROM public.events WHERE id IN ('59c3471e-cd45-4af8-be01-7f2a6110b9e6','6b3524ea-cd7c-4c12-bffb-4fe67d06e5d1','d0720059-a850-4b41-8567-6024dc300b24','8ade76aa-0192-402f-acbb-8a9b0e7081ff','0618479e-4bf3-41f5-a098-00e10618509c');
UPDATE public.periods SET wikipedia_title_fr=NULL,wikipedia_title_en=NULL WHERE id='fef88ee8-062c-4067-87ba-d3b9daf42346';
UPDATE public.periods SET start_date='-1349',end_date='-0799',start_years_bp=3375.79884238928,end_years_bp=2825.80842486704 WHERE id='ce77a30d-1a24-4bd7-8a44-c814b843abc8';
UPDATE public.periods SET start_date='-0279',end_date='-0278',start_years_bp=2305.81937823364,end_years_bp=2304.82006269634 WHERE id='9c0cb584-999b-4099-a3f1-e1b48bae4ba0';
UPDATE public.events SET date='-0117',date_years_bp=2143.82349127396 WHERE id='390747a8-8d55-477e-a9fc-294060fe1ff4';
UPDATE public.events SET date='-0224',date_years_bp=2250.82143715828 WHERE id='673a1e79-e7a7-429c-b9bc-008a905414f2';
UPDATE public.events SET date='-0389',date_years_bp=2415.81801412842 WHERE id='fd7dee80-a205-4eb2-867d-ba4faef3986d';
UPDATE public.events SET date='-0516',date_years_bp=2542.81596338064 WHERE id='3652c3a2-54c2-47bb-8773-1748645f5cb5';
DELETE FROM public.story_tags WHERE story_id=87 AND tag_id='conflits';
UPDATE public.stories SET title_fr='Le monde Celtique',title_en='Le monde Celtique',description_fr=NULL,description_en=NULL WHERE id=87;
END $lot$;
COMMIT;
