select jsonb_build_object(
'extracted_at',now(),
'stories',(select coalesce(jsonb_agg(to_jsonb(s) - 'owner_user_id' - 'author' order by id),'[]') from stories s),
'periods',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label_fr',label_fr,'label_en',label_en,'start_date',start_date,'end_date',end_date,'start_years_bp',start_years_bp::text,'end_years_bp',end_years_bp::text) order by id),'[]') from periods),
'events',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label_fr',label_fr,'date',date,'date_years_bp',date_years_bp::text) order by id),'[]') from events),
'story_periods',(select coalesce(jsonb_agg(to_jsonb(t) order by story_id,period_id),'[]') from story_periods t),
'story_events',(select coalesce(jsonb_agg(to_jsonb(t) order by story_id,event_id),'[]') from story_events t),
'story_anchors',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from story_anchors t),
'story_entry_points',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from story_entry_points t),
'story_period_presentations',(select coalesce(jsonb_agg(to_jsonb(t) order by context_story_id,period_id,target_story_id),'[]') from story_period_presentations t)
) as snapshot
