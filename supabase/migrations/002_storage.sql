-- ============================================================================
-- Lost in Transit — Storage Bucket & Policies
-- ============================================================================

-- Private bucket: each patient's files isolated by folder = user_id
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', false);

CREATE POLICY "owner_only_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner_only_read"
  ON storage.objects FOR SELECT
  USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner_only_delete"
  ON storage.objects FOR DELETE
  USING (auth.uid()::text = (storage.foldername(name))[1]);
