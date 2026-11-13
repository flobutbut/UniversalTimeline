-- Guerre de Sécession, 13 novembre 2026. Création d’une frise.
-- Sources et décisions : 20261113_guerre_secession.json, 20261113_guerre_secession_source/content.mjs.
-- Une seule transaction ; toute divergence annule le lot. Aucun changement de schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.stories,public.periods,public.events,public.story_periods,public.story_events,public.story_entry_points,public.story_anchors,public.story_tags,public.period_tags,public.event_tags IN SHARE ROW EXCLUSIVE MODE;

DO $lot$ DECLARE owner uuid; writer text; sid integer; BEGIN
IF NOT ((SELECT count(DISTINCT owner_user_id) FROM public.stories WHERE id IN (41,50,78))=1 AND (SELECT count(DISTINCT author) FROM public.stories WHERE id IN (41,50,78))=1) THEN RAISE EXCEPTION 'Les frises sources n’ont pas un propriétaire et un auteur uniques.'; END IF;
SELECT owner_user_id,author INTO owner,writer FROM public.stories WHERE id=50;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=41 AND md5(title_fr)='9d937ba942032769d213972ea0669ea5')) THEN RAISE EXCEPTION 'Frise source 41 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=50 AND md5(title_fr)='3d9eaa9d9f3c3f4c6152ff08cbd4025b')) THEN RAISE EXCEPTION 'Frise source 50 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.stories WHERE id=78 AND md5(title_fr)='2f7cfa603df2a25fce27ad69cd4be673')) THEN RAISE EXCEPTION 'Frise source 78 absente ou renommée.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='70809365-87a9-469f-9edb-c2b58303f153' AND date='1860-11-06' AND wikidata_id IS NOT DISTINCT FROM 'Q698842')) THEN RAISE EXCEPTION 'Événement réutilisé 70809365-87a9-469f-9edb-c2b58303f153 absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='b58c84a3-fd64-4b69-ab5c-786f664cccce' AND date='1858-08-21' AND wikidata_id IS NOT DISTINCT FROM 'Q622354')) THEN RAISE EXCEPTION 'Événement réutilisé b58c84a3-fd64-4b69-ab5c-786f664cccce absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='7a661c41-f7c9-4fe8-b5a4-03a39168f643' AND date='1863-01-01' AND wikidata_id IS NOT DISTINCT FROM 'Q391358')) THEN RAISE EXCEPTION 'Événement réutilisé 7a661c41-f7c9-4fe8-b5a4-03a39168f643 absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='0f5bdc93-5e59-4e98-a438-3cdf6c3d4173' AND date='1863-07-01' AND wikidata_id IS NOT DISTINCT FROM 'Q33132')) THEN RAISE EXCEPTION 'Événement réutilisé 0f5bdc93-5e59-4e98-a438-3cdf6c3d4173 absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='86344162-d418-478c-87d1-d6c6a1ac1a26' AND date='1863-11-19' AND wikidata_id IS NOT DISTINCT FROM 'Q214524')) THEN RAISE EXCEPTION 'Événement réutilisé 86344162-d418-478c-87d1-d6c6a1ac1a26 absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='0db81758-6fd2-416c-9587-26d502f81ac1' AND date='1864-11-08' AND wikidata_id IS NOT DISTINCT FROM NULL)) THEN RAISE EXCEPTION 'Événement réutilisé 0db81758-6fd2-416c-9587-26d502f81ac1 absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='7467dae4-5e53-49c0-af9f-b76e9417e0d3' AND date='1865-04-14' AND wikidata_id IS NOT DISTINCT FROM 'Q1025404')) THEN RAISE EXCEPTION 'Événement réutilisé 7467dae4-5e53-49c0-af9f-b76e9417e0d3 absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.events WHERE id='442c25a9-d5a5-459e-94ad-efe93e50f5e8' AND date='1865-12-06' AND wikidata_id IS NOT DISTINCT FROM 'Q175613')) THEN RAISE EXCEPTION 'Événement réutilisé 442c25a9-d5a5-459e-94ad-efe93e50f5e8 absent ou modifié.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.periods WHERE id='1f82c15a-d8dc-4b37-96de-891784474d69' AND start_date='1861-04-12' AND end_date='1865-04-09' AND wikidata_id IS NOT DISTINCT FROM 'Q8676')) THEN RAISE EXCEPTION 'Période réutilisée 1f82c15a-d8dc-4b37-96de-891784474d69 absente ou modifiée.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.stories WHERE lower(title_fr)=lower('Guerre de Sécession'))) THEN RAISE EXCEPTION 'Une frise « Guerre de Sécession » existe déjà.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=50 AND period_id='1f82c15a-d8dc-4b37-96de-891784474d69')) THEN RAISE EXCEPTION 'Ancre 1f82c15a-d8dc-4b37-96de-891784474d69 absente de la frise 50.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_periods WHERE story_id=78 AND period_id='1f82c15a-d8dc-4b37-96de-891784474d69')) THEN RAISE EXCEPTION 'Ancre 1f82c15a-d8dc-4b37-96de-891784474d69 absente de la frise 78.'; END IF;
IF NOT (EXISTS(SELECT 1 FROM public.story_events WHERE story_id=41 AND event_id='442c25a9-d5a5-459e-94ad-efe93e50f5e8')) THEN RAISE EXCEPTION 'Ancre 442c25a9-d5a5-459e-94ad-efe93e50f5e8 absente de la frise 41.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='bca1b165-97dc-47ae-8ed3-bbdd6de23c2d' OR wikidata_id='Q2991747' OR lower(label_fr)=lower('Crise de l’Union'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Crise de l’Union) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='6e520a59-415f-44a2-b16f-8f17bf182d8d' OR wikidata_id='Q331377' OR lower(label_fr)=lower('Kansas sanglant'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Kansas sanglant) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='1f243925-d9e1-45c6-a339-ed17788503bc' OR wikidata_id='Q1066253' OR lower(label_fr)=lower('Siège de Vicksburg'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Siège de Vicksburg) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='f462aee0-b25a-4834-93a5-a7b126b41b37' OR wikidata_id='Q739644' OR lower(label_fr)=lower('Campagne de l’Overland'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Campagne de l’Overland) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='dabec932-310a-48f0-993a-48cb4a699290' OR wikidata_id='Q756118' OR lower(label_fr)=lower('Campagne d’Atlanta'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Campagne d’Atlanta) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='7930a98f-855b-43f1-a36b-207fc2151cb7' OR wikidata_id='Q815195' OR lower(label_fr)=lower('Siège de Petersburg'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Siège de Petersburg) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.periods WHERE id='8cbd5fb1-770b-4050-9239-9adc5793668b' OR wikidata_id='Q1052780' OR lower(label_fr)=lower('Marche de Sherman vers la mer'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Marche de Sherman vers la mer) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='b3c18bcf-1a71-4998-be68-8ace532fd1a5' OR wikidata_id='Q39392' OR lower(label_fr)=lower('Compromis de 1850'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Compromis de 1850) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='c9ece010-aa3c-496d-bd74-36c47f0a8db9' OR wikidata_id='Q535519' OR lower(label_fr)=lower('Loi sur les esclaves fugitifs'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Loi sur les esclaves fugitifs) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='413b49a3-843d-4242-9f94-91903d776c83' OR wikidata_id='Q2222' OR lower(label_fr)=lower('La Case de l’oncle Tom'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (La Case de l’oncle Tom) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='48e7c921-01e0-4614-abf7-9083770c2122' OR wikidata_id='Q619762' OR lower(label_fr)=lower('Loi Kansas-Nebraska'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Loi Kansas-Nebraska) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='c5a88fe4-e636-4e56-a8a5-4a6274b8717c' OR lower(label_fr)=lower('Fondation du Parti républicain'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Fondation du Parti républicain) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='dc39b629-8437-4a0c-bbf6-520bab52e224' OR wikidata_id='Q690462' OR lower(label_fr)=lower('Arrêt Dred Scott'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Arrêt Dred Scott) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='efb6c831-6661-4773-9855-8898cecf8296' OR wikidata_id='Q6223430' OR lower(label_fr)=lower('Raid de John Brown sur Harpers Ferry'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Raid de John Brown sur Harpers Ferry) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='6625b495-b3dd-43da-b2ba-da9fb3f4d23b' OR lower(label_fr)=lower('Sécession de la Caroline du Sud'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Sécession de la Caroline du Sud) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='ea326271-1565-4a50-a356-8fac84071096' OR wikidata_id='Q81931' OR lower(label_fr)=lower('Création des États confédérés'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Création des États confédérés) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='cebf4ae7-6b5b-49ef-ac33-589d16cfb00e' OR wikidata_id='Q543165' OR lower(label_fr)=lower('Bataille de Fort Sumter'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Bataille de Fort Sumter) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='d970fa29-fe77-4cee-ac33-7883b4a9264f' OR wikidata_id='Q2493703' OR lower(label_fr)=lower('Proclamation du blocus de l’Union'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Proclamation du blocus de l’Union) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='c8baa690-4af2-486d-9209-8a6bed407fe5' OR wikidata_id='Q221469' OR lower(label_fr)=lower('Première bataille de Bull Run'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Première bataille de Bull Run) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='1db9e518-b75f-40e4-9c77-4f1989d672d2' OR wikidata_id='Q3028072' OR lower(label_fr)=lower('Corps aérostatique de l’Union'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Corps aérostatique de l’Union) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='092e4d1a-8013-48d1-9068-7bd2aaa56206' OR wikidata_id='Q868481' OR lower(label_fr)=lower('Combat de Hampton Roads'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Combat de Hampton Roads) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='1ca03781-8c2d-4f6a-8fb9-1ae54db97e41' OR wikidata_id='Q943277' OR lower(label_fr)=lower('Bataille de Shiloh'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Bataille de Shiloh) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='03efea30-7762-4564-b986-822fd4d0b556' OR wikidata_id='Q2700708' OR lower(label_fr)=lower('Prise de La Nouvelle-Orléans'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Prise de La Nouvelle-Orléans) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='164d4aa6-6cda-4081-98f3-1e8487710ed7' OR wikidata_id='Q719252' OR lower(label_fr)=lower('Bataille d’Antietam'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Bataille d’Antietam) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='f415bdd8-8020-49af-a813-ed95a6104375' OR lower(label_fr)=lower('Exposition « The Dead of Antietam »'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Exposition « The Dead of Antietam ») : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='c458a733-5849-4fbd-8abd-718ae95e494e' OR wikidata_id='Q272975' OR lower(label_fr)=lower('Brevet de la mitrailleuse Gatling'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Brevet de la mitrailleuse Gatling) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='6d8e042a-518b-4b00-a625-6435204b680c' OR wikidata_id='Q745979' OR lower(label_fr)=lower('Bataille de Chancellorsville'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Bataille de Chancellorsville) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='2cd0aaca-ebba-47fc-aadf-f5fcbf93d23d' OR wikidata_id='Q220497' OR lower(label_fr)=lower('Émeutes de la conscription à New York'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Émeutes de la conscription à New York) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='8c177b6d-db5c-4eaf-851b-73c1dd7f930d' OR wikidata_id='Q2676019' OR lower(label_fr)=lower('Seconde bataille de Fort Wagner'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Seconde bataille de Fort Wagner) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='b5b90b83-eecb-4073-b2bf-4f2062e833b0' OR wikidata_id='Q7524597' OR lower(label_fr)=lower('Le Hunley coule l’USS Housatonic'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Le Hunley coule l’USS Housatonic) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='1049c24d-bf78-453e-b7a1-6a295a312cda' OR wikidata_id='Q19918522' OR lower(label_fr)=lower('Reddition de Lee à Appomattox'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Reddition de Lee à Appomattox) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='4ee053c5-9e7c-4760-a563-a72dd4a4d259' OR wikidata_id='Q141906650' OR lower(label_fr)=lower('Capture de Jefferson Davis'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Capture de Jefferson Davis) : réutiliser l’existant.'; END IF;
IF NOT (NOT EXISTS(SELECT 1 FROM public.events WHERE id='a635eed2-b1ee-41ec-9c12-cd2c74573334' OR wikidata_id='Q6312521' OR lower(label_fr)=lower('Juneteenth'))) THEN RAISE EXCEPTION 'Nouvelle fiche déjà présente (Juneteenth) : réutiliser l’existant.'; END IF;
INSERT INTO public.periods (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,start_date,end_date,start_years_bp,end_years_bp,non_thematic) VALUES
('bca1b165-97dc-47ae-8ed3-bbdd6de23c2d','Crise de l’Union','Crisis of the Union','Le Nord et le Sud s’affrontent sur l’extension de l’esclavage aux nouveaux territoires, jusqu’à la rupture.','North and South clash over the spread of slavery into the new territories, until the break-up.','Q2991747','Genèse de la guerre de Sécession','Origins of the American Civil War','1850','1861-04-12',176.86379192334,165.586584531143,false),
('6e520a59-415f-44a2-b16f-8f17bf182d8d','Kansas sanglant','Bleeding Kansas','Colons esclavagistes et abolitionnistes se disputent le territoire du Kansas, armes à la main.','Pro-slavery and free-state settlers fight over Kansas Territory, weapons in hand.','Q331377','Bleeding Kansas','Bleeding Kansas','1854','1861',172.86379192334,165.863107460643,false),
('1f243925-d9e1-45c6-a339-ed17788503bc','Siège de Vicksburg','Siege of Vicksburg','Grant assiège la dernière place confédérée sur le Mississippi ; sa chute coupe le Sud en deux.','Grant besieges the last Confederate stronghold on the Mississippi; its fall splits the South in two.','Q1066253','Siège de Vicksburg','Siege of Vicksburg','1863-05-18','1863-07-04',163.4893908282,163.360711841205,false),
('f462aee0-b25a-4834-93a5-a7b126b41b37','Campagne de l’Overland','Overland Campaign','Grant engage l’armée de Lee en Virginie dans une suite de batailles d’usure, de la Wilderness à Cold Harbor.','Grant engages Lee’s army in Virginia in a series of battles of attrition, from the Wilderness to Cold Harbor.','Q739644','Overland Campaign','Overland Campaign','1864-05-04','1864-06-24',162.525667351129,162.386036960986,false),
('dabec932-310a-48f0-993a-48cb4a699290','Campagne d’Atlanta','Atlanta campaign','Sherman avance du Tennessee vers la Géorgie et prend Atlanta, centre ferroviaire du Sud.','Sherman advances from Tennessee into Georgia and takes Atlanta, the South’s railway hub.','Q756118','Campagne d''Atlanta','Atlanta campaign','1864-05-07','1864-09-02',162.517453798768,162.194387405886,false),
('7930a98f-855b-43f1-a36b-207fc2151cb7','Siège de Petersburg','Siege of Petersburg','Neuf mois de guerre de tranchées autour de Petersburg, qui protège Richmond, la capitale confédérée.','Nine months of trench warfare around Petersburg, which shields Richmond, the Confederate capital.','Q815195','Siège de Petersburg','Siege of Petersburg','1864-06-09','1865-03-25',162.427104722793,161.635865845311,false),
('8cbd5fb1-770b-4050-9239-9adc5793668b','Marche de Sherman vers la mer','Sherman’s March to the Sea','D’Atlanta à Savannah, l’armée de Sherman détruit voies ferrées, récoltes et ressources de la Géorgie.','From Atlanta to Savannah, Sherman’s army destroys Georgia’s railways, crops and resources.','Q1052780','Marche de Sherman vers la mer','Sherman''s March to the Sea','1864-11-15','1864-12-21',161.991786447639,161.893223819302,false);
INSERT INTO public.events (id,label_fr,label_en,description_fr,description_en,wikidata_id,wikipedia_title_fr,wikipedia_title_en,date,date_years_bp) VALUES
('b3c18bcf-1a71-4998-be68-8ace532fd1a5','Compromis de 1850','Compromise of 1850','Une série de lois admet la Californie comme État libre et laisse les nouveaux territoires décider de l’esclavage.','A package of laws admits California as a free state and lets the new territories decide on slavery.','Q39392','Compromis de 1850','Compromise of 1850','1850-09',176.198494182067),
('c9ece010-aa3c-496d-bd74-36c47f0a8db9','Loi sur les esclaves fugitifs','Fugitive Slave Act','Les États libres doivent désormais aider à capturer et renvoyer les esclaves en fuite.','Free states must now help capture and return escaped slaves.','Q535519','Fugitive Slave Act','Fugitive Slave Act of 1850','1850-09-18',176.151950718686),
('413b49a3-843d-4242-9f94-91903d776c83','La Case de l’oncle Tom','Uncle Tom’s Cabin','Le roman antiesclavagiste de Harriet Beecher Stowe devient le livre le plus vendu du siècle aux États-Unis.','Harriet Beecher Stowe’s anti-slavery novel becomes the best-selling book of the century in the United States.','Q2222','La Case de l''oncle Tom','Uncle Tom''s Cabin','1852-03-20',174.64887063655),
('48e7c921-01e0-4614-abf7-9083770c2122','Loi Kansas-Nebraska','Kansas–Nebraska Act','La loi laisse les colons du Kansas et du Nebraska choisir l’esclavage, rouvrant la question dans le Nord-Ouest.','The act lets settlers in Kansas and Nebraska choose slavery, reopening the question in the Northwest.','Q619762','Loi Kansas-Nebraska','Kansas–Nebraska Act','1854-05-30',172.455852156057),
('c5a88fe4-e636-4e56-a8a5-4a6274b8717c','Fondation du Parti républicain','Founding of the Republican Party','Des opposants à l’extension de l’esclavage fondent un nouveau parti, implanté seulement dans le Nord.','Opponents of the spread of slavery found a new party, rooted only in the North.',NULL,NULL,NULL,'1854',172.86379192334),
('dc39b629-8437-4a0c-bbf6-520bab52e224','Arrêt Dred Scott','Dred Scott decision','La Cour suprême juge que les Noirs ne peuvent être citoyens et que le Congrès ne peut interdire l’esclavage dans les territoires.','The Supreme Court rules that Black people cannot be citizens and that Congress cannot ban slavery in the territories.','Q690462','Scott v. Sandford','Dred Scott v. Sandford','1857-03-06',169.687885010267),
('efb6c831-6661-4773-9855-8898cecf8296','Raid de John Brown sur Harpers Ferry','John Brown’s raid on Harpers Ferry','L’abolitionniste John Brown attaque un arsenal fédéral pour armer une révolte d’esclaves ; il est capturé et pendu.','Abolitionist John Brown attacks a federal arsenal to arm a slave revolt; he is captured and hanged.','Q6223430','Raid de John Brown contre Harpers Ferry','John Brown''s raid on Harpers Ferry','1859-10-16',167.075975359343),
('6625b495-b3dd-43da-b2ba-da9fb3f4d23b','Sécession de la Caroline du Sud','Secession of South Carolina','Premier État à quitter l’Union après l’élection de Lincoln ; dix autres le suivent.','The first state to leave the Union after Lincoln’s election; ten others follow.',NULL,'Ordonnance de sécession','Ordinance of Secession','1860-12-20',165.895961670089),
('ea326271-1565-4a50-a356-8fac84071096','Création des États confédérés','Formation of the Confederate States','Les États sécessionnistes adoptent une constitution provisoire à Montgomery ; Jefferson Davis est élu président.','The seceding states adopt a provisional constitution in Montgomery; Jefferson Davis is elected president.','Q81931','États confédérés d''Amérique','Confederate States of America','1861-02-08',165.759069130732),
('cebf4ae7-6b5b-49ef-ac33-589d16cfb00e','Bataille de Fort Sumter','Battle of Fort Sumter','Les confédérés bombardent le fort fédéral de Charleston : premiers coups de feu de la guerre.','Confederate forces shell the federal fort at Charleston: the first shots of the war.','Q543165','Bataille de Fort Sumter','Battle of Fort Sumter','1861-04-12',165.586584531143),
('d970fa29-fe77-4cee-ac33-7883b4a9264f','Proclamation du blocus de l’Union','Proclamation of the Union blockade','Lincoln ordonne le blocus des ports du Sud pour étouffer son commerce de coton et ses importations d’armes.','Lincoln orders a blockade of Southern ports to choke its cotton trade and arms imports.','Q2493703','Blocus de l''Union','Union blockade','1861-04-19',165.567419575633),
('c8baa690-4af2-486d-9209-8a6bed407fe5','Première bataille de Bull Run','First Battle of Bull Run','La déroute de l’armée de l’Union près de Washington dissipe l’espoir d’une guerre courte.','The rout of the Union army near Washington ends hopes of a short war.','Q221469','Première bataille de Bull Run','First Battle of Bull Run','1861-07-21',165.31279945243),
('1db9e518-b75f-40e4-9c77-4f1989d672d2','Corps aérostatique de l’Union','Union Army Balloon Corps','Thaddeus Lowe observe les lignes ennemies depuis des ballons captifs et transmet ses rapports par télégraphe.','Thaddeus Lowe watches enemy lines from tethered balloons and sends his reports by telegraph.','Q3028072','Union Army Balloon Corps','Union Army Balloon Corps','1861',165.863107460643),
('092e4d1a-8013-48d1-9068-7bd2aaa56206','Combat de Hampton Roads','Battle of Hampton Roads','Premier combat entre deux navires cuirassés, le Monitor et le Virginia : les flottes de bois deviennent obsolètes.','The first fight between two ironclad warships, the Monitor and the Virginia: wooden fleets become obsolete.','Q868481','Combat naval de Hampton Roads','Battle of Hampton Roads','1862-03-08',164.683093771389),
('1ca03781-8c2d-4f6a-8fb9-1ae54db97e41','Bataille de Shiloh','Battle of Shiloh','Plus de 23 000 tués, blessés ou disparus en deux jours dans le Tennessee : le pays découvre le prix de la guerre.','More than 23,000 killed, wounded or missing in two days in Tennessee: the country discovers the cost of the war.','Q943277','Bataille de Shiloh','Battle of Shiloh','1862-04-06',164.603696098563),
('03efea30-7762-4564-b986-822fd4d0b556','Prise de La Nouvelle-Orléans','Capture of New Orleans','La flotte de Farragut force les forts du Mississippi et s’empare du plus grand port du Sud.','Farragut’s fleet runs past the Mississippi forts and seizes the South’s largest port.','Q2700708','Bataille de La Nouvelle-Orléans (1862)','Capture of New Orleans','1862-04-25',164.551676933607),
('164d4aa6-6cda-4081-98f3-1e8487710ed7','Bataille d’Antietam','Battle of Antietam','La journée la plus meurtrière de l’histoire américaine arrête l’invasion du Nord par Lee.','The bloodiest single day in American history halts Lee’s invasion of the North.','Q719252','Bataille d''Antietam','Battle of Antietam','1862-09-17',164.154688569473),
('f415bdd8-8020-49af-a813-ed95a6104375','Exposition « The Dead of Antietam »','“The Dead of Antietam” exhibition','La galerie de Mathew Brady à New York montre les photographies de cadavres prises sur le champ de bataille.','Mathew Brady’s New York gallery shows photographs of the dead taken on the battlefield.',NULL,NULL,NULL,'1862-10',164.116358658453),
('c458a733-5849-4fbd-8abd-718ae95e494e','Brevet de la mitrailleuse Gatling','Patent for the Gatling gun','Richard Gatling fait breveter une arme à canons rotatifs actionnée par manivelle, ancêtre des mitrailleuses.','Richard Gatling patents a hand-cranked weapon with rotating barrels, forerunner of the machine gun.','Q272975','Mitrailleuse Gatling','Gatling gun','1862-11-04',164.023271731691),
('6d8e042a-518b-4b00-a625-6435204b680c','Bataille de Chancellorsville','Battle of Chancellorsville','Victoire de Lee face à une armée deux fois plus nombreuse ; Stonewall Jackson y est mortellement blessé.','Lee defeats an army twice his size; Stonewall Jackson is mortally wounded.','Q745979','Bataille de Chancellorsville','Battle of Chancellorsville','1863-04-30',163.538672142368),
('2cd0aaca-ebba-47fc-aadf-f5fcbf93d23d','Émeutes de la conscription à New York','New York City draft riots','Des émeutiers opposés à la conscription s’en prennent aux habitants noirs ; plus d’une centaine de morts.','Rioters opposed to the draft attack Black residents; more than a hundred are killed.','Q220497','Draft Riots','New York City draft riots','1863-07-13',163.33607118412),
('8c177b6d-db5c-4eaf-851b-73c1dd7f930d','Seconde bataille de Fort Wagner','Second Battle of Fort Wagner','L’assaut du 54e Massachusetts, régiment de soldats noirs, prouve leur engagement au Nord.','The assault by the 54th Massachusetts, a regiment of Black soldiers, proves their commitment to the North.','Q2676019','Seconde bataille de Fort Wagner','Second Battle of Fort Wagner','1863-07-18',163.322381930185),
('b5b90b83-eecb-4073-b2bf-4f2062e833b0','Le Hunley coule l’USS Housatonic','The Hunley sinks USS Housatonic','Le sous-marin confédéré H. L. Hunley coule un navire de guerre de l’Union : première victoire d’un sous-marin, qui sombre aussi.','The Confederate submarine H. L. Hunley sinks a Union warship: the first submarine victory, and the Hunley sinks too.','Q7524597',NULL,'Sinking of USS Housatonic','1864-02-17',162.736481861739),
('1049c24d-bf78-453e-b7a1-6a295a312cda','Reddition de Lee à Appomattox','Lee’s surrender at Appomattox','Encerclé, Lee rend l’armée de Virginie du Nord à Grant : la fin de la guerre est acquise.','Surrounded, Lee surrenders the Army of Northern Virginia to Grant: the end of the war is sealed.','Q19918522',NULL,'Surrender at Appomattox','1865-04-09',161.594798083504),
('4ee053c5-9e7c-4760-a563-a72dd4a4d259','Capture de Jefferson Davis','Capture of Jefferson Davis','Le président confédéré en fuite est arrêté en Géorgie ; il passe deux ans en prison sans être jugé.','The fleeing Confederate president is arrested in Georgia; he spends two years in prison without trial.','Q141906650',NULL,NULL,'1865-05-10',161.509924709103),
('a635eed2-b1ee-41ec-9c12-cd2c74573334','Juneteenth','Juneteenth','À Galveston, l’armée de l’Union annonce aux esclaves du Texas qu’ils sont libres.','In Galveston, the Union army tells the enslaved people of Texas that they are free.','Q6312521','Juneteenth','Juneteenth','1865-06-19',161.400410677618);
INSERT INTO public.period_tags (period_id,tag_id,position) VALUES
('bca1b165-97dc-47ae-8ed3-bbdd6de23c2d','pouvoir-institutions',1),
('bca1b165-97dc-47ae-8ed3-bbdd6de23c2d','peuplement-societe',2),
('6e520a59-415f-44a2-b16f-8f17bf182d8d','conflits',1),
('6e520a59-415f-44a2-b16f-8f17bf182d8d','pouvoir-institutions',2),
('1f243925-d9e1-45c6-a339-ed17788503bc','conflits',1),
('f462aee0-b25a-4834-93a5-a7b126b41b37','conflits',1),
('dabec932-310a-48f0-993a-48cb4a699290','conflits',1),
('7930a98f-855b-43f1-a36b-207fc2151cb7','conflits',1),
('8cbd5fb1-770b-4050-9239-9adc5793668b','conflits',1);
INSERT INTO public.event_tags (event_id,tag_id,position) VALUES
('b3c18bcf-1a71-4998-be68-8ace532fd1a5','pouvoir-institutions',1),
('b3c18bcf-1a71-4998-be68-8ace532fd1a5','peuplement-societe',2),
('c9ece010-aa3c-496d-bd74-36c47f0a8db9','pouvoir-institutions',1),
('c9ece010-aa3c-496d-bd74-36c47f0a8db9','peuplement-societe',2),
('413b49a3-843d-4242-9f94-91903d776c83','arts-culture-loisirs',1),
('413b49a3-843d-4242-9f94-91903d776c83','philosophie-ideologies',2),
('48e7c921-01e0-4614-abf7-9083770c2122','pouvoir-institutions',1),
('48e7c921-01e0-4614-abf7-9083770c2122','peuplement-societe',2),
('c5a88fe4-e636-4e56-a8a5-4a6274b8717c','pouvoir-institutions',1),
('c5a88fe4-e636-4e56-a8a5-4a6274b8717c','philosophie-ideologies',2),
('dc39b629-8437-4a0c-bbf6-520bab52e224','pouvoir-institutions',1),
('dc39b629-8437-4a0c-bbf6-520bab52e224','peuplement-societe',2),
('efb6c831-6661-4773-9855-8898cecf8296','conflits',1),
('efb6c831-6661-4773-9855-8898cecf8296','philosophie-ideologies',2),
('6625b495-b3dd-43da-b2ba-da9fb3f4d23b','pouvoir-institutions',1),
('ea326271-1565-4a50-a356-8fac84071096','pouvoir-institutions',1),
('cebf4ae7-6b5b-49ef-ac33-589d16cfb00e','conflits',1),
('d970fa29-fe77-4cee-ac33-7883b4a9264f','conflits',1),
('d970fa29-fe77-4cee-ac33-7883b4a9264f','economie-echanges',2),
('c8baa690-4af2-486d-9209-8a6bed407fe5','conflits',1),
('1db9e518-b75f-40e4-9c77-4f1989d672d2','techniques-inventions',1),
('1db9e518-b75f-40e4-9c77-4f1989d672d2','conflits',2),
('092e4d1a-8013-48d1-9068-7bd2aaa56206','techniques-inventions',1),
('092e4d1a-8013-48d1-9068-7bd2aaa56206','conflits',2),
('1ca03781-8c2d-4f6a-8fb9-1ae54db97e41','conflits',1),
('03efea30-7762-4564-b986-822fd4d0b556','conflits',1),
('164d4aa6-6cda-4081-98f3-1e8487710ed7','conflits',1),
('f415bdd8-8020-49af-a813-ed95a6104375','techniques-inventions',1),
('f415bdd8-8020-49af-a813-ed95a6104375','arts-culture-loisirs',2),
('c458a733-5849-4fbd-8abd-718ae95e494e','techniques-inventions',1),
('c458a733-5849-4fbd-8abd-718ae95e494e','conflits',2),
('6d8e042a-518b-4b00-a625-6435204b680c','conflits',1),
('2cd0aaca-ebba-47fc-aadf-f5fcbf93d23d','peuplement-societe',1),
('2cd0aaca-ebba-47fc-aadf-f5fcbf93d23d','conflits',2),
('8c177b6d-db5c-4eaf-851b-73c1dd7f930d','conflits',1),
('8c177b6d-db5c-4eaf-851b-73c1dd7f930d','peuplement-societe',2),
('b5b90b83-eecb-4073-b2bf-4f2062e833b0','techniques-inventions',1),
('b5b90b83-eecb-4073-b2bf-4f2062e833b0','conflits',2),
('1049c24d-bf78-453e-b7a1-6a295a312cda','conflits',1),
('4ee053c5-9e7c-4760-a563-a72dd4a4d259','conflits',1),
('4ee053c5-9e7c-4760-a563-a72dd4a4d259','pouvoir-institutions',2),
('a635eed2-b1ee-41ec-9c12-cd2c74573334','peuplement-societe',1);
INSERT INTO public.stories (title_fr,title_en,description_fr,description_en,author,is_public,parent_story_id,owner_user_id) VALUES ('Guerre de Sécession','American Civil War','De la crise des années 1850 sur l’extension de l’esclavage à la reddition du Sud et au XIIIe amendement : batailles, campagnes, émancipation et premières armes modernes.','From the 1850s crisis over the spread of slavery to the surrender of the South and the Thirteenth Amendment: battles, campaigns, emancipation and the first modern weapons.',writer,true,50,owner) RETURNING id INTO sid;
INSERT INTO public.story_tags (story_id,tag_id,position) VALUES (sid,'conflits',1),(sid,'pouvoir-institutions',2);
INSERT INTO public.story_anchors (story_id,anchor_type,anchor_id) VALUES (sid,'period','1f82c15a-d8dc-4b37-96de-891784474d69');
INSERT INTO public.story_periods (story_id,period_id,parent_period_id) VALUES (sid,'bca1b165-97dc-47ae-8ed3-bbdd6de23c2d',NULL),(sid,'1f82c15a-d8dc-4b37-96de-891784474d69',NULL),(sid,'6e520a59-415f-44a2-b16f-8f17bf182d8d','bca1b165-97dc-47ae-8ed3-bbdd6de23c2d'),(sid,'1f243925-d9e1-45c6-a339-ed17788503bc','1f82c15a-d8dc-4b37-96de-891784474d69'),(sid,'f462aee0-b25a-4834-93a5-a7b126b41b37','1f82c15a-d8dc-4b37-96de-891784474d69'),(sid,'dabec932-310a-48f0-993a-48cb4a699290','1f82c15a-d8dc-4b37-96de-891784474d69'),(sid,'7930a98f-855b-43f1-a36b-207fc2151cb7','1f82c15a-d8dc-4b37-96de-891784474d69'),(sid,'8cbd5fb1-770b-4050-9239-9adc5793668b','1f82c15a-d8dc-4b37-96de-891784474d69');
INSERT INTO public.story_events (story_id,event_id,importance) VALUES
(sid,'b3c18bcf-1a71-4998-be68-8ace532fd1a5','normal'),
(sid,'c9ece010-aa3c-496d-bd74-36c47f0a8db9','normal'),
(sid,'413b49a3-843d-4242-9f94-91903d776c83','normal'),
(sid,'48e7c921-01e0-4614-abf7-9083770c2122','normal'),
(sid,'c5a88fe4-e636-4e56-a8a5-4a6274b8717c','normal'),
(sid,'dc39b629-8437-4a0c-bbf6-520bab52e224','major'),
(sid,'b58c84a3-fd64-4b69-ab5c-786f664cccce','normal'),
(sid,'efb6c831-6661-4773-9855-8898cecf8296','normal'),
(sid,'70809365-87a9-469f-9edb-c2b58303f153','major'),
(sid,'6625b495-b3dd-43da-b2ba-da9fb3f4d23b','normal'),
(sid,'ea326271-1565-4a50-a356-8fac84071096','normal'),
(sid,'cebf4ae7-6b5b-49ef-ac33-589d16cfb00e','major'),
(sid,'d970fa29-fe77-4cee-ac33-7883b4a9264f','normal'),
(sid,'c8baa690-4af2-486d-9209-8a6bed407fe5','normal'),
(sid,'1db9e518-b75f-40e4-9c77-4f1989d672d2','normal'),
(sid,'092e4d1a-8013-48d1-9068-7bd2aaa56206','major'),
(sid,'1ca03781-8c2d-4f6a-8fb9-1ae54db97e41','normal'),
(sid,'03efea30-7762-4564-b986-822fd4d0b556','normal'),
(sid,'164d4aa6-6cda-4081-98f3-1e8487710ed7','major'),
(sid,'f415bdd8-8020-49af-a813-ed95a6104375','normal'),
(sid,'c458a733-5849-4fbd-8abd-718ae95e494e','major'),
(sid,'7a661c41-f7c9-4fe8-b5a4-03a39168f643','major'),
(sid,'6d8e042a-518b-4b00-a625-6435204b680c','normal'),
(sid,'0f5bdc93-5e59-4e98-a438-3cdf6c3d4173','major'),
(sid,'2cd0aaca-ebba-47fc-aadf-f5fcbf93d23d','normal'),
(sid,'8c177b6d-db5c-4eaf-851b-73c1dd7f930d','normal'),
(sid,'86344162-d418-478c-87d1-d6c6a1ac1a26','normal'),
(sid,'b5b90b83-eecb-4073-b2bf-4f2062e833b0','major'),
(sid,'0db81758-6fd2-416c-9587-26d502f81ac1','normal'),
(sid,'1049c24d-bf78-453e-b7a1-6a295a312cda','major'),
(sid,'7467dae4-5e53-49c0-af9f-b76e9417e0d3','major'),
(sid,'4ee053c5-9e7c-4760-a563-a72dd4a4d259','normal'),
(sid,'a635eed2-b1ee-41ec-9c12-cd2c74573334','normal'),
(sid,'442c25a9-d5a5-459e-94ad-efe93e50f5e8','major');
INSERT INTO public.story_entry_points (source_story_id,target_story_id,period_id,event_id,display_as_period) VALUES
(50,sid,'1f82c15a-d8dc-4b37-96de-891784474d69',NULL,false),
(78,sid,'1f82c15a-d8dc-4b37-96de-891784474d69',NULL,false),
(41,sid,NULL,'442c25a9-d5a5-459e-94ad-efe93e50f5e8',false),
(sid,78,NULL,'70809365-87a9-469f-9edb-c2b58303f153',false),
(sid,41,NULL,'442c25a9-d5a5-459e-94ad-efe93e50f5e8',false);
IF NOT ((SELECT count(*) FROM public.story_periods WHERE story_id=sid)=8 AND (SELECT count(*) FROM public.story_events WHERE story_id=sid)=34 AND (SELECT count(*) FROM public.story_entry_points WHERE sid IN (source_story_id,target_story_id))=5) THEN RAISE EXCEPTION 'Contenu inattendu pour « Guerre de Sécession ».'; END IF;
IF NOT ((SELECT count(*) FROM public.periods WHERE id IN ('bca1b165-97dc-47ae-8ed3-bbdd6de23c2d','6e520a59-415f-44a2-b16f-8f17bf182d8d','1f243925-d9e1-45c6-a339-ed17788503bc','f462aee0-b25a-4834-93a5-a7b126b41b37','dabec932-310a-48f0-993a-48cb4a699290','7930a98f-855b-43f1-a36b-207fc2151cb7','8cbd5fb1-770b-4050-9239-9adc5793668b') AND start_years_bp>end_years_bp)=7) THEN RAISE EXCEPTION 'Bornes de périodes incohérentes.'; END IF;
END $lot$;
COMMIT;
