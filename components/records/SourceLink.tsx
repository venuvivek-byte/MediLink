import { FileText } from "lucide-react";

export interface SourceInfo {
  documentId: string | null;
  page: number | null;
  /** Original filename; null if the document was deleted. */
  documentName: string | null;
}

/**
 * Where a record came from. In real-user mode it opens the original file
 * (PDFs jump to the cited page); demo documents have no file to open.
 */
export function SourceLink({ source, canOpen }: { source: SourceInfo; canOpen: boolean }) {
  if (!source.documentId || !source.documentName) {
    return <span className="text-[11px] text-muted-foreground">No source document linked</span>;
  }
  const label = `${source.documentName}${source.page ? `, page ${source.page}` : ""}`;
  if (!canOpen) {
    return (
      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <FileText className="w-3 h-3" aria-hidden="true" /> From {label}
      </span>
    );
  }
  const href = `/api/documents/${source.documentId}/file${source.page ? `#page=${source.page}` : ""}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
    >
      <FileText className="w-3 h-3" aria-hidden="true" /> From {label}
      <span className="sr-only"> (opens the original document in a new tab)</span>
    </a>
  );
}

/** Builds SourceInfo from a record and a map of document id -> filename. */
export function sourceOf(
  record: { sourceDocumentId: string | null; sourcePage: number | null },
  documentNames: Record<string, string>
): SourceInfo {
  return {
    documentId: record.sourceDocumentId,
    page: record.sourcePage,
    documentName: record.sourceDocumentId ? (documentNames[record.sourceDocumentId] ?? null) : null,
  };
}
