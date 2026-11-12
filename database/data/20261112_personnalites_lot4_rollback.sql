-- Personnalités, quatrième lot (Marco Polo), 12 novembre 2026. Retour arrière ciblé ; ne pas exécuter automatiquement.
-- Sources et décisions : 20261112_personnalites_lot4.json et audits/2026-11-12-personnalites.md.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;

DO $people$ DECLARE sids integer[]; BEGIN
SELECT array_agg(id) INTO sids FROM public.stories WHERE title_fr IN ('Marco Polo');
IF NOT (cardinality(sids)=1) THEN RAISE EXCEPTION 'Les frises du lot ne sont pas toutes présentes.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.stories WHERE parent_story_id=ANY(sids))) THEN RAISE EXCEPTION 'Une frise a été rattachée à une frise du lot.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.story_entry_points WHERE source_story_id=ANY(sids))) THEN RAISE EXCEPTION 'Une frise du lot sert de source à un accès créé depuis.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.story_periods WHERE period_id IN ('855bf9b0-c041-448c-b5f6-93bd7c5ecb56','b2720529-e26c-492b-a6be-504bed1a241a','05b4f43c-24eb-4965-ad68-cee60d438c9e','9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e','f619cde6-2e7d-4e62-8bae-f26e8bd4962f') AND NOT story_id=ANY(sids))) THEN RAISE EXCEPTION 'Une période du lot est utilisée par une autre frise.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.story_events WHERE event_id IN ('9258c86c-cbff-409c-9288-2a27a1f3fa48','aebd9a6a-0417-4324-8451-2a88da942277','6c050a8c-64d8-423e-9485-81c26612fb67','864c9f60-6b44-4f6a-9f0b-e5e6e46c86af','55f0eb26-0cb9-4802-adc2-6270d1da90f8','57e12a0e-0841-4f8f-ac43-f464112a0544') AND NOT story_id=ANY(sids))) THEN RAISE EXCEPTION 'Un événement du lot est utilisé par une autre frise.'; END IF;
IF NOT ((SELECT count(*) FROM public.periods t WHERE (t.id='855bf9b0-c041-448c-b5f6-93bd7c5ecb56' AND t.label_fr='Jeunesse de Marco Polo à Venise') OR (t.id='b2720529-e26c-492b-a6be-504bed1a241a' AND t.label_fr='Voyage de Marco Polo vers la Chine') OR (t.id='05b4f43c-24eb-4965-ad68-cee60d438c9e' AND t.label_fr='Marco Polo au service de Kubilai Khan') OR (t.id='9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e' AND t.label_fr='Retour de Marco Polo par la mer') OR (t.id='f619cde6-2e7d-4e62-8bae-f26e8bd4962f' AND t.label_fr='Marco Polo marchand à Venise'))=5) THEN RAISE EXCEPTION 'Des fiches du lot (periods) ont été modifiées ou supprimées.'; END IF;
IF NOT ((SELECT count(*) FROM public.events t WHERE (t.id='9258c86c-cbff-409c-9288-2a27a1f3fa48' AND t.label_fr='Naissance de Marco Polo') OR (t.id='aebd9a6a-0417-4324-8451-2a88da942277' AND t.label_fr='Départ des Polo pour l’Orient') OR (t.id='6c050a8c-64d8-423e-9485-81c26612fb67' AND t.label_fr='Arrivée des Polo à la cour de Kubilai Khan') OR (t.id='864c9f60-6b44-4f6a-9f0b-e5e6e46c86af' AND t.label_fr='Retour de Marco Polo à Venise') OR (t.id='55f0eb26-0cb9-4802-adc2-6270d1da90f8' AND t.label_fr='Bataille de Curzola') OR (t.id='57e12a0e-0841-4f8f-ac43-f464112a0544' AND t.label_fr='Mort de Marco Polo'))=6) THEN RAISE EXCEPTION 'Des fiches du lot (events) ont été modifiées ou supprimées.'; END IF;
DELETE FROM public.stories WHERE id=ANY(sids);
DELETE FROM public.periods WHERE id IN ('855bf9b0-c041-448c-b5f6-93bd7c5ecb56','b2720529-e26c-492b-a6be-504bed1a241a','05b4f43c-24eb-4965-ad68-cee60d438c9e','9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e','f619cde6-2e7d-4e62-8bae-f26e8bd4962f');
DELETE FROM public.events WHERE id IN ('9258c86c-cbff-409c-9288-2a27a1f3fa48','aebd9a6a-0417-4324-8451-2a88da942277','6c050a8c-64d8-423e-9485-81c26612fb67','864c9f60-6b44-4f6a-9f0b-e5e6e46c86af','55f0eb26-0cb9-4802-adc2-6270d1da90f8','57e12a0e-0841-4f8f-ac43-f464112a0544');
END $people$;
COMMIT;
