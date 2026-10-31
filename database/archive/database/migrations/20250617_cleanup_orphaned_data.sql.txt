-- Suppression des entrées orphelines dans story_events
DELETE FROM stories.story_events
WHERE event_id NOT IN (SELECT id FROM events.events);

-- Suppression des entrées orphelines dans story_periods
DELETE FROM stories.story_periods
WHERE period_id NOT IN (SELECT id FROM periods.periods);

-- Vérification du nombre d'entrées restantes
SELECT 'story_events' as table_name, COUNT(*) as count FROM stories.story_events
UNION ALL
SELECT 'story_periods', COUNT(*) FROM stories.story_periods; 