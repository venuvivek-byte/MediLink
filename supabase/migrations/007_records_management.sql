-- ============================================================================
-- MyHealthVault — 007 Records management (Phase 4)
-- ============================================================================
-- * lab_results.report_flag: the high/low marker exactly as printed on the
--   report (e.g. "H", "L", "*"). The app never computes abnormality itself.
-- * duplicate_decisions: the patient's "not a duplicate" decisions, so the
--   same alert is not raised again for the same set of records.
-- * update_medication / delete_health_record / dismiss_duplicate: each change
--   and its audit entry are written in one transaction.
-- * confirm_extraction: now also stores the lab report flag.
--
-- All functions are SECURITY INVOKER: they run with the caller's rights, so
-- RLS (patient_id = auth.uid()) still applies to every row they touch.

-- ─── Lab report flag ────────────────────────────────────────────────────────
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS report_flag text
    CONSTRAINT lab_results_report_flag_check CHECK (char_length(report_flag) <= 20);

-- ─── Duplicate decisions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.duplicate_decisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  record_kind text NOT NULL CHECK (record_kind IN ('medication', 'lab_result')),
  -- Sorted, distinct ids of the records the patient judged not to be duplicates.
  record_ids  uuid[] NOT NULL CHECK (cardinality(record_ids) BETWEEN 2 AND 20),
  decision    text NOT NULL DEFAULT 'not_duplicate' CHECK (decision IN ('not_duplicate')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duplicate_decisions_unique UNIQUE (patient_id, record_kind, record_ids)
);

ALTER TABLE public.duplicate_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duplicate_decisions_select_own" ON public.duplicate_decisions;
DROP POLICY IF EXISTS "duplicate_decisions_insert_own" ON public.duplicate_decisions;
DROP POLICY IF EXISTS "duplicate_decisions_delete_own" ON public.duplicate_decisions;
CREATE POLICY "duplicate_decisions_select_own" ON public.duplicate_decisions
  FOR SELECT TO authenticated USING (patient_id = (SELECT auth.uid()));
CREATE POLICY "duplicate_decisions_insert_own" ON public.duplicate_decisions
  FOR INSERT TO authenticated WITH CHECK (patient_id = (SELECT auth.uid()));
CREATE POLICY "duplicate_decisions_delete_own" ON public.duplicate_decisions
  FOR DELETE TO authenticated USING (patient_id = (SELECT auth.uid()));

REVOKE ALL ON public.duplicate_decisions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.duplicate_decisions TO authenticated;

-- ─── Patient edits a medication's status and dates ─────────────────────────
CREATE OR REPLACE FUNCTION public.update_medication(
  p_medication_id uuid,
  p_status text,
  p_start_date date,
  p_end_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('active', 'historical', 'discontinued', 'unknown') THEN
    RAISE EXCEPTION 'Invalid medication status' USING ERRCODE = '22023';
  END IF;
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date is before start date' USING ERRCODE = '22023';
  END IF;

  SELECT m.status INTO v_old_status
  FROM public.medications m
  WHERE m.id = p_medication_id AND m.patient_id = v_uid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medication not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.medications
  SET status = p_status, start_date = p_start_date, end_date = p_end_date, updated_at = now()
  WHERE id = p_medication_id AND patient_id = v_uid;

  INSERT INTO public.audit_logs (patient_id, event_type, metadata)
  VALUES (v_uid, 'record_edited', jsonb_build_object(
    'kind', 'medication', 'status_from', v_old_status, 'status_to', p_status
  ));
END;
$$;

-- ─── Patient deletes one of their records ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_health_record(p_kind text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- One static statement per table: no dynamic SQL.
  IF p_kind = 'medication' THEN
    DELETE FROM public.medications WHERE id = p_id AND patient_id = v_uid;
  ELSIF p_kind = 'lab_result' THEN
    DELETE FROM public.lab_results WHERE id = p_id AND patient_id = v_uid;
  ELSIF p_kind = 'condition' THEN
    DELETE FROM public.conditions WHERE id = p_id AND patient_id = v_uid;
  ELSIF p_kind = 'allergy' THEN
    DELETE FROM public.allergies WHERE id = p_id AND patient_id = v_uid;
  ELSIF p_kind = 'medical_event' THEN
    DELETE FROM public.medical_events WHERE id = p_id AND patient_id = v_uid;
  ELSE
    RAISE EXCEPTION 'Invalid record kind' USING ERRCODE = '22023';
  END IF;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Record not found' USING ERRCODE = 'P0002';
  END IF;

  -- A decision about a set that no longer exists is meaningless.
  DELETE FROM public.duplicate_decisions WHERE patient_id = v_uid AND p_id = ANY (record_ids);

  INSERT INTO public.audit_logs (patient_id, event_type, metadata)
  VALUES (v_uid, 'record_deleted', jsonb_build_object('kind', p_kind));
END;
$$;

-- ─── Patient marks a flagged group as "not a duplicate" ────────────────────
CREATE OR REPLACE FUNCTION public.dismiss_duplicate(p_kind text, p_record_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_owned int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('medication', 'lab_result') THEN
    RAISE EXCEPTION 'Invalid record kind' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(DISTINCT x ORDER BY x) INTO v_ids FROM unnest(p_record_ids) AS x WHERE x IS NOT NULL;
  IF v_ids IS NULL OR cardinality(v_ids) < 2 OR cardinality(v_ids) > 20 THEN
    RAISE EXCEPTION 'A decision needs 2 to 20 records' USING ERRCODE = '22023';
  END IF;

  -- Every record must be the caller's own and of the stated kind.
  IF p_kind = 'medication' THEN
    SELECT count(*) INTO v_owned FROM public.medications WHERE id = ANY (v_ids) AND patient_id = v_uid;
  ELSE
    SELECT count(*) INTO v_owned FROM public.lab_results WHERE id = ANY (v_ids) AND patient_id = v_uid;
  END IF;
  IF v_owned <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Record not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.duplicate_decisions (patient_id, record_kind, record_ids)
  VALUES (v_uid, p_kind, v_ids)
  ON CONFLICT ON CONSTRAINT duplicate_decisions_unique DO NOTHING;

  INSERT INTO public.audit_logs (patient_id, event_type, metadata)
  VALUES (v_uid, 'duplicate_flag_resolved', jsonb_build_object(
    'kind', p_kind, 'records', cardinality(v_ids), 'decision', 'not_duplicate'
  ));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_medication(uuid, text, date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_health_record(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dismiss_duplicate(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_medication(uuid, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_health_record(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_duplicate(text, uuid[]) TO authenticated;

-- ─── confirm_extraction: unchanged from 006 except lab_results.report_flag ──
CREATE OR REPLACE FUNCTION public.confirm_extraction(p_extraction_id uuid, p_review jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_doc uuid;
  v_header jsonb := COALESCE(p_review->'header', '{}'::jsonb);
  v_doc_date date := NULLIF(v_header->>'document_date', '')::date;
  v_title text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Lock the extraction row; RLS hides other patients' rows entirely.
  SELECT e.document_id INTO v_doc
  FROM public.document_extractions e
  WHERE e.id = p_extraction_id AND e.patient_id = v_uid AND e.status = 'succeeded'
  FOR UPDATE;
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Extraction not found or not awaiting review' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.medications (
    patient_id, source_document_id, extraction_id, name, strength, dosage, frequency, duration, route,
    instructions, status, verification_status, prescriber_name, facility_name, start_date,
    source_page, source_excerpt, normalized_name
  )
  SELECT v_uid, v_doc, p_extraction_id, m.name, m.strength, m.dosage, m.frequency, m.duration, m.route,
         m.instructions, COALESCE(m.status, 'unknown'), 'verified',
         NULLIF(v_header->>'provider_name', ''), NULLIF(v_header->>'facility_name', ''), v_doc_date,
         m.source_page, m.source_excerpt, m.normalized_name
  FROM jsonb_to_recordset(COALESCE(p_review->'medications', '[]'::jsonb)) AS m(
    name text, strength text, dosage text, frequency text, duration text, route text, instructions text,
    status text, source_page int, source_excerpt text, normalized_name text
  );

  INSERT INTO public.lab_results (
    patient_id, source_document_id, extraction_id, test_name, normalized_test_name, result_value, unit,
    reference_range, report_flag, test_date, lab_name, verification_status, source_page, source_excerpt
  )
  SELECT v_uid, v_doc, p_extraction_id, l.test_name, l.normalized_test_name, l.value, l.unit,
         l.reference_range, NULLIF(l.flag, ''), COALESCE(NULLIF(l.result_date, '')::date, v_doc_date),
         NULLIF(v_header->>'facility_name', ''), 'verified', l.source_page, l.source_excerpt
  FROM jsonb_to_recordset(COALESCE(p_review->'lab_results', '[]'::jsonb)) AS l(
    test_name text, normalized_test_name text, value text, unit text, reference_range text, flag text,
    result_date text, source_page int, source_excerpt text
  );

  INSERT INTO public.conditions (
    patient_id, source_document_id, extraction_id, name, status, diagnosed_date, verification_status,
    source_page, source_excerpt
  )
  SELECT v_uid, v_doc, p_extraction_id, c.name, 'unknown', v_doc_date, 'verified', c.source_page, c.source_excerpt
  FROM jsonb_to_recordset(COALESCE(p_review->'conditions', '[]'::jsonb)) AS c(
    name text, source_page int, source_excerpt text
  );

  INSERT INTO public.allergies (
    patient_id, source_document_id, extraction_id, substance, reaction, verification_status,
    source_page, source_excerpt
  )
  SELECT v_uid, v_doc, p_extraction_id, a.substance, a.reaction, 'verified', a.source_page, a.source_excerpt
  FROM jsonb_to_recordset(COALESCE(p_review->'allergies', '[]'::jsonb)) AS a(
    substance text, reaction text, source_page int, source_excerpt text
  );

  -- One timeline entry for the document itself.
  v_title := left(
    initcap(replace(COALESCE(NULLIF(v_header->>'document_type', ''), 'document'), '_', ' '))
    || COALESCE(' — ' || NULLIF(v_header->>'facility_name', ''), ''),
    200
  );
  INSERT INTO public.medical_events (
    patient_id, document_id, extraction_id, event_type, event_date, title, provider_name, facility_name,
    verification_status
  )
  VALUES (
    v_uid, v_doc, p_extraction_id,
    CASE COALESCE(v_header->>'document_type', 'other')
      WHEN 'lab_report' THEN 'lab' WHEN 'prescription' THEN 'prescription'
      WHEN 'discharge_summary' THEN 'discharge' ELSE 'document' END,
    v_doc_date, v_title, NULLIF(v_header->>'provider_name', ''), NULLIF(v_header->>'facility_name', ''), 'verified'
  );

  UPDATE public.document_extractions SET status = 'confirmed', completed_at = now() WHERE id = p_extraction_id;

  UPDATE public.documents
  SET verification_status = 'verified',
      document_type = NULLIF(v_header->>'document_type', ''),
      document_date = v_doc_date,
      provider_name = NULLIF(v_header->>'provider_name', ''),
      facility_name = NULLIF(v_header->>'facility_name', '')
  WHERE id = v_doc;

  INSERT INTO public.audit_logs (patient_id, document_id, event_type, metadata)
  VALUES (v_uid, v_doc, 'extraction_confirmed', jsonb_build_object(
    'medications', jsonb_array_length(COALESCE(p_review->'medications', '[]'::jsonb)),
    'lab_results', jsonb_array_length(COALESCE(p_review->'lab_results', '[]'::jsonb)),
    'conditions', jsonb_array_length(COALESCE(p_review->'conditions', '[]'::jsonb)),
    'allergies', jsonb_array_length(COALESCE(p_review->'allergies', '[]'::jsonb))
  ));

  RETURN v_doc;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_extraction(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_extraction(uuid, jsonb) TO authenticated;
