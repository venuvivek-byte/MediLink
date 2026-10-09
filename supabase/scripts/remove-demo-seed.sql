-- ============================================================================
-- One-off: remove the fictional demo patient seeded by the old seed.sql.
-- ============================================================================
-- Deletes exactly one auth user, matched by BOTH its fixed seed id and email.
-- Every patient table references auth.users ON DELETE CASCADE, so the
-- profile, documents, medications, labs, conditions, allergies, events and
-- shares go with it. Audit rows (none exist) would keep their row with
-- patient_id set to NULL.
--
-- Run once against the hosted project:
--   npx supabase db query --linked -f supabase/scripts/remove-demo-seed.sql

BEGIN;

DELETE FROM auth.users
WHERE id = 'a0000000-0000-0000-0000-000000000001'
  AND email = 'ananya.rao@example.com';

COMMIT;
