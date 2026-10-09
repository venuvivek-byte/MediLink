import { createHash } from "node:crypto";
import type { AllowedMimeType } from "@/lib/storage/paths";
import { DocumentError } from "./errors";

// The declared MIME type and the file extension are client-controlled, so the
// real type is decided from the file's leading bytes ("magic numbers").

const SIGNATURES: { mime: AllowedMimeType; bytes: number[] }[] = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
];

export function detectMimeType(bytes: Uint8Array): AllowedMimeType | null {
  for (const { mime, bytes: sig } of SIGNATURES) {
    if (bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b)) return mime;
  }
  return null;
}

export interface ValidatedFile {
  mimeType: AllowedMimeType;
  sha256: string;
  sizeBytes: number;
  /** Display-only; never used in storage paths. */
  safeFilename: string;
}

/** Keeps a readable name for display while removing paths and control characters. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return cleaned.length > 0 && cleaned !== "." && cleaned !== ".." ? cleaned : "document";
}

export function validateUpload(
  bytes: Uint8Array,
  declared: { mimeType: string; filename: string },
  maxBytes: number
): ValidatedFile {
  if (bytes.length === 0) throw new DocumentError("file_empty");
  if (bytes.length > maxBytes) throw new DocumentError("file_too_large");

  const detected = detectMimeType(bytes);
  if (!detected) throw new DocumentError("file_type_unsupported");
  // A declared type that disagrees with the content is rejected rather than
  // silently corrected: it usually means a renamed or corrupted file.
  const declaredType = declared.mimeType === "image/jpg" ? "image/jpeg" : declared.mimeType;
  if (declaredType && declaredType !== "application/octet-stream" && declaredType !== detected) {
    throw new DocumentError("file_type_mismatch");
  }

  return {
    mimeType: detected,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.length,
    safeFilename: sanitizeFilename(declared.filename),
  };
}
