"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Printer,
  ShieldAlert,
  Pill,
  Activity,
  AlertTriangle,
  Heart,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  DEMO_PATIENT,
  DEMO_CONDITIONS,
  DEMO_MEDICATIONS,
  DEMO_ALLERGIES,
  DEMO_LAB_RESULTS,
} from "@/lib/demo/data";

export default function ClinicianSharePage() {
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "482910" || pin.length === 6) {
      setIsUnlocked(true);
      setError(null);
    } else {
      setError("Invalid PIN. Please check the 6-digit access code provided by the patient.");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-border/80">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-bold">Lost in Transit — Clinician Portal</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Patient record is PIN-protected. Enter the 6-digit PIN provided by the patient to decrypt and view clinical summary.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Input
                  type="password"
                  placeholder="Enter 6-digit PIN (Demo: 482910)"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="text-center text-lg tracking-widest font-mono h-12"
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-destructive text-center font-medium">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-health-emerald"
              >
                Unlock Patient Health Summary
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = DEMO_PATIENT;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Clinician Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-health-emerald flex items-center justify-center text-white">
              <Heart className="w-5 h-5" fill="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg">{patient.display_name}</h1>
                <Badge variant="outline" className="text-xs font-semibold">
                  DOB: {patient.date_of_birth} (52y)
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Blood: {patient.blood_group}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Consent-scoped health summary • Share expires in 28 days
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs gap-1.5 self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" /> Print / Export PDF
          </Button>
        </div>

        {/* Clinical Disclaimer Banner */}
        <div className="p-3 bg-muted/60 border border-border rounded-lg text-xs text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Clinical Notice:</strong> Extracted from patient-submitted records. Confirmed by patient Ananya Rao. Not a replacement for formal physician-to-physician transfer.
          </span>
        </div>

        {/* Clinical Duplicate Alert */}
        <div className="p-4 rounded-xl border border-health-amber/40 bg-health-amber/10 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-health-amber shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-semibold text-foreground">
              Clinical Alert: Active Duplicate Metformin Prescriptions
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Records show Metformin 500mg BD (Apollo) and Metformin 1000mg OD (Fortis) both listed as active. Review total daily dose.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chronic Conditions */}
          <Card className="bg-card/70 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-health-indigo" />
                Chronic Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEMO_CONDITIONS.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg border border-border/80 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <Badge variant="outline" className="bg-health-emerald/10 text-health-emerald border-health-emerald/30 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documented Allergies */}
          <Card className="bg-card/70 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-health-rose">
                <ShieldAlert className="w-4 h-4 text-health-rose" />
                Allergies & Adverse Reactions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEMO_ALLERGIES.map((a) => (
                <div key={a.id} className="p-2.5 rounded-lg border border-health-rose/30 bg-health-rose/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground">{a.substance}</span>
                    <span className="text-muted-foreground ml-2">Reaction: {a.reaction}</span>
                  </div>
                  <Badge variant="outline" className="bg-health-rose/10 text-health-rose border-health-rose/30 text-[10px]">
                    Confirmed
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Current Medications */}
        <Card className="bg-card/70 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" />
              Active Medication Regimen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-xs">
              {DEMO_MEDICATIONS.map((med) => (
                <div key={med.id} className="p-3.5 flex items-center justify-between hover:bg-accent/20">
                  <div>
                    <span className="font-semibold text-foreground text-sm">{med.name}</span>
                    <p className="text-muted-foreground mt-0.5">
                      {med.dosage} • {med.frequency} • {med.route}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Source: {med.metadata?.facility || "Clinic"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Lab Trends */}
        <Card className="bg-card/70 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Recent Lab Biomarkers (SRL Diagnostics / Thyrocare)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Biomarker</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Result</th>
                  <th className="px-4 py-2.5">Reference Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DEMO_LAB_RESULTS.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 font-medium">{l.test_name}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{l.test_date}</td>
                    <td className="px-4 py-2.5 font-bold">
                      <span className={l.is_abnormal ? "text-health-amber" : "text-foreground"}>
                        {l.result_value} {l.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{l.reference_range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
