"use client";

import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, AlertTriangle, Building2, Stethoscope, Clock, Check } from "lucide-react";
import { DEMO_MEDICATIONS, getDemoDuplicateAlerts } from "@/lib/demo/data";
import { VerificationBadge } from "@/components/ui/VerificationBadge";

export default function MedicationsPage() {
  const duplicateAlerts = getDemoDuplicateAlerts();
  const activeMeds = DEMO_MEDICATIONS.filter((m) => m.status === "active");

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Medication Management"
        subtitle="Current prescriptions, cross-provider duplicate detection & dosage schedules"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Duplicate Warning Alert */}
        {duplicateAlerts.length > 0 && (
          <div className="p-4 rounded-xl border border-health-amber/40 bg-health-amber/10 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-health-amber/20 text-health-amber shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-foreground">
                  Duplicate Medication Alert: Metformin
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Metformin is currently active in 2 different prescriptions (Apollo Hospitals 500mg BD and Fortis Hospital 1000mg OD). Please verify target dose with your doctor.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-xs border-health-amber/40 shrink-0">
              Mark as Reviewed
            </Button>
          </div>
        )}

        {/* Active Medications Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" />
              Active Prescriptions
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {activeMeds.length}
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMeds.map((med) => {
              const isDuplicate = med.metadata?.duplicate_alert;

              return (
                <Card
                  key={med.id}
                  className={`bg-card/70 backdrop-blur-sm border transition-all ${
                    isDuplicate
                      ? "border-health-amber/50 shadow-sm"
                      : "border-border/80 hover:shadow-md"
                  }`}
                >
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">{med.name}</CardTitle>
                        {isDuplicate && (
                          <Badge variant="outline" className="bg-health-amber/10 text-health-amber border-health-amber/30 text-[10px]">
                            Duplicate Flag
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {med.ingredient} • {med.strength}
                      </p>
                    </div>
                    <VerificationBadge status={med.verification_status} />
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Dosage & Route</span>
                        <span className="font-medium">{med.dosage} ({med.route})</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Frequency</span>
                        <span className="font-medium text-primary">{med.frequency}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{med.metadata?.facility || "Unknown Clinic"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{med.metadata?.provider || "Doctor"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Safety & Interaction Note */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              <strong>Medication Safety Note:</strong> Live drug-drug interaction database integration is scheduled for v1.1. Always consult your attending pharmacist or physician before adjusting dosages.
            </span>
            <Badge variant="secondary" className="shrink-0 text-[10px]">MVP Notice</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
