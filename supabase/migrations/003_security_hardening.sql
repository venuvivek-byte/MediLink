-- ============================================================================
-- MyHealthVault — 003 Security hardening
-- ============================================================================
-- Fixes Supabase advisor findings and tightens every access path:
--   * policies apply to the `authenticated` role only (never `anon`), one per
--     command, with auth.uid() evaluated once per statement
--   * anon has no table privileges on patient data at all
--   * audit log is append-only and not writable by patients directly
--   * share token / PIN hashes cannot be read by any API role
--   * storage policies scoped to the medical-documents bucket; bucket limited
--     to 5 MB PDF/JPEG/PNG; uploaded objects cannot be overwritten
-- Idempotent where practical so it can be re-applied to a fresh project.

-- ─── Functions ──────────────────────────────────────────────────────────────

-- Pinned search_path (advisor: function_search_path_mutable).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- `rls_auto_enable` is Supabase's event-trigger helper that turns on RLS for
-- new tables. Keep it working, but it must not be callable through the API
-- (advisor: anon/authenticated_security_definer_function_executable).
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

-- ─── Remove the original catch-all policies ────────────────────────────────

DROP POLICY IF EXISTS "users_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "patients_own_documents" ON public.documents;
DROP POLICY IF EXISTS "patients_own_events" ON public.medical_events;
DROP POLICY IF EXISTS "patients_own_medications" ON public.medications;
DROP POLICY IF EXISTS "patients_own_allergies" ON public.allergies;
DROP POLICY IF EXISTS "patients_own_conditions" ON public.conditions;
DROP POLICY IF EXISTS "patients_own_lab_results" ON public.lab_results;
DROP POLICY IF EXISTS "patients_own_shares" ON public.record_shares;
DROP POLICY IF EXISTS "patients_own_audit" ON public.audit_logs;

-- ─── Table privileges ───────────────────────────────────────────────────────
-- Supabase grants ALL on public tables to anon and authenticated by default.
-- Patient data is never available to anon, and authenticated gets only the
-- commands each table needs. RLS then restricts rows.

REVOKE ALL ON
  public.profiles, public.documents, public.medical_events, public.medications,
  public.allergies, public.conditions, public.lab_results, public.record_shares,
  public.audit_logs
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.documents, public.medical_events, public.medications,
  public.allergies, public.conditions, public.lab_results
TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- record_shares: hashes are not readable by any API role. Patients may create
-- shares (the server computes the hashes) and may only change revoked_at.
GRANT SELECT (id, patient_id, scope, date_range_start, date_range_end, expires_at, revoked_at, metadata, created_at)
  ON public.record_shares TO authenticated;
GRANT INSERT ON public.record_shares TO authenticated;
GRANT UPDATE (revoked_at) ON public.record_shares TO authenticated;

-- ─── Policies: patient-owned clinical tables ───────────────────────────────

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['documents', 'medical_events', 'medications', 'allergies', 'conditions', 'lab_results']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()))',
      t || '_select_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (patient_id = (SELECT auth.uid()))',
      t || '_insert_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (patient_id = (SELECT auth.uid())) WITH CHECK (patient_id = (SELECT auth.uid()))',
      t || '_update_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (patient_id = (SELECT auth.uid()))',
      t || '_delete_own', t);
  END LOOP;
END;
$$;

-- ─── Policies: profiles ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
-- No DELETE policy: profiles are removed only via auth.users cascade.

-- ─── Policies: record_shares ────────────────────────────────────────────────

DROP POLICY IF EXISTS "record_shares_select_own" ON public.record_shares;
DROP POLICY IF EXISTS "record_shares_insert_own" ON public.record_shares;
DROP POLICY IF EXISTS "record_shares_update_own" ON public.record_shares;

CREATE POLICY "record_shares_select_own" ON public.record_shares
  FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()));
CREATE POLICY "record_shares_insert_own" ON public.record_shares
  FOR INSERT TO authenticated WITH CHECK (patient_id = (SELECT auth.uid()));
CREATE POLICY "record_shares_update_own" ON public.record_shares
  FOR UPDATE TO authenticated
  USING (patient_id = (SELECT auth.uid())) WITH CHECK (patient_id = (SELECT auth.uid()));
-- No DELETE: revoked shares are kept for the access history.

-- ─── Policies: audit_logs (append-only) ─────────────────────────────────────

DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()));
-- Writes go through public.record_audit_event() (004) or the service role.

-- ─── Storage ────────────────────────────────────────────────────────────────

UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'medical-documents';

-- The 002 policies did not restrict bucket_id and applied to every role.
DROP POLICY IF EXISTS "owner_only_upload" ON storage.objects;
DROP POLICY IF EXISTS "owner_only_read" ON storage.objects;
DROP POLICY IF EXISTS "owner_only_delete" ON storage.objects;
DROP POLICY IF EXISTS "medical_documents_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "medical_documents_select_own" ON storage.objects;
DROP POLICY IF EXISTS "medical_documents_delete_own" ON storage.objects;

CREATE POLICY "medical_documents_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY "medical_documents_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY "medical_documents_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
-- No UPDATE policy: an uploaded original can never be overwritten.
