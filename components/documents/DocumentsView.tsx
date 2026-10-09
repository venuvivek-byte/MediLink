"use client";

import { useState } from "react";
import { CheckCircle2, FileText, FlaskConical, Info, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { AppMode } from "@/lib/config/schema";
import type { DocumentSummary, ProcessingStatus } from "@/lib/data/types";
import { formatDate, humanize } from "@/lib/format";

interface DocumentsViewProps {
  documents: DocumentSummary[];
  mode: AppMode;
  maxUploadBytes: number;
}

const PROCESSING_LABEL: Record<ProcessingStatus, string> = {
  pending: "Waiting to process",
  processing: "Processing",
  completed: "Processed",
  failed: "Processing failed",
};

/** Fixed, clearly synthetic sample used to demonstrate the review step. */
const DEMO_SAMPLE = {
  filename: "Sample_Prescription_CareClinic.pdf",
  documentDate: "2025-10-09",
  provider: "Dr. R. K. Singhal",
  medication: "Glimepiride 1mg",
  instructions: "1 tablet once daily before breakfast",
};

export function DocumentsView({ documents: initialDocuments, mode, maxUploadBytes }: DocumentsViewProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [reviewing, setReviewing] = useState(false);
  const [fields, setFields] = useState({ ...DEMO_SAMPLE });

  const confirmDemoImport = () => {
    setDocuments((docs) => [
      {
        id: `demo-local-${docs.length + 1}`,
        filename: fields.filename,
        mimeType: "application/pdf",
        documentType: "prescription",
        documentDate: fields.documentDate || null,
        providerName: fields.provider || null,
        facilityName: "Care Clinic & Diagnostics",
        processingStatus: "completed",
        reviewStatus: "patient_reviewed",
        uploadedAt: new Date().toISOString(),
      },
      ...docs,
    ]);
    setReviewing(false);
  };

  return (
    <>
      <Card className="border-dashed border-2 p-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary">
            <Upload className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Add a medical document</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              PDF, JPEG or PNG, up to {(maxUploadBytes / (1024 * 1024)).toFixed(0)} MB
            </p>
          </div>
          {mode === "demo" ? (
            <div className="space-y-2">
              <Button onClick={() => setReviewing(true)} disabled={reviewing} className="gap-2">
                <FlaskConical className="w-4 h-4" aria-hidden="true" />
                Load sample prescription (simulated)
              </Button>
              <p className="text-[11px] text-muted-foreground max-w-md">
                Demo mode does not accept real files and does not call any AI service. The extracted fields below are
                pre-written sample output.
              </p>
            </div>
          ) : (
            <p role="note" className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-4 h-4" aria-hidden="true" />
              Document upload is not available yet.
            </p>
          )}
        </div>
      </Card>

      {mode === "demo" && reviewing && (
        <Card className="border-health-amber/40">
          <CardHeader className="bg-health-amber/10 border-b border-health-amber/20 pb-3 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">Review extracted details</CardTitle>
              <p className="text-xs text-muted-foreground">
                Check every field against the document. Nothing is added to your records until you confirm.
              </p>
            </div>
            <Badge variant="outline" className="border-health-amber/40 text-health-amber shrink-0">
              Simulated output
            </Badge>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border p-4 bg-muted/40 text-xs font-mono space-y-1.5">
              <p className="font-sans font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sample document
              </p>
              <p className="font-bold">CARE CLINIC &amp; DIAGNOSTICS</p>
              <p>Date: 09/10/2025 | Rx No: #7821</p>
              <p>Patient: Ananya Rao</p>
              <hr className="my-2 border-border" />
              <p>Rx: Tab Glimepiride 1mg 1-0-0 (B/F)</p>
              <p>Advice: Monitor blood sugar twice weekly.</p>
              <p className="text-muted-foreground">Signed: Dr. R. K. Singhal</p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                confirmDemoImport();
              }}
            >
              {(
                [
                  ["documentDate", "Document date", "date"],
                  ["provider", "Doctor / provider", "text"],
                  ["medication", "Medication", "text"],
                  ["instructions", "Dosage & instructions", "text"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`review-${key}`} className="text-xs font-medium">{label}</Label>
                  <Input
                    id={`review-${key}`}
                    type={type}
                    value={fields[key]}
                    onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
              <div className="pt-2 flex gap-3">
                <Button type="submit" className="flex-1 gap-1.5">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Confirm
                </Button>
                <Button type="button" variant="outline" onClick={() => setReviewing(false)} className="gap-1.5">
                  <Trash2 className="w-4 h-4" aria-hidden="true" /> Cancel import
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Demo only: confirmed samples are kept in this browser tab and disappear on reload.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Your documents</CardTitle>
          <span className="text-xs text-muted-foreground">{documents.length} files</span>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => (
                <li key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileText className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate">{doc.filename}</h3>
                      <p className="text-xs text-muted-foreground">
                        {[
                          doc.documentType ? humanize(doc.documentType) : "Type unknown",
                          `Document date: ${formatDate(doc.documentDate)}`,
                          `Uploaded: ${formatDate(doc.uploadedAt)}`,
                          doc.providerName,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={doc.processingStatus === "failed" ? "text-destructive border-destructive/30" : ""}
                    >
                      {PROCESSING_LABEL[doc.processingStatus]}
                    </Badge>
                    <VerificationBadge status={doc.reviewStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
