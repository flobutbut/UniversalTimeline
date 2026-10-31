-- Run in an explicit privileged transaction after setting timeline.admin_email.
-- Requires an existing confirmed account. Never creates users or assigns stories.
DO $admin$
DECLARE target uuid; requested text := current_setting('timeline.admin_email', true);
BEGIN
  IF requested IS NULL OR btrim(requested) = '' THEN
    RAISE EXCEPTION 'timeline.admin_email must be supplied explicitly';
  END IF;
  SELECT id INTO STRICT target FROM auth.users
    WHERE lower(email)=lower(btrim(requested)) AND email_confirmed_at IS NOT NULL
      AND NOT coalesce(is_anonymous, false);
  UPDATE auth.users
    SET raw_app_meta_data=coalesce(raw_app_meta_data, '{}'::jsonb)||jsonb_build_object('role','admin')
    WHERE id=target;
END $admin$;
