-- Insertion des catégories par défaut
-- Date: 2025-06-17

-- Vider la table des catégories existantes (optionnel)
-- DELETE FROM categories.categories;

-- Insérer les catégories par défaut
INSERT INTO categories.categories (id, label_fr, label_en, description_fr, description_en) VALUES
('cat_001', 'Cosmologie', 'Cosmology', 'Étude de l''univers dans son ensemble', 'Study of the universe as a whole'),
('cat_002', 'Astrophysique', 'Astrophysics', 'Physique appliquée à l''astronomie', 'Physics applied to astronomy'),
('cat_003', 'Physique Théorique', 'Theoretical Physics', 'Développement de modèles théoriques', 'Development of theoretical models'),
('cat_004', 'Biologie Évolutive', 'Evolutionary Biology', 'Étude de l''évolution des espèces', 'Study of species evolution'),
('cat_005', 'Paléontologie', 'Paleontology', 'Étude des fossiles et de la vie passée', 'Study of fossils and past life'),
('cat_006', 'Physique des Particules', 'Particle Physics', 'Étude des particules élémentaires', 'Study of elementary particles'),
('cat_007', 'Géologie', 'Geology', 'Étude de la Terre et de sa structure', 'Study of Earth and its structure'),
('cat_008', 'Chimie', 'Chemistry', 'Étude de la matière et de ses transformations', 'Study of matter and its transformations'),
('cat_009', 'Botanique', 'Botany', 'Étude des plantes', 'Study of plants'),
('cat_010', 'Histoire et Civilisations', 'History and Civilizations', 'Étude des civilisations humaines', 'Study of human civilizations'),
('cat_011', 'Anthropologie et Archéologie', 'Anthropology and Archaeology', 'Étude de l''humain et de ses vestiges', 'Study of humans and their remains'),
('cat_012', 'Technologie et Innovations', 'Technology and Innovations', 'Développements technologiques', 'Technological developments'),
('cat_013', 'Religion et Philosophie', 'Religion and Philosophy', 'Croyances et systèmes de pensée', 'Beliefs and thought systems'),
('cat_014', 'Art et Culture', 'Art and Culture', 'Expressions artistiques et culturelles', 'Artistic and cultural expressions'),
('cat_015', 'Économie', 'Economics', 'Étude des systèmes économiques', 'Study of economic systems'),
('cat_016', 'Océanographie', 'Oceanography', 'Étude des océans', 'Study of oceans'),
('cat_017', 'Microbiologie', 'Microbiology', 'Étude des micro-organismes', 'Study of microorganisms'),
('cat_018', 'Écologie', 'Ecology', 'Étude des interactions entre organismes et environnement', 'Study of interactions between organisms and environment')
ON CONFLICT (id) DO UPDATE SET
    label_fr = EXCLUDED.label_fr,
    label_en = EXCLUDED.label_en,
    description_fr = EXCLUDED.description_fr,
    description_en = EXCLUDED.description_en,
    updated_at = CURRENT_TIMESTAMP; 