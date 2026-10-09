"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Lock,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  QrCode,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { DEMO_SHARES } from "@/lib/demo/data";
import { QRCodeSVG } from "qrcode.react";

export interface ShareItem {
  id: string;
  patient_id: string;
  token_hash: string;
  pin_hash: string;
  scope: {
    categories: string[];
    date_range: string | null;
    conditions: string[] | null;
  };
  date_range_start: string | null;
  date_range_end: string | null;
  expires_at: string;
  revoked_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export default function SharePage() {
  const [shares, setShares] = useState<ShareItem[]>(DEMO_SHARES as ShareItem[]);
  const [label, setLabel] = useState("");
  const [pin, setPin] = useState("482910");
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  const handleCreateShare = (e: React.FormEvent) => {
    e.preventDefault();
    const token = "demo-clinician-share-token";
    const shareUrl = `${window.location.origin}/share/${token}`;

    const newShare: ShareItem = {
      id: `share-${Date.now()}`,
      patient_id: "demo-user-00000-00000-00000-000001",
      token_hash: "hash-" + Date.now(),
      pin_hash: "bcrypt-hash",
      scope: {
        categories: ["medications", "conditions", "lab_results", "allergies"],
        date_range: null,
        conditions: null,
      },
      date_range_start: null,
      date_range_end: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null,
      metadata: { is_demo: true, label: label || "Clinician Consult" },
      created_at: new Date().toISOString(),
    };

    setShares([newShare, ...shares]);
    setCreatedShareUrl(shareUrl);
  };

  const handleRevoke = (id: string) => {
    setShares(
      shares.map((s) =>
        s.id === id ? { ...s, revoked_at: new Date().toISOString() } : s
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Consent-Scoped Clinician Sharing"
        subtitle="Generate time-bound, PIN-protected, and revokable health summary links"
      />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Security architecture highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Zero Plaintext PINs</p>
                <p className="text-muted-foreground">PINs are server-hashed via bcrypt (12 rounds).</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-health-emerald/5 border-health-emerald/20">
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-health-emerald shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Consent-Scoped</p>
                <p className="text-muted-foreground">Only authorized categories are returned.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-health-amber/5 border-health-amber/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-health-amber shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Instant Revocation</p>
                <p className="text-muted-foreground">One-click revocation immediately kills access.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate New Share Card */}
        <Card className="bg-card/70 backdrop-blur-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              Generate Clinician Share Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateShare} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Clinician / Facility Label</Label>
                  <Input
                    placeholder="e.g. Dr. Verma — Second Opinion"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">6-Digit Protection PIN</Label>
                  <Input
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-primary to-health-emerald text-xs gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Generate Protected Link
                </Button>
              </div>
            </form>

            {createdShareUrl && (
              <div className="mt-4 p-4 rounded-xl border border-health-emerald/30 bg-health-emerald/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-health-emerald flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Share Link Active
                  </span>
                  <span className="text-xs font-mono bg-background/80 px-2 py-0.5 rounded border">
                    PIN: {pin}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={createdShareUrl} className="text-xs h-8 font-mono bg-background" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => navigator.clipboard.writeText(createdShareUrl)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                  <a href={createdShareUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" className="h-8 text-xs shrink-0">
                      Open View
                    </Button>
                  </a>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <div className="p-2 bg-white rounded-lg border">
                    <QRCodeSVG value={createdShareUrl} size={64} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clinicians can scan this QR code on desktop or tablet and enter the 6-digit PIN to unlock the clinical summary.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Shares Table */}
        <Card className="bg-card/70 backdrop-blur-sm border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Active & Past Share Links</CardTitle>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {shares.length} Total
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {shares.map((s) => {
                const isRevoked = Boolean(s.revoked_at);

                return (
                  <div
                    key={s.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {s.metadata?.label || "General Consult"}
                        </span>
                        {isRevoked ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-health-emerald/10 text-health-emerald border-health-emerald/30 text-[10px]">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          Expires: {new Date(s.expires_at).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>Scope: Medications, Conditions, Labs</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isRevoked && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleRevoke(s.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Revoke Access
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
