// Pure helpers for private document storage paths (unit-tested).
//
// Layout: {patientId}/{documentId}/{sha256}.{ext}
// - The first folder MUST be the owner's id: storage RLS and the
//   documents_storage_path_owner_check constraint both depend on it.
// - The user's original filename never appears in the path, so it cannot
//   inject path segments or leak through storage logs.

export const DOCUMENTS_BUCKET = "medical-documents";
export const SIGNED_URL_TTL_SECONDS = 60;

export const EXTENSION_BY_MIME = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export type AllowedMimeType = keyof typeof EXTENSION_BY_MIME;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return Object.hasOwn(EXTENSION_BY_MIME, value);
}

export function buildDocumentPath(
  patientId: string,
  documentId: string,
  sha256: string,
  mimeType: string
): string {
  if (!UUID.test(patientId)) throw new Error("Invalid patient id");
  if (!UUID.test(documentId)) throw new Error("Invalid document id");
  if (!SHA256.test(sha256)) throw new Error("Invalid content hash");
  if (!isAllowedMimeType(mimeType)) throw new Error("Unsupported file type");
  return `${patientId.toLowerCase()}/${documentId.toLowerCase()}/${sha256}.${EXTENSION_BY_MIME[mimeType]}`;
}

/** True only if `path` sits inside `patientId`'s own folder. */
export function isOwnedPath(path: string, patientId: string): boolean {
  const [owner, ...rest] = path.split("/");
  return owner === patientId.toLowerCase() && rest.length >= 1 && !rest.some((p) => p === "" || p === "." || p === "..");
}
