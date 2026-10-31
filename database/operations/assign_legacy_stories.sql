-- Run in an explicit privileged transaction after setting timeline.admin_email.
-- Requires a confirmed admin; assigns unowned stories without changing visibility/categories.
DO $assign$
DECLARE target uuid; requested text := current_setting('timeline.admin_email', true);
BEGIN
  IF requested IS NULL OR btrim(requested) = '' THEN
    RAISE EXCEPTION 'timeline.admin_email must be supplied explicitly';
  END IF;
  SELECT id INTO STRICT target FROM auth.users
    WHERE lower(email)=lower(btrim(requested)) AND email_confirmed_at IS NOT NULL
      AND NOT coalesce(is_anonymous, false) AND raw_app_meta_data->>'role'='admin';
  UPDATE public.stories SET owner_user_id=target WHERE owner_user_id IS NULL;
END $assign$;
