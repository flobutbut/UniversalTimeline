-- Vider les tables existantes
SET search_path TO categories;
TRUNCATE TABLE period_categories, event_categories, story_categories, categories CASCADE;

SET search_path TO periods;
TRUNCATE TABLE periods CASCADE;

SET search_path TO events;
TRUNCATE TABLE events CASCADE;

SET search_path TO stories;
TRUNCATE TABLE story_periods, story_events, stories CASCADE;

-- Import des catégories
SET search_path TO categories;

INSERT INTO categories (id, label_fr, label_en, description_fr, description_en, created_at, updated_at)
VALUES 
  ('CAT_COSMO', 'Cosmologie', 'Cosmology', NULL, NULL, NOW(), NOW()),
  ('CAT_ASTRO', 'Astrophysique', 'Astrophysics', NULL, NULL, NOW(), NOW()),
  ('CAT_PHYS', 'Physique Théorique', 'Theoretical Physics', NULL, NULL, NOW(), NOW()),
  ('CAT_BIO_EVO', 'Biologie Évolutive', 'Evolutionary Biology', NULL, NULL, NOW(), NOW()),
  ('CAT_PALEO', 'Paléontologie', 'Paleontology', NULL, NULL, NOW(), NOW()),
  ('CAT_PART', 'Physique des Particules', 'Particle Physics', NULL, NULL, NOW(), NOW()),
  ('CAT_GEO', 'Géologie', 'Geology', NULL, NULL, NOW(), NOW()),
  ('CAT_CHEM', 'Chimie', 'Chemistry', NULL, NULL, NOW(), NOW()),
  ('CAT_BOT', 'Botanique', 'Botany', NULL, NULL, NOW(), NOW()),
  ('CAT_HIST', 'Histoire et Civilisations', 'History and Civilizations', NULL, NULL, NOW(), NOW()),
  ('CAT_ANTHRO', 'Anthropologie et Archéologie', 'Anthropology and Archaeology', NULL, NULL, NOW(), NOW()),
  ('CAT_TECH', 'Technologie et Innovations', 'Technology and Innovations', NULL, NULL, NOW(), NOW()),
  ('CAT_PHILO', 'Religion et Philosophie', 'Religion and Philosophy', NULL, NULL, NOW(), NOW()),
  ('CAT_ART', 'Art et Culture', 'Art and Culture', NULL, NULL, NOW(), NOW()),
  ('CAT_ECO', 'Économie', 'Economics', NULL, NULL, NOW(), NOW()),
  ('CAT_OCEAN', 'Océanographie', 'Oceanography', NULL, NULL, NOW(), NOW()),
  ('CAT_MICRO', 'Microbiologie', 'Microbiology', NULL, NULL, NOW(), NOW()),
  ('CAT_ECO_SYS', 'Écologie', 'Ecology', NULL, NULL, NOW(), NOW());

-- Import des périodes
SET search_path TO periods;

INSERT INTO periods (id, wikidata_id, label_fr, label_en, description_fr, description_en, start_date, end_date, temporal_location, created_at, updated_at)
VALUES 
  ('PER_MILKYWAY', 'Q2', 'Voie Lactée', 'Milky Way', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_BIGBANG', 'Q323', 'Big Bang', 'Big Bang', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_PLANCK', 'Q172932', 'Ère de Planck', 'Planck Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_GUT', 'Q898941', 'Ère de la Grande Unification', 'Grand Unification Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_ELECTROWEAK', 'Q899367', 'Ère Électrofaible', 'Electroweak Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_HADRON', 'Q899383', 'Ère Hadronique', 'Hadron Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_LEPTON', 'Q899379', 'Ère Leptonique', 'Lepton Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_NUCLEOSYN', 'Q217416', 'Ère de la Nucléosynthèse Primordiale', 'Primordial Nucleosynthesis Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_RECOMB', 'Q899426', 'Ère de la Recombinaison', 'Recombination Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_DARK_AGES', 'Q1236209', 'Ère des Âges Sombres', 'Dark Ages', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_REION', 'Q901651', 'Ère de Réionisation', 'Reionization Era', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_SOLAR_SYS', 'Q544', 'Système solaire', 'Solar System', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_EARTH', 'Q2297', 'Terre', 'Earth', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_HADEAN', 'Q151264', 'Éon Hadéen', 'Hadean Eon', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_ARCHEAN', 'Q46886', 'Éon Archéen', 'Archean Eon', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_PROTEROZOIC', 'Q44882', 'Éon Protérozoïque', 'Proterozoic Eon', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_PALEOPROTEROZOIC', 'Q271359', 'Paléoprotérozoïque', 'Paleoproterozoic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_MESOPROTEROZOIC', 'Q271398', 'Mésoprotérozoïque', 'Mesoproterozoic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_NEOPROTEROZOIC', 'Q271422', 'Néoprotérozoïque', 'Neoproterozoic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_CRYOGENIAN', 'Q203367', 'Cryogénien', 'Cryogenian', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_PHANEROZOIC', 'Q23040', 'Éon Phanérozoïque', 'Phanerozoic Eon', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_PALEOZOIC', 'Q23057', 'Paléozoïque', 'Paleozoic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_MESOZOIC', 'Q5390', 'Mésozoïque', 'Mesozoic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_CENOZOIC', 'Q23041', 'Cénozoïque', 'Cenozoic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_CAMBRIAN', 'Q5146', 'Cambrien', 'Cambrian', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_ORDOVICIAN', 'Q5145', 'Ordovicien', 'Ordovician', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_SILURIAN', 'Q5426', 'Silurien', 'Silurian', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_DEVONIAN', 'Q1934', 'Dévonien', 'Devonian', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_CARBONIFEROUS', 'Q1929', 'Carbonifère', 'Carboniferous', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_PERMIAN', 'Q5301', 'Permien', 'Permian', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_TRIASSIC', 'Q5383', 'Trias', 'Triassic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_JURASSIC', 'Q5386', 'Jurassique', 'Jurassic', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_CRETACEOUS', 'Q5334', 'Crétacé', 'Cretaceous', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_PALEOGENE', 'Q23018', 'Paléogène', 'Paleogene', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_NEOGENE', 'Q3982', 'Néogène', 'Neogene', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('PER_QUATERNARY', 'Q1747846', 'Quaternaire', 'Quaternary', NULL, NULL, NULL, NULL, NULL, NOW(), NOW());

-- Import des événements
SET search_path TO events;

INSERT INTO events (id, wikidata_id, label_fr, label_en, description_fr, description_en, date, created_at, updated_at)
VALUES 
  ('EVT_BIGBANG', 'Q323', 'Big Bang', 'Big Bang', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_FIRST_STARS', 'Q3343986', 'Formation des premières étoiles', 'Formation of First Stars', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_GLOB_CLUSTERS', 'Q52863547', 'Formation des amas globulaires', 'Formation of Globular Clusters', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_SOLAR_NEB', 'Q162230', 'Formation de la nébuleuse solaire', 'Formation of Solar Nebula', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_SUN_FORM', 'Q2373740', 'Formation du Soleil', 'Formation of Sun', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_EARTH_FORM', 'Q1235542', 'Formation de la Terre', 'Formation of Earth', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_MOON_FORM', 'Q333656', 'Formation de la Lune', 'Formation of Moon', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_OCEAN_FORM', 'Q428962', 'Formation des océans', 'Formation of Oceans', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_FIRST_MIN', 'Q2603003', 'Premiers minéraux connus (zircons)', 'First Known Minerals (Zircons)', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_LHB_END', 'Q80800', 'Fin du grand bombardement tardif', 'End of Late Heavy Bombardment', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_FIRST_LIFE', 'Q13433688', 'Premières traces de vie', 'First Traces of Life', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_CYANOBACT', 'Q653049', 'Formation des premières cyanobactéries', 'Formation of First Cyanobacteria', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_GOE', 'Q1545904', 'Apparition de l''oxygène atmosphérique (Grande Oxydation)', 'Appearance of Atmospheric Oxygen (Great Oxidation)', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_EUKAR', 'Q145262', 'Apparition des premiers eucaryotes', 'Appearance of First Eukaryotes', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_HURON_GLAC', 'Q1393590', 'Glaciation huronienne', 'Huronian Glaciation', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_COLUMBIA', 'Q833611', 'Formation du supercontinent Columbia', 'Formation of Columbia Supercontinent', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_STURT_GLAC', 'Q1636908', 'Glaciation sturtienne', 'Sturtian Glaciation', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_EDIACARA', 'Q463516', 'Faune d''Édiacara', 'Ediacaran Fauna', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_CAMBRIAN', 'Q177060', 'Explosion cambrienne', 'Cambrian Explosion', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_FIRST_FISH', 'Q152', 'Premiers poissons', 'First Fish', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_LAND_PLANTS', 'Q1136609', 'Colonisation des terres par les plantes', 'Land Colonization by Plants', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_INSECTS', 'Q1390', 'Apparition des insectes', 'Appearance of Insects', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_AMPHIBIANS', 'Q25229', 'Apparition des premiers amphibiens', 'Appearance of First Amphibians', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_PANGAEA', 'Q46253', 'Formation de la Pangée', 'Formation of Pangaea', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_REPTILES', 'Q10908', 'Apparition des reptiles', 'Appearance of Reptiles', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_DINOSAURS', 'Q10811', 'Apparition des dinosaures', 'Appearance of Dinosaurs', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_MAMMALS', 'Q7377', 'Apparition des premiers mammifères', 'Appearance of First Mammals', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_PT_EXT', 'Q214851', 'Extinction Permien-Trias', 'Permian-Triassic Extinction', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_KT_EXT', 'Q46368', 'Extinction Crétacé-Tertiaire', 'Cretaceous-Tertiary Extinction', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_PRIMATES', 'Q7358', 'Apparition des premiers primates', 'Appearance of First Primates', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_HIMALAYA', 'Q12467092', 'Formation de l''Himalaya', 'Formation of Himalayas', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_HOMINIDS', 'Q3238722', 'Apparition des premiers hominidés', 'Appearance of First Hominids', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_QUAT_GLAC', 'Q11746', 'Début des glaciations quaternaires', 'Beginning of Quaternary Glaciations', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_HOMO', 'Q171283', 'Apparition du genre Homo', 'Appearance of Genus Homo', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_FIRE', 'Q3098972', 'Première utilisation contrôlée du feu', 'First Controlled Use of Fire', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_SAPIENS', 'Q15978631', 'Apparition d''Homo sapiens', 'Appearance of Homo sapiens', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_CAVE_ART', 'Q5825', 'Début de l''art pariétal', 'Beginning of Cave Art', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_LAST_GLAC', 'Q121557', 'Fin de la dernière période glaciaire', 'End of Last Glacial Period', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_AGRICULTURE', 'Q181053', 'Début de l''agriculture', 'Beginning of Agriculture', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_WRITING', 'Q8767', 'Invention de l''écriture', 'Invention of Writing', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_PYRAMIDS', 'Q37200', 'Construction des pyramides de Gizeh', 'Construction of Giza Pyramids', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_BUDDHA', 'Q9441', 'Naissance de Bouddha', 'Birth of Buddha', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_ROME', 'Q4940', 'Fondation de Rome', 'Foundation of Rome', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_JESUS', 'Q302', 'Naissance de Jésus-Christ', 'Birth of Jesus Christ', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_ROME_FALL', 'Q132605', 'Chute de l''Empire romain d''Occident', 'Fall of Western Roman Empire', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_HEGIRA', 'Q4389', 'Début de l''Hégire', 'Beginning of Hijra', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_AMERICA', 'Q8667', 'Découverte de l''Amérique par Christophe Colomb', 'Discovery of America by Christopher Columbus', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_IND_REV', 'Q11651', 'Révolution industrielle', 'Industrial Revolution', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_FR_REV', 'Q6534', 'Révolution française', 'French Revolution', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_WW1', 'Q361', 'Première Guerre mondiale', 'First World War', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_WW2', 'Q362', 'Seconde Guerre mondiale', 'Second World War', NULL, NULL, NULL, NOW(), NOW()),
  ('EVT_MOON_LAND', 'Q29962', 'Premier pas sur la Lune', 'First Step on Moon', NULL, NULL, NULL, NOW(), NOW()); 