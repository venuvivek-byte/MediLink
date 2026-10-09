-- ============================================================================
-- Lost in Transit — Supabase Seed Data (Demo Patient: Ananya Rao)
-- ============================================================================
-- All medical and demographic data is strictly fictional.

-- 1. Demo User in auth.users (if not already existing)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ananya.rao@example.com',
  '$2a$10$demoHashedPasswordPlaceholderForLocalDevOnly00000000000',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Ananya Rao"}',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Profile
INSERT INTO profiles (
  user_id,
  display_name,
  date_of_birth,
  blood_group,
  emergency_contact,
  patient_info,
  metadata
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Ananya Rao',
  '1973-03-15',
  'B+',
  '{"name": "Vikram Rao", "phone": "+91 98765 43210", "relationship": "Spouse"}'::jsonb,
  '{"self_reported_conditions": ["Type 2 Diabetes", "Hypertension"], "self_reported_allergies": ["Penicillin"]}'::jsonb,
  '{"is_demo": true}'::jsonb
) ON CONFLICT (user_id) DO NOTHING;

-- 3. Conditions
INSERT INTO conditions (id, patient_id, name, status, verification_status, metadata) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Type 2 Diabetes Mellitus', 'active', 'verified', '{"is_demo": true}'::jsonb),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Essential Hypertension', 'active', 'verified', '{"is_demo": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Allergies
INSERT INTO allergies (id, patient_id, substance, reaction, verification_status, metadata) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Penicillin', 'Urticaria (rash)', 'verified', '{"is_demo": true, "source": "patient_reported"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. Medications
INSERT INTO medications (
  id, patient_id, name, normalized_name, ingredient, strength, dosage, frequency, route, start_date, status, verification_status, metadata
) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Metformin 500mg', 'metformin', 'Metformin Hydrochloride', '500mg', '1 tablet', 'Twice daily (BD)', 'Oral', '2025-01-15', 'active', 'verified', '{"is_demo": true, "provider": "Dr. Priya Nair", "facility": "Apollo Hospitals"}'::jsonb),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Amlodipine 5mg', 'amlodipine', 'Amlodipine Besylate', '5mg', '1 tablet', 'Once daily (OD)', 'Oral', '2025-02-20', 'active', 'verified', '{"is_demo": true, "provider": "Dr. Arjun Mehta", "facility": "Max Healthcare"}'::jsonb),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Atorvastatin 10mg', 'atorvastatin', 'Atorvastatin Calcium', '10mg', '1 tablet', 'Once daily (OD)', 'Oral', '2025-02-20', 'active', 'verified', '{"is_demo": true, "provider": "Dr. Arjun Mehta", "facility": "Max Healthcare"}'::jsonb),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Metformin 1000mg', 'metformin', 'Metformin Hydrochloride', '1000mg', '1 tablet', 'Once daily (OD)', 'Oral', '2025-09-10', 'active', 'verified', '{"is_demo": true, "provider": "Dr. Shalini Iyer", "facility": "Fortis Hospital", "duplicate_alert": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 6. Lab Results (demonstrating HbA1c repeat testing and trend)
INSERT INTO lab_results (
  id, patient_id, test_name, normalized_test_name, result_value, unit, reference_range, is_abnormal, test_date, verification_status, metadata
) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'HbA1c', 'hba1c', '7.8', '%', '<5.7%', true, '2025-01-20', 'verified', '{"is_demo": true}'::jsonb),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'HbA1c', 'hba1c', '7.4', '%', '<5.7%', true, '2025-04-18', 'verified', '{"is_demo": true}'::jsonb),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'HbA1c', 'hba1c', '7.2', '%', '<5.7%', true, '2025-07-15', 'verified', '{"is_demo": true}'::jsonb),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'TSH', 'tsh', '2.1', 'mIU/L', '0.4-4.0 mIU/L', false, '2025-07-15', 'verified', '{"is_demo": true}'::jsonb),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Random Blood Sugar', 'rbs', '142', 'mg/dL', '70-140 mg/dL', true, '2025-07-15', 'verified', '{"is_demo": true}'::jsonb),
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Serum Creatinine', 'creatinine', '0.9', 'mg/dL', '0.6-1.2 mg/dL', false, '2025-07-15', 'verified', '{"is_demo": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;
