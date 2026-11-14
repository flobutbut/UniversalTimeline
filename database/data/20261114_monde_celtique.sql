-- Le monde celtique (frise 87), 14 novembre 2026. Correction, compléments et liens.
-- Sources et décisions : audits/2026-11-14-monde-celtique.md, 20261114_monde_celtique_source/build.mjs.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_anchors,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;

DO $lot$ BEGIN
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=10 AND md5(title_fr)='fb7c3cea6b0617cee02d3b560efca02d')) THEN RAISE EXCEPTION 'Frise 10 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=21 AND md5(title_fr)='d501dd144be9636e291c2c94d21ad1db')) THEN RAISE EXCEPTION 'Frise 21 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=45 AND md5(title_fr)='a373c58af973543db64218f16043ceb3')) THEN RAISE EXCEPTION 'Frise 45 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=51 AND md5(title_fr)='a74d273030b0bf0861b00fe2c59fca6b')) THEN RAISE EXCEPTION 'Frise 51 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=53 AND md5(title_fr)='cd56c14df3aaf30e596c4c64750c0754')) THEN RAISE EXCEPTION 'Frise 53 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=65 AND md5(title_fr)='c020ae735cd04dbce6ad3529ca614c31')) THEN RAISE EXCEPTION 'Frise 65 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=87 AND md5(title_fr)='086d5eef6e35e2589d76496d94fda2d5')) THEN RAISE EXCEPTION 'Frise 87 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=87 AND parent_story_id IS NULL AND description_fr IS NULL AND description_en IS NULL AND title_en='Le monde Celtique')) THEN RAISE EXCEPTION 'La frise 87 a changé depuis l’analyse.'; END IF;
IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=87)=10 AND (SELECT count(*) FROM public.story_events WHERE story_id=87)=7 AND NOT EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=87 AND parent_period_id IS NOT NULL)) THEN RAISE EXCEPTION 'Le contenu de la frise 87 a changé depuis l’analyse.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.story_entry_points WHERE 87 IN (source_story_id,target_story_id)) AND NOT EXISTS(SELECT 1 FROM public.story_anchors WHERE story_id=87)) THEN RAISE EXCEPTION 'La frise 87 a déjà des liens.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.periods WHERE id='ce77a30d-1a24-4bd7-8a44-c814b843abc8' AND start_date='-1349' AND end_date='-0799')) THEN RAISE EXCEPTION 'Période ce77a30d-1a24-4bd7-8a44-c814b843abc8 modifiée depuis l’analyse.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.periods WHERE id='9c0cb584-999b-4099-a3f1-e1b48bae4ba0' AND start_date='-0279' AND end_date='-0278')) THEN RAISE EXCEPTION 'Période 9c0cb584-999b-4099-a3f1-e1b48bae4ba0 modifiée depuis l’analyse.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='390747a8-8d55-477e-a9fc-294060fe1ff4' AND date='-0117')) THEN RAISE EXCEPTION 'Événement 390747a8-8d55-477e-a9fc-294060fe1ff4 modifié depuis l’analyse.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='673a1e79-e7a7-429c-b9bc-008a905414f2' AND date='-0224')) THEN RAISE EXCEPTION 'Événement 673a1e79-e7a7-429c-b9bc-008a905414f2 modifié depuis l’analyse.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='fd7dee80-a205-4eb2-867d-ba4faef3986d' AND date='-0389')) THEN RAISE EXCEPTION 'Événement fd7dee80-a205-4eb2-867d-ba4faef3986d modifié depuis l’analyse.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='3652c3a2-54c2-47bb-8773-1748645f5cb5' AND date='-0516')) THEN RAISE EXCEPTION 'Événement 3652c3a2-54c2-47bb-8773-1748645f5cb5 modifié depuis l’analyse.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.periods WHERE id='fef88ee8-062c-4067-87ba-d3b9daf42346' AND wikipedia_title_fr IS NULL AND wikipedia_title_en IS NULL)) THEN RAISE EXCEPTION 'Bretagne romaine modifiée depuis l’analyse.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=21 AND period_id='80b51412-4ff5-4f15-8c53-99047fe52681')) THEN RAISE EXCEPTION 'Ancre 80b51412-4ff5-4f15-8c53-99047fe52681 absente de la frise 21.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=51 AND period_id='697065a6-a932-4198-b99b-bed72fe8eb99')) THEN RAISE EXCEPTION 'Ancre 697065a6-a932-4198-b99b-bed72fe8eb99 absente de la frise 51.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=53 AND period_id='fef88ee8-062c-4067-87ba-d3b9daf42346')) THEN RAISE EXCEPTION 'Ancre fef88ee8-062c-4067-87ba-d3b9daf42346 absente de la frise 53.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=45 AND period_id='06454d26-49e3-4e67-9c5d-43f71efdb07b')) THEN RAISE EXCEPTION 'Ancre 06454d26-49e3-4e67-9c5d-43f71efdb07b absente de la frise 45.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=21 AND period_id='80b51412-4ff5-4f15-8c53-99047fe52681')) THEN RAISE EXCEPTION 'La Tène absente de la frise 21.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='210a9912-6d85-4826-9b56-941ce6409aa2' AND date='0122') AND NOT EXISTS(SELECT 1 FROM public.story_events WHERE story_id=87 AND event_id='210a9912-6d85-4826-9b56-941ce6409aa2')) THEN RAISE EXCEPTION 'Mur d’Hadrien absent ou déjà présent.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='c5dfcbf0-5771-4a54-a674-530e68412196' OR lower(label_fr)=lower('Haut Moyen Âge celtique'))) THEN RAISE EXCEPTION 'Fiche déjà présente : Haut Moyen Âge celtique.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='5327c07d-c273-4403-a3ef-d43d89fd268d' OR wikidata_id='Q2446231' OR lower(label_fr)=lower('Guerres celtibères'))) THEN RAISE EXCEPTION 'Fiche déjà présente : Guerres celtibères.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='59c3471e-cd45-4af8-be01-7f2a6110b9e6' OR wikidata_id='Q1483632' OR lower(label_fr)=lower('Tombe de Vix'))) THEN RAISE EXCEPTION 'Fiche déjà présente : Tombe de Vix.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='6b3524ea-cd7c-4c12-bffb-4fe67d06e5d1' OR wikidata_id='Q815183' OR lower(label_fr)=lower('Siège de Numance'))) THEN RAISE EXCEPTION 'Fiche déjà présente : Siège de Numance.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='d0720059-a850-4b41-8567-6024dc300b24' OR lower(label_fr)=lower('Massacre des druides de Mona'))) THEN RAISE EXCEPTION 'Fiche déjà présente : Massacre des druides de Mona.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='8ade76aa-0192-402f-acbb-8a9b0e7081ff' OR wikidata_id='Q198409' OR lower(label_fr)=lower('Fondation d’Iona par Columba'))) THEN RAISE EXCEPTION 'Fiche déjà présente : Fondation d’Iona par Columba.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='0618479e-4bf3-41f5-a098-00e10618509c' OR wikidata_id='Q204221' OR lower(label_fr)=lower('Livre de Kells'))) THEN RAISE EXCEPTION 'Fiche déjà présente : Livre de Kells.'; END IF;
UPDATE public.stories SET title_fr='Le monde celtique',title_en='The Celtic world',description_fr='Des champs d’urnes aux royaumes du haut Moyen Âge : l’essor des Celtes en Europe, leurs expéditions jusqu’à Rome et Delphes, la conquête romaine, puis le monde gaélique et breton chrétien.',description_en='From the Urnfield culture to the early medieval kingdoms: the rise of the Celts across Europe, their expeditions to Rome and Delphi, the Roman conquest, then the Christian Gaelic and Brittonic world.' WHERE id=87;
INSERT INTO public.story_tags (story_id,tag_id,position) SELECT 87,'conflits',2 WHERE NOT EXISTS(SELECT 1 FROM public.story_tags WHERE story_id=87 AND (tag_id='conflits' OR position=2));
UPDATE public.periods SET start_date='1350 BCE',end_date='800 BCE',start_years_bp=3375.80150581793,end_years_bp=2825.81108829569 WHERE id='ce77a30d-1a24-4bd7-8a44-c814b843abc8';
UPDATE public.periods SET start_date='279 BCE',end_date='278 BCE',start_years_bp=2304.82272416153,end_years_bp=2303.82340862423 WHERE id='9c0cb584-999b-4099-a3f1-e1b48bae4ba0';
UPDATE public.events SET date='118 BCE',date_years_bp=2143.82614647502 WHERE id='390747a8-8d55-477e-a9fc-294060fe1ff4';
UPDATE public.events SET date='225 BCE',date_years_bp=2250.82409308693 WHERE id='673a1e79-e7a7-429c-b9bc-008a905414f2';
UPDATE public.events SET date='390 BCE',date_years_bp=2415.82067077344 WHERE id='fd7dee80-a205-4eb2-867d-ba4faef3986d';
UPDATE public.events SET date='517 BCE',date_years_bp=2542.81861738535 WHERE id='3652c3a2-54c2-47bb-8773-1748645f5cb5';
UPDATE public.periods SET wikipedia_title_fr='Bretagne (province romaine)',wikipedia_title_en='Roman Britain' WHERE id='fef88ee8-062c-4067-87ba-d3b9daf42346';
INSERT INTO public.periods (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,start_date,end_date,start_years_bp,end_years_bp,non_thematic) VALUES
('c5dfcbf0-5771-4a54-a674-530e68412196','Haut Moyen Âge celtique','Early medieval Celtic world','Après le départ de Rome, Irlande, Écosse, pays de Galles et Bretagne forment un monde celtique chrétien, centré sur ses monastères.','After Rome’s departure, Ireland, Scotland, Wales and Brittany form a Christian Celtic world centred on its monasteries.',NULL,NULL,NULL,'0400','0800',1626.83778234086,1226.84599589322,true),
('5327c07d-c273-4403-a3ef-d43d89fd268d','Guerres celtibères','Celtiberian Wars','Les Celtibères du centre de l’Hispanie résistent à la conquête romaine.','The Celtiberians of central Hispania resist the Roman conquest.','Q2446231',NULL,'Celtiberian Wars','181 BCE','151 BCE',2206.82683093771,2176.82546201232,false);
INSERT INTO public.events (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,date,date_years_bp) VALUES
('59c3471e-cd45-4af8-be01-7f2a6110b9e6','Tombe de Vix','Vix Grave','Vers 500 av. J.-C., une princesse celte est inhumée en Bourgogne avec un char et un cratère grec en bronze de 1,64 m.','Around 500 BC, a Celtic princess is buried in Burgundy with a cart and a 1.64 m Greek bronze krater.','Q1483632','Tombe de Vix','Vix Grave','500 BCE',2525.81930184805),
('6b3524ea-cd7c-4c12-bffb-4fe67d06e5d1','Siège de Numance','Siege of Numantia','Après des mois de blocus par Scipion Émilien, la cité celtibère de Numance tombe : la résistance de l’Hispanie centrale prend fin.','After months of blockade by Scipio Aemilianus, the Celtiberian city of Numantia falls, ending resistance in central Hispania.','Q815183','Siège de Numance','Siege of Numantia','133 BCE',2158.82683093771),
('d0720059-a850-4b41-8567-6024dc300b24','Massacre des druides de Mona','Destruction of the druids of Mona','Les légions de Suetonius Paulinus prennent l’île de Mona (Anglesey), sanctuaire des druides, et détruisent ses bois sacrés.','The legions of Suetonius Paulinus take the island of Mona (Anglesey), the druids’ sanctuary, and destroy its sacred groves.',NULL,NULL,NULL,'0060',1966.8295687885),
('8ade76aa-0192-402f-acbb-8a9b0e7081ff','Fondation d’Iona par Columba','Columba founds Iona','Le moine irlandais Columba fonde sur l’île d’Iona un monastère qui évangélise les Pictes et rayonne sur l’Écosse et la Northumbrie.','The Irish monk Columba founds a monastery on Iona that converts the Picts and spreads its influence over Scotland and Northumbria.','Q198409','Abbaye d''Iona','Iona Abbey','0563',1463.83983572895),
('0618479e-4bf3-41f5-a098-00e10618509c','Livre de Kells','Book of Kells','Vers 800, des moines d’Iona enluminent ce livre des Évangiles, chef-d’œuvre de l’art insulaire.','Around 800, monks of Iona illuminate this Gospel book, a masterpiece of Insular art.','Q204221','Livre de Kells','Book of Kells','0800',1226.84599589322);
INSERT INTO public.period_tags (period_id,tag_id,position) VALUES ('5327c07d-c273-4403-a3ef-d43d89fd268d','conflits',1);
INSERT INTO public.event_tags (event_id,tag_id,position) VALUES
('59c3471e-cd45-4af8-be01-7f2a6110b9e6','arts-culture-loisirs',1),
('59c3471e-cd45-4af8-be01-7f2a6110b9e6','peuplement-societe',2),
('6b3524ea-cd7c-4c12-bffb-4fe67d06e5d1','conflits',1),
('d0720059-a850-4b41-8567-6024dc300b24','religions-spiritualites',1),
('d0720059-a850-4b41-8567-6024dc300b24','conflits',2),
('8ade76aa-0192-402f-acbb-8a9b0e7081ff','religions-spiritualites',1),
('0618479e-4bf3-41f5-a098-00e10618509c','arts-culture-loisirs',1),
('0618479e-4bf3-41f5-a098-00e10618509c','religions-spiritualites',2);
DELETE FROM public.story_periods WHERE story_id=87 AND period_id='697065a6-a932-4198-b99b-bed72fe8eb99';
INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES (87,'c5dfcbf0-5771-4a54-a674-530e68412196',NULL),(87,'5327c07d-c273-4403-a3ef-d43d89fd268d','80b51412-4ff5-4f15-8c53-99047fe52681');
UPDATE public.story_periods SET parent_period_id='80b51412-4ff5-4f15-8c53-99047fe52681' WHERE story_id=87 AND period_id='9c0cb584-999b-4099-a3f1-e1b48bae4ba0';
UPDATE public.story_periods SET parent_period_id='80b51412-4ff5-4f15-8c53-99047fe52681' WHERE story_id=87 AND period_id='06454d26-49e3-4e67-9c5d-43f71efdb07b';
UPDATE public.story_periods SET parent_period_id='c5dfcbf0-5771-4a54-a674-530e68412196' WHERE story_id=87 AND period_id='871b6cbf-af81-4da4-a992-13a5cb10d694';
UPDATE public.story_periods SET parent_period_id='c5dfcbf0-5771-4a54-a674-530e68412196' WHERE story_id=87 AND period_id='c653e13b-be85-45b6-af45-353f8089df6c';
INSERT INTO public.story_events (story_id,event_id,importance) VALUES (87,'59c3471e-cd45-4af8-be01-7f2a6110b9e6','normal'),(87,'6b3524ea-cd7c-4c12-bffb-4fe67d06e5d1','normal'),(87,'d0720059-a850-4b41-8567-6024dc300b24','normal'),(87,'8ade76aa-0192-402f-acbb-8a9b0e7081ff','normal'),(87,'0618479e-4bf3-41f5-a098-00e10618509c','normal'),(87,'210a9912-6d85-4826-9b56-941ce6409aa2','normal');
INSERT INTO public.story_entry_points (source_story_id,target_story_id,period_id,event_id,display_as_period) VALUES
(21,87,'80b51412-4ff5-4f15-8c53-99047fe52681',NULL,false),
(10,87,NULL,NULL,false),
(51,87,'697065a6-a932-4198-b99b-bed72fe8eb99',NULL,false),
(53,87,'fef88ee8-062c-4067-87ba-d3b9daf42346',NULL,false),
(45,87,'06454d26-49e3-4e67-9c5d-43f71efdb07b',NULL,false),
(87,51,'7e53786a-e942-49ce-b519-bbf8a616f6a0',NULL,false),
(87,53,'fef88ee8-062c-4067-87ba-d3b9daf42346',NULL,false),
(87,45,'06454d26-49e3-4e67-9c5d-43f71efdb07b',NULL,false),
(87,65,NULL,'bf2684a2-7df4-4f13-a062-36b3e38a5045',false),
(87,21,'1322e5b2-1cce-4ceb-af43-96b34912ed6e',NULL,false);
IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=87)=11 AND (SELECT count(*) FROM public.story_events WHERE story_id=87)=13 AND (SELECT count(*) FROM public.story_entry_points WHERE 87 IN (source_story_id,target_story_id))=10) THEN RAISE EXCEPTION 'Contenu inattendu après le lot.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.story_periods c JOIN public.periods p ON p.id=c.period_id JOIN public.periods par ON par.id=c.parent_period_id WHERE c.story_id=87 AND (p.start_years_bp>par.start_years_bp OR p.end_years_bp<par.end_years_bp))) THEN RAISE EXCEPTION 'Une sous-période dépasse son parent.'; END IF;
END $lot$;
COMMIT;
