"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { DEMO_DOCUMENTS } from "@/lib/demo/data";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(DEMO_DOCUMENTS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewDoc, setReviewDoc] = useState<any | null>(null);

  // Extraction editable state
  const [docType, setDocType] = useState("prescription");
  const [docDate, setDocDate] = useState("2025-10-09");
  const [provider, setProvider] = useState("Dr. R. K. Singhal");
  const [medName, setMedName] = useState("Glimepiride 1mg");
  const [medDosage, setMedDosage] = useState("1 tablet once daily before breakfast");

  const handleSimulateUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setReviewDoc({
        id: `doc-${Date.now()}`,
        filename: "New_Prescription_CareClinic.pdf",
        confidence: 0.68, // trigger please verify warning
      });
    }, 1200);
  };

  const handleConfirmExtraction = () => {
    if (!reviewDoc) return;
    const newDoc = {
      id: reviewDoc.id,
      patient_id: "demo-user-00000-00000-00000-000001",
      storage_path: `demo/${reviewDoc.filename}`,
      original_filename: reviewDoc.filename,
      mime_type: "application/pdf",
      document_type: docType,
      document_date: docDate,
      provider_name: provider,
      extraction_status: "done",
      verification_status: "verified",
      extracted_data: null,
      metadata: { is_demo: true },
      created_at: new Date().toISOString(),
    };

    setDocuments([newDoc, ...documents]);
    setReviewDoc(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Medical Documents & AI Extraction"
        subtitle="Secure document repository with vision-based clinical parsing"
      />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Upload Dropzone Card */}
        <Card className="border-dashed border-2 border-primary/40 bg-card/40 backdrop-blur-sm p-6 text-center hover:border-primary/70 transition-all">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Upload Medical Records</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supports prescriptions, lab PDFs, discharge summaries (Max 5MB)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={handleSimulateUpload}
                disabled={isProcessing}
                className="bg-gradient-to-r from-primary to-health-emerald hover:opacity-90 gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI Analyzing Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Load Sample Document & Extract (Demo)
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Side-by-side Extraction Review Modal/Card when active */}
        {reviewDoc && (
          <Card className="border-health-amber/40 bg-card/90 shadow-xl overflow-hidden animate-fade-in-up">
            <CardHeader className="bg-health-amber/10 border-b border-health-amber/20 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-health-amber" />
                <div>
                  <CardTitle className="text-base font-semibold">
                    Review Extracted Clinical Data
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    File: {reviewDoc.filename} — Please verify fields before saving to your timeline
                  </p>
                </div>
              </div>
              <ConfidenceBadge confidence={reviewDoc.confidence} />
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Simulated Document Preview */}
                <div className="rounded-xl border border-border p-4 bg-muted/40 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Original Document View
                    </span>
                    <div className="mt-3 p-4 bg-background rounded-lg border border-border text-xs font-mono space-y-2">
                      <p className="font-bold">CARE CLINIC & DIAGNOSTICS</p>
                      <p>Date: {docDate} | Rx No: #7821</p>
                      <p>Patient: Ananya Rao (52y / F)</p>
                      <hr className="my-2 border-border" />
                      <p className="font-semibold text-foreground">Rx:</p>
                      <p>1. Tab Glimepiride 1mg - 1-0-0 (B/F)</p>
                      <p>Advise: Monitor blood sugar twice weekly.</p>
                      <p className="mt-4 text-[10px] text-muted-foreground">Signed: Dr. R. K. Singhal</p>
                    </div>
                  </div>
                  <div className="p-3 bg-health-amber/10 border border-health-amber/30 rounded-lg text-xs text-health-amber flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Confidence is 68%. Highlighting required patient confirmation per safety protocol.
                    </span>
                  </div>
                </div>

                {/* Editable Structured Fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Document Type</Label>
                    <Input
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Document Date</Label>
                    <Input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Doctor / Provider</Label>
                    <Input
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Extracted Medication</Label>
                    <Input
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Dosage & Instructions</Label>
                    <Input
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="pt-3 flex gap-3">
                    <Button
                      onClick={handleConfirmExtraction}
                      className="flex-1 bg-gradient-to-r from-primary to-health-emerald text-xs gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirm & Add to Records
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setReviewDoc(null)}
                      className="text-xs gap-1.5"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" /> Discard
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Documents List */}
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Processed Documents</CardTitle>
              <p className="text-xs text-muted-foreground">
                All records stored with user-isolated encryption
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {documents.length} Files
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {doc.original_filename}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{doc.provider_name || "Unknown Provider"}</span>
                        <span>•</span>
                        <span className="font-mono">{doc.document_date}</span>
                        <span>•</span>
                        <span className="capitalize">{doc.document_type.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <VerificationBadge status={doc.verification_status} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
