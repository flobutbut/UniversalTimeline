BEGIN;
SET LOCAL lock_timeout = '5s';

-- Filter before pagination so objects/statuses on later pages are included in the result and count.
CREATE FUNCTION feedback_private.filtered_list(p_offset integer, p_subject text, p_status text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  IF (p_subject IS NOT NULL AND p_subject NOT IN ('missing_timeline','data_error','feature','bug','other'))
    OR (p_status IS NOT NULL AND p_status NOT IN ('new','in_progress','resolved')) THEN
    RAISE EXCEPTION 'Invalid filter' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM feedback_private.submissions WHERE (p_subject IS NULL OR subject = p_subject) AND (p_status IS NULL OR status = p_status)),
    'items', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f."createdAt" DESC, f.id) FROM (
      SELECT id, rating, subject, message, page_url AS "pageUrl", email, status, created_at AS "createdAt"
      FROM feedback_private.submissions WHERE (p_subject IS NULL OR subject = p_subject) AND (p_status IS NULL OR status = p_status)
      ORDER BY created_at DESC, id LIMIT 50 OFFSET greatest(p_offset, 0)
    ) f), '[]'::jsonb));
END;
$function$;
REVOKE ALL ON FUNCTION feedback_private.filtered_list(integer,text,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION feedback_private.filtered_list(integer,text,text) TO authenticated;
COMMIT;
