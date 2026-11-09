-- Feedback is private: public visitors can only submit and attach an email with their receipt.
-- The API connects through restricted roles; no table is exposed to the Data API.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA feedback_private;
REVOKE ALL ON SCHEMA feedback_private FROM PUBLIC;
GRANT USAGE ON SCHEMA feedback_private TO anon, authenticated;

CREATE TABLE feedback_private.submissions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  subject text NOT NULL CHECK (subject IN ('missing_timeline', 'data_error', 'feature', 'bug', 'other')),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 5000),
  page_url text NOT NULL CHECK (length(page_url) <= 4000 AND page_url ~ '^https?://'),
  email text CHECK (length(email) <= 254 AND email ~ '^[^[:space:]@<>;,]+@[^[:space:]@<>;,]+\.[^[:space:]@<>;,]+$'),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  fingerprint text CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE feedback_private.submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback_private.submissions FROM PUBLIC, anon, authenticated, service_role;
CREATE INDEX feedback_created_idx ON feedback_private.submissions (created_at DESC, id);
CREATE INDEX feedback_fingerprint_idx ON feedback_private.submissions (fingerprint, created_at) WHERE fingerprint IS NOT NULL;

CREATE FUNCTION feedback_private.submit(p_id uuid, p_token_hash text, p_rating smallint, p_subject text, p_message text, p_page_url text, p_fingerprint text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
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

CREATE FUNCTION feedback_private.add_email(p_id uuid, p_token_hash text, p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  -- A receipt can only attach an email during the first day; no public reads or overwrites.
  UPDATE feedback_private.submissions SET email = p_email
    WHERE id = p_id AND token_hash = p_token_hash AND created_at > now() - interval '1 day'
      AND (email IS NULL OR email = p_email);
  RETURN FOUND;
END;
$function$;

CREATE FUNCTION feedback_private.list(p_offset integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM feedback_private.submissions),
    'items', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f."createdAt" DESC, f.id) FROM (
      SELECT id, rating, subject, message, page_url AS "pageUrl", email, status, created_at AS "createdAt"
      FROM feedback_private.submissions ORDER BY created_at DESC, id LIMIT 50 OFFSET greatest(p_offset, 0)
    ) f), '[]'::jsonb));
END;
$function$;

CREATE FUNCTION feedback_private.set_status(p_id uuid, p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  PERFORM admin_private.require_admin();
  UPDATE feedback_private.submissions SET status = p_status WHERE id = p_id;
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA feedback_private FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION feedback_private.submit(uuid,text,smallint,text,text,text,text), feedback_private.add_email(uuid,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION feedback_private.list(integer), feedback_private.set_status(uuid,text) TO authenticated;
COMMIT;
