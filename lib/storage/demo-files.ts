import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Session } from "@/lib/auth/session";
import { datasetForPatient } from "@/lib/demo/datasets";

/** Where bundled example files live; listed in next.config.ts outputFileTracingIncludes. */
export const SAMPLE_FILES_DIR = path.join(process.cwd(), "lib", "demo", "sample", "files");

const SAFE_NAME = /^[A-Za-z0-9_-]+\.(pdf|png|jpe?g)$/;

export type DemoFileResult =
  | { ok: true; bytes: Uint8Array; mimeType: string; filename: string }
  | { ok: false; reason: "not_found" | "unavailable" };

/**
 * An original file of a read-only session's own dataset. Only ids present in
 * that dataset's file map resolve, and the stored name must be a plain file
 * name, so nothing outside SAMPLE_FILES_DIR can be read.
 */
export async function readDemoFile(session: Session, documentId: string): Promise<DemoFileResult> {
  if (session.kind !== "demo") return { ok: false, reason: "not_found" };
  const dataset = datasetForPatient(session.patientId);
  const name = dataset && Object.hasOwn(dataset.files, documentId) ? dataset.files[documentId] : null;
  const doc = dataset?.documents.find((d) => d.id === documentId && d.patient_id === session.patientId);
  if (!name || !doc || !SAFE_NAME.test(name)) return { ok: false, reason: "not_found" };
  try {
    const bytes = new Uint8Array(await readFile(path.join(SAMPLE_FILES_DIR, name)));
    return { ok: true, bytes, mimeType: doc.mime_type, filename: doc.original_filename };
  } catch {
    console.error("[storage] bundled example file missing");
    return { ok: false, reason: "unavailable" };
  }
}
