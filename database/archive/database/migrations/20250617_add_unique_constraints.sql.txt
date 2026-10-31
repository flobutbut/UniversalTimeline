-- Ajout de la contrainte d'unicité sur story_events
ALTER TABLE stories.story_events
ADD CONSTRAINT story_events_story_event_unique UNIQUE (story_id, event_id);

-- Ajout de la contrainte d'unicité sur story_periods
ALTER TABLE stories.story_periods
ADD CONSTRAINT story_periods_story_period_unique UNIQUE (story_id, period_id);

-- Vérification des contraintes ajoutées
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname IN ('story_events_story_event_unique', 'story_periods_story_period_unique'); 