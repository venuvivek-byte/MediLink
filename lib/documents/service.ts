import "server-only";
import type { Session } from "@/lib/auth/session";
import { getConfig } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredProvider, getFallbackProvider, runExtractionWithFallback } from "@/lib/ai";
import { getOcrProvider } from "@/lib/ocr";
import { GEMINI_VISION_OCR } from "@/lib/ocr/gemini";
import { GROQ_VISION_OCR } from "@/lib/ocr/groq";
import { EXTRACTION_SCHEMA_VERSION } from "@/lib/ai/extraction-schema";
import { buildDocumentPath, DOCUMENTS_BUCKET } from "@/lib/storage/paths";
import { mapDocument } from "@/lib/data/mappers";
import type { DocumentSummary } from "@/lib/data/types";
import type { VerifiedExtraction } from "@/lib/ai/verify";
import { DocumentError, isDocumentError, type DocumentErrorCode } from "./errors";
import { validateUpload } from "./file-validation";
import { extractPdfText, type PageText } from "./pdf-text";
import { ILLEGIBLE_ERROR, reviewSubmissionSchema } from "./review-schema";

// Real-user document workflow. Every call runs as the signed-in patient
// through RLS; the service never uses the service-role key.

export const UPLOADS_PER_HOUR = 20;

type LiveSession = Extract<Session, { kind: "live" }>;

function requireLive(session: Session): LiveSession {
  if (session.kind !== "live") throw new Error("Document processing is only available in real-user mode.");
  return session;
}

async function audit(
  client: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  eventType: string,
  documentId: string | null,
  details: Record<string, string | number> = {}
) {
  const { error } = await client
    .from("audit_logs")
    .insert({ patient_id: patientId, document_id: documentId, event_type: eventType, metadata: details });
  // Audit failures are logged, never shown, and never block the patient's action.
  if (error) console.error("[audit] insert failed", { code: error.code ?? "unknown", eventType });
}

/** Validate, store privately, and register an uploaded file. */
export async function uploadDocument(
  session: Session,
  file: { bytes: Uint8Array; name: string; type: string }
): Promise<DocumentSummary> {
  const { patientId } = requireLive(session);
  const config = getConfig();
  const validated = validateUpload(file.bytes, { mimeType: file.type, filename: file.name }, config.upload.maxBytes);
  const supabase = await createClient();

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .gte("created_at", since);
  if ((count ?? 0) >= UPLOADS_PER_HOUR) throw new DocumentError("too_many_attempts");

  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("patient_id", patientId)
    .eq("content_sha256", validated.sha256)
    .maybeSingle();
  if (existing) throw new DocumentError("file_duplicate");

  const documentId = crypto.randomUUID();
  const path = buildDocumentPath(patientId, documentId, validated.sha256, validated.mimeType);

  const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file.bytes, {
    contentType: validated.mimeType,
    upsert: false,
  });
  if (storageError) {
    console.error("[documents] storage upload failed");
    throw new DocumentError("storage_failed", true);
  }

  const { data: row, error: insertError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      patient_id: patientId,
      storage_path: path,
      original_filename: validated.safeFilename,
      mime_type: validated.mimeType,
      size_bytes: validated.sizeBytes,
      content_sha256: validated.sha256,
      extraction_status: "pending",
      verification_status: "unverified",
    })
    .select("*")
    .single();

  if (insertError || !row) {
    // Never leave an orphaned file behind.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
    if (insertError?.code === "23505") throw new DocumentError("file_duplicate");
    console.error("[documents] insert failed", { code: insertError?.code ?? "unknown" });
    throw new DocumentError("storage_failed", true);
  }

  await audit(supabase, patientId, "document_uploaded", documentId, { filename: validated.safeFilename });
  return mapDocument(row);
}

/** Text for every page: embedded PDF text first, OCR only where needed. */
/** A page's text plus where it came from, so every stored page is traceable. */
interface SourcedPage extends PageText {
  source: "pdf_text" | "ocr";
  /** OCR engine confidence (0..1); null for embedded PDF text. */
  confidence: number | null;
  /** OCR provider that read this page (null for embedded PDF text). */
  engine: string | null;
}

async function readPages(bytes: Uint8Array, mimeType: string): Promise<{ pages: SourcedPage[]; pageCount: number }> {
  const ocr = getOcrProvider(getConfig());
  if (mimeType === "application/pdf") {
    const pdf = await extractPdfText(bytes);
    let pages: SourcedPage[] = pdf.textPages.map((p) => ({ ...p, source: "pdf_text", confidence: null, engine: null }));
    if (pdf.pagesNeedingOcr.length > 0) {
      // Never silently drop pages: if any page needs OCR and OCR is not
      // available, the whole document fails with a clear reason.
      const ocrPages = await ocr.recognize({ bytes, mimeType, pages: pdf.pagesNeedingOcr });
      pages = [...pages, ...ocrPages.map((p): SourcedPage => ({ pageNumber: p.pageNumber, text: p.text, source: "ocr", confidence: p.confidence, engine: p.engine ?? ocr.name }))].sort(
        (a, b) => a.pageNumber - b.pageNumber
      );
    }
    return { pages, pageCount: pdf.pageCount };
  }
  const ocrPages = await ocr.recognize({ bytes, mimeType });
  return {
    pages: ocrPages.map((p): SourcedPage => ({ pageNumber: p.pageNumber, text: p.text, source: "ocr", confidence: p.confidence, engine: p.engine ?? ocr.name })),
    pageCount: 1,
  };
}

export type ProcessResult = { ok: true; extractionId: string } | { ok: false; code: DocumentErrorCode; retryable: boolean };

/** Runs text extraction, OCR and AI for one of the patient's documents. */
export async function processDocument(session: Session, documentId: string): Promise<ProcessResult> {
  const { patientId } = requireLive(session);
  const supabase = await createClient();

  const { data: claimed, error: claimError } = await supabase.rpc("claim_document_for_processing", {
    p_document_id: documentId,
  });
  if (claimError) {
    console.error("[documents] claim failed", { code: claimError.code ?? "unknown" });
    return { ok: false, code: "already_processing", retryable: true };
  }
  const doc = Array.isArray(claimed) ? claimed[0] : null;
  if (!doc) {
    const { data: current } = await supabase
      .from("documents")
      .select("extraction_status, processing_attempts")
      .eq("id", documentId)
      .eq("patient_id", patientId)
      .maybeSingle();
    if (!current) return { ok: false, code: "storage_failed", retryable: false };
    if (current.processing_attempts >= 3) return { ok: false, code: "too_many_attempts", retryable: false };
    return { ok: false, code: "already_processing", retryable: false };
  }

  let extractionId: string | null = null;
  const fail = async (error: unknown): Promise<ProcessResult> => {
    const docError = isDocumentError(error) ? error : new DocumentError("internal_error", true);
    // Error name only: messages from parsers/providers can echo document content.
    if (!isDocumentError(error)) console.error("[documents] unexpected processing error", { name: (error as { name?: string })?.name ?? "unknown" });
    await supabase
      .from("documents")
      .update({ extraction_status: "failed", processing_error: docError.code })
      .eq("id", documentId);
    if (extractionId) {
      await supabase
        .from("document_extractions")
        .update({ status: "failed", error_code: docError.code, completed_at: new Date().toISOString() })
        .eq("id", extractionId);
    }
    await audit(supabase, patientId, "extraction_failed", documentId, { reason: docError.code });
    return { ok: false, code: docError.code, retryable: docError.retryable };
  };

  try {
    // Fail fast before downloading, parsing or sending anything to OCR.
    const config = getConfig();
    const provider = getConfiguredProvider(config);
    if (!provider) throw new DocumentError("ai_not_configured");

    const { data: blob, error: downloadError } = await supabase.storage.from(DOCUMENTS_BUCKET).download(doc.storage_path);
    if (downloadError || !blob) throw new DocumentError("storage_failed", true);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const { pages, pageCount } = await readPages(bytes, doc.mime_type);
    const usedOcr = pages.some((p) => p.source === "ocr");
    const usedPdfText = pages.some((p) => p.source === "pdf_text");
    if (pages.every((p) => p.text.trim().length === 0)) throw new DocumentError("no_text_found");

    // Keep the extracted text for traceability (replaced on retry).
    await supabase.from("document_pages").delete().eq("document_id", documentId);
    const { error: pagesError } = await supabase.from("document_pages").insert(
      pages.map((p) => ({
        document_id: documentId,
        patient_id: patientId,
        page_number: p.pageNumber,
        text_source: p.source,
        ocr_confidence: p.confidence,
        content: p.text,
      }))
    );
    if (pagesError) throw new DocumentError("storage_failed", true);


    const { data: extraction, error: extractionError } = await supabase
      .from("document_extractions")
      .insert({
        document_id: documentId,
        patient_id: patientId,
        status: "pending",
        schema_version: EXTRACTION_SCHEMA_VERSION,
        text_source: usedOcr && usedPdfText ? "mixed" : usedOcr ? "ocr" : "pdf_text",
        // The provider that actually read the pages (the backup, if it was used).
        ocr_provider: usedOcr ? [...new Set(pages.flatMap((p) => (p.engine ? [p.engine] : [])))].join("+").slice(0, 50) : null,
        ai_provider: provider.name,
        ai_model: provider.model,
        is_simulated: provider.isSimulated,
      })
      .select("id")
      .single();
    if (extractionError || !extraction) throw new DocumentError("storage_failed", true);
    extractionId = extraction.id;

    const outcome = await runExtractionWithFallback(provider, getFallbackProvider(config), pages);

    await supabase
      .from("document_extractions")
      .update({
        status: "succeeded",
        output: { verified: outcome.verified } as never,
        // Records the backup provider when the primary was unavailable.
        ai_provider: outcome.provider,
        ai_model: outcome.model,
        completed_at: new Date().toISOString(),
      })
      .eq("id", extractionId);
    await supabase
      .from("documents")
      .update({ extraction_status: "completed", page_count: pageCount, processed_at: new Date().toISOString() })
      .eq("id", documentId);
    await audit(supabase, patientId, "extraction_completed", documentId);

    return { ok: true, extractionId };
  } catch (error) {
    return fail(error);
  }
}

/** OCR providers that are AI models transcribing an image (no engine confidence). */
const AI_VISION_OCR = [GEMINI_VISION_OCR, GROQ_VISION_OCR];

export interface ReviewData {
  extractionId: string;
  document: DocumentSummary;
  verified: VerifiedExtraction;
  pages: PageText[];
  provider: string;
  model: string;
  isSimulated: boolean;
  textReadByAi: boolean;
  /** The backup provider read or extracted this document (primary was unavailable). */
  readByBackup: boolean;
}

/** The latest extraction awaiting the patient's review, with its source text. */
export async function getReviewData(session: Session, documentId: string): Promise<ReviewData | null> {
  const { patientId } = requireLive(session);
  const supabase = await createClient();

  const [{ data: doc }, { data: extraction }, { data: pages }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", documentId).eq("patient_id", patientId).maybeSingle(),
    supabase
      .from("document_extractions")
      .select("id, output, ai_provider, ai_model, is_simulated, ocr_provider")
      .eq("document_id", documentId)
      .eq("patient_id", patientId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("document_pages")
      .select("page_number, content")
      .eq("document_id", documentId)
      .eq("patient_id", patientId)
      .order("page_number"),
  ]);
  if (!doc || !extraction) return null;
  const verified = (extraction.output as { verified?: VerifiedExtraction } | null)?.verified;
  if (!verified) return null;

  return {
    extractionId: extraction.id,
    document: mapDocument(doc),
    verified,
    pages: (pages ?? []).map((p) => ({ pageNumber: p.page_number, text: p.content })),
    provider: extraction.ai_provider ?? "unknown",
    model: extraction.ai_model ?? "unknown",
    isSimulated: extraction.is_simulated,
    textReadByAi: AI_VISION_OCR.some((name) => extraction.ocr_provider?.includes(name)),
    readByBackup: Boolean(extraction.ocr_provider?.includes(GROQ_VISION_OCR)) || extraction.ai_provider === "groq",
  };
}

export type ConfirmResult = { ok: true } | { ok: false; error: string };

export async function confirmReview(session: Session, submission: unknown): Promise<ConfirmResult> {
  requireLive(session);
  const parsed = reviewSubmissionSchema.safeParse(submission);
  if (!parsed.success) {
    const illegible = parsed.error.issues.some((i) => i.message === ILLEGIBLE_ERROR);
    return {
      ok: false,
      error: illegible
        ? "Some entries still contain [illegible]. Type what the document says, or remove the entry, before confirming."
        : "Some fields are invalid. Check the highlighted entries and try again.",
    };
  }
  const { extractionId, ...review } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_extraction", { p_extraction_id: extractionId, p_review: review as never });
  if (error) {
    console.error("[documents] confirm failed", { code: error.code ?? "unknown" });
    return { ok: false, error: "The records could not be saved. Nothing was changed; please try again." };
  }
  return { ok: true };
}

export async function cancelReview(session: Session, documentId: string): Promise<ConfirmResult> {
  const { patientId } = requireLive(session);
  const supabase = await createClient();
  await supabase
    .from("document_extractions")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("document_id", documentId)
    .eq("patient_id", patientId)
    .eq("status", "succeeded");
  const { error } = await supabase
    .from("documents")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("patient_id", patientId);
  if (error) return { ok: false, error: "The import could not be cancelled. Please try again." };
  await audit(supabase, patientId, "extraction_cancelled", documentId);
  return { ok: true };
}

/** Deletes the original file and its staging data. Confirmed records remain, unlinked. */
export async function deleteDocument(session: Session, documentId: string): Promise<ConfirmResult> {
  const { patientId } = requireLive(session);
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Document not found." };

  const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
  if (storageError) return { ok: false, error: "The file could not be deleted. Please try again." };
  const { error } = await supabase.from("documents").delete().eq("id", documentId).eq("patient_id", patientId);
  if (error) return { ok: false, error: "The document could not be deleted. Please try again." };
  await audit(supabase, patientId, "document_deleted", null);
  return { ok: true };
}
