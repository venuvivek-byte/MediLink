import type { TestDatabase, Tx } from "./harness";

export const hex64 = (seed: string) => seed.padEnd(64, "0").slice(0, 64).replace(/[^0-9a-f]/g, "a");
export const BCRYPT_LIKE = "$2b$12$" + "x".repeat(53);

export interface PatientRecords {
  userId: string;
  documentId: string;
  extractionId: string;
  medicationId: string;
  labId: string;
  conditionId: string;
  allergyId: string;
  eventId: string;
  shareId: string;
  emergencyId: string;
  objectName: string;
}

async function insertId(tx: Tx, sql: string, params: unknown[]): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(sql, params);
  return rows[0].id;
}

/** Creates a user and a full set of records AS THAT USER (through RLS). */
export async function seedPatient(db: TestDatabase, email: string): Promise<PatientRecords> {
  const userId = await db.createUser(email, { display_name: email.split("@")[0] });
  return db.asUser(userId, async (tx) => {
    const objectName = `${userId}/doc-1/${hex64("a1")}.pdf`;
    await tx.query("INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('medical-documents', $1, $2)", [
      objectName,
      userId,
    ]);
    const documentId = await insertId(
      tx,
      `INSERT INTO public.documents (patient_id, storage_path, original_filename, mime_type, size_bytes, content_sha256)
       VALUES ($1, $2, 'rx.pdf', 'application/pdf', 1000, $3) RETURNING id`,
      [userId, objectName, hex64(userId.replace(/-/g, ""))]
    );
    const extractionId = await insertId(
      tx,
      `INSERT INTO public.document_extractions (document_id, patient_id, schema_version, status)
       VALUES ($1, $2, '1', 'succeeded') RETURNING id`,
      [documentId, userId]
    );
    await tx.query(
      `INSERT INTO public.document_pages (document_id, patient_id, page_number, text_source, content)
       VALUES ($1, $2, 1, 'pdf_text', 'Tab Metformin 500 mg BD')`,
      [documentId, userId]
    );
    const medicationId = await insertId(
      tx,
      `INSERT INTO public.medications (patient_id, source_document_id, extraction_id, name, status, source_page, source_excerpt)
       VALUES ($1, $2, $3, 'Metformin 500mg', 'active', 1, 'Tab Metformin 500 mg BD') RETURNING id`,
      [userId, documentId, extractionId]
    );
    const labId = await insertId(
      tx,
      `INSERT INTO public.lab_results (patient_id, source_document_id, test_name, result_value, unit)
       VALUES ($1, $2, 'HbA1c', '7.2', '%') RETURNING id`,
      [userId, documentId]
    );
    const conditionId = await insertId(
      tx,
      "INSERT INTO public.conditions (patient_id, name, status) VALUES ($1, 'Type 2 diabetes', 'active') RETURNING id",
      [userId]
    );
    const allergyId = await insertId(
      tx,
      "INSERT INTO public.allergies (patient_id, substance) VALUES ($1, 'Penicillin') RETURNING id",
      [userId]
    );
    const eventId = await insertId(
      tx,
      "INSERT INTO public.medical_events (patient_id, document_id, event_type, title) VALUES ($1, $2, 'prescription', 'Visit') RETURNING id",
      [userId, documentId]
    );
    const shareId = await insertId(
      tx,
      `INSERT INTO public.record_shares (patient_id, token_hash, pin_hash, scope, expires_at, consent_given_at)
       VALUES ($1, $2, $3, '{"categories":["medications"]}', now() + interval '7 days', now()) RETURNING id`,
      [userId, hex64(`b${userId.replace(/-/g, "")}`), BCRYPT_LIKE]
    );
    const emergencyId = await insertId(
      tx,
      `INSERT INTO public.emergency_access (patient_id, token_hash, show_allergies, consent_given_at, expires_at)
       VALUES ($1, $2, true, now(), now() + interval '30 days') RETURNING id`,
      [userId, hex64(`c${userId.replace(/-/g, "")}`)]
    );
    return {
      userId,
      documentId,
      extractionId,
      medicationId,
      labId,
      conditionId,
      allergyId,
      eventId,
      shareId,
      emergencyId,
      objectName,
    };
  });
}
