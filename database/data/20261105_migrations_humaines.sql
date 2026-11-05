-- Nouvelle frise « Les grandes migrations humaines ».
-- Généré le 2026-11-05 depuis 20261105_migrations_humaines.json ; dates calculées par server/src/shared/temporal.ts.
-- Toute divergence avec l'état relu annule la transaction entière.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.stories,public.story_categories,public.story_periods,public.story_events,public.story_entry_points,public.periods,public.events,public.period_categories,public.event_categories IN SHARE ROW EXCLUSIVE MODE;
DO $guard$ BEGIN
  IF EXISTS(SELECT 1 FROM public.stories WHERE title_fr='Les grandes migrations humaines') THEN RAISE EXCEPTION 'La frise existe déjà.'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE username='flobutbut')<>1 THEN RAISE EXCEPTION 'Profil auteur introuvable.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stories st JOIN public.profiles p ON p.user_id=st.owner_user_id WHERE st.id=5 AND p.username='flobutbut') THEN
    RAISE EXCEPTION 'La frise parente n’appartient plus au même compte.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.periods WHERE wikidata_id IN ('Q28445743','Q130251','Q131192','Q213649','Q188371','Q1506365','Q20857240'))
    OR EXISTS(SELECT 1 FROM public.events WHERE wikidata_id IN ('Q65077610','Q114289250','Q2725768','Q4218','Q129053','Q60433')) THEN
    RAISE EXCEPTION 'Un Q-id du lot existe déjà : réutiliser la fiche au lieu de la créer.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.periods WHERE id IN ('c1050f5c-bf19-4ec7-a078-7e7dfe8574b6','899ca6d8-6ea4-487a-b018-2d040397f368','03bf6221-40fb-4be6-a6d3-cf4ff511e667','065caa04-e3e2-4794-b716-1361a118cca6','e9aeb787-18fe-4e4d-8ac8-b3f9bdbe3238','5669959e-8483-46a6-a84b-1b17a49bd267','533e155f-2597-4dcc-868b-9c653cf48914','927731e9-d958-4b62-bb31-0730c06529fa','b320259b-6aa2-47db-885d-15ce6c0315aa','2ac20fe3-d44e-45e6-bb6f-bf0f8e36512e','98da0a59-c0da-483f-acdb-4c2f76af6922','86005fa3-c5f9-4da7-b942-b17556fe80fd','455b6931-5b91-4a06-b766-67533c991190','2c5758d0-2791-4858-a285-47836e8cde3e','636d8c79-2263-46b8-a814-34324366f59f','7d9c0d12-4778-4ec1-b88e-2f2122c6f018')) OR EXISTS(SELECT 1 FROM public.events WHERE id IN ('90ab7bd2-5831-4b28-b1cb-2fead0532eaf','a64c1045-84ca-477e-a6b4-ef39f969887a','8a84b4d3-790f-48a4-8bb2-d1c4c76805c9','c77d4e65-161d-4c89-ad15-88bc057ba01a','34a139ed-35fc-4d63-a465-7d660ba537fe','96850f41-a52e-4cb1-bdcc-5906e141a349','593e301c-e09c-4a04-9e56-8261fc285795','a4b0033b-ac97-4674-81c4-a235c7a2e806','250cb410-b648-43fc-8069-ad6234780811','d0f084bb-a623-4ad5-923a-34d858882331','0402bac6-c9ca-4df2-a91b-d8990af5c1a6')) THEN
    RAISE EXCEPTION 'Identifiant déjà présent.';
  END IF;
  IF (SELECT count(*) FROM public.periods WHERE (id,start_date,end_date) IN (('Q38486','M1.89','K143'),('Q838707','K500','K30'),('Q42767','K400','K40'),('bdfa109a-864c-4ae8-adb9-b7e9aec9443f','K26.5','K19'),('56b0f980-fc39-44a1-b647-2ecfd4689793','5500 BCE','4900 BCE'),('9515f188-b7b8-4992-985d-b733ce70da1b','1501','1867')))<>6
    OR (SELECT count(*) FROM public.events WHERE (id,date) IN (('bc607aed-30d0-4d26-91e6-6410addd2011','K70'),('8badd516-c091-4e37-849e-efe94e2f0af0','K54'),('dc13695d-22ef-4c18-bce1-714f4f286122','K50'),('24eb4d95-8788-4bc1-b300-a21eeec57f01','K16'),('Q1069958','0410-08-24'),('EVT_HEGIRA','0622-07-16'),('fdbc9fb3-9a9c-4f17-9d9d-55a5a92fbe2e','1280'),('EVT_AMERICA','1492-10-12')))<>8 THEN
    RAISE EXCEPTION 'Une fiche réutilisée a changé.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=5 AND period_id='Q15978631') THEN RAISE EXCEPTION 'Ancre absente dans la frise 5.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stories st JOIN public.profiles p ON p.user_id=st.owner_user_id WHERE st.id=41 AND p.username='flobutbut') THEN RAISE EXCEPTION 'Frise cible 41 d’un autre compte.'; END IF;
END $guard$;

INSERT INTO public.periods(id,wikidata_id,label_fr,label_en,description_fr,description_en,start_date,end_date,start_years_bp,end_years_bp) VALUES
('c1050f5c-bf19-4ec7-a078-7e7dfe8574b6',NULL,'Peuplement de la planète','Peopling of the planet','Des premiers humains archaïques à Homo sapiens, les chasseurs-cueilleurs gagnent tous les continents sauf l’Antarctique.','From the first archaic humans to Homo sapiens, hunter-gatherers reach every continent except Antarctica.','M2.12','K12',2120000,12000),
('899ca6d8-6ea4-487a-b018-2d040397f368',NULL,'Humains archaïques hors d’Afrique','Archaic humans beyond Africa','Homo erectus puis ses descendants s’installent en Eurasie, où naissent Néandertaliens et Dénisoviens.','Homo erectus and its descendants settle in Eurasia, where Neanderthals and Denisovans emerge.','M2.12','K30',2120000,30000),
('03bf6221-40fb-4be6-a6d3-cf4ff511e667',NULL,'Expansion d’Homo sapiens','Spread of Homo sapiens','Après des sorties sans descendance, Homo sapiens quitte l’Afrique, rencontre les autres humains et atteint l’Australie puis les Amériques.','After early exits that left no descendants, Homo sapiens leaves Africa, meets other humans and reaches Australia, then the Americas.','K200','K12',200000,12000),
('065caa04-e3e2-4794-b716-1361a118cca6',NULL,'Expansion des agriculteurs et des navigateurs','Spread of farmers and seafarers','Les populations d’agriculteurs, d’éleveurs et de marins diffusent leurs langues et leurs modes de vie sur des continents entiers et dans le Pacifique.','Farming, herding and seafaring populations spread their languages and ways of life across whole continents and the Pacific.','6500 BCE','1280',8525.6708484964,746.828959379357),
('e9aeb787-18fe-4e4d-8ac8-b3f9bdbe3238',NULL,'Arrivée des agriculteurs anatoliens en Europe','Anatolian farmers settle Europe','Venus d’Anatolie, les premiers agriculteurs gagnent l’Europe par la Méditerranée et le Danube et y remplacent en grande partie les chasseurs-cueilleurs.','Coming from Anatolia, the first farmers reach Europe along the Mediterranean and the Danube and largely replace its hunter-gatherers.','6500 BCE','4000 BCE',8525.6708484964,6025.72012981057),
('5669959e-8483-46a6-a84b-1b17a49bd267','Q28445743','Migrations indo-européennes','Indo-European migrations','Des pasteurs des steppes pontiques se répandent vers l’Europe et l’Asie du Sud, diffusant probablement les langues indo-européennes.','Herders from the Pontic steppe spread into Europe and South Asia, probably carrying the Indo-European languages.','3300 BCE','1500 BCE',5325.73655691529,3525.77214897552),
('533e155f-2597-4dcc-868b-9c653cf48914',NULL,'Expansion austronésienne','Austronesian expansion','Partis de Taïwan, des navigateurs peuplent l’Asie du Sud-Est insulaire, Madagascar et les îles du Pacifique jusqu’à la Nouvelle-Zélande.','Setting out from Taiwan, seafarers settle Island Southeast Asia, Madagascar and the Pacific islands as far as New Zealand.','3000 BCE','1280',5025.74203261687,746.828959379357),
('927731e9-d958-4b62-bb31-0730c06529fa','Q130251','Expansion bantoue','Bantu expansion','Depuis la région du Cameroun, des agriculteurs de langues bantoues gagnent progressivement l’Afrique centrale, orientale et australe.','From the Cameroon region, Bantu-speaking farmers gradually spread across central, eastern and southern Africa.','2000 BCE','0500',4025.76119757238,1526.81253227463),
('b320259b-6aa2-47db-885d-15ce6c0315aa',NULL,'Des invasions barbares aux Vikings','From the barbarian invasions to the Vikings','Peuples germaniques, Huns, Slaves, Magyars puis Scandinaves se déplacent et s’installent dans l’ancien monde romain et au-delà.','Germanic peoples, Huns, Slavs, Magyars and then Scandinavians move and settle across the former Roman world and beyond.','0375','1066',1651.81184781194,960.824852603176),
('2ac20fe3-d44e-45e6-bb6f-bf0f8e36512e','Q131192','Grandes invasions','Migration Period','Poussés notamment par l’arrivée des Huns, des peuples germaniques franchissent les frontières romaines et fondent leurs royaumes.','Pushed in part by the arrival of the Huns, Germanic peoples cross the Roman frontiers and found their own kingdoms.','0375','0568',1651.81184781194,1458.81527012542),
('98da0a59-c0da-483f-acdb-4c2f76af6922','Q213649','Âge des Vikings','Viking Age','Raids, commerce et colonies scandinaves des îles Britanniques à la Russie, jusqu’à l’Islande, au Groenland et à Terre-Neuve.','Scandinavian raids, trade and settlement from the British Isles to Russia, as far as Iceland, Greenland and Newfoundland.','0793','1066',1233.81869243891,960.824852603176),
('86005fa3-c5f9-4da7-b942-b17556fe80fd',NULL,'Migrations des temps modernes et contemporains','Modern and contemporary migrations','Colonisation, déportations forcées, exodes économiques et exils politiques redessinent la population de tous les continents.','Colonisation, forced deportation, economic exodus and political exile reshape the population of every continent.','1492-10-12','TODAY',534.054147606599,0),
('455b6931-5b91-4a06-b766-67533c991190',NULL,'Grande émigration européenne','Great European emigration','Environ 55 millions d’Européens partent vers les Amériques et l’Océanie, chassés par la pauvreté et attirés par la terre et le travail.','Some 55 million Europeans leave for the Americas and Oceania, driven by poverty and drawn by land and work.','1820','1914',206.842648633293,112.844017558686),
('2c5758d0-2791-4858-a285-47836e8cde3e','Q188371','Grande Famine en Irlande','Great Irish Famine','La maladie de la pomme de terre tue environ un million d’Irlandais et en pousse plus d’un million à émigrer.','Potato blight kills about a million Irish people and drives more than a million to emigrate.','1845','1852',181.840595245202,174.842648633293),
('636d8c79-2263-46b8-a814-34324366f59f','Q1506365','Grande migration afro-américaine','Great Migration','Six millions d’Afro-Américains quittent le Sud rural et ségrégationniste pour les villes du Nord et de l’Ouest des États-Unis.','Six million African Americans leave the rural, segregated South for the cities of the North and West of the United States.','1916','1970',110.84538648408,56.8440175586863),
('7d9c0d12-4778-4ec1-b88e-2f2122c6f018','Q20857240','Crise migratoire en Europe','European migrant crisis','Plus d’un million de personnes fuyant surtout les guerres de Syrie, d’Afghanistan et d’Irak arrivent dans l’Union européenne, souvent par la mer.','More than a million people, fleeing mainly the wars in Syria, Afghanistan and Iraq, reach the European Union, often by sea.','2014','2016',12.8440175586863,10.8453864840799);
INSERT INTO public.period_categories(period_id,category_id) VALUES
('c1050f5c-bf19-4ec7-a078-7e7dfe8574b6','CAT_ANTHRO'),
('c1050f5c-bf19-4ec7-a078-7e7dfe8574b6','CAT_PALEO'),
('899ca6d8-6ea4-487a-b018-2d040397f368','CAT_ANTHRO'),
('899ca6d8-6ea4-487a-b018-2d040397f368','CAT_PALEO'),
('03bf6221-40fb-4be6-a6d3-cf4ff511e667','CAT_ANTHRO'),
('03bf6221-40fb-4be6-a6d3-cf4ff511e667','CAT_PALEO'),
('065caa04-e3e2-4794-b716-1361a118cca6','CAT_ANTHRO'),
('065caa04-e3e2-4794-b716-1361a118cca6','CAT_HIST'),
('e9aeb787-18fe-4e4d-8ac8-b3f9bdbe3238','CAT_ANTHRO'),
('e9aeb787-18fe-4e4d-8ac8-b3f9bdbe3238','CAT_HIST'),
('5669959e-8483-46a6-a84b-1b17a49bd267','CAT_ANTHRO'),
('5669959e-8483-46a6-a84b-1b17a49bd267','CAT_HIST'),
('533e155f-2597-4dcc-868b-9c653cf48914','CAT_ANTHRO'),
('533e155f-2597-4dcc-868b-9c653cf48914','CAT_OCEAN'),
('927731e9-d958-4b62-bb31-0730c06529fa','CAT_ANTHRO'),
('927731e9-d958-4b62-bb31-0730c06529fa','CAT_HIST'),
('b320259b-6aa2-47db-885d-15ce6c0315aa','CAT_HIST'),
('b320259b-6aa2-47db-885d-15ce6c0315aa','CAT_ANTHRO'),
('2ac20fe3-d44e-45e6-bb6f-bf0f8e36512e','CAT_HIST'),
('2ac20fe3-d44e-45e6-bb6f-bf0f8e36512e','CAT_ANTHRO'),
('98da0a59-c0da-483f-acdb-4c2f76af6922','CAT_HIST'),
('98da0a59-c0da-483f-acdb-4c2f76af6922','CAT_ANTHRO'),
('86005fa3-c5f9-4da7-b942-b17556fe80fd','CAT_HIST'),
('86005fa3-c5f9-4da7-b942-b17556fe80fd','CAT_ANTHRO'),
('455b6931-5b91-4a06-b766-67533c991190','CAT_HIST'),
('455b6931-5b91-4a06-b766-67533c991190','CAT_ECO'),
('2c5758d0-2791-4858-a285-47836e8cde3e','CAT_HIST'),
('2c5758d0-2791-4858-a285-47836e8cde3e','CAT_ECO'),
('636d8c79-2263-46b8-a814-34324366f59f','CAT_HIST'),
('636d8c79-2263-46b8-a814-34324366f59f','CAT_ANTHRO'),
('7d9c0d12-4778-4ec1-b88e-2f2122c6f018','CAT_HIST'),
('7d9c0d12-4778-4ec1-b88e-2f2122c6f018','CAT_ANTHRO');
INSERT INTO public.events(id,wikidata_id,label_fr,label_en,description_fr,description_en,date,date_years_bp) VALUES
('90ab7bd2-5831-4b28-b1cb-2fead0532eaf',NULL,'Outils de Shangchen','Shangchen stone tools','Des outils de pierre découverts en Chine sont les plus anciennes traces connues d’humains hors d’Afrique.','Stone tools found in China are the oldest known traces of humans outside Africa.','M2.12',2120000),
('a64c1045-84ca-477e-a6b4-ef39f969887a','Q65077610','Crânes de Dmanissi','Dmanisi skulls','En Géorgie, cinq crânes livrent les plus anciens fossiles humains connus hors d’Afrique.','In Georgia, five skulls are the oldest known human fossils outside Africa.','M1.77',1770000),
('8a84b4d3-790f-48a4-8bb2-d1c4c76805c9',NULL,'Mâchoire de Misliya','Misliya jawbone','Découverte en Israël, elle témoigne d’une sortie très ancienne d’Homo sapiens, sans descendance connue.','Found in Israel, it attests a very early exit of Homo sapiens that left no known descendants.','K185',185000),
('c77d4e65-161d-4c89-ad15-88bc057ba01a',NULL,'Métissage avec Néandertal','Interbreeding with Neanderthals','Les Homo sapiens sortis d’Afrique se mêlent aux Néandertaliens : tous les humains non africains en portent environ 2 % de gènes.','Homo sapiens leaving Africa interbreed with Neanderthals: all non-African humans carry about 2% of their genes.','K47',47000),
('34a139ed-35fc-4d63-a465-7d660ba537fe','Q114289250','Empreintes de White Sands','White Sands footprints','Au Nouveau-Mexique, des traces de pas montrent une présence humaine en Amérique pendant le dernier maximum glaciaire.','In New Mexico, footprints show humans were present in the Americas during the Last Glacial Maximum.','K23',23000),
('96850f41-a52e-4cb1-bdcc-5906e141a349','Q2725768','Colonisation de l’Islande','Settlement of Iceland','Selon la tradition, Ingólfr Arnarson fonde le premier établissement norrois permanent de l’île.','According to tradition, Ingólfr Arnarson founds the island’s first permanent Norse settlement.','0874',1152.8193769016),
('593e301c-e09c-4a04-9e56-8261fc285795','Q4218','Installation des Magyars dans le bassin des Carpates','Hungarian conquest of the Carpathian Basin','Venus des steppes, les Hongrois franchissent les Carpates et s’établissent dans la plaine du Danube.','Coming from the steppes, the Hungarians cross the Carpathians and settle on the Danube plain.','0895',1131.8200613643),
('a4b0033b-ac97-4674-81c4-a235c7a2e806',NULL,'Ouverture d’Ellis Island','Ellis Island opens','Le centre d’immigration de New York accueillera environ 12 millions d’arrivants jusqu’en 1954.','New York’s immigration station will process some 12 million arrivals until 1954.','1892-01-01',134.842648633293),
('250cb410-b648-43fc-8069-ad6234780811','Q129053','Partition des Indes','Partition of India','La division entre l’Inde et le Pakistan provoque l’un des plus grands déplacements de population de l’histoire, environ 15 millions de personnes.','The division into India and Pakistan triggers one of history’s largest population movements, some 15 million people.','1947-08-15',79.2259477434913),
('d0f084bb-a623-4ad5-923a-34d858882331',NULL,'Arrivée de l’Empire Windrush','Arrival of the Empire Windrush','Le navire débarque près de Londres des centaines d’immigrés caribéens, symbole des migrations de travail de l’après-guerre.','The ship lands hundreds of Caribbean migrants near London, a symbol of post-war labour migration.','1948-06-22',78.371738297906),
('0402bac6-c9ca-4df2-a91b-d8990af5c1a6','Q60433','Convention relative au statut des réfugiés','Refugee Convention','Adoptée à Genève, elle définit le réfugié et interdit de le renvoyer là où sa vie est menacée.','Adopted in Geneva, it defines who is a refugee and forbids returning them where their life is threatened.','1951-07-28',75.2752290576596);
INSERT INTO public.event_categories(event_id,category_id) VALUES
('90ab7bd2-5831-4b28-b1cb-2fead0532eaf','CAT_ANTHRO'),
('90ab7bd2-5831-4b28-b1cb-2fead0532eaf','CAT_PALEO'),
('a64c1045-84ca-477e-a6b4-ef39f969887a','CAT_ANTHRO'),
('a64c1045-84ca-477e-a6b4-ef39f969887a','CAT_PALEO'),
('8a84b4d3-790f-48a4-8bb2-d1c4c76805c9','CAT_ANTHRO'),
('8a84b4d3-790f-48a4-8bb2-d1c4c76805c9','CAT_PALEO'),
('c77d4e65-161d-4c89-ad15-88bc057ba01a','CAT_ANTHRO'),
('c77d4e65-161d-4c89-ad15-88bc057ba01a','CAT_BIO_EVO'),
('34a139ed-35fc-4d63-a465-7d660ba537fe','CAT_ANTHRO'),
('34a139ed-35fc-4d63-a465-7d660ba537fe','CAT_PALEO'),
('96850f41-a52e-4cb1-bdcc-5906e141a349','CAT_HIST'),
('96850f41-a52e-4cb1-bdcc-5906e141a349','CAT_ANTHRO'),
('593e301c-e09c-4a04-9e56-8261fc285795','CAT_HIST'),
('593e301c-e09c-4a04-9e56-8261fc285795','CAT_ANTHRO'),
('a4b0033b-ac97-4674-81c4-a235c7a2e806','CAT_HIST'),
('250cb410-b648-43fc-8069-ad6234780811','CAT_HIST'),
('d0f084bb-a623-4ad5-923a-34d858882331','CAT_HIST'),
('0402bac6-c9ca-4df2-a91b-d8990af5c1a6','CAT_HIST');

CREATE TEMP TABLE _mig_story(id integer) ON COMMIT DROP;
WITH created AS (
  INSERT INTO public.stories(title_fr,title_en,description_fr,description_en,author,is_public,parent_story_id,owner_user_id)
  SELECT 'Les grandes migrations humaines','The great human migrations','Depuis plus de deux millions d’années, les humains se déplacent. La frise suit les sorties d’Afrique, le peuplement des continents et des îles, l’expansion des agriculteurs et des navigateurs, les migrations des peuples, puis les migrations de masse et les exils contemporains.','Humans have been on the move for more than two million years. The timeline follows the exits from Africa, the settlement of continents and islands, the spread of farmers and seafarers, the migrations of peoples, then mass migration and modern exile.','flobutbut',true,5,user_id
  FROM public.profiles WHERE username='flobutbut'
  RETURNING id)
INSERT INTO _mig_story SELECT id FROM created;
INSERT INTO public.story_categories(story_id,category_id) VALUES
((SELECT id FROM _mig_story),'CAT_ANTHRO'),
((SELECT id FROM _mig_story),'CAT_HIST');
-- Parents locaux avant leurs enfants.
INSERT INTO public.story_periods(story_id,period_id,parent_period_id) VALUES
((SELECT id FROM _mig_story),'c1050f5c-bf19-4ec7-a078-7e7dfe8574b6',NULL),
((SELECT id FROM _mig_story),'899ca6d8-6ea4-487a-b018-2d040397f368','c1050f5c-bf19-4ec7-a078-7e7dfe8574b6'),
((SELECT id FROM _mig_story),'03bf6221-40fb-4be6-a6d3-cf4ff511e667','c1050f5c-bf19-4ec7-a078-7e7dfe8574b6'),
((SELECT id FROM _mig_story),'065caa04-e3e2-4794-b716-1361a118cca6',NULL),
((SELECT id FROM _mig_story),'e9aeb787-18fe-4e4d-8ac8-b3f9bdbe3238','065caa04-e3e2-4794-b716-1361a118cca6'),
((SELECT id FROM _mig_story),'5669959e-8483-46a6-a84b-1b17a49bd267','065caa04-e3e2-4794-b716-1361a118cca6'),
((SELECT id FROM _mig_story),'533e155f-2597-4dcc-868b-9c653cf48914','065caa04-e3e2-4794-b716-1361a118cca6'),
((SELECT id FROM _mig_story),'927731e9-d958-4b62-bb31-0730c06529fa','065caa04-e3e2-4794-b716-1361a118cca6'),
((SELECT id FROM _mig_story),'b320259b-6aa2-47db-885d-15ce6c0315aa',NULL),
((SELECT id FROM _mig_story),'2ac20fe3-d44e-45e6-bb6f-bf0f8e36512e','b320259b-6aa2-47db-885d-15ce6c0315aa'),
((SELECT id FROM _mig_story),'98da0a59-c0da-483f-acdb-4c2f76af6922','b320259b-6aa2-47db-885d-15ce6c0315aa'),
((SELECT id FROM _mig_story),'86005fa3-c5f9-4da7-b942-b17556fe80fd',NULL),
((SELECT id FROM _mig_story),'455b6931-5b91-4a06-b766-67533c991190','86005fa3-c5f9-4da7-b942-b17556fe80fd'),
((SELECT id FROM _mig_story),'2c5758d0-2791-4858-a285-47836e8cde3e','455b6931-5b91-4a06-b766-67533c991190'),
((SELECT id FROM _mig_story),'636d8c79-2263-46b8-a814-34324366f59f','86005fa3-c5f9-4da7-b942-b17556fe80fd'),
((SELECT id FROM _mig_story),'7d9c0d12-4778-4ec1-b88e-2f2122c6f018','86005fa3-c5f9-4da7-b942-b17556fe80fd'),
((SELECT id FROM _mig_story),'Q38486','899ca6d8-6ea4-487a-b018-2d040397f368'),
((SELECT id FROM _mig_story),'Q838707','899ca6d8-6ea4-487a-b018-2d040397f368'),
((SELECT id FROM _mig_story),'Q42767','899ca6d8-6ea4-487a-b018-2d040397f368'),
((SELECT id FROM _mig_story),'bdfa109a-864c-4ae8-adb9-b7e9aec9443f','03bf6221-40fb-4be6-a6d3-cf4ff511e667'),
((SELECT id FROM _mig_story),'56b0f980-fc39-44a1-b647-2ecfd4689793','e9aeb787-18fe-4e4d-8ac8-b3f9bdbe3238'),
((SELECT id FROM _mig_story),'9515f188-b7b8-4992-985d-b733ce70da1b','86005fa3-c5f9-4da7-b942-b17556fe80fd');
INSERT INTO public.story_events(story_id,event_id,importance) VALUES
((SELECT id FROM _mig_story),'bc607aed-30d0-4d26-91e6-6410addd2011','major'),
((SELECT id FROM _mig_story),'8badd516-c091-4e37-849e-efe94e2f0af0','normal'),
((SELECT id FROM _mig_story),'dc13695d-22ef-4c18-bce1-714f4f286122','major'),
((SELECT id FROM _mig_story),'24eb4d95-8788-4bc1-b300-a21eeec57f01','major'),
((SELECT id FROM _mig_story),'Q1069958','normal'),
((SELECT id FROM _mig_story),'EVT_HEGIRA','normal'),
((SELECT id FROM _mig_story),'fdbc9fb3-9a9c-4f17-9d9d-55a5a92fbe2e','major'),
((SELECT id FROM _mig_story),'EVT_AMERICA','normal'),
((SELECT id FROM _mig_story),'90ab7bd2-5831-4b28-b1cb-2fead0532eaf','normal'),
((SELECT id FROM _mig_story),'a64c1045-84ca-477e-a6b4-ef39f969887a','normal'),
((SELECT id FROM _mig_story),'8a84b4d3-790f-48a4-8bb2-d1c4c76805c9','normal'),
((SELECT id FROM _mig_story),'c77d4e65-161d-4c89-ad15-88bc057ba01a','normal'),
((SELECT id FROM _mig_story),'34a139ed-35fc-4d63-a465-7d660ba537fe','normal'),
((SELECT id FROM _mig_story),'96850f41-a52e-4cb1-bdcc-5906e141a349','normal'),
((SELECT id FROM _mig_story),'593e301c-e09c-4a04-9e56-8261fc285795','normal'),
((SELECT id FROM _mig_story),'a4b0033b-ac97-4674-81c4-a235c7a2e806','normal'),
((SELECT id FROM _mig_story),'250cb410-b648-43fc-8069-ad6234780811','major'),
((SELECT id FROM _mig_story),'d0f084bb-a623-4ad5-923a-34d858882331','normal'),
((SELECT id FROM _mig_story),'0402bac6-c9ca-4df2-a91b-d8990af5c1a6','normal');
INSERT INTO public.story_entry_points(source_story_id,target_story_id,period_id,event_id) VALUES
(5,(SELECT id FROM _mig_story),'Q15978631',NULL),
((SELECT id FROM _mig_story),41,'9515f188-b7b8-4992-985d-b733ce70da1b',NULL);

DO $check$ DECLARE sid integer := (SELECT id FROM _mig_story); BEGIN
  IF (SELECT count(*) FROM public.story_periods WHERE story_id=sid)<>22 THEN RAISE EXCEPTION 'Périodes finales inattendues.'; END IF;
  IF (SELECT count(*) FROM public.story_events WHERE story_id=sid)<>19 THEN RAISE EXCEPTION 'Événements finaux inattendus.'; END IF;
  IF EXISTS(SELECT 1 FROM public.story_periods c LEFT JOIN public.story_periods p ON p.story_id=sid AND p.period_id=c.parent_period_id
    WHERE c.story_id=sid AND c.parent_period_id IS NOT NULL AND p.period_id IS NULL) THEN RAISE EXCEPTION 'Parent local absent.'; END IF;
  IF EXISTS(SELECT 1 FROM public.periods WHERE id IN ('c1050f5c-bf19-4ec7-a078-7e7dfe8574b6','899ca6d8-6ea4-487a-b018-2d040397f368','03bf6221-40fb-4be6-a6d3-cf4ff511e667','065caa04-e3e2-4794-b716-1361a118cca6','e9aeb787-18fe-4e4d-8ac8-b3f9bdbe3238','5669959e-8483-46a6-a84b-1b17a49bd267','533e155f-2597-4dcc-868b-9c653cf48914','927731e9-d958-4b62-bb31-0730c06529fa','b320259b-6aa2-47db-885d-15ce6c0315aa','2ac20fe3-d44e-45e6-bb6f-bf0f8e36512e','98da0a59-c0da-483f-acdb-4c2f76af6922','86005fa3-c5f9-4da7-b942-b17556fe80fd','455b6931-5b91-4a06-b766-67533c991190','2c5758d0-2791-4858-a285-47836e8cde3e','636d8c79-2263-46b8-a814-34324366f59f','7d9c0d12-4778-4ec1-b88e-2f2122c6f018') AND NOT (start_years_bp>end_years_bp)) THEN RAISE EXCEPTION 'Intervalle inversé.'; END IF;
  IF (SELECT count(*) FROM public.story_entry_points WHERE (SELECT id FROM _mig_story) IN (source_story_id,target_story_id))<>2 THEN RAISE EXCEPTION 'Accès incomplets.'; END IF;
  RAISE NOTICE 'Frise créée : %', sid;
END $check$;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
