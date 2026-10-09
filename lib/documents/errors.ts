// Processing failures with a stable code (stored on the document) and a
// patient-facing message. Messages never include document content.

export const DOCUMENT_ERROR_MESSAGES = {
  file_empty: "The file is empty.",
  file_too_large: "The file is larger than the upload limit.",
  file_type_unsupported: "Only PDF, JPEG and PNG files are supported.",
  file_type_mismatch: "The file's contents do not match its type. It may be corrupted or renamed.",
  file_duplicate: "You have already uploaded this exact file.",
  pdf_invalid: "The PDF could not be read. It may be damaged.",
  pdf_encrypted: "The PDF is password-protected. Remove the password and upload it again.",
  too_many_pages: "The document has too many pages to process. Split it into smaller files.",
  no_text_found: "No readable text was found in the document.",
  ocr_unavailable: "This looks like a scanned document, and text recognition (OCR) is not available right now.",
  ocr_failed: "Text recognition failed. Try a clearer scan or photo.",
  ai_not_configured: "Automatic extraction is not configured. You can still keep the document.",
  ai_unavailable: "The extraction service is temporarily unavailable. Please try again later.",
  ai_invalid_output: "The extraction result could not be validated, so it was discarded. Please retry.",
  storage_failed: "The document could not be stored. Please try again.",
  already_processing: "This document is already being processed.",
  too_many_attempts: "Processing has failed too many times for this document.",
} as const;

export type DocumentErrorCode = keyof typeof DOCUMENT_ERROR_MESSAGES;

export class DocumentError extends Error {
  constructor(
    public readonly code: DocumentErrorCode,
    /** Whether retrying the same input might succeed (e.g. provider outage). */
    public readonly retryable = false
  ) {
    super(DOCUMENT_ERROR_MESSAGES[code]);
    this.name = "DocumentError";
  }
}

/**
 * Structural check instead of `instanceof`: robust when the error crosses a
 * module-instance boundary (bundler chunks, test module isolation).
 */
export function isDocumentError(error: unknown): error is DocumentError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "DocumentError" &&
    Object.hasOwn(DOCUMENT_ERROR_MESSAGES, (error as { code?: string }).code ?? "")
  );
}
