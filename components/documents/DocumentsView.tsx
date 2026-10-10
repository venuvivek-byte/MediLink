"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, FileText, FlaskConical, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ReviewForm } from "./ReviewForm";
import { deleteDocumentAction, runDemoSampleAction } from "@/app/(app)/documents/actions";
import type { AppMode } from "@/lib/config/schema";
import type { DocumentSummary, ProcessingStatus } from "@/lib/data/types";
import type { ReviewPayload } from "@/lib/documents/review-payload";
import { formatDate, humanize } from "@/lib/format";

interface DocumentsViewProps {
  documents: DocumentSummary[];
  mode: AppMode;
  maxUploadBytes: number;
  demoSamples: { id: string; title: string }[];
}

const PROCESSING_LABEL: Record<ProcessingStatus, string> = {
  pending: "Not processed yet",
  processing: "Processing…",
  completed: "Processed",
  failed: "Processing failed",
};

const ACCEPT = "application/pdf,image/jpeg,image/png";

export function DocumentsView(props: DocumentsViewProps) {
  return props.mode === "demo" ? <DemoDocuments {...props} /> : <LiveDocuments {...props} />;
}

// ─── Real-user mode ───────────────────────────────────────────────────────

type Stage = { kind: "idle" } | { kind: "uploading" } | { kind: "processing"; documentId: string } | { kind: "error"; message: string; documentId?: string; retryable?: boolean };

function LiveDocuments({ documents, maxUploadBytes }: DocumentsViewProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const maxMb = Math.floor(maxUploadBytes / (1024 * 1024));

  const process = async (documentId: string) => {
    setStage({ kind: "processing", documentId });
    let res: Response;
    try {
      res = await fetch(`/api/documents/${documentId}/process`, { method: "POST" });
    } catch {
      // Network failure: never leave the button stuck on "Reading the document…".
      setStage({ kind: "error", message: "Could not reach the server. Check your connection.", documentId, retryable: true });
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string; retryable?: boolean };
    if (res.ok) {
      router.push(`/documents/${documentId}/review`);
      return;
    }
    setStage({ kind: "error", message: body.error ?? "Processing failed.", documentId, retryable: body.retryable });
    router.refresh();
  };

  const upload = async (file: File) => {
    // Client-side checks are for convenience only; the server re-validates everything.
    if (file.size > maxUploadBytes) {
      setStage({ kind: "error", message: `The file is larger than ${maxMb} MB.` });
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      setStage({ kind: "error", message: "Only PDF, JPEG and PNG files are supported." });
      return;
    }
    setStage({ kind: "uploading" });
    const form = new FormData();
    form.set("file", file);
    let res: Response;
    try {
      res = await fetch("/api/documents/upload", { method: "POST", body: form });
    } catch {
      setStage({ kind: "error", message: "Could not reach the server. Check your connection and try again." });
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string; document?: { id: string } };
    if (!res.ok || !body.document) {
      setStage({ kind: "error", message: body.error ?? "Upload failed." });
      return;
    }
    router.refresh();
    await process(body.document.id);
  };

  const remove = (doc: DocumentSummary) => {
    if (!window.confirm(`Delete "${doc.filename}"? The original file is removed. Records you already confirmed are kept, but will no longer link to their source.`)) return;
    setBusyId(doc.id);
    startTransition(async () => {
      const result = await deleteDocumentAction(doc.id);
      setBusyId(null);
      if (!result.ok) setStage({ kind: "error", message: result.error });
      router.refresh();
    });
  };

  const busy = stage.kind === "uploading" || stage.kind === "processing";

  return (
    <>
      <Card className="border-dashed border-2 p-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary">
            <Upload className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Add a medical document</h2>
            <p className="text-sm text-muted-foreground mt-0.5">PDF, JPEG or PNG, up to {maxMb} MB. Stored privately; only you can access it.</p>
          </div>
          <input
            ref={inputRef}
            id="document-file"
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
            {stage.kind === "uploading" ? "Uploading…" : stage.kind === "processing" ? "Reading the document…" : "Choose a file"}
          </Button>
          <div aria-live="polite" className="min-h-5 text-sm">
            {stage.kind === "processing" && (
              <span className="text-muted-foreground">Extracting text and details. This can take up to a minute for scanned documents.</span>
            )}
            {stage.kind === "error" && (
              <span role="alert" className="text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" aria-hidden="true" /> {stage.message}
                {stage.documentId && stage.retryable && (
                  <Button size="sm" variant="outline" className="h-9 text-sm ml-2" onClick={() => void process(stage.documentId!)}>
                    Try again
                  </Button>
                )}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Your documents</CardTitle>
          <span className="text-sm text-muted-foreground">{documents.length} files</span>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => {
                const awaitingReview = doc.processingStatus === "completed" && doc.reviewStatus === "pending_review" && !doc.cancelled;
                const canProcess = (doc.processingStatus === "pending" || doc.processingStatus === "failed") && doc.reviewStatus === "pending_review" && !doc.cancelled;
                return (
                  <li key={doc.id} className="p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <DocumentLine doc={doc} />
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {doc.cancelled ? (
                          <Badge variant="outline">Import cancelled</Badge>
                        ) : (
                          <Badge variant="outline" className={doc.processingStatus === "failed" ? "text-destructive border-destructive/30" : ""}>
                            {PROCESSING_LABEL[doc.processingStatus]}
                          </Badge>
                        )}
                        {/* "Pending review" only when there is something to review. */}
                        {(awaitingReview || doc.reviewStatus === "patient_reviewed") && <VerificationBadge status={doc.reviewStatus} />}
                      </div>
                    </div>
                    {doc.processingError && !doc.cancelled && <p className="text-sm text-destructive">{doc.processingError}</p>}
                    <div className="flex flex-wrap gap-2">
                      {awaitingReview && (
                        <Link href={`/documents/${doc.id}/review`} className={buttonVariants({ size: "sm", className: "h-9 text-sm gap-1" })}>
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Review extracted details
                        </Link>
                      )}
                      {canProcess && (
                        <Button size="sm" variant="outline" className="h-9 text-sm gap-1" disabled={busy} onClick={() => void process(doc.id)}>
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> {doc.processingStatus === "failed" ? "Retry" : "Process"}
                        </Button>
                      )}
                      <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" className="h-9 text-sm gap-1">
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" /> View original
                        </Button>
                      </a>
                      <Button size="sm" variant="ghost" className="h-9 text-sm gap-1 text-destructive" disabled={busyId === doc.id} onClick={() => remove(doc)}>
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function DocumentLine({ doc }: { doc: DocumentSummary }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
        <FileText className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold line-clamp-2 break-all" title={doc.filename}>{doc.filename}</h3>
        <p className="text-sm text-muted-foreground">
          {[
            doc.documentType ? humanize(doc.documentType) : "Type unknown",
            `Document date: ${formatDate(doc.documentDate)}`,
            `Uploaded: ${formatDate(doc.uploadedAt)}`,
            doc.pageCount ? `${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}` : null,
            doc.providerName,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

// ─── Demo mode ────────────────────────────────────────────────────────────

function DemoDocuments({ documents, demoSamples }: DocumentsViewProps) {
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (id: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await runDemoSampleAction(id);
      if (result.ok) setReview(result.review);
      else setMessage(result.error);
    });

  return (
    <>
      {!review && (
        <Card className="border-dashed border-2 p-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <FlaskConical className="w-8 h-8" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Try the import workflow with a sample</h2>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
                Demo mode does not accept real files and does not call any AI service. The samples are fictional, and their
                extraction output is simulated, including deliberate mistakes for you to catch during review.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {demoSamples.map((s) => (
                <Button key={s.id} variant="outline" disabled={pending} onClick={() => load(s.id)} className="text-sm h-auto min-h-9 py-2 max-w-full whitespace-normal text-center">
                  {s.title}
                </Button>
              ))}
            </div>
            {message && (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </div>
        </Card>
      )}

      {review && (
        <ReviewForm
          review={review}
          onConfirm={async () => {
            setReview(null);
            setMessage("Demo only: the reviewed sample was not saved. In real-user mode it would now appear in your records.");
            return { ok: true };
          }}
          onCancel={() => {
            setReview(null);
            setMessage("Import cancelled. Nothing was saved.");
          }}
        />
      )}

      <Card className="border-border/80">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Your documents</CardTitle>
          <span className="text-sm text-muted-foreground">{documents.length} files</span>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <DocumentLine doc={doc} />
                <VerificationBadge status={doc.reviewStatus} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
