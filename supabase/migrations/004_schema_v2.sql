-- ============================================================================
-- MyHealthVault — 004 Schema v2
-- ============================================================================
-- * normalises existing values, then constrains every status/enum column
-- * same-patient composite foreign keys between records and their sources
-- * source traceability (page + excerpt + extraction) on extracted records
-- * document processing fields, duplicate-upload hash, private-path check
-- * new tables: document_extractions, document_pages, emergency_access,
--   share_access_logs
-- * share columns for PIN attempt limiting; revocation is one-way
-- * automatic profile creation on sign-up; audited writes via a function
-- Requires PostgreSQL 15+ (ON DELETE SET NULL (column) syntax).

-- ─── 1. Normalise existing values ──────────────────────────────────────────
-- Unknown or missing review states become 'unverified' (never upgraded).

UPDATE public.documents SET extraction_status = 'completed' WHERE extraction_status = 'done';
UPDATE public.documents SET extraction_status = 'pending'
  WHERE extraction_status IS NULL OR extraction_status NOT IN ('pending', 'processing', 'completed', 'failed');

UPDATE public.medications SET status = 'active' WHERE status = 'current';
UPDATE public.medications SET status = 'unknown'
  WHERE status IS NULL OR status NOT IN ('active', 'historical', 'discontinued', 'unknown');
UPDATE public.conditions SET status = 'unknown'
  WHERE status IS NULL OR status NOT IN ('active', 'resolved', 'unknown');

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['documents', 'medical_events', 'medications', 'allergies', 'conditions', 'lab_results']
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET verification_status = ''unverified'' WHERE verification_status IS NULL OR verification_status NOT IN (''verified'', ''unverified'')',
      t);
    EXECUTE format('UPDATE public.%I SET created_at = now() WHERE created_at IS NULL', t);
  END LOOP;
END;
$$;

-- ─── 2. Common columns, constraints and updated_at triggers ───────────────

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['documents', 'medical_events', 'medications', 'allergies', 'conditions', 'lab_results']
  LOOP
    -- Meaning: 'unverified' = pending patient review;
    --          'verified'   = confirmed by the patient (NOT clinically verified).
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN verification_status SET DEFAULT ''unverified''', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN verification_status SET NOT NULL', t);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (verification_status IN (''unverified'', ''verified''))',
      t, t || '_verification_status_check');

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_at SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'set_' || t || '_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      'set_' || t || '_updated_at', t);
  END LOOP;
END;
$$;

-- ─── 3. profiles ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_check CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT profiles_blood_group_check
    CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  ADD CONSTRAINT profiles_emergency_contact_check
    CHECK (emergency_contact IS NULL OR jsonb_typeof(emergency_contact) = 'object');

-- ─── 4. documents ───────────────────────────────────────────────────────────

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS facility_name text,
  ADD COLUMN IF NOT EXISTS content_sha256 text,
  ADD COLUMN IF NOT EXISTS size_bytes integer,
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS processing_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

UPDATE public.documents SET facility_name = metadata->>'facility'
  WHERE facility_name IS NULL AND metadata ? 'facility';

ALTER TABLE public.documents
  ALTER COLUMN extraction_status SET DEFAULT 'pending',
  ALTER COLUMN extraction_status SET NOT NULL,
  ADD CONSTRAINT documents_extraction_status_check
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD CONSTRAINT documents_document_type_check
    CHECK (document_type IS NULL OR document_type IN ('prescription', 'lab_report', 'discharge_summary', 'other')),
  ADD CONSTRAINT documents_mime_type_check
    CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  ADD CONSTRAINT documents_size_check CHECK (size_bytes IS NULL OR size_bytes BETWEEN 1 AND 5242880),
  ADD CONSTRAINT documents_page_count_check CHECK (page_count IS NULL OR page_count BETWEEN 1 AND 50),
  ADD CONSTRAINT documents_sha256_check CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT documents_attempts_check CHECK (processing_attempts BETWEEN 0 AND 10),
  ADD CONSTRAINT documents_processing_error_check CHECK (char_length(processing_error) <= 500),
  ADD CONSTRAINT documents_filename_check CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  -- A document row can only point into its owner's storage folder.
  ADD CONSTRAINT documents_storage_path_owner_check CHECK (split_part(storage_path, '/', 1) = patient_id::text),
  ADD CONSTRAINT documents_storage_path_unique UNIQUE (storage_path),
  -- Target for same-patient composite foreign keys.
  ADD CONSTRAINT documents_id_patient_unique UNIQUE (id, patient_id);

-- The same file cannot be imported twice by the same patient.
CREATE UNIQUE INDEX IF NOT EXISTS documents_patient_sha256_unique
  ON public.documents (patient_id, content_sha256) WHERE content_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_patient_created_idx ON public.documents (patient_id, created_at DESC);

-- ─── 5. Extraction staging (pre-review output, kept separate) ─────────────

CREATE TABLE IF NOT EXISTS public.document_extractions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL,
  patient_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'succeeded', 'failed', 'confirmed', 'cancelled')),
  text_source     text CHECK (text_source IN ('pdf_text', 'ocr', 'mixed', 'none')),
  ocr_provider    text CHECK (char_length(ocr_provider) <= 50),
  ai_provider     text CHECK (char_length(ai_provider) <= 50),
  ai_model        text CHECK (char_length(ai_model) <= 100),
  schema_version  text NOT NULL CHECK (char_length(schema_version) <= 20),
  is_simulated    boolean NOT NULL DEFAULT false,
  output          jsonb CHECK (output IS NULL OR jsonb_typeof(output) = 'object'),
  error_code      text CHECK (char_length(error_code) <= 64),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_extractions_document_fk
    FOREIGN KEY (document_id, patient_id) REFERENCES public.documents (id, patient_id) ON DELETE CASCADE,
  CONSTRAINT document_extractions_id_patient_unique UNIQUE (id, patient_id)
);
CREATE INDEX IF NOT EXISTS document_extractions_document_idx ON public.document_extractions (document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_extractions_patient_idx ON public.document_extractions (patient_id);
CREATE TRIGGER set_document_extractions_updated_at BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.document_pages (
  document_id     uuid NOT NULL,
  patient_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number     integer NOT NULL CHECK (page_number BETWEEN 1 AND 50),
  text_source     text NOT NULL CHECK (text_source IN ('pdf_text', 'ocr')),
  content         text NOT NULL CHECK (char_length(content) <= 100000),
  ocr_confidence  real CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1)),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, page_number),
  CONSTRAINT document_pages_document_fk
    FOREIGN KEY (document_id, patient_id) REFERENCES public.documents (id, patient_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS document_pages_patient_idx ON public.document_pages (patient_id);

-- ─── 6. Clinical tables: same-patient source links + traceability ─────────

DO $$
DECLARE
  t text;
  doc_col text;
BEGIN
  FOREACH t IN ARRAY ARRAY['medical_events', 'medications', 'allergies', 'conditions', 'lab_results']
  LOOP
    doc_col := CASE WHEN t = 'medical_events' THEN 'document_id' ELSE 'source_document_id' END;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS extraction_id uuid', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS source_page integer', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS source_excerpt text', t);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (source_page IS NULL OR source_page BETWEEN 1 AND 50)',
      t, t || '_source_page_check');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (char_length(source_excerpt) <= 1000)',
      t, t || '_source_excerpt_check');

    -- Replace the single-column FK with one that also requires the same patient.
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_' || doc_col || '_fkey');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I, patient_id) REFERENCES public.documents (id, patient_id) ON DELETE SET NULL (%I)',
      t, t || '_source_document_fk', doc_col, doc_col);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (extraction_id, patient_id) REFERENCES public.document_extractions (id, patient_id) ON DELETE SET NULL (extraction_id)',
      t, t || '_extraction_fk');

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', t || '_source_document_idx', t, doc_col);
  END LOOP;
END;
$$;

-- medications
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS prescriber_name text,
  ADD COLUMN IF NOT EXISTS facility_name text,
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS instructions text;
UPDATE public.medications
  SET prescriber_name = COALESCE(prescriber_name, metadata->>'provider'),
      facility_name = COALESCE(facility_name, metadata->>'facility')
  WHERE metadata IS NOT NULL;
ALTER TABLE public.medications
  ALTER COLUMN status SET DEFAULT 'unknown',
  ALTER COLUMN status SET NOT NULL,
  ADD CONSTRAINT medications_status_check CHECK (status IN ('active', 'historical', 'discontinued', 'unknown')),
  ADD CONSTRAINT medications_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  ADD CONSTRAINT medications_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 200);
CREATE INDEX IF NOT EXISTS medications_patient_start_idx ON public.medications (patient_id, start_date DESC);
CREATE INDEX IF NOT EXISTS medications_patient_name_idx ON public.medications (patient_id, normalized_name);

-- lab_results
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS lab_name text;
ALTER TABLE public.lab_results
  ADD CONSTRAINT lab_results_test_name_check CHECK (char_length(btrim(test_name)) BETWEEN 1 AND 200);
COMMENT ON COLUMN public.lab_results.is_abnormal IS
  'Deprecated and not displayed: MyHealthVault does not interpret results.';
-- The 001 full-text index was never used by any query.
DROP INDEX IF EXISTS public.idx_lab_results_normalized;
CREATE INDEX IF NOT EXISTS lab_results_patient_date_idx ON public.lab_results (patient_id, test_date DESC);
CREATE INDEX IF NOT EXISTS lab_results_patient_test_idx ON public.lab_results (patient_id, normalized_test_name);

-- medical_events
ALTER TABLE public.medical_events
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS facility_name text;
UPDATE public.medical_events
  SET provider_name = COALESCE(provider_name, structured_data->>'provider'),
      facility_name = COALESCE(facility_name, structured_data->>'facility', structured_data->>'lab')
  WHERE structured_data IS NOT NULL;
ALTER TABLE public.medical_events
  ADD CONSTRAINT medical_events_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 200);
CREATE INDEX IF NOT EXISTS medical_events_patient_date_idx ON public.medical_events (patient_id, event_date DESC);

-- conditions (also used for diagnoses extracted from documents)
ALTER TABLE public.conditions ADD COLUMN IF NOT EXISTS diagnosed_date date;
ALTER TABLE public.conditions
  ALTER COLUMN status SET DEFAULT 'unknown',
  ALTER COLUMN status SET NOT NULL,
  ADD CONSTRAINT conditions_status_check CHECK (status IN ('active', 'resolved', 'unknown')),
  ADD CONSTRAINT conditions_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 200);
COMMENT ON TABLE public.conditions IS 'Conditions and diagnoses, patient-reported or extracted from documents.';
CREATE INDEX IF NOT EXISTS conditions_patient_idx ON public.conditions (patient_id);

-- allergies
ALTER TABLE public.allergies
  ADD CONSTRAINT allergies_substance_check CHECK (char_length(btrim(substance)) BETWEEN 1 AND 200);
CREATE INDEX IF NOT EXISTS allergies_patient_idx ON public.allergies (patient_id);

-- ─── 7. record_shares ───────────────────────────────────────────────────────

ALTER TABLE public.record_shares
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS document_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;
UPDATE public.record_shares SET label = metadata->>'label' WHERE label IS NULL AND metadata ? 'label';
UPDATE public.record_shares SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.record_shares
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT record_shares_label_check CHECK (char_length(label) <= 100),
  ADD CONSTRAINT record_shares_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT record_shares_pin_hash_check CHECK (pin_hash ~ '^\$2[aby]\$\d{2}\$'),
  ADD CONSTRAINT record_shares_scope_check
    CHECK (jsonb_typeof(scope) = 'object' AND jsonb_typeof(scope->'categories') = 'array'),
  ADD CONSTRAINT record_shares_expiry_check
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '90 days'),
  ADD CONSTRAINT record_shares_attempts_check CHECK (failed_pin_attempts >= 0),
  ADD CONSTRAINT record_shares_id_patient_unique UNIQUE (id, patient_id);
CREATE INDEX IF NOT EXISTS record_shares_patient_idx ON public.record_shares (patient_id, created_at DESC);
-- idx_shares_token_hash from 001 duplicates the UNIQUE constraint's index.
DROP INDEX IF EXISTS public.idx_shares_token_hash;

GRANT SELECT (label, document_ids, consent_given_at, failed_pin_attempts, locked_until, last_accessed_at)
  ON public.record_shares TO authenticated;

-- Revocation is one-way and always stamped with the server's clock.
CREATE OR REPLACE FUNCTION public.enforce_one_way_revocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'A revoked link cannot be reactivated or changed' USING ERRCODE = '42501';
  END IF;
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    NEW.revoked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_shares_one_way_revocation ON public.record_shares;
CREATE TRIGGER record_shares_one_way_revocation BEFORE UPDATE ON public.record_shares
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_way_revocation();

-- ─── 8. emergency_access ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.emergency_access (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash              text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  -- Nothing is shown unless the patient explicitly opts in.
  show_blood_group        boolean NOT NULL DEFAULT false,
  show_date_of_birth      boolean NOT NULL DEFAULT false,
  show_allergies          boolean NOT NULL DEFAULT false,
  show_conditions         boolean NOT NULL DEFAULT false,
  show_emergency_contact  boolean NOT NULL DEFAULT false,
  medication_ids          uuid[] NOT NULL DEFAULT '{}',
  patient_note            text CHECK (char_length(patient_note) <= 500),
  consent_given_at        timestamptz NOT NULL,
  expires_at              timestamptz NOT NULL,
  revoked_at              timestamptz,
  last_accessed_at        timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT emergency_access_expiry_check
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '400 days'),
  CONSTRAINT emergency_access_id_patient_unique UNIQUE (id, patient_id)
);
-- At most one live emergency link per patient; renewal revokes the old one.
CREATE UNIQUE INDEX IF NOT EXISTS emergency_access_one_live
  ON public.emergency_access (patient_id) WHERE revoked_at IS NULL;
CREATE TRIGGER set_emergency_access_updated_at BEFORE UPDATE ON public.emergency_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER emergency_access_one_way_revocation BEFORE UPDATE ON public.emergency_access
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_way_revocation();

-- ─── 9. share_access_logs (clinician + emergency access attempts) ─────────

CREATE TABLE IF NOT EXISTS public.share_access_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id             uuid,
  emergency_access_id  uuid,
  outcome              text NOT NULL CHECK (outcome IN ('granted', 'pin_failed', 'locked', 'expired', 'revoked')),
  -- Keyed hash of the client IP; the raw address is never stored.
  ip_hash              text CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent           text CHECK (char_length(user_agent) <= 200),
  occurred_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT share_access_logs_target_check CHECK (num_nonnulls(share_id, emergency_access_id) = 1),
  -- The log's patient must be the owner of the share / emergency link.
  CONSTRAINT share_access_logs_share_fk
    FOREIGN KEY (share_id, patient_id) REFERENCES public.record_shares (id, patient_id) ON DELETE CASCADE,
  CONSTRAINT share_access_logs_emergency_fk
    FOREIGN KEY (emergency_access_id, patient_id) REFERENCES public.emergency_access (id, patient_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS share_access_logs_patient_idx ON public.share_access_logs (patient_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS share_access_logs_share_idx ON public.share_access_logs (share_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS share_access_logs_emergency_idx ON public.share_access_logs (emergency_access_id, occurred_at DESC);

-- ─── 10. audit_logs ─────────────────────────────────────────────────────────

UPDATE public.audit_logs SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.audit_logs
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT audit_logs_event_type_check CHECK (event_type ~ '^[a-z][a-z_]{2,49}$'),
  ADD CONSTRAINT audit_logs_metadata_check
    CHECK (metadata IS NULL OR (jsonb_typeof(metadata) = 'object' AND pg_column_size(metadata) <= 2048));
CREATE INDEX IF NOT EXISTS audit_logs_share_idx ON public.audit_logs (share_id);
CREATE INDEX IF NOT EXISTS audit_logs_document_idx ON public.audit_logs (document_id);

-- Patients write audit events only through this function: it stamps their
-- own id, accepts only patient-originated event types, and only references
-- documents/shares they own. Clinician/emergency access events are written
-- by the server with the service role.
CREATE OR REPLACE FUNCTION public.record_audit_event(
  p_event_type text,
  p_document_id uuid DEFAULT NULL,
  p_share_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_event_type NOT IN (
    'document_uploaded', 'extraction_completed', 'extraction_failed', 'extraction_confirmed',
    'extraction_cancelled', 'record_edited', 'record_deleted', 'document_deleted',
    'share_created', 'share_revoked', 'emergency_access_created', 'emergency_access_revoked',
    'profile_updated', 'duplicate_flag_resolved'
  ) THEN
    RAISE EXCEPTION 'Unsupported audit event type' USING ERRCODE = '22023';
  END IF;
  IF p_document_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.documents WHERE id = p_document_id AND patient_id = v_uid) THEN
    RAISE EXCEPTION 'Unknown document' USING ERRCODE = '42501';
  END IF;
  IF p_share_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.record_shares WHERE id = p_share_id AND patient_id = v_uid) THEN
    RAISE EXCEPTION 'Unknown share' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_logs (patient_id, document_id, share_id, event_type, metadata)
  VALUES (v_uid, p_document_id, p_share_id, p_event_type, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_audit_event(text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_audit_event(text, uuid, uuid, jsonb) TO authenticated;

-- ─── 11. Automatic profile on sign-up ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := left(btrim(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'display_name', ''), '[[:cntrl:]]', '', 'g')), 120);
  IF v_name = '' THEN
    v_name := 'Patient';
  END IF;
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing users.
INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, 'Patient'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ─── 12. Privileges and RLS for the new tables ─────────────────────────────

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_access_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.document_extractions, public.document_pages, public.emergency_access, public.share_access_logs
  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.document_extractions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.document_pages TO authenticated;
GRANT SELECT (id, patient_id, show_blood_group, show_date_of_birth, show_allergies, show_conditions,
              show_emergency_contact, medication_ids, patient_note, consent_given_at, expires_at,
              revoked_at, last_accessed_at, created_at, updated_at)
  ON public.emergency_access TO authenticated;
GRANT INSERT ON public.emergency_access TO authenticated;
GRANT UPDATE (revoked_at) ON public.emergency_access TO authenticated;
GRANT SELECT ON public.share_access_logs TO authenticated;

CREATE POLICY "document_extractions_select_own" ON public.document_extractions
  FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()));
CREATE POLICY "document_extractions_insert_own" ON public.document_extractions
  FOR INSERT TO authenticated WITH CHECK (patient_id = (SELECT auth.uid()));
CREATE POLICY "document_extractions_update_own" ON public.document_extractions
  FOR UPDATE TO authenticated
  USING (patient_id = (SELECT auth.uid())) WITH CHECK (patient_id = (SELECT auth.uid()));

CREATE POLICY "document_pages_select_own" ON public.document_pages
  FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()));
CREATE POLICY "document_pages_insert_own" ON public.document_pages
  FOR INSERT TO authenticated WITH CHECK (patient_id = (SELECT auth.uid()));
CREATE POLICY "document_pages_delete_own" ON public.document_pages
  FOR DELETE TO authenticated USING (patient_id = (SELECT auth.uid()));

CREATE POLICY "emergency_access_select_own" ON public.emergency_access
  FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()));
CREATE POLICY "emergency_access_insert_own" ON public.emergency_access
  FOR INSERT TO authenticated WITH CHECK (patient_id = (SELECT auth.uid()));
CREATE POLICY "emergency_access_update_own" ON public.emergency_access
  FOR UPDATE TO authenticated
  USING (patient_id = (SELECT auth.uid())) WITH CHECK (patient_id = (SELECT auth.uid()));

CREATE POLICY "share_access_logs_select_own" ON public.share_access_logs
  FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()));
-- No write policies: access attempts are recorded by the server (service role).
