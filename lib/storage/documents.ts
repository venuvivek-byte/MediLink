import "server-only";
import type { Session } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET, SIGNED_URL_TTL_SECONDS, isOwnedPath } from "./paths";

export type SignedUrlResult =
  | { ok: true; url: string; filename: string; mimeType: string }
  | { ok: false; reason: "not_found" | "unavailable" };

/**
 * Short-lived download URL for one of the CURRENT patient's documents.
 *
 * Authorisation happens three times: the documents query runs under RLS and
 * filters on the session's patient id; the stored path must sit inside that
 * patient's folder; and storage RLS applies again when signing.
 * Any mismatch reads as "not found" so the caller cannot probe other ids.
 */
export async function createDocumentDownloadUrl(session: Session, documentId: string): Promise<SignedUrlResult> {
  if (session.kind !== "live") return { ok: false, reason: "not_found" };

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("storage_path, original_filename, mime_type")
    .eq("id", documentId)
    .eq("patient_id", session.patientId)
    .maybeSingle();

  if (error) {
    console.error("[storage] document lookup failed", { code: error.code ?? "unknown" });
    return { ok: false, reason: "unavailable" };
  }
  if (!doc || !isOwnedPath(doc.storage_path, session.patientId)) return { ok: false, reason: "not_found" };

  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    console.error("[storage] signing failed");
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, url: signed.signedUrl, filename: doc.original_filename, mimeType: doc.mime_type };
}
