-- Liens des frises de personnalités (58 à 85), appliqué en production le 13 novembre 2026 : 73 liens. Ancres retrouvées par libellé dans la frise source ; à ne pas rejouer sur une base vide.
DO $do$
DECLARE r jsonb; n int; id2 varchar; added int := 0;
BEGIN
FOR r IN SELECT value FROM jsonb_array_elements($j$[
[58,45,"E","Crucifixion de Jésus"],
[59,55,"P","Enseignement dans la plaine du Gange"],
[60,53,"E","Principia de Newton"],[60,16,"E","Principia de Newton"],
[61,37,"E","Relativité restreinte"],[61,9,"E","Lettre d’Einstein à Roosevelt"],[61,50,"E","Einstein devient citoyen américain"],
[62,9,"P","Hitler chef de guerre"],[62,8,"P","Hitler à Munich et dans la Grande Guerre"],
[63,50,"P","Présidence de Harry S. Truman"],[63,12,"E","Truman expose sa doctrine au Congrès"],[63,9,"E","Bombardement atomique d'Hiroshima"],
[64,44,"P","Conquêtes d’Alexandre le Grand"],[64,26,"E","Bataille de Gaugamèles"],[64,55,"E","Bataille de l’Hydaspe"],[64,43,"E","Fondation d’Alexandrie"],
[65,45,"E","Passage du Rubicon"],[65,51,"P","Guerre des Gaules"],
[66,52,"E","Naissance de Confucius"],
[67,54,"P","Prédication de Mahomet"],
[68,51,"P","Règne de Charlemagne"],[68,15,"E","Couronnement de Charlemagne"],
[69,16,"E","Condamnation de Galilée"],
[70,51,"P","Règne de Louis XIV"],[70,40,"E","La cour s’installe à Versailles"],
[71,55,"P","Gandhi à la tête du mouvement national"],[71,56,"E","Partition des Indes"],[71,57,"E","Marche du sel"],
[72,53,"E","Winston Churchill devient Premier ministre"],[72,9,"P","Churchill dans la Seconde Guerre mondiale"],[72,12,"E","Discours de Fulton"],
[73,35,"P","Présidence de Charles de Gaulle"],[73,9,"P","De Gaulle chef de la France libre"],[73,56,"E","Accords d’Évian"],
[74,52,"E","Prise de Zhongdu par Gengis Khan"],[74,54,"P","Conquête du Khwarezm"],
[75,33,"P","Campagnes de Jeanne d’Arc"],[75,51,"E","Sacre de Charles VII à Reims"],
[76,16,"E","Les 95 thèses de Luther"],[76,17,"E","Les 95 thèses de Luther"],
[77,34,"P","Voyages de Christophe Colomb"],[77,46,"E","Arrivée de Christophe Colomb en Amérique"],
[78,50,"P","Présidence d’Abraham Lincoln"],[78,41,"E","XIIIe amendement aux États-Unis"],
[79,52,"P","Ère maoïste"],[79,12,"E","Nixon en Chine"],
[80,53,"E","De l’origine des espèces"],[80,2,"E","De l’origine des espèces"],
[81,51,"E","Découverte du radium"],[81,37,"E","Découverte du radium"],[81,8,"E","Marie Curie équipe des voitures radiologiques"],
[82,9,"P","Staline chef de guerre"],[82,12,"P","Dernières années de Staline"],[82,8,"E","Révolution d'Octobre"],
[83,17,"E","La Joconde"],[83,40,"E","La Joconde"],
[84,37,"E","Libération de Nelson Mandela"],
[85,52,"P","Marco Polo au service de Kubilai Khan"],[85,15,"E","Le Livre de Marco Polo"],
[56,71,"E","Partition des Indes"],[57,71,"E","Marche du sel"],
[9,73,"E","Appel du 18 juin"],[9,63,"E","Bombardement atomique d'Hiroshima"],
[12,79,"E","Nixon en Chine"],[12,82,"E","Conférence de Yalta"],
[26,64,"E","Bataille de Gaugamèles"],[55,64,"E","Bataille de l’Hydaspe"],[43,64,"E","Fondation d’Alexandrie"],
[41,78,"E","XIIIe amendement aux États-Unis"],[2,80,"E","De l’origine des espèces"],[8,82,"E","Révolution d'Octobre"],
[46,77,"E","Arrivée de Christophe Colomb en Amérique"],[56,73,"E","Accords d’Évian"]
]$j$::jsonb) LOOP
IF r->>2 = 'E' THEN
SELECT count(*), min(e.id) INTO n, id2 FROM public.events e JOIN public.story_events se ON se.event_id = e.id AND se.story_id = (r->>0)::int WHERE e.label_fr = r->>3;
ELSE
SELECT count(*), min(q.id) INTO n, id2 FROM public.periods q JOIN public.story_periods sp ON sp.period_id = q.id AND sp.story_id = (r->>0)::int WHERE q.label_fr = r->>3;
END IF;
IF n <> 1 THEN RAISE EXCEPTION 'Ancre absente : % / %', r->>0, r->>3; END IF;
INSERT INTO public.story_entry_points (source_story_id, target_story_id, period_id, event_id, display_as_period)
VALUES ((r->>0)::int, (r->>1)::int, CASE WHEN r->>2 = 'P' THEN id2 END, CASE WHEN r->>2 = 'E' THEN id2 END, false)
ON CONFLICT DO NOTHING;
GET DIAGNOSTICS n = ROW_COUNT;
added := added + n;
END LOOP;
RAISE NOTICE '% liens ajoutés', added;
END $do$;
