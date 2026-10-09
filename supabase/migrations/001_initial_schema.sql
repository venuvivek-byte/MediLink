-- ============================================================================
-- Lost in Transit — Initial Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL,
  date_of_birth    DATE,
  blood_group      TEXT,
  emergency_contact JSONB,        -- { name, phone, relationship }
  patient_info     JSONB,         -- self-reported conditions, allergies
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profile"
  ON profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Documents ───────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path        TEXT NOT NULL,
  original_filename   TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  document_type       TEXT,           -- prescription | lab_report | discharge_summary | other
  document_date       DATE,
  provider_name       TEXT,
  extraction_status   TEXT DEFAULT 'pending',       -- pending | processing | done | failed
  verification_status TEXT DEFAULT 'unverified',
  extracted_data      JSONB,          -- raw AI output (pre-confirmation)
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_documents"
  ON documents FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ─── Medical Events (Timeline) ──────────────────────────────────────────────
CREATE TABLE medical_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
  event_type          TEXT NOT NULL,   -- visit | prescription | diagnosis | lab | discharge | upload
  event_date          DATE,
  title               TEXT NOT NULL,
  summary             TEXT,
  verification_status TEXT DEFAULT 'unverified',
  structured_data     JSONB,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medical_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_events"
  ON medical_events FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ─── Medications ─────────────────────────────────────────────────────────────
CREATE TABLE medications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  normalized_name     TEXT,           -- lowercase stripped for duplicate detection
  ingredient          TEXT,
  strength            TEXT,
  dosage              TEXT,
  frequency           TEXT,
  route               TEXT,
  start_date          DATE,
  end_date            DATE,
  status              TEXT DEFAULT 'unknown',        -- active | historical | unknown
  verification_status TEXT DEFAULT 'unverified',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_medications"
  ON medications FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ─── Allergies ───────────────────────────────────────────────────────────────
CREATE TABLE allergies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  substance           TEXT NOT NULL,
  reaction            TEXT,
  verification_status TEXT DEFAULT 'unverified',
  source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_allergies"
  ON allergies FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ─── Conditions ──────────────────────────────────────────────────────────────
CREATE TABLE conditions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  status              TEXT DEFAULT 'active',         -- active | resolved | unknown
  verification_status TEXT DEFAULT 'unverified',
  source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_conditions"
  ON conditions FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ─── Lab Results ─────────────────────────────────────────────────────────────
CREATE TABLE lab_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  test_name           TEXT NOT NULL,
  normalized_test_name TEXT,          -- for trend grouping + duplicate detection
  result_value        TEXT,
  unit                TEXT,
  reference_range     TEXT,
  is_abnormal         BOOLEAN,
  test_date           DATE,
  verification_status TEXT DEFAULT 'unverified',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lab_results_normalized ON lab_results USING GIN (to_tsvector('english', COALESCE(normalized_test_name, '')));

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_lab_results"
  ON lab_results FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ─── Record Shares ──────────────────────────────────────────────────────────
CREATE TABLE record_shares (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash        TEXT NOT NULL UNIQUE,    -- SHA-256 of the random token
  pin_hash          TEXT NOT NULL,           -- bcrypt(pin, 12)
  scope             JSONB NOT NULL,          -- { categories, date_range, conditions }
  date_range_start  DATE,
  date_range_end    DATE,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shares_token_hash ON record_shares (token_hash);

ALTER TABLE record_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_shares"
  ON record_shares FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_id     UUID REFERENCES record_shares(id) ON DELETE SET NULL,
  document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',    -- ip, user_agent, scope used — NO PINs, NO tokens
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_patient ON audit_logs (patient_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_own_audit"
  ON audit_logs FOR SELECT
  USING (auth.uid() = patient_id);

-- ─── Updated-at Triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
