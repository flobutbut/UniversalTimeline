-- Personnalités, quatrième lot (Marco Polo), 12 novembre 2026. Création d’une frise.
-- Sources et décisions : 20261112_personnalites_lot4.json et audits/2026-11-12-personnalites.md.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;

DO $people$ DECLARE owner uuid; writer text; sid integer; BEGIN
IF NOT ((SELECT count(DISTINCT owner_user_id) FROM public.stories WHERE id IN (15,52))=1 AND (SELECT count(DISTINCT author) FROM public.stories WHERE id IN (15,52))=1) THEN RAISE EXCEPTION 'Les frises sources n’ont pas un propriétaire et un auteur uniques.'; END IF;
SELECT owner_user_id,author INTO owner,writer FROM public.stories WHERE id=15;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=15 AND md5(title_fr)='ebd2107e08725de6365bab1a04254143')) THEN RAISE EXCEPTION 'Frise source 15 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=52 AND md5(title_fr)='acff54dd49a7327934546622969b5f00')) THEN RAISE EXCEPTION 'Frise source 52 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7' AND date='1298' AND wikidata_id IS NOT DISTINCT FROM 'Q654562')) THEN RAISE EXCEPTION 'Événement réutilisé 3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7 absent ou modifié.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.stories WHERE lower(title_fr)=lower('Marco Polo'))) THEN RAISE EXCEPTION 'Une frise « Marco Polo » existe déjà.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_events WHERE story_id=15 AND event_id='3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7')) THEN RAISE EXCEPTION 'Ancre 3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7 absente de la frise 15.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_events WHERE story_id=52 AND event_id='3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7')) THEN RAISE EXCEPTION 'Ancre 3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7 absente de la frise 52.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='855bf9b0-c041-448c-b5f6-93bd7c5ecb56' OR lower(label_fr)=lower('Jeunesse de Marco Polo à Venise'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Jeunesse de Marco Polo à Venise) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='b2720529-e26c-492b-a6be-504bed1a241a' OR lower(label_fr)=lower('Voyage de Marco Polo vers la Chine'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Voyage de Marco Polo vers la Chine) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='05b4f43c-24eb-4965-ad68-cee60d438c9e' OR lower(label_fr)=lower('Marco Polo au service de Kubilai Khan'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Marco Polo au service de Kubilai Khan) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e' OR lower(label_fr)=lower('Retour de Marco Polo par la mer'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Retour de Marco Polo par la mer) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='f619cde6-2e7d-4e62-8bae-f26e8bd4962f' OR lower(label_fr)=lower('Marco Polo marchand à Venise'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Marco Polo marchand à Venise) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='9258c86c-cbff-409c-9288-2a27a1f3fa48' OR lower(label_fr)=lower('Naissance de Marco Polo'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Naissance de Marco Polo) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='aebd9a6a-0417-4324-8451-2a88da942277' OR lower(label_fr)=lower('Départ des Polo pour l’Orient'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Départ des Polo pour l’Orient) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='6c050a8c-64d8-423e-9485-81c26612fb67' OR lower(label_fr)=lower('Arrivée des Polo à la cour de Kubilai Khan'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Arrivée des Polo à la cour de Kubilai Khan) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='864c9f60-6b44-4f6a-9f0b-e5e6e46c86af' OR lower(label_fr)=lower('Retour de Marco Polo à Venise'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Retour de Marco Polo à Venise) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='55f0eb26-0cb9-4802-adc2-6270d1da90f8' OR wikidata_id='Q2139987' OR lower(label_fr)=lower('Bataille de Curzola'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Bataille de Curzola) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='57e12a0e-0841-4f8f-ac43-f464112a0544' OR lower(label_fr)=lower('Mort de Marco Polo'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Mort de Marco Polo) : réutiliser l’existant.'; END IF;
INSERT INTO public.periods (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,start_date,end_date,start_years_bp,end_years_bp,non_thematic) VALUES
('855bf9b0-c041-448c-b5f6-93bd7c5ecb56','Jeunesse de Marco Polo à Venise','Marco Polo’s youth in Venice','Marco grandit dans une famille de marchands vénitiens, tandis que son père et son oncle commercent jusqu’en Asie centrale.','Marco grows up in a family of Venetian merchants while his father and uncle trade as far as Central Asia.',NULL,NULL,NULL,'1254','1271',772.847364818617,755.848049281314,false),
('b2720529-e26c-492b-a6be-504bed1a241a','Voyage de Marco Polo vers la Chine','Marco Polo’s journey to China','Avec son père Niccolò et son oncle Maffeo, Marco traverse l’Anatolie, la Perse, le Pamir et le désert de Gobi.','With his father Niccolò and his uncle Maffeo, Marco crosses Anatolia, Persia, the Pamirs and the Gobi Desert.',NULL,NULL,NULL,'1271','1275',755.848049281314,751.848049281314,false),
('05b4f43c-24eb-4965-ad68-cee60d438c9e','Marco Polo au service de Kubilai Khan','Marco Polo in the service of Kublai Khan','Selon son récit, Marco remplit des missions pour l’empereur mongol dans plusieurs provinces de Chine ; les sources chinoises ne le mentionnent pas.','By his own account, Marco carries out missions for the Mongol emperor in several provinces of China; Chinese sources do not mention him.',NULL,NULL,NULL,'1275','1292',751.848049281314,734.848733744011,false),
('9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e','Retour de Marco Polo par la mer','Marco Polo’s return by sea','Les Polo accompagnent une princesse mongole jusqu’en Perse par Sumatra, Ceylan et l’Inde, puis regagnent Venise.','The Polos escort a Mongol princess to Persia by way of Sumatra, Ceylon and India, then make their way back to Venice.',NULL,NULL,NULL,'1292','1295',734.848733744011,731.848049281314,false),
('f619cde6-2e7d-4e62-8bae-f26e8bd4962f','Marco Polo marchand à Venise','Marco Polo as a merchant in Venice','Rentré riche, Marco reprend le commerce, se marie et voit son récit circuler dans toute l’Europe.','Back home a rich man, Marco returns to trade, marries and sees his account circulate throughout Europe.',NULL,NULL,NULL,'1295','1324-01-08',731.848049281314,702.832306639288,false);
INSERT INTO public.events (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,date,date_years_bp) VALUES
('9258c86c-cbff-409c-9288-2a27a1f3fa48','Naissance de Marco Polo','Birth of Marco Polo','Marco Polo naît à Venise ; la tradition retient le 15 septembre 1254.','Marco Polo is born in Venice; tradition gives 15 September 1254.',NULL,NULL,NULL,'1254',772.847364818617),
('aebd9a6a-0417-4324-8451-2a88da942277','Départ des Polo pour l’Orient','The Polos set out for the East','À dix-sept ans, Marco quitte Venise avec son père et son oncle, porteurs de lettres du pape pour le grand khan.','Aged seventeen, Marco leaves Venice with his father and uncle, who carry letters from the pope for the Great Khan.',NULL,NULL,NULL,'1271',755.848049281314),
('6c050a8c-64d8-423e-9485-81c26612fb67','Arrivée des Polo à la cour de Kubilai Khan','The Polos arrive at the court of Kublai Khan','Après plus de trois ans de route, les Polo sont reçus par l’empereur à Shangdu, sa résidence d’été.','After more than three years on the road, the Polos are received by the emperor at Shangdu, his summer residence.',NULL,NULL,NULL,'1275',751.848049281314),
('864c9f60-6b44-4f6a-9f0b-e5e6e46c86af','Retour de Marco Polo à Venise','Marco Polo returns to Venice','Les trois voyageurs retrouvent Venise après vingt-quatre ans d’absence.','The three travellers return to Venice after twenty-four years away.',NULL,NULL,NULL,'1295',731.848049281314),
('55f0eb26-0cb9-4802-adc2-6270d1da90f8','Bataille de Curzola','Battle of Curzola','La flotte de Gênes bat celle de Venise en Adriatique ; selon la tradition, Marco Polo y est fait prisonnier.','The Genoese fleet defeats the Venetian fleet in the Adriatic; according to tradition, Marco Polo is taken prisoner there.','Q2139987','Bataille de Curzola','Battle of Curzola','1298-09-09',728.160164271047),
('57e12a0e-0841-4f8f-ac43-f464112a0544','Mort de Marco Polo','Death of Marco Polo','Marco Polo meurt à Venise, laissant un testament qui détaille sa fortune.','Marco Polo dies in Venice, leaving a will that details his fortune.',NULL,NULL,NULL,'1324-01-08',702.832306639288);
INSERT INTO public.period_tags (period_id,tag_id,position) VALUES
('855bf9b0-c041-448c-b5f6-93bd7c5ecb56','peuplement-societe',1),
('855bf9b0-c041-448c-b5f6-93bd7c5ecb56','economie-echanges',2),
('b2720529-e26c-492b-a6be-504bed1a241a','territoires-exploration',1),
('b2720529-e26c-492b-a6be-504bed1a241a','economie-echanges',2),
('05b4f43c-24eb-4965-ad68-cee60d438c9e','pouvoir-institutions',1),
('05b4f43c-24eb-4965-ad68-cee60d438c9e','territoires-exploration',2),
('9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e','territoires-exploration',1),
('f619cde6-2e7d-4e62-8bae-f26e8bd4962f','economie-echanges',1);
INSERT INTO public.event_tags (event_id,tag_id,position) VALUES
('9258c86c-cbff-409c-9288-2a27a1f3fa48','peuplement-societe',1),
('aebd9a6a-0417-4324-8451-2a88da942277','territoires-exploration',1),
('6c050a8c-64d8-423e-9485-81c26612fb67','territoires-exploration',1),
('6c050a8c-64d8-423e-9485-81c26612fb67','pouvoir-institutions',2),
('864c9f60-6b44-4f6a-9f0b-e5e6e46c86af','territoires-exploration',1),
('55f0eb26-0cb9-4802-adc2-6270d1da90f8','conflits',1),
('57e12a0e-0841-4f8f-ac43-f464112a0544','peuplement-societe',1);
-- Marco Polo
INSERT INTO public.stories (title_fr,title_en,description_fr,description_en,author,is_public,parent_story_id,owner_user_id) VALUES ('Marco Polo','Marco Polo','De Venise à la cour de Kubilai Khan : la route de la soie, dix-sept années passées en Chine, le retour par l’océan Indien et le récit dicté en prison à Gênes.','From Venice to the court of Kublai Khan: the Silk Road, seventeen years spent in China, the return by the Indian Ocean and the account dictated in prison in Genoa.',writer,true,15,owner) RETURNING id INTO sid;
INSERT INTO public.story_tags (story_id,tag_id,position) VALUES (sid,'territoires-exploration',1),(sid,'economie-echanges',2);
INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES (sid,'855bf9b0-c041-448c-b5f6-93bd7c5ecb56',NULL),(sid,'b2720529-e26c-492b-a6be-504bed1a241a',NULL),(sid,'05b4f43c-24eb-4965-ad68-cee60d438c9e',NULL),(sid,'9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e',NULL),(sid,'f619cde6-2e7d-4e62-8bae-f26e8bd4962f',NULL);
INSERT INTO public.story_events (story_id,event_id,importance) VALUES (sid,'9258c86c-cbff-409c-9288-2a27a1f3fa48','normal'),(sid,'aebd9a6a-0417-4324-8451-2a88da942277','major'),(sid,'6c050a8c-64d8-423e-9485-81c26612fb67','major'),(sid,'864c9f60-6b44-4f6a-9f0b-e5e6e46c86af','normal'),(sid,'55f0eb26-0cb9-4802-adc2-6270d1da90f8','normal'),(sid,'3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7','major'),(sid,'57e12a0e-0841-4f8f-ac43-f464112a0544','normal');
INSERT INTO public.story_entry_points (source_story_id,target_story_id,period_id,event_id,display_as_period) VALUES (15,sid,NULL,'3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7',false),(52,sid,NULL,'3bdbb6b1-cdfb-4e4d-8b98-2af3296d7aa7',false);
IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=sid)=5 AND (SELECT count(*) FROM public.story_events WHERE story_id=sid)=7 AND (SELECT count(*) FROM public.story_entry_points WHERE target_story_id=sid)=2) THEN RAISE EXCEPTION 'Contenu inattendu pour « Marco Polo ».'; END IF;
IF NOT ((SELECT count(*) FROM public.periods WHERE id IN ('855bf9b0-c041-448c-b5f6-93bd7c5ecb56','b2720529-e26c-492b-a6be-504bed1a241a','05b4f43c-24eb-4965-ad68-cee60d438c9e','9e8c5ab1-8d4f-404c-8ed4-8a7568e9c82e','f619cde6-2e7d-4e62-8bae-f26e8bd4962f') AND start_years_bp>end_years_bp)=5) THEN RAISE EXCEPTION 'Bornes de périodes incohérentes.'; END IF;
END $people$;
COMMIT;
