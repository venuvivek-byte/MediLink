import { NextResponse } from "next/server";
import { DocumentError, type DocumentErrorCode } from "./errors";

const STATUS: Partial<Record<DocumentErrorCode, number>> = {
  file_empty: 400,
  file_too_large: 413,
  file_type_unsupported: 415,
  file_type_mismatch: 415,
  file_duplicate: 409,
  already_processing: 409,
  too_many_attempts: 429,
  pdf_invalid: 422,
  pdf_encrypted: 422,
  too_many_pages: 422,
  no_text_found: 422,
  ocr_failed: 422,
  ai_invalid_output: 502,
  ocr_unavailable: 503,
  ai_unavailable: 503,
  ai_not_configured: 503,
  storage_failed: 503,
};

export const NO_STORE = { "Cache-Control": "no-store" };

export function documentErrorResponse(error: DocumentError | DocumentErrorCode, retryable?: boolean) {
  const e = typeof error === "string" ? new DocumentError(error, retryable) : error;
  return NextResponse.json(
    { error: e.message, code: e.code, retryable: e.retryable },
    { status: STATUS[e.code] ?? 400, headers: NO_STORE }
  );
}
