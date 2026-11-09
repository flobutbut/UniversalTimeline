BEGIN;
SET LOCAL lock_timeout = '5s';

-- Singleton setting: public readers learn only whether feedback is enabled.
CREATE TABLE feedback_private.configuration (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT true
);
INSERT INTO feedback_private.configuration (singleton) VALUES (true);
ALTER TABLE feedback_private.configuration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback_private.configuration FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION feedback_private.is_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT enabled FROM feedback_private.configuration WHERE singleton;
$function$;

CREATE FUNCTION feedback_private.set_enabled(p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'Enabled is required' USING ERRCODE = '22023'; END IF;
  UPDATE feedback_private.configuration SET enabled = p_enabled WHERE singleton;
  IF NOT p_enabled THEN
    UPDATE feedback_private.notification_deliveries SET status = 'cancelled', lease = NULL
      WHERE status IN ('pending', 'sending');
  END IF;
  RETURN p_enabled;
END;
$function$;

-- Hold a shared lock until the write commits, so disabling waits for in-flight writes.
CREATE FUNCTION feedback_private.require_enabled()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF NOT (SELECT enabled FROM feedback_private.configuration WHERE singleton FOR SHARE) THEN
    RAISE EXCEPTION 'Feedback is disabled' USING ERRCODE = 'UT503';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION feedback_private.submit(p_id uuid, p_token_hash text, p_rating smallint, p_subject text, p_message text, p_page_url text, p_fingerprint text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM feedback_private.require_enabled();
  -- Serialize a source's submissions so concurrent requests cannot bypass the burst limit.
  IF p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid fingerprint' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_fingerprint, 0));
  IF NOT EXISTS (SELECT 1 FROM feedback_private.submissions WHERE id = p_id) THEN
    IF (SELECT count(*) FROM feedback_private.submissions WHERE fingerprint = p_fingerprint AND created_at > now() - interval '15 minutes') >= 10 THEN
      RAISE EXCEPTION 'Too many submissions' USING ERRCODE = 'UT429';
    END IF;
    INSERT INTO feedback_private.submissions (id, token_hash, rating, subject, message, page_url, fingerprint)
      VALUES (p_id, p_token_hash, p_rating, p_subject, p_message, p_page_url, p_fingerprint)
      ON CONFLICT (id) DO NOTHING;
  END IF;
  -- Same receipt and same content: safely acknowledge a retry after a lost HTTP response.
  IF NOT EXISTS (SELECT 1 FROM feedback_private.submissions WHERE id = p_id AND token_hash = p_token_hash
    AND rating IS NOT DISTINCT FROM p_rating AND subject = p_subject AND message = p_message AND page_url = p_page_url) THEN
    RAISE EXCEPTION 'Receipt conflict' USING ERRCODE = '23505';
  END IF;
  UPDATE feedback_private.submissions SET fingerprint = NULL WHERE fingerprint IS NOT NULL AND created_at < now() - interval '1 day';
END;
$function$;

CREATE OR REPLACE FUNCTION feedback_private.add_email(p_id uuid, p_token_hash text, p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM feedback_private.require_enabled();
  -- A receipt can only attach an email during the first day; no public reads or overwrites.
  UPDATE feedback_private.submissions SET email = p_email
    WHERE id = p_id AND token_hash = p_token_hash AND created_at > now() - interval '1 day'
      AND (email IS NULL OR email = p_email);
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION feedback_private.claim_notification()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE claimed feedback_private.notification_deliveries;
BEGIN
  IF NOT (SELECT enabled FROM feedback_private.configuration WHERE singleton FOR SHARE) THEN RETURN NULL; END IF;
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

REVOKE ALL ON FUNCTION feedback_private.is_enabled(), feedback_private.set_enabled(boolean), feedback_private.require_enabled()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION feedback_private.is_enabled() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION feedback_private.set_enabled(boolean) TO authenticated;
COMMIT;
