import { AlertTriangle, Building2, Info, Pill, Stethoscope } from "lucide-react";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { getPatientRepository } from "@/lib/data";
import type { Medication, MedicationStatus } from "@/lib/data/types";
import { findDuplicateMedications } from "@/lib/domain/insights";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Medications" };

const SECTIONS: { status: MedicationStatus; title: string; description: string }[] = [
  { status: "current", title: "Current", description: "Recorded as currently taken." },
  {
    status: "uncertain",
    title: "Status uncertain",
    description: "The source does not say whether these are still taken. Confirm with your doctor.",
  },
  { status: "historical", title: "Historical", description: "From older records; not assumed to be current." },
  { status: "discontinued", title: "Discontinued", description: "Recorded as stopped." },
];

export default async function MedicationsPage() {
  const medications = await (await getPatientRepository()).listMedications();
  const duplicates = findDuplicateMedications(medications);
  const flagged = new Set(duplicates.flatMap((d) => d.records.map((r) => r.id)));

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Medications" subtitle="Every medicine found in your records, with its source" />
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {duplicates.map((alert) => (
          <div key={alert.key} role="note" className="p-4 rounded-xl border border-health-amber/40 bg-health-amber/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-health-amber shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold">Possible duplicate: {alert.displayName}</h2>
              <p className="text-xs text-muted-foreground">
                {alert.reason} This may be intentional (for example, a dose change). Check with your doctor or
                pharmacist before changing anything.
              </p>
            </div>
          </div>
        ))}

        {medications.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No medications recorded yet.
            </CardContent>
          </Card>
        )}

        {SECTIONS.map(({ status, title, description }) => {
          const items = medications.filter((m) => m.status === status);
          if (items.length === 0) return null;
          return (
            <section key={status} aria-labelledby={`meds-${status}`} className="space-y-3">
              <div>
                <h2 id={`meds-${status}`} className="text-base font-bold flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" aria-hidden="true" />
                  {title}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {items.length}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((med) => (
                  <MedicationCard key={med.id} med={med} flagged={flagged.has(med.id)} />
                ))}
              </div>
            </section>
          );
        })}

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Drug-interaction checking is not available.</strong> MyHealthVault does not check medicines
              against each other. Ask your pharmacist or doctor about interactions.
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MedicationCard({ med, flagged }: { med: Medication; flagged: boolean }) {
  return (
    <Card className={flagged ? "border-health-amber/50" : "border-border/80"}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold">{med.name}</CardTitle>
            {flagged && (
              <Badge variant="outline" className="bg-health-amber/10 text-health-amber border-health-amber/30 text-[10px]">
                Possible duplicate
              </Badge>
            )}
          </div>
          {(med.ingredient || med.strength) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[med.ingredient, med.strength].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <VerificationBadge status={med.reviewStatus} />
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <dl className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40">
          <div>
            <dt className="text-muted-foreground text-[10px]">Dosage &amp; route</dt>
            <dd className="font-medium">{[med.dosage, med.route].filter(Boolean).join(", ") || "Not stated"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px]">Frequency</dt>
            <dd className="font-medium">{med.frequency ?? "Not stated"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px]">Started</dt>
            <dd className="font-medium">{formatDate(med.startDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px]">Ended</dt>
            <dd className="font-medium">{med.endDate ? formatDate(med.endDate) : "Not stated"}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            {med.facilityName ?? "Facility not stated"}
          </span>
          <span className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
            {med.prescriberName ?? "Prescriber not stated"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
