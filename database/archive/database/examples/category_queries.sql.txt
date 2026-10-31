-- Exemples de requêtes pour les catégories
-- Date: 2025-06-17

-- 1. Récupérer toutes les catégories
SELECT id, label_fr, label_en, description_fr 
FROM categories.categories 
ORDER BY label_fr;

-- 2. Récupérer une période avec ses catégories
SELECT 
    p.id,
    p.label_fr,
    p.label_en,
    p.start_date,
    p.end_date,
    ARRAY_AGG(c.label_fr) as categories
FROM periods p
LEFT JOIN period_categories pc ON p.id = pc.period_id
LEFT JOIN categories.categories c ON pc.category_id = c.id
WHERE p.id = 'your_period_id'
GROUP BY p.id, p.label_fr, p.label_en, p.start_date, p.end_date;

-- 3. Récupérer tous les événements d'une catégorie spécifique
SELECT 
    e.id,
    e.label_fr,
    e.label_en,
    e.date
FROM events e
JOIN event_categories ec ON e.id = ec.event_id
JOIN categories.categories c ON ec.category_id = c.id
WHERE c.label_fr = 'Géologie'
ORDER BY e.date;

-- 4. Récupérer toutes les stories avec leurs catégories
SELECT 
    s.id,
    s.title_fr,
    s.title_en,
    s.author,
    ARRAY_AGG(c.label_fr) as categories
FROM stories s
LEFT JOIN story_categories sc ON s.id = sc.story_id
LEFT JOIN categories.categories c ON sc.category_id = c.id
GROUP BY s.id, s.title_fr, s.title_en, s.author;

-- 5. Compter les éléments par catégorie
SELECT 
    c.label_fr,
    COUNT(DISTINCT p.id) as periods_count,
    COUNT(DISTINCT e.id) as events_count,
    COUNT(DISTINCT s.id) as stories_count
FROM categories.categories c
LEFT JOIN period_categories pc ON c.id = pc.category_id
LEFT JOIN periods p ON pc.period_id = p.id
LEFT JOIN event_categories ec ON c.id = ec.category_id
LEFT JOIN events e ON ec.event_id = e.id
LEFT JOIN story_categories sc ON c.id = sc.category_id
LEFT JOIN stories s ON sc.story_id = s.id
GROUP BY c.id, c.label_fr
ORDER BY c.label_fr;

-- 6. Rechercher des éléments par plusieurs catégories
SELECT 
    p.id,
    p.label_fr,
    p.label_en,
    ARRAY_AGG(c.label_fr) as categories
FROM periods p
JOIN period_categories pc ON p.id = pc.period_id
JOIN categories.categories c ON pc.category_id = c.id
WHERE c.label_fr IN ('Géologie', 'Paléontologie')
GROUP BY p.id, p.label_fr, p.label_en
HAVING COUNT(DISTINCT c.id) = 2; -- Éléments qui ont TOUTES les catégories

-- 7. Ajouter une catégorie à une période
INSERT INTO period_categories (period_id, category_id) 
VALUES ('period_id_here', 'cat_007') -- cat_007 = Géologie
ON CONFLICT (period_id, category_id) DO NOTHING;

-- 8. Supprimer une catégorie d'une période
DELETE FROM period_categories 
WHERE period_id = 'period_id_here' 
AND category_id = 'cat_007';

-- 9. Remplacer toutes les catégories d'un événement
-- D'abord supprimer les anciennes
DELETE FROM event_categories WHERE event_id = 'event_id_here';
-- Puis ajouter les nouvelles
INSERT INTO event_categories (event_id, category_id) VALUES
('event_id_here', 'cat_001'), -- Cosmologie
('event_id_here', 'cat_002'); -- Astrophysique

-- 10. Statistiques d'utilisation des catégories
SELECT 
    c.label_fr,
    (SELECT COUNT(*) FROM period_categories pc WHERE pc.category_id = c.id) as periods_usage,
    (SELECT COUNT(*) FROM event_categories ec WHERE ec.category_id = c.id) as events_usage,
    (SELECT COUNT(*) FROM story_categories sc WHERE sc.category_id = c.id) as stories_usage
FROM categories.categories c
ORDER BY (periods_usage + events_usage + stories_usage) DESC; 