BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE FUNCTION feedback_private.delete_submission(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  DELETE FROM feedback_private.submissions WHERE id = p_id;
  RETURN FOUND;
END;
$function$;
REVOKE ALL ON FUNCTION feedback_private.delete_submission(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION feedback_private.delete_submission(uuid) TO authenticated;
COMMIT;
