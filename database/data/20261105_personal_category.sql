-- Category shared by frises, periods and events. Safe to replay.
INSERT INTO public.categories (id, label_fr, label_en, description_fr, description_en)
VALUES ('CAT_PERSONAL', 'Personnelle', 'Personal',
        'Parcours de vie, souvenirs et projets personnels.',
        'Life journeys, memories and personal projects.')
ON CONFLICT (id) DO NOTHING;
