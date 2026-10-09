// ============================================================================
// Lost in Transit — Demo Data (Fictional Patient: Ananya Rao)
// ============================================================================
// All data is entirely fictional. No real patient data is used.

export const DEMO_PATIENT = {
  user_id: "demo-user-00000-00000-00000-000001",
  display_name: "Ananya Rao",
  date_of_birth: "1973-03-15",
  blood_group: "B+",
  emergency_contact: {
    name: "Vikram Rao",
    phone: "+91 98765 43210",
    relationship: "Spouse",
  },
  patient_info: {
    self_reported_conditions: ["Type 2 Diabetes", "Hypertension"],
    self_reported_allergies: ["Penicillin"],
  },
  metadata: { is_demo: true },
  created_at: "2025-01-10T09:00:00Z",
  updated_at: "2025-10-01T14:30:00Z",
};

export const DEMO_CONDITIONS = [
  {
    id: "cond-001",
    patient_id: DEMO_PATIENT.user_id,
    name: "Type 2 Diabetes Mellitus",
    status: "active",
    verification_status: "verified",
    source_document_id: "doc-001",
    metadata: { is_demo: true },
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "cond-002",
    patient_id: DEMO_PATIENT.user_id,
    name: "Essential Hypertension",
    status: "active",
    verification_status: "verified",
    source_document_id: "doc-002",
    metadata: { is_demo: true },
    created_at: "2025-02-20T11:00:00Z",
  },
];

export const DEMO_ALLERGIES = [
  {
    id: "allergy-001",
    patient_id: DEMO_PATIENT.user_id,
    substance: "Penicillin",
    reaction: "Urticaria (rash)",
    verification_status: "verified",
    source_document_id: null,
    metadata: { is_demo: true, source: "patient_reported" },
    created_at: "2025-01-10T09:00:00Z",
  },
];

export const DEMO_MEDICATIONS = [
  {
    id: "med-001",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-001",
    name: "Metformin 500mg",
    normalized_name: "metformin",
    ingredient: "Metformin Hydrochloride",
    strength: "500mg",
    dosage: "1 tablet",
    frequency: "Twice daily (BD)",
    route: "Oral",
    start_date: "2025-01-15",
    end_date: null,
    status: "active",
    verification_status: "verified",
    metadata: { is_demo: true, provider: "Dr. Priya Nair", facility: "Apollo Hospitals" },
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "med-002",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-002",
    name: "Amlodipine 5mg",
    normalized_name: "amlodipine",
    ingredient: "Amlodipine Besylate",
    strength: "5mg",
    dosage: "1 tablet",
    frequency: "Once daily (OD)",
    route: "Oral",
    start_date: "2025-02-20",
    end_date: null,
    status: "active",
    verification_status: "verified",
    metadata: { is_demo: true, provider: "Dr. Arjun Mehta", facility: "Max Healthcare" },
    created_at: "2025-02-20T11:00:00Z",
  },
  {
    id: "med-003",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-002",
    name: "Atorvastatin 10mg",
    normalized_name: "atorvastatin",
    ingredient: "Atorvastatin Calcium",
    strength: "10mg",
    dosage: "1 tablet",
    frequency: "Once daily (OD)",
    route: "Oral",
    start_date: "2025-02-20",
    end_date: null,
    status: "active",
    verification_status: "verified",
    metadata: { is_demo: true, provider: "Dr. Arjun Mehta", facility: "Max Healthcare" },
    created_at: "2025-02-20T11:00:00Z",
  },
  {
    id: "med-004",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-003",
    name: "Metformin 1000mg",
    normalized_name: "metformin",
    ingredient: "Metformin Hydrochloride",
    strength: "1000mg",
    dosage: "1 tablet",
    frequency: "Once daily (OD)",
    route: "Oral",
    start_date: "2025-09-10",
    end_date: null,
    status: "active",
    verification_status: "verified",
    metadata: { is_demo: true, provider: "Dr. Shalini Iyer", facility: "Fortis Hospital", duplicate_alert: true },
    created_at: "2025-09-10T14:00:00Z",
  },
];

export const DEMO_LAB_RESULTS = [
  {
    id: "lab-001",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-004",
    test_name: "HbA1c",
    normalized_test_name: "hba1c",
    result_value: "7.8",
    unit: "%",
    reference_range: "<5.7%",
    is_abnormal: true,
    test_date: "2025-01-20",
    verification_status: "verified",
    metadata: { is_demo: true },
    created_at: "2025-01-22T09:00:00Z",
  },
  {
    id: "lab-002",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-004",
    test_name: "HbA1c",
    normalized_test_name: "hba1c",
    result_value: "7.4",
    unit: "%",
    reference_range: "<5.7%",
    is_abnormal: true,
    test_date: "2025-04-18",
    verification_status: "verified",
    metadata: { is_demo: true },
    created_at: "2025-04-20T09:00:00Z",
  },
  {
    id: "lab-003",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-005",
    test_name: "HbA1c",
    normalized_test_name: "hba1c",
    result_value: "7.2",
    unit: "%",
    reference_range: "<5.7%",
    is_abnormal: true,
    test_date: "2025-07-15",
    verification_status: "verified",
    metadata: { is_demo: true },
    created_at: "2025-07-17T09:00:00Z",
  },
  {
    id: "lab-004",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-005",
    test_name: "TSH",
    normalized_test_name: "tsh",
    result_value: "2.1",
    unit: "mIU/L",
    reference_range: "0.4-4.0 mIU/L",
    is_abnormal: false,
    test_date: "2025-07-15",
    verification_status: "verified",
    metadata: { is_demo: true },
    created_at: "2025-07-17T09:00:00Z",
  },
  {
    id: "lab-005",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-005",
    test_name: "Random Blood Sugar",
    normalized_test_name: "rbs",
    result_value: "142",
    unit: "mg/dL",
    reference_range: "70-140 mg/dL",
    is_abnormal: true,
    test_date: "2025-07-15",
    verification_status: "verified",
    metadata: { is_demo: true },
    created_at: "2025-07-17T09:00:00Z",
  },
  {
    id: "lab-006",
    patient_id: DEMO_PATIENT.user_id,
    source_document_id: "doc-005",
    test_name: "Serum Creatinine",
    normalized_test_name: "creatinine",
    result_value: "0.9",
    unit: "mg/dL",
    reference_range: "0.6-1.2 mg/dL",
    is_abnormal: false,
    test_date: "2025-07-15",
    verification_status: "verified",
    metadata: { is_demo: true },
    created_at: "2025-07-17T09:00:00Z",
  },
];

export const DEMO_DOCUMENTS = [
  {
    id: "doc-001",
    patient_id: DEMO_PATIENT.user_id,
    storage_path: "demo/prescription-apollo.pdf",
    original_filename: "Prescription_Apollo_Jan2025.pdf",
    mime_type: "application/pdf",
    document_type: "prescription",
    document_date: "2025-01-15",
    provider_name: "Dr. Priya Nair",
    extraction_status: "done",
    verification_status: "verified",
    extracted_data: null,
    metadata: { is_demo: true, facility: "Apollo Hospitals" },
    created_at: "2025-01-15T10:30:00Z",
  },
  {
    id: "doc-002",
    patient_id: DEMO_PATIENT.user_id,
    storage_path: "demo/prescription-max.pdf",
    original_filename: "Prescription_Max_Feb2025.pdf",
    mime_type: "application/pdf",
    document_type: "prescription",
    document_date: "2025-02-20",
    provider_name: "Dr. Arjun Mehta",
    extraction_status: "done",
    verification_status: "verified",
    extracted_data: null,
    metadata: { is_demo: true, facility: "Max Healthcare" },
    created_at: "2025-02-20T12:00:00Z",
  },
  {
    id: "doc-003",
    patient_id: DEMO_PATIENT.user_id,
    storage_path: "demo/prescription-fortis.pdf",
    original_filename: "Prescription_Fortis_Sep2025.pdf",
    mime_type: "application/pdf",
    document_type: "prescription",
    document_date: "2025-09-10",
    provider_name: "Dr. Shalini Iyer",
    extraction_status: "done",
    verification_status: "verified",
    extracted_data: null,
    metadata: { is_demo: true, facility: "Fortis Hospital" },
    created_at: "2025-09-10T14:30:00Z",
  },
  {
    id: "doc-004",
    patient_id: DEMO_PATIENT.user_id,
    storage_path: "demo/lab-report-jan2025.pdf",
    original_filename: "Lab_Report_Jan2025.pdf",
    mime_type: "application/pdf",
    document_type: "lab_report",
    document_date: "2025-01-20",
    provider_name: "SRL Diagnostics",
    extraction_status: "done",
    verification_status: "verified",
    extracted_data: null,
    metadata: { is_demo: true },
    created_at: "2025-01-22T09:30:00Z",
  },
  {
    id: "doc-005",
    patient_id: DEMO_PATIENT.user_id,
    storage_path: "demo/lab-report-jul2025.pdf",
    original_filename: "Lab_Report_Jul2025.pdf",
    mime_type: "application/pdf",
    document_type: "lab_report",
    document_date: "2025-07-15",
    provider_name: "Thyrocare Technologies",
    extraction_status: "done",
    verification_status: "verified",
    extracted_data: null,
    metadata: { is_demo: true },
    created_at: "2025-07-17T09:30:00Z",
  },
];

export const DEMO_MEDICAL_EVENTS = [
  {
    id: "evt-001",
    patient_id: DEMO_PATIENT.user_id,
    document_id: "doc-001",
    event_type: "prescription",
    event_date: "2025-01-15",
    title: "Prescription — Apollo Hospitals",
    summary: "Dr. Priya Nair prescribed Metformin 500mg BD for Type 2 Diabetes management.",
    verification_status: "verified",
    structured_data: { provider: "Dr. Priya Nair", facility: "Apollo Hospitals" },
    metadata: { is_demo: true },
    created_at: "2025-01-15T10:30:00Z",
  },
  {
    id: "evt-002",
    patient_id: DEMO_PATIENT.user_id,
    document_id: "doc-004",
    event_type: "lab",
    event_date: "2025-01-20",
    title: "Lab Results — HbA1c 7.8%",
    summary: "HbA1c at 7.8% (above target). Baseline measurement for diabetes management.",
    verification_status: "verified",
    structured_data: { lab: "SRL Diagnostics", key_result: "HbA1c 7.8%" },
    metadata: { is_demo: true },
    created_at: "2025-01-22T09:30:00Z",
  },
  {
    id: "evt-003",
    patient_id: DEMO_PATIENT.user_id,
    document_id: "doc-002",
    event_type: "prescription",
    event_date: "2025-02-20",
    title: "Prescription — Max Healthcare",
    summary: "Dr. Arjun Mehta prescribed Amlodipine 5mg OD and Atorvastatin 10mg OD for hypertension and lipid management.",
    verification_status: "verified",
    structured_data: { provider: "Dr. Arjun Mehta", facility: "Max Healthcare" },
    metadata: { is_demo: true },
    created_at: "2025-02-20T12:00:00Z",
  },
  {
    id: "evt-004",
    patient_id: DEMO_PATIENT.user_id,
    document_id: "doc-004",
    event_type: "lab",
    event_date: "2025-04-18",
    title: "Lab Results — HbA1c 7.4%",
    summary: "HbA1c improved to 7.4%. Trend shows positive response to Metformin therapy.",
    verification_status: "verified",
    structured_data: { lab: "SRL Diagnostics", key_result: "HbA1c 7.4%" },
    metadata: { is_demo: true },
    created_at: "2025-04-20T09:30:00Z",
  },
  {
    id: "evt-005",
    patient_id: DEMO_PATIENT.user_id,
    document_id: "doc-005",
    event_type: "lab",
    event_date: "2025-07-15",
    title: "Lab Results — HbA1c 7.2%, Full Panel",
    summary: "HbA1c further improved to 7.2%. TSH, RBS, and Creatinine tested. RBS slightly elevated at 142 mg/dL.",
    verification_status: "verified",
    structured_data: { lab: "Thyrocare Technologies", key_result: "HbA1c 7.2%" },
    metadata: { is_demo: true },
    created_at: "2025-07-17T09:30:00Z",
  },
  {
    id: "evt-006",
    patient_id: DEMO_PATIENT.user_id,
    document_id: "doc-003",
    event_type: "prescription",
    event_date: "2025-09-10",
    title: "Prescription — Fortis Hospital",
    summary: "Dr. Shalini Iyer prescribed Metformin 1000mg OD. ⚠ Possible duplicate with existing Metformin 500mg BD.",
    verification_status: "verified",
    structured_data: { provider: "Dr. Shalini Iyer", facility: "Fortis Hospital", alert: "duplicate_medication" },
    metadata: { is_demo: true },
    created_at: "2025-09-10T14:30:00Z",
  },
];

export const DEMO_SHARES = [
  {
    id: "share-001",
    patient_id: DEMO_PATIENT.user_id,
    token_hash: "demo-active-share-hash",
    pin_hash: "$2b$12$demo.hash.placeholder.for.display.only",
    scope: {
      categories: ["medications", "conditions", "lab_results", "allergies"],
      date_range: null,
      conditions: null,
    },
    date_range_start: null,
    date_range_end: null,
    expires_at: "2025-11-09T18:00:00Z",
    revoked_at: null,
    metadata: { is_demo: true, label: "Dr. Mehta — Full Records" },
    created_at: "2025-10-10T10:00:00Z",
  },
  {
    id: "share-002",
    patient_id: DEMO_PATIENT.user_id,
    token_hash: "demo-revoked-share-hash",
    pin_hash: "$2b$12$demo.hash.placeholder.for.display.only",
    scope: {
      categories: ["medications"],
      date_range: null,
      conditions: null,
    },
    date_range_start: "2025-01-01",
    date_range_end: "2025-06-30",
    expires_at: "2025-10-01T18:00:00Z",
    revoked_at: "2025-09-28T15:00:00Z",
    metadata: { is_demo: true, label: "Pharmacy — Medications Only" },
    created_at: "2025-09-01T10:00:00Z",
  },
];

export const DEMO_AUDIT_LOGS = [
  {
    id: "audit-001",
    patient_id: DEMO_PATIENT.user_id,
    share_id: null,
    document_id: "doc-001",
    event_type: "document_uploaded",
    metadata: { is_demo: true, filename: "Prescription_Apollo_Jan2025.pdf" },
    created_at: "2025-01-15T10:30:00Z",
  },
  {
    id: "audit-002",
    patient_id: DEMO_PATIENT.user_id,
    share_id: null,
    document_id: "doc-001",
    event_type: "extraction_completed",
    metadata: { is_demo: true, confidence: 0.92 },
    created_at: "2025-01-15T10:31:00Z",
  },
  {
    id: "audit-003",
    patient_id: DEMO_PATIENT.user_id,
    share_id: null,
    document_id: "doc-001",
    event_type: "extraction_confirmed",
    metadata: { is_demo: true },
    created_at: "2025-01-15T10:35:00Z",
  },
  {
    id: "audit-004",
    patient_id: DEMO_PATIENT.user_id,
    share_id: "share-001",
    document_id: null,
    event_type: "share_created",
    metadata: { is_demo: true, label: "Dr. Mehta — Full Records", scope: "all" },
    created_at: "2025-10-10T10:00:00Z",
  },
  {
    id: "audit-005",
    patient_id: DEMO_PATIENT.user_id,
    share_id: "share-001",
    document_id: null,
    event_type: "share_accessed",
    metadata: { is_demo: true, accessor: "clinician" },
    created_at: "2025-10-11T09:15:00Z",
  },
  {
    id: "audit-006",
    patient_id: DEMO_PATIENT.user_id,
    share_id: "share-002",
    document_id: null,
    event_type: "share_revoked",
    metadata: { is_demo: true, label: "Pharmacy — Medications Only" },
    created_at: "2025-09-28T15:00:00Z",
  },
  {
    id: "audit-007",
    patient_id: DEMO_PATIENT.user_id,
    share_id: null,
    document_id: "doc-005",
    event_type: "document_uploaded",
    metadata: { is_demo: true, filename: "Lab_Report_Jul2025.pdf" },
    created_at: "2025-07-17T09:30:00Z",
  },
];

// ─── Derived / Computed demo data ────────────────────────────────────────────

export function getDemoDuplicateAlerts() {
  const nameGroups = new Map<string, typeof DEMO_MEDICATIONS>();
  DEMO_MEDICATIONS.forEach((med) => {
    const key = med.normalized_name;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key)!.push(med);
  });

  return Array.from(nameGroups.entries())
    .filter(([, meds]) => meds.length > 1)
    .map(([name, meds]) => ({
      type: "duplicate_medication" as const,
      severity: "warning" as const,
      title: `Possible duplicate: ${name.charAt(0).toUpperCase() + name.slice(1)} found in ${meds.length} records`,
      medications: meds,
      message: `${meds.map((m) => `${m.name} (${m.frequency})`).join(" and ")} — from different providers. Please verify with your doctor.`,
    }));
}

export function getDemoRepeatTestAlerts() {
  const testGroups = new Map<string, typeof DEMO_LAB_RESULTS>();
  DEMO_LAB_RESULTS.forEach((lab) => {
    const key = lab.normalized_test_name;
    if (!testGroups.has(key)) testGroups.set(key, []);
    testGroups.get(key)!.push(lab);
  });

  const alerts: Array<{
    type: "repeat_test";
    severity: "info";
    title: string;
    message: string;
    test_name: string;
    dates: string[];
  }> = [];

  testGroups.forEach((results, testName) => {
    if (results.length < 2) return;
    const sorted = [...results].sort(
      (a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    );
    const latest = new Date(sorted[0].test_date);
    const previous = new Date(sorted[1].test_date);
    const diffDays = (latest.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 90) {
      alerts.push({
        type: "repeat_test",
        severity: "info",
        title: `${sorted[0].test_name} tested ${Math.round(diffDays)} days apart`,
        message: `${sorted[0].test_name} was tested on ${sorted[1].test_date} and ${sorted[0].test_date} (${Math.round(diffDays)} days apart). This may be a repeat test — consult your doctor if unexpected.`,
        test_name: testName,
        dates: sorted.map((r) => r.test_date),
      });
    }
  });

  return alerts;
}

export function getDemoLabTrends() {
  const trends = new Map<string, Array<{ date: string; value: number; unit: string }>>();

  DEMO_LAB_RESULTS.forEach((lab) => {
    const key = lab.normalized_test_name;
    if (!trends.has(key)) trends.set(key, []);
    trends.get(key)!.push({
      date: lab.test_date,
      value: parseFloat(lab.result_value),
      unit: lab.unit,
    });
  });

  // Sort each trend by date
  trends.forEach((values) => {
    values.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  return Object.fromEntries(trends);
}

export function getDemoStats() {
  const activeMeds = DEMO_MEDICATIONS.filter((m) => m.status === "active");
  const conditions = DEMO_CONDITIONS.filter((c) => c.status === "active");
  const latestLab = [...DEMO_LAB_RESULTS]
    .filter((l) => l.normalized_test_name === "hba1c")
    .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];

  return {
    activeMedications: activeMeds.length,
    knownAllergies: DEMO_ALLERGIES.length,
    activeConditions: conditions.length,
    latestKeyResult: latestLab
      ? {
          name: latestLab.test_name,
          value: `${latestLab.result_value}${latestLab.unit}`,
          is_abnormal: latestLab.is_abnormal,
          date: latestLab.test_date,
          trend: "improving",
        }
      : null,
    totalDocuments: DEMO_DOCUMENTS.length,
    totalProviders: new Set(DEMO_DOCUMENTS.map((d) => d.provider_name)).size,
    pendingVerification: DEMO_DOCUMENTS.filter((d) => d.verification_status === "unverified").length,
  };
}
