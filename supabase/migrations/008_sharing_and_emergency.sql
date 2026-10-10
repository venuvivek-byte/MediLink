-- ============================================================================
-- MyHealthVault — 008 Sharing, emergency access and audit (Phase 5)
-- ============================================================================
-- Patient-side (role authenticated, SECURITY INVOKER, RLS applies):
--   create_record_share / revoke_record_share
--   create_emergency_access / update_emergency_access / revoke_emergency_access
--   update_profile
--   Each change and its audit entry are written in one transaction.
--
-- Server-side (role service_role only; called after the server has resolved a
-- hashed token, never reachable from the browser):
--   claim_share_pin_attempt  atomically reserves one PIN attempt, so parallel
--                            guesses cannot get past the lockout
--   record_public_access     writes share_access_logs (throttled), updates
--                            last_accessed_at and clears the attempt counter
--                            after a correct PIN
--
-- Also tightens INSERT on record_shares / emergency_access to the columns a
-- patient may set: counters, lock times, revocation and timestamps are
-- server-controlled.

-- ─── Column privileges ──────────────────────────────────────────────────────

REVOKE INSERT ON public.record_shares FROM authenticated;
GRANT INSERT (patient_id, token_hash, pin_hash, scope, label, expires_at, consent_given_at)
  ON public.record_shares TO authenticated;

REVOKE INSERT ON public.emergency_access FROM authenticated;
-- id is supplied by the server: the responder link is derived from it.
GRANT INSERT (id, patient_id, token_hash, show_blood_group, show_date_of_birth, show_allergies, show_conditions,
              show_emergency_contact, medication_ids, patient_note, consent_given_at, expires_at)
  ON public.emergency_access TO authenticated;
GRANT UPDATE (show_blood_group, show_date_of_birth, show_allergies, show_conditions, show_emergency_contact,
              medication_ids, patient_note)
  ON public.emergency_access TO authenticated;

-- ─── Audit: one more patient-originated event type ─────────────────────────

DROP POLICY IF EXISTS "audit_logs_insert_own" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = (SELECT auth.uid())
    AND event_type IN (
      'document_uploaded', 'extraction_completed', 'extraction_failed', 'extraction_confirmed',
      'extraction_cancelled', 'record_edited', 'record_deleted', 'document_deleted',
      'share_created', 'share_revoked', 'emergency_access_created', 'emergency_access_revoked',
      'emergency_access_updated', 'profile_updated', 'duplicate_flag_resolved'
    )
    AND (document_id IS NULL OR EXISTS (
      SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.patient_id = (SELECT auth.uid())
    ))
    AND (share_id IS NULL OR EXISTS (
      SELECT 1 FROM public.record_shares s WHERE s.id = share_id AND s.patient_id = (SELECT auth.uid())
    ))
  );

-- ─── Share links ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_record_share(
  p_token_hash text,
  p_pin_hash text,
  p_label text,
  p_categories text[],
  p_include_unreviewed boolean,
  p_expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_categories text[];
  v_label text := NULLIF(btrim(regexp_replace(COALESCE(p_label, ''), '[[:cntrl:]]', '', 'g')), '');
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(DISTINCT c ORDER BY c) INTO v_categories FROM unnest(p_categories) AS c WHERE c IS NOT NULL;
  IF v_categories IS NULL
     OR NOT v_categories <@ ARRAY['allergies', 'conditions', 'lab_results', 'medications', 'timeline'] THEN
    RAISE EXCEPTION 'Choose at least one supported category' USING ERRCODE = '22023';
  END IF;
  IF v_label IS NOT NULL AND char_length(v_label) > 100 THEN
    RAISE EXCEPTION 'Label is too long' USING ERRCODE = '22023';
  END IF;
  IF p_expires_at IS NULL OR p_expires_at < now() + interval '1 hour' OR p_expires_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'Expiry must be between 1 hour and 90 days' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.record_shares (patient_id, token_hash, pin_hash, scope, label, expires_at, consent_given_at)
  VALUES (
    v_uid, p_token_hash, p_pin_hash,
    jsonb_build_object('categories', to_jsonb(v_categories), 'include_unreviewed', COALESCE(p_include_unreviewed, false)),
    v_label, p_expires_at, now()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs (patient_id, share_id, event_type, metadata)
  VALUES (v_uid, v_id, 'share_created', jsonb_build_object(
    'label', COALESCE(v_label, 'Clinician share'), 'categories', cardinality(v_categories)
  ));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_record_share(p_share_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_label text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.record_shares SET revoked_at = now()
  WHERE id = p_share_id AND patient_id = v_uid AND revoked_at IS NULL
  RETURNING COALESCE(label, 'Clinician share') INTO v_label;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found or already revoked' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (patient_id, share_id, event_type, metadata)
  VALUES (v_uid, p_share_id, 'share_revoked', jsonb_build_object('label', v_label));
END;
$$;

-- ─── Emergency access ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_emergency_fields(p_medication_ids uuid[], p_note text)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_ids uuid[];
  v_owned int;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), '{}') INTO v_ids FROM unnest(p_medication_ids) AS x WHERE x IS NOT NULL;
  IF cardinality(v_ids) > 50 THEN
    RAISE EXCEPTION 'Too many medications' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_owned FROM public.medications WHERE id = ANY (v_ids) AND patient_id = (SELECT auth.uid());
  IF v_owned <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Medication not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'Note is too long' USING ERRCODE = '22023';
  END IF;
  RETURN v_ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_emergency_access(
  p_id uuid,
  p_token_hash text,
  p_show_blood_group boolean,
  p_show_date_of_birth boolean,
  p_show_allergies boolean,
  p_show_conditions boolean,
  p_show_emergency_contact boolean,
  p_medication_ids uuid[],
  p_patient_note text,
  p_expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_note text := NULLIF(btrim(COALESCE(p_patient_note, '')), '');
  v_old uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  v_ids := public.validate_emergency_fields(p_medication_ids, v_note);
  IF p_expires_at IS NULL OR p_expires_at < now() + interval '1 day' OR p_expires_at > now() + interval '400 days' THEN
    RAISE EXCEPTION 'Expiry must be between 1 and 400 days' USING ERRCODE = '22023';
  END IF;

  -- Replacing the link: the old one stops working in the same transaction.
  UPDATE public.emergency_access SET revoked_at = now()
  WHERE patient_id = v_uid AND revoked_at IS NULL
  RETURNING id INTO v_old;
  IF v_old IS NOT NULL THEN
    INSERT INTO public.audit_logs (patient_id, event_type, metadata)
    VALUES (v_uid, 'emergency_access_revoked', jsonb_build_object('reason', 'replaced'));
  END IF;

  INSERT INTO public.emergency_access (
    id, patient_id, token_hash, show_blood_group, show_date_of_birth, show_allergies, show_conditions,
    show_emergency_contact, medication_ids, patient_note, consent_given_at, expires_at
  )
  VALUES (
    p_id, v_uid, p_token_hash, COALESCE(p_show_blood_group, false), COALESCE(p_show_date_of_birth, false),
    COALESCE(p_show_allergies, false), COALESCE(p_show_conditions, false), COALESCE(p_show_emergency_contact, false),
    v_ids, v_note, now(), p_expires_at
  );

  INSERT INTO public.audit_logs (patient_id, event_type, metadata)
  VALUES (v_uid, 'emergency_access_created', '{}'::jsonb);
  RETURN p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_emergency_access(
  p_show_blood_group boolean,
  p_show_date_of_birth boolean,
  p_show_allergies boolean,
  p_show_conditions boolean,
  p_show_emergency_contact boolean,
  p_medication_ids uuid[],
  p_patient_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_note text := NULLIF(btrim(COALESCE(p_patient_note, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  v_ids := public.validate_emergency_fields(p_medication_ids, v_note);

  UPDATE public.emergency_access
  SET show_blood_group = COALESCE(p_show_blood_group, false),
      show_date_of_birth = COALESCE(p_show_date_of_birth, false),
      show_allergies = COALESCE(p_show_allergies, false),
      show_conditions = COALESCE(p_show_conditions, false),
      show_emergency_contact = COALESCE(p_show_emergency_contact, false),
      medication_ids = v_ids,
      patient_note = v_note
  WHERE patient_id = v_uid AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active emergency link' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (patient_id, event_type, metadata)
  VALUES (v_uid, 'emergency_access_updated', '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_emergency_access()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  UPDATE public.emergency_access SET revoked_at = now() WHERE patient_id = v_uid AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active emergency link' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.audit_logs (patient_id, event_type, metadata)
  VALUES (v_uid, 'emergency_access_revoked', jsonb_build_object('reason', 'turned_off'));
END;
$$;

-- ─── Profile ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_profile(
  p_display_name text,
  p_date_of_birth date,
  p_blood_group text,
  p_emergency_contact jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := btrim(regexp_replace(COALESCE(p_display_name, ''), '[[:cntrl:]]', '', 'g'));
  v_contact jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Name must be 1 to 120 characters' USING ERRCODE = '22023';
  END IF;
  IF p_date_of_birth IS NOT NULL AND (p_date_of_birth > current_date OR p_date_of_birth < date '1900-01-01') THEN
    RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(p_blood_group, '') IS NOT NULL AND p_blood_group NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') THEN
    RAISE EXCEPTION 'Invalid blood group' USING ERRCODE = '22023';
  END IF;

  -- Only name / phone / relationship are kept; anything else is dropped.
  IF p_emergency_contact IS NOT NULL AND jsonb_typeof(p_emergency_contact) = 'object' THEN
    v_contact := jsonb_strip_nulls(jsonb_build_object(
      'name', NULLIF(left(btrim(p_emergency_contact->>'name'), 120), ''),
      'phone', NULLIF(left(btrim(p_emergency_contact->>'phone'), 40), ''),
      'relationship', NULLIF(left(btrim(p_emergency_contact->>'relationship'), 60), '')
    ));
    IF v_contact = '{}'::jsonb THEN
      v_contact := NULL;
    ELSIF NOT (v_contact ? 'name' AND v_contact ? 'phone') THEN
      RAISE EXCEPTION 'An emergency contact needs a name and a phone number' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.profiles
  SET display_name = v_name,
      date_of_birth = p_date_of_birth,
      blood_group = NULLIF(p_blood_group, ''),
      emergency_contact = v_contact,
      updated_at = now()
  WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  -- No values in the log: the profile itself is the record.
  INSERT INTO public.audit_logs (patient_id, event_type, metadata)
  VALUES (v_uid, 'profile_updated', '{}'::jsonb);
END;
$$;

-- ─── Server-only: PIN attempts and access logging ──────────────────────────

-- Reserves one PIN attempt before the PIN is checked. Returns the attempt
-- number, or NULL when the share is locked, revoked, expired or unknown.
-- The row lock serialises parallel requests, so at most 5 guesses fit in a
-- 15-minute window, and after 20 failed attempts the link stays locked until
-- it expires. A correct PIN resets the counter (record_public_access).
CREATE OR REPLACE FUNCTION public.claim_share_pin_attempt(p_share_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_attempts integer;
BEGIN
  UPDATE public.record_shares
  SET failed_pin_attempts = failed_pin_attempts + 1,
      locked_until = CASE
        WHEN failed_pin_attempts + 1 >= 20 THEN expires_at
        WHEN (failed_pin_attempts + 1) % 5 = 0 THEN now() + interval '15 minutes'
        ELSE locked_until
      END
  WHERE id = p_share_id
    AND revoked_at IS NULL
    AND expires_at > now()
    AND (locked_until IS NULL OR locked_until <= now())
  RETURNING failed_pin_attempts INTO v_attempts;
  RETURN v_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_public_access(
  p_share_id uuid,
  p_emergency_access_id uuid,
  p_outcome text,
  p_ip_hash text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_patient uuid;
BEGIN
  IF num_nonnulls(p_share_id, p_emergency_access_id) <> 1 THEN
    RAISE EXCEPTION 'Exactly one target is required' USING ERRCODE = '22023';
  END IF;

  IF p_share_id IS NOT NULL THEN
    SELECT patient_id INTO v_patient FROM public.record_shares WHERE id = p_share_id;
  ELSE
    SELECT patient_id INTO v_patient FROM public.emergency_access WHERE id = p_emergency_access_id;
  END IF;
  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Unknown target' USING ERRCODE = 'P0002';
  END IF;

  IF p_outcome = 'granted' THEN
    IF p_share_id IS NOT NULL THEN
      UPDATE public.record_shares
      SET failed_pin_attempts = 0, locked_until = NULL, last_accessed_at = now()
      WHERE id = p_share_id;
    ELSE
      UPDATE public.emergency_access SET last_accessed_at = now() WHERE id = p_emergency_access_id;
    END IF;
  END IF;

  -- Repeated page loads and denied retries from the same client are logged
  -- once per 10 minutes. Wrong PINs and clinician PIN entries are always
  -- logged (they are already limited by the lockout).
  IF p_outcome IN ('pin_failed') OR (p_outcome = 'granted' AND p_share_id IS NOT NULL) OR NOT EXISTS (
    SELECT 1 FROM public.share_access_logs l
    WHERE l.share_id IS NOT DISTINCT FROM p_share_id
      AND l.emergency_access_id IS NOT DISTINCT FROM p_emergency_access_id
      AND l.outcome = p_outcome
      AND l.ip_hash IS NOT DISTINCT FROM p_ip_hash
      AND l.occurred_at > now() - interval '10 minutes'
  ) THEN
    INSERT INTO public.share_access_logs (patient_id, share_id, emergency_access_id, outcome, ip_hash, user_agent)
    VALUES (v_patient, p_share_id, p_emergency_access_id, p_outcome, p_ip_hash, left(p_user_agent, 200));
  END IF;
END;
$$;

-- ─── Execute privileges ─────────────────────────────────────────────────────
-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default, so every grant here is explicit.

REVOKE EXECUTE ON FUNCTION public.create_record_share(text, text, text, text[], boolean, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_record_share(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_emergency_fields(uuid[], text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_emergency_access(uuid, text, boolean, boolean, boolean, boolean, boolean, uuid[], text, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_emergency_access(boolean, boolean, boolean, boolean, boolean, uuid[], text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_emergency_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_profile(text, date, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_record_share(text, text, text, text[], boolean, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_record_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_emergency_fields(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_emergency_access(uuid, text, boolean, boolean, boolean, boolean, boolean, uuid[], text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_emergency_access(boolean, boolean, boolean, boolean, boolean, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_emergency_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile(text, date, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_share_pin_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_public_access(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_share_pin_attempt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_public_access(uuid, uuid, text, text, text) TO service_role;
