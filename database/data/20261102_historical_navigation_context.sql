-- Add the reviewed reference context. Shared facts and historical links stay intact.
-- IDs of generated stories are always obtained through RETURNING.
DO $seed$
DECLARE reference_id integer; reference_owner uuid; reference_author text; reference_public boolean;
BEGIN
  SELECT owner_user_id,author,is_public INTO STRICT reference_owner,reference_author,reference_public
    FROM public.stories WHERE title_fr='Moyen Âge'
      AND EXISTS (SELECT 1 FROM public.story_periods sp WHERE sp.story_id=stories.id AND sp.period_id='Q12554');
  IF (SELECT count(*) FROM (VALUES
    ('Antiquité et premières civilisations','Q40244'),('Moyen Âge','Q12554'),
    ('Époque moderne','Q7432'),('Époque moderne','Q11769')
  ) wanted(title,period_id) JOIN public.stories s ON s.title_fr=wanted.title AND s.owner_user_id=reference_owner
    JOIN public.story_periods sp ON sp.story_id=s.id AND sp.period_id=wanted.period_id) <> 4
  THEN RAISE EXCEPTION 'Reviewed historical presentations changed; seed refused'; END IF;
  SELECT id INTO reference_id FROM public.stories WHERE title_fr='Grandes périodes de l’histoire européenne' AND owner_user_id=reference_owner;
  IF reference_id IS NULL THEN
    INSERT INTO public.stories(title_fr,title_en,description_fr,description_en,author,is_public,owner_user_id)
    VALUES('Grandes périodes de l’histoire européenne','Major periods of European history',
      'Un parcours chronologique entre les grandes périodes de l’histoire européenne et leurs frises de détail.',
      'A chronological journey through major periods of European history and their detailed timelines.',reference_author,reference_public,reference_owner)
    RETURNING id INTO reference_id;
  END IF;
  INSERT INTO public.story_periods(story_id,period_id,parent_period_id)
    SELECT reference_id,id,NULL FROM public.periods WHERE id IN ('Q40244','Q12554','Q7432','Q11769') ON CONFLICT DO NOTHING;
  INSERT INTO public.story_period_presentations(context_story_id,period_id,target_story_id)
    SELECT reference_id,wanted.period_id,s.id FROM (VALUES
      ('Antiquité et premières civilisations','Q40244'),('Moyen Âge','Q12554'),
      ('Époque moderne','Q7432'),('Époque moderne','Q11769')
    ) wanted(title,period_id) JOIN public.stories s ON s.title_fr=wanted.title AND s.owner_user_id=reference_owner
      JOIN public.story_periods sp ON sp.story_id=s.id AND sp.period_id=wanted.period_id
    ON CONFLICT DO NOTHING;
END;
$seed$;
SELECT s.id,s.title_fr,p.period_id,p.target_story_id FROM public.stories s
  JOIN public.story_period_presentations p ON p.context_story_id=s.id
  WHERE s.title_fr='Grandes périodes de l’histoire européenne' ORDER BY p.period_id;
