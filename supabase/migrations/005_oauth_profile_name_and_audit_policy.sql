-- ============================================================================
-- MyHealthVault — 005 OAuth profile names + audit inserts without SECURITY DEFINER
-- ============================================================================
-- Email sign-up sends `display_name`; Google OAuth sends `full_name` / `name`.
-- Without this, Google users' profiles were created with the fallback name
-- "Patient". Same sanitising rules as 004: control characters stripped,
-- trimmed, at most 120 characters.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := left(btrim(regexp_replace(COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    ''), '[[:cntrl:]]', '', 'g')), 120);
  IF v_name = '' THEN
    v_name := 'Patient';
  END IF;
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE keeps existing grants, but restate the intent explicitly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ─── Audit writes without SECURITY DEFINER ─────────────────────────────────
-- Advisor (authenticated_security_definer_function_executable): instead of a
-- privileged function, patients insert audit rows directly under an RLS
-- policy enforcing the same rules as 004's function did:
--   * only for themselves
--   * only patient-originated event types (clinician/emergency access events
--     are written by the server with the service role)
--   * only referencing their own documents/shares
-- Column grants exclude id and created_at, so entries cannot be backdated.
-- No UPDATE or DELETE grants: the log stays append-only.

GRANT INSERT (patient_id, document_id, share_id, event_type, metadata) ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "audit_logs_insert_own" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = (SELECT auth.uid())
    AND event_type IN (
      'document_uploaded', 'extraction_completed', 'extraction_failed', 'extraction_confirmed',
      'extraction_cancelled', 'record_edited', 'record_deleted', 'document_deleted',
      'share_created', 'share_revoked', 'emergency_access_created', 'emergency_access_revoked',
      'profile_updated', 'duplicate_flag_resolved'
    )
    AND (document_id IS NULL OR EXISTS (
      SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.patient_id = (SELECT auth.uid())
    ))
    AND (share_id IS NULL OR EXISTS (
      SELECT 1 FROM public.record_shares s WHERE s.id = share_id AND s.patient_id = (SELECT auth.uid())
    ))
  );

-- Keep the convenience function, but it now runs with the caller's own
-- rights, so the policy above is what authorises the insert.
CREATE OR REPLACE FUNCTION public.record_audit_event(
  p_event_type text,
  p_document_id uuid DEFAULT NULL,
  p_share_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  INSERT INTO public.audit_logs (patient_id, document_id, share_id, event_type, metadata)
  VALUES ((SELECT auth.uid()), p_document_id, p_share_id, p_event_type, COALESCE(p_details, '{}'::jsonb))
  RETURNING id;
$$;

REVOKE EXECUTE ON FUNCTION public.record_audit_event(text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_audit_event(text, uuid, uuid, jsonb) TO authenticated;
