-- Read-only admin graph. No change to ordinary story access or catalogue facts.
BEGIN;

CREATE INDEX IF NOT EXISTS story_periods_entity_story_idx ON public.story_periods(period_id, story_id);
CREATE INDEX IF NOT EXISTS story_events_entity_story_idx ON public.story_events(event_id, story_id);

CREATE FUNCTION admin_private.relations_overview() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  RETURN jsonb_build_object(
    'generatedAt', now(),
    'stories', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id::text, 'title', s.title_fr, 'isPublic', s.is_public,
      'periods', coalesce(p.n, 0), 'events', coalesce(e.n, 0)
    ) ORDER BY s.title_fr, s.id), '[]') FROM public.stories s
      LEFT JOIN (SELECT story_id, count(*) n FROM public.story_periods GROUP BY story_id) p ON p.story_id=s.id
      LEFT JOIN (SELECT story_id, count(*) n FROM public.story_events GROUP BY story_id) e ON e.story_id=s.id),
    'links', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'type', l.kind, 'source', l.source::text, 'target', l.target::text,
      'anchor', CASE WHEN l.anchor_id IS NULL THEN NULL ELSE jsonb_build_object(
        'kind', l.anchor_kind, 'id', l.anchor_id, 'title', coalesce(p.label_fr, e.label_fr, l.anchor_id)) END
    ) ORDER BY l.id), '[]') FROM (
      SELECT 'entry:'||ep.id id, 'entry' kind, ep.source_story_id source, ep.target_story_id target,
        CASE WHEN ep.period_id IS NOT NULL THEN 'period' ELSE 'event' END anchor_kind,
        coalesce(ep.period_id,ep.event_id) anchor_id FROM public.story_entry_points ep
      UNION ALL
      SELECT 'presentation:'||v.context_story_id||':'||v.target_story_id||':'||v.period_id,
        'presentation', v.context_story_id, v.target_story_id, 'period', v.period_id FROM public.story_period_presentations v
      UNION ALL
      SELECT 'legacy:'||s.id||':'||coalesce(a.id::text,'root'), 'legacy', s.parent_story_id, s.id, a.anchor_type, a.anchor_id
        FROM public.stories s LEFT JOIN public.story_anchors a ON a.story_id=s.id WHERE s.parent_story_id IS NOT NULL
    ) l LEFT JOIN public.periods p ON l.anchor_kind='period' AND p.id=l.anchor_id
        LEFT JOIN public.events e ON l.anchor_kind='event' AND e.id=l.anchor_id));
END;
$function$;

CREATE FUNCTION admin_private.relations_story(story integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.id=story) THEN
    RAISE EXCEPTION 'Frise absente' USING ERRCODE='P0002';
  END IF;
  RETURN jsonb_build_object('storyId', story::text,
    'periods', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'title', p.label_fr, 'startDate', p.start_date, 'endDate', p.end_date, 'wikidataId', p.wikidata_id,
      'parentId', sp.parent_period_id, 'uses', (SELECT count(*) FROM public.story_periods u WHERE u.period_id=p.id)
    ) ORDER BY p.label_fr, p.id), '[]') FROM public.story_periods sp JOIN public.periods p ON p.id=sp.period_id WHERE sp.story_id=story),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.label_fr, 'date', e.date, 'wikidataId', e.wikidata_id, 'importance', se.importance,
      'uses', (SELECT count(*) FROM public.story_events u WHERE u.event_id=e.id)
    ) ORDER BY e.label_fr, e.id), '[]') FROM public.story_events se JOIN public.events e ON e.id=se.event_id WHERE se.story_id=story));
END;
$function$;

CREATE FUNCTION admin_private.relations_entity(kind text, entity text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM admin_private.require_admin();
  IF kind='period' THEN
    SELECT jsonb_build_object('kind',kind,'id',p.id,'title',p.label_fr,'startDate',p.start_date,'endDate',p.end_date,
      'wikidataId',p.wikidata_id,'stories',(SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',s.id::text,'title',s.title_fr,'isPublic',s.is_public,'parentId',sp.parent_period_id,
        'parentTitle',parent.label_fr) ORDER BY s.title_fr,s.id),'[]')
        FROM public.story_periods sp JOIN public.stories s ON s.id=sp.story_id
        LEFT JOIN public.periods parent ON parent.id=sp.parent_period_id WHERE sp.period_id=p.id))
      INTO result FROM public.periods p WHERE p.id=entity;
  ELSIF kind='event' THEN
    SELECT jsonb_build_object('kind',kind,'id',e.id,'title',e.label_fr,'startDate',e.date,'endDate',NULL,
      'wikidataId',e.wikidata_id,'stories',(SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',s.id::text,'title',s.title_fr,'isPublic',s.is_public,'importance',se.importance) ORDER BY s.title_fr,s.id),'[]')
        FROM public.story_events se JOIN public.stories s ON s.id=se.story_id WHERE se.event_id=e.id))
      INTO result FROM public.events e WHERE e.id=entity;
  ELSE RAISE EXCEPTION 'Type invalide' USING ERRCODE='22023';
  END IF;
  IF result IS NULL THEN RAISE EXCEPTION 'Fiche absente' USING ERRCODE='P0002'; END IF;
  RETURN result;
END;
$function$;

CREATE FUNCTION admin_private.relations_catalogue(kind text, usage_filter text, search_text text, page_offset integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM admin_private.require_admin();
  IF kind NOT IN ('period','event') OR usage_filter NOT IN ('shared','unused','all')
    OR page_offset < 0 OR page_offset > 1000000 OR length(search_text)>200 THEN
    RAISE EXCEPTION 'Filtre invalide' USING ERRCODE='22023';
  END IF;
  WITH entities AS (
    SELECT p.id,p.label_fr title,(SELECT count(*) FROM public.story_periods u WHERE u.period_id=p.id) uses
      FROM public.periods p WHERE kind='period'
    UNION ALL
    SELECT e.id,e.label_fr,(SELECT count(*) FROM public.story_events u WHERE u.event_id=e.id)
      FROM public.events e WHERE kind='event'
  ), filtered AS (
    SELECT * FROM entities WHERE (usage_filter='all' OR (usage_filter='shared' AND uses>1) OR (usage_filter='unused' AND uses=0))
      AND (search_text='' OR strpos(lower(title),lower(search_text))>0)
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',coalesce((
    SELECT jsonb_agg(to_jsonb(page) ORDER BY page.title,page.id) FROM (
      SELECT * FROM filtered ORDER BY title,id LIMIT 50 OFFSET page_offset
    ) page),'[]')) INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION admin_private.relations_overview(), admin_private.relations_story(integer),
  admin_private.relations_entity(text,text), admin_private.relations_catalogue(text,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_private.relations_overview(), admin_private.relations_story(integer),
  admin_private.relations_entity(text,text), admin_private.relations_catalogue(text,text,text,integer) TO authenticated;
COMMIT;
