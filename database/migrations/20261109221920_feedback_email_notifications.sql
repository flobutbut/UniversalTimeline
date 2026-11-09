BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE feedback_private.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE feedback_private.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES feedback_private.submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  lease uuid,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feedback_id, user_id)
);
CREATE INDEX feedback_notification_pending_idx ON feedback_private.notification_deliveries (next_attempt_at, id) WHERE status IN ('pending','sending');
CREATE INDEX feedback_notification_user_idx ON feedback_private.notification_deliveries (user_id);
ALTER TABLE feedback_private.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_private.notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback_private.notification_preferences, feedback_private.notification_deliveries FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA feedback_private TO service_role;

CREATE FUNCTION feedback_private.notification_settings(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE me uuid := admin_private.require_admin(); address text; confirmed boolean;
BEGIN
  SELECT u.email, u.email_confirmed_at IS NOT NULL INTO address, confirmed FROM auth.users u WHERE u.id = me;
  IF p_enabled IS NOT NULL THEN
    IF p_enabled AND (NOT confirmed OR address IS NULL) THEN
      RAISE EXCEPTION 'Confirmed account email required' USING ERRCODE = '42501';
    END IF;
    INSERT INTO feedback_private.notification_preferences (user_id, enabled) VALUES (me, p_enabled)
      ON CONFLICT (user_id) DO UPDATE SET enabled = excluded.enabled;
    IF NOT p_enabled THEN
      UPDATE feedback_private.notification_deliveries SET status = 'cancelled'
        WHERE user_id = me AND status IN ('pending','sending');
    END IF;
  END IF;
  RETURN jsonb_build_object('email', address, 'enabled', coalesce((SELECT enabled FROM feedback_private.notification_preferences WHERE user_id = me), false));
END;
$function$;

CREATE FUNCTION feedback_private.enqueue_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  INSERT INTO feedback_private.notification_deliveries (feedback_id, user_id)
    SELECT NEW.id, p.user_id FROM feedback_private.notification_preferences p JOIN auth.users u ON u.id = p.user_id
    WHERE p.enabled AND u.raw_app_meta_data->>'role' = 'admin' AND u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until <= now());
  RETURN NEW;
END;
$function$;
CREATE TRIGGER feedback_enqueue_notifications AFTER INSERT ON feedback_private.submissions
  FOR EACH ROW EXECUTE FUNCTION feedback_private.enqueue_notifications();

-- Only the internal API delivery transaction assumes service_role; visitors cannot claim messages or recipients.
CREATE FUNCTION feedback_private.claim_notification()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE claimed feedback_private.notification_deliveries;
BEGIN
  UPDATE feedback_private.notification_deliveries q SET status = 'cancelled'
    WHERE q.status IN ('pending','sending') AND NOT EXISTS (
      SELECT 1 FROM feedback_private.notification_preferences p JOIN auth.users u ON u.id = p.user_id
      WHERE p.user_id = q.user_id AND p.enabled AND u.raw_app_meta_data->>'role' = 'admin'
        AND u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until <= now()));
  WITH candidate AS (
    SELECT q.id FROM feedback_private.notification_deliveries q
      WHERE q.status IN ('pending','sending') AND q.next_attempt_at <= now() AND q.attempts < 5
      ORDER BY q.next_attempt_at, q.id FOR UPDATE SKIP LOCKED LIMIT 1
  )
  UPDATE feedback_private.notification_deliveries q SET status = 'sending', attempts = q.attempts + 1,
    lease = gen_random_uuid(), next_attempt_at = now() + interval '2 minutes'
    FROM candidate c WHERE q.id = c.id RETURNING q.* INTO claimed;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN (SELECT jsonb_build_object('id', claimed.id, 'lease', claimed.lease, 'recipient', u.email,
    'feedback', jsonb_build_object('id', f.id, 'rating', f.rating, 'subject', f.subject, 'message', f.message,
      'pageUrl', f.page_url, 'email', f.email, 'status', f.status, 'createdAt', f.created_at))
    FROM feedback_private.submissions f JOIN auth.users u ON u.id = claimed.user_id WHERE f.id = claimed.feedback_id);
END;
$function$;

CREATE FUNCTION feedback_private.complete_notification(p_id uuid, p_lease uuid, p_delivered boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $function$
  UPDATE feedback_private.notification_deliveries SET
    status = CASE WHEN p_delivered THEN 'sent' WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END,
    next_attempt_at = now() + interval '5 minutes', lease = NULL
    WHERE id = p_id AND lease = p_lease AND status = 'sending';
$function$;

REVOKE ALL ON FUNCTION feedback_private.notification_settings(boolean), feedback_private.enqueue_notifications(),
  feedback_private.claim_notification(), feedback_private.complete_notification(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION feedback_private.notification_settings(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION feedback_private.claim_notification(), feedback_private.complete_notification(uuid,uuid,boolean) TO service_role;
COMMIT;
