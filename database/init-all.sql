-- Création des schémas
CREATE SCHEMA IF NOT EXISTS categories;
CREATE SCHEMA IF NOT EXISTS periods;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS stories;

-- Schéma categories
SET search_path TO categories;

CREATE TABLE categories (
    id VARCHAR(255) PRIMARY KEY,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    parent_id VARCHAR(255) REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables de liaison pour les catégories
CREATE TABLE period_categories (
    period_id VARCHAR(255),
    category_id VARCHAR(255) REFERENCES categories(id),
    PRIMARY KEY (period_id, category_id)
);

CREATE TABLE event_categories (
    event_id VARCHAR(255),
    category_id VARCHAR(255) REFERENCES categories(id),
    PRIMARY KEY (event_id, category_id)
);

CREATE TABLE story_categories (
    story_id INTEGER,
    category_id VARCHAR(255) REFERENCES categories(id),
    PRIMARY KEY (story_id, category_id)
);

-- Insertion des catégories
INSERT INTO categories (id, label_fr, label_en) VALUES
('CAT_COSMO', 'Cosmologie', 'Cosmology'),
('CAT_ASTRO', 'Astrophysique', 'Astrophysics'),
('CAT_PHYS', 'Physique Théorique', 'Theoretical Physics'),
('CAT_BIO_EVO', 'Biologie Évolutive', 'Evolutionary Biology'),
('CAT_PALEO', 'Paléontologie', 'Paleontology'),
('CAT_PART', 'Physique des Particules', 'Particle Physics'),
('CAT_GEO', 'Géologie', 'Geology'),
('CAT_CHEM', 'Chimie', 'Chemistry'),
('CAT_BOT', 'Botanique', 'Botany'),
('CAT_HIST', 'Histoire et Civilisations', 'History and Civilizations'),
('CAT_ANTHRO', 'Anthropologie et Archéologie', 'Anthropology and Archaeology'),
('CAT_TECH', 'Technologie et Innovations', 'Technology and Innovations'),
('CAT_PHILO', 'Religion et Philosophie', 'Religion and Philosophy'),
('CAT_ART', 'Art et Culture', 'Art and Culture'),
('CAT_ECO', 'Économie', 'Economics'),
('CAT_OCEAN', 'Océanographie', 'Oceanography'),
('CAT_MICRO', 'Microbiologie', 'Microbiology'),
('CAT_ECO_SYS', 'Écologie', 'Ecology');

-- Schéma periods
SET search_path TO periods;

CREATE TABLE periods (
    id VARCHAR(255) PRIMARY KEY,
    wikidata_id VARCHAR(255) UNIQUE NOT NULL,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    parent_id VARCHAR(255) REFERENCES periods(id),
    temporal_location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des périodes
INSERT INTO periods (id, wikidata_id, label_fr, label_en) VALUES
('PER_MILKYWAY', 'Q2', 'Voie Lactée', 'Milky Way'),
('PER_BIGBANG', 'Q323', 'Big Bang', 'Big Bang'),
('PER_PLANCK', 'Q172932', 'Ère de Planck', 'Planck Era'),
('PER_GUT', 'Q898941', 'Ère de la Grande Unification', 'Grand Unification Era'),
('PER_ELECTROWEAK', 'Q899367', 'Ère Électrofaible', 'Electroweak Era'),
('PER_HADRON', 'Q899383', 'Ère Hadronique', 'Hadronic Era'),
('PER_LEPTON', 'Q899379', 'Ère Leptonique', 'Leptonic Era'),
('PER_NUCLEOSYN', 'Q217416', 'Ère de la Nucléosynthèse Primordiale', 'Primordial Nucleosynthesis Era'),
('PER_RECOMB', 'Q899426', 'Ère de la Recombinaison', 'Recombination Era'),
('PER_DARK_AGES', 'Q1236209', 'Ère des Âges Sombres', 'Dark Ages Era'),
('PER_REION', 'Q901651', 'Ère de Réionisation', 'Reionization Era'),
('PER_SOLAR_SYS', 'Q544', 'Système solaire', 'Solar System'),
('PER_EARTH', 'Q2277', 'Terre', 'Earth'),
('PER_HADEAN', 'Q151264', 'Éon Hadéen', 'Hadean Eon'),
('PER_ARCHEAN', 'Q46886', 'Éon Archéen', 'Archean Eon'),
('PER_PROTEROZOIC', 'Q44882', 'Éon Protérozoïque', 'Proterozoic Eon'),
('PER_PALEOPROTEROZOIC', 'Q271359', 'Paléoprotérozoïque', 'Paleoproterozoic'),
('PER_MESOPROTEROZOIC', 'Q271398', 'Mésoprotérozoïque', 'Mesoproterozoic'),
('PER_NEOPROTEROZOIC', 'Q271422', 'Néoprotérozoïque', 'Neoproterozoic'),
('PER_CRYOGENIAN', 'Q203367', 'Cryogénien', 'Cryogenian'),
('PER_PHANEROZOIC', 'Q23040', 'Éon Phanérozoïque', 'Phanerozoic Eon'),
('PER_PALEOZOIC', 'Q23057', 'Paléozoïque', 'Paleozoic'),
('PER_MESOZOIC', 'Q5390', 'Mésozoïque', 'Mesozoic'),
('PER_CENOZOIC', 'Q23041', 'Cénozoïque', 'Cenozoic'),
('PER_CAMBRIAN', 'Q5146', 'Cambrien', 'Cambrian'),
('PER_ORDOVICIAN', 'Q5146', 'Ordovicien', 'Ordovician'),
('PER_SILURIAN', 'Q5426', 'Silurien', 'Silurian'),
('PER_DEVONIAN', 'Q1934', 'Dévonien', 'Devonian'),
('PER_CARBONIFEROUS', 'Q1929', 'Carbonifère', 'Carboniferous'),
('PER_PERMIAN', 'Q5301', 'Permien', 'Permian'),
('PER_TRIASSIC', 'Q5383', 'Trias', 'Triassic'),
('PER_JURASSIC', 'Q5386', 'Jurassique', 'Jurassic'),
('PER_CRETACEOUS', 'Q5334', 'Crétacé', 'Cretaceous'),
('PER_PALEOGENE', 'Q23018', 'Paléogène', 'Paleogene'),
('PER_NEOGENE', 'Q3982', 'Néogène', 'Neogene'),
('PER_QUATERNARY', 'Q1747846', 'Quaternaire', 'Quaternary');

-- Schéma events
SET search_path TO events;

CREATE TABLE events (
    id VARCHAR(255) PRIMARY KEY,
    wikidata_id VARCHAR(255) UNIQUE NOT NULL,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des événements
INSERT INTO events (id, wikidata_id, label_fr, label_en) VALUES
('EVT_BIGBANG', 'Q323', 'Big Bang', 'Big Bang'),
('EVT_FIRST_STARS', 'Q3343986', 'Formation des premières étoiles', 'Formation of first stars'),
('EVT_GLOB_CLUSTERS', 'Q52863547', 'Formation des amas globulaires', 'Formation of globular clusters'),
('EVT_SOLAR_NEB', 'Q162230', 'Formation de la nébuleuse solaire', 'Formation of solar nebula'),
('EVT_SUN_FORM', 'Q2373740', 'Formation du Soleil', 'Formation of the Sun'),
('EVT_EARTH_FORM', 'Q1235542', 'Formation de la Terre', 'Formation of Earth'),
('EVT_MOON_FORM', 'Q333656', 'Formation de la Lune', 'Formation of the Moon'),
('EVT_OCEAN_FORM', 'Q428962', 'Formation des océans', 'Formation of oceans'),
('EVT_FIRST_MIN', 'Q2603003', 'Premiers minéraux connus (zircons)', 'First known minerals (zircons)'),
('EVT_LHB_END', 'Q80800', 'Fin du grand bombardement tardif', 'End of Late Heavy Bombardment'),
('EVT_FIRST_LIFE', 'Q13433688', 'Premières traces de vie', 'First traces of life'),
('EVT_CYANOBACT', 'Q653049', 'Formation des premières cyanobactéries', 'Formation of first cyanobacteria'),
('EVT_GOE', 'Q1545904', 'Apparition de l''oxygène atmosphérique (Grande Oxydation)', 'Great Oxygenation Event'),
('EVT_EUKAR', 'Q145262', 'Apparition des premiers eucaryotes', 'Appearance of first eukaryotes'),
('EVT_HURON_GLAC', 'Q1393590', 'Glaciation huronienne', 'Huronian glaciation'),
('EVT_COLUMBIA', 'Q833611', 'Formation du supercontinent Columbia', 'Formation of Columbia supercontinent'),
('EVT_STURT_GLAC', 'Q1636908', 'Glaciation sturtienne', 'Sturtian glaciation'),
('EVT_EDIACARA', 'Q463516', 'Faune d''Édiacara', 'Ediacaran biota'),
('EVT_CAMBRIAN', 'Q177060', 'Explosion cambrienne', 'Cambrian explosion'),
('EVT_FIRST_FISH', 'Q152', 'Premiers poissons', 'First fish'),
('EVT_LAND_PLANTS', 'Q1136609', 'Colonisation des terres par les plantes', 'Land plant colonization'),
('EVT_INSECTS', 'Q1390', 'Apparition des insectes', 'Appearance of insects'),
('EVT_AMPHIBIANS', 'Q25229', 'Apparition des premiers amphibiens', 'Appearance of first amphibians'),
('EVT_PANGAEA', 'Q46253', 'Formation de la Pangée', 'Formation of Pangaea'),
('EVT_REPTILES', 'Q10908', 'Apparition des reptiles', 'Appearance of reptiles'),
('EVT_DINOSAURS', 'Q10811', 'Apparition des dinosaures', 'Appearance of dinosaurs'),
('EVT_MAMMALS', 'Q7377', 'Apparition des premiers mammifères', 'Appearance of first mammals'),
('EVT_PT_EXT', 'Q214851', 'Extinction Permien-Trias', 'Permian-Triassic extinction'),
('EVT_KT_EXT', 'Q46368', 'Extinction Crétacé-Tertiaire', 'Cretaceous-Tertiary extinction'),
('EVT_PRIMATES', 'Q7358', 'Apparition des premiers primates', 'Appearance of first primates'),
('EVT_HIMALAYA', 'Q12467092', 'Formation de l''Himalaya', 'Formation of Himalayas'),
('EVT_HOMINIDS', 'Q3238722', 'Apparition des premiers hominidés', 'Appearance of first hominids'),
('EVT_QUAT_GLAC', 'Q11746', 'Début des glaciations quaternaires', 'Start of Quaternary glaciation'),
('EVT_HOMO', 'Q171283', 'Apparition du genre Homo', 'Appearance of genus Homo'),
('EVT_FIRE_USE', 'Q3098972', 'Première utilisation contrôlée du feu', 'First controlled use of fire'),
('EVT_SAPIENS', 'Q15978631', 'Apparition d''Homo sapiens', 'Appearance of Homo sapiens'),
('EVT_CAVE_ART', 'Q5825', 'Début de l''art pariétal', 'Beginning of cave art'),
('EVT_LAST_GLAC', 'Q121557', 'Fin de la dernière période glaciaire', 'End of last glacial period'),
('EVT_AGRICULTURE', 'Q181053', 'Début de l''agriculture', 'Beginning of agriculture'),
('EVT_WRITING', 'Q8767', 'Invention de l''écriture', 'Invention of writing'),
('EVT_PYRAMIDS', 'Q37200', 'Construction des pyramides de Gizeh', 'Construction of Giza pyramids'),
('EVT_BUDDHA', 'Q9441', 'Naissance de Bouddha', 'Birth of Buddha'),
('EVT_ROME', 'Q4940', 'Fondation de Rome', 'Foundation of Rome'),
('EVT_JESUS', 'Q302', 'Naissance de Jésus-Christ', 'Birth of Jesus Christ'),
('EVT_ROME_FALL', 'Q132605', 'Chute de l''Empire romain d''Occident', 'Fall of Western Roman Empire'),
('EVT_HEGIRA', 'Q4389', 'Début de l''Hégire', 'Beginning of Hegira'),
('EVT_AMERICA', 'Q8667', 'Découverte de l''Amérique par Christophe Colomb', 'Discovery of America by Christopher Columbus'),
('EVT_IND_REV', 'Q11651', 'Révolution industrielle', 'Industrial Revolution'),
('EVT_FR_REV', 'Q6534', 'Révolution française', 'French Revolution'),
('EVT_WW1', 'Q361', 'Première Guerre mondiale', 'World War I'),
('EVT_WW2', 'Q362', 'Seconde Guerre mondiale', 'World War II'),
('EVT_MOON_LAND', 'Q29962', 'Premier pas sur la Lune', 'First step on the Moon');

-- Schéma stories
SET search_path TO stories;

CREATE TABLE stories (
    id SERIAL PRIMARY KEY,
    title_fr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    author VARCHAR(255) NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables de liaison pour les stories
CREATE TABLE story_periods (
    story_id INTEGER REFERENCES stories(id),
    period_id VARCHAR(255),
    PRIMARY KEY (story_id, period_id)
);

CREATE TABLE story_events (
    story_id INTEGER REFERENCES stories(id),
    event_id VARCHAR(255),
    PRIMARY KEY (story_id, event_id)
);

-- Création des triggers pour la mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Application des triggers sur toutes les tables
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories.categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_periods_updated_at
    BEFORE UPDATE ON periods.periods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events.events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories.stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Création des index
CREATE INDEX idx_categories_parent_id ON categories.categories(parent_id);
CREATE INDEX idx_periods_parent_id ON periods.periods(parent_id);
CREATE INDEX idx_periods_dates ON periods.periods(start_date, end_date);
CREATE INDEX idx_events_date ON events.events(date);
CREATE INDEX idx_period_categories ON categories.period_categories(period_id, category_id);
CREATE INDEX idx_event_categories ON categories.event_categories(event_id, category_id);
CREATE INDEX idx_story_categories ON categories.story_categories(story_id, category_id);
CREATE INDEX idx_story_periods ON stories.story_periods(story_id, period_id);
CREATE INDEX idx_story_events ON stories.story_events(story_id, event_id);
CREATE INDEX idx_periods_wikidata_id ON periods.periods(wikidata_id);
CREATE INDEX idx_events_wikidata_id ON events.events(wikidata_id); 