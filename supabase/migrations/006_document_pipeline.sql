-- ============================================================================
-- MyHealthVault — 006 Document processing pipeline
-- ============================================================================
-- Both functions are SECURITY INVOKER: they run with the caller's rights, so
-- every read and write is still checked by RLS (patient_id = auth.uid()).

-- ─── Atomic claim: prevents duplicate concurrent processing ────────────────
-- Succeeds only if the document belongs to the caller and is pending/failed,
-- or has been stuck in "processing" for 10+ minutes (crashed run). Caps the
-- number of attempts. Returns the claimed row, or nothing.
CREATE OR REPLACE FUNCTION public.claim_document_for_processing(p_document_id uuid)
RETURNS SETOF public.documents
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.documents
  SET extraction_status = 'processing',
      processing_started_at = now(),
      processing_attempts = processing_attempts + 1,
      processing_error = NULL
  WHERE id = p_document_id
    AND patient_id = (SELECT auth.uid())
    AND cancelled_at IS NULL
    AND verification_status = 'unverified'
    AND processing_attempts < 3
    AND (
      extraction_status IN ('pending', 'failed')
      OR (extraction_status = 'processing' AND processing_started_at < now() - interval '10 minutes')
    )
  RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_document_for_processing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_document_for_processing(uuid) TO authenticated;

-- ─── Atomic confirmation of a patient-reviewed extraction ──────────────────
-- p_review is the patient's edited, app-validated payload:
-- {
--   "header": {"document_type", "document_date", "provider_name", "facility_name"},
--   "medications": [{"name","strength","dosage","frequency","duration","route","instructions","status","source_page","source_excerpt"}],
--   "lab_results": [{"test_name","value","unit","reference_range","result_date","source_page","source_excerpt"}],
--   "conditions":  [{"name","source_page","source_excerpt"}],
--   "allergies":   [{"substance","reaction","source_page","source_excerpt"}]
-- }
-- Everything is written in one transaction, marked as patient-reviewed, and
-- linked to the source document, extraction and page.
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
    reference_range, test_date, lab_name, verification_status, source_page, source_excerpt
  )
  SELECT v_uid, v_doc, p_extraction_id, l.test_name, l.normalized_test_name, l.value, l.unit,
         l.reference_range, COALESCE(NULLIF(l.result_date, '')::date, v_doc_date),
         NULLIF(v_header->>'facility_name', ''), 'verified', l.source_page, l.source_excerpt
  FROM jsonb_to_recordset(COALESCE(p_review->'lab_results', '[]'::jsonb)) AS l(
    test_name text, normalized_test_name text, value text, unit text, reference_range text,
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
