import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { AlertTriangle, Building2, Info, Pill, Stethoscope } from "lucide-react";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { MedicationEditor } from "@/components/medications/MedicationEditor";
import { DeleteRecordButton, NotDuplicateButton } from "@/components/records/RecordControls";
import { SourceLink, sourceOf } from "@/components/records/SourceLink";
import { getPatientRepository } from "@/lib/data";
import { getPublicConfig } from "@/lib/config/env";
import type { Medication, MedicationStatus } from "@/lib/data/types";
import { findDuplicateMedications } from "@/lib/domain/insights";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Medications" };

const SECTIONS: { status: MedicationStatus; title: string; description: string }[] = [
  { status: "current", title: "Currently taking", description: "You marked these as medicines you take now." },
  {
    status: "uncertain",
    title: "Not sure if still taken",
    description: "The record does not say whether you still take these. Update each one, or check with your doctor.",
  },
  { status: "discontinued", title: "Stopped", description: "Marked as stopped." },
  { status: "historical", title: "Past prescriptions", description: "From older records; not current." },
];

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function MedicationsPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Medications" subtitle="Every medicine found in your records, with its source" />}>
      <MedicationsContent />
    </Suspense>
  );
}

async function MedicationsContent() {
  const repo = await getPatientRepository();
  const [medications, decisions, documents] = await Promise.all([
    repo.listMedications(),
    repo.listDuplicateDecisions(),
    repo.listDocuments(),
  ]);
  const live = getPublicConfig().mode === "live";
  const documentNames = Object.fromEntries(documents.map((d) => [d.id, d.filename]));
  const duplicates = findDuplicateMedications(medications, decisions);
  const flagged = new Set(duplicates.flatMap((d) => d.records.map((r) => r.id)));

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Medications" subtitle="Every medicine found in your records, with its source" />
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {duplicates.map((alert) => (
          <section
            key={alert.key}
            aria-label={`Possible duplicate: ${alert.displayName}`}
            className="p-4 rounded-xl border border-health-amber/40 bg-health-amber/10 space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-health-amber shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold">Possible duplicate: {alert.displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  {alert.reason} This may be intentional (for example, a dose change). Check with your doctor or
                  pharmacist before changing anything.
                </p>
              </div>
            </div>
            <ul className="space-y-1 pl-8 text-sm">
              {alert.records.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">
                    {r.name}
                    {r.strength ? ` · ${r.strength}` : ""}
                    {r.frequency ? ` · ${r.frequency}` : ""}
                  </span>
                  <SourceLink source={sourceOf(r, documentNames)} canOpen={live} />
                </li>
              ))}
            </ul>
            {live && (
              <div className="pl-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <NotDuplicateButton kind="medication" recordIds={alert.records.map((r) => r.id)} />
                <span>or delete the extra entry from its card below.</span>
              </div>
            )}
          </section>
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
                  <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {items.length}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((med) => (
                  <MedicationCard
                    key={med.id}
                    med={med}
                    flagged={flagged.has(med.id)}
                    live={live}
                    documentNames={documentNames}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground flex items-start gap-2">
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

function MedicationCard({
  med,
  flagged,
  live,
  documentNames,
}: {
  med: Medication;
  flagged: boolean;
  live: boolean;
  documentNames: Record<string, string>;
}) {
  return (
    <Card className={flagged ? "border-health-amber/50" : "border-border/80"}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold">{med.name}</CardTitle>
            {flagged && (
              <Badge variant="outline" className="bg-health-amber/10 text-health-amber border-health-amber/30 text-xs">
                Possible duplicate
              </Badge>
            )}
          </div>
          {(med.ingredient || med.strength) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[med.ingredient, med.strength].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <VerificationBadge status={med.reviewStatus} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40">
          <div>
            <dt className="text-muted-foreground text-xs">Dosage &amp; route</dt>
            <dd className="font-medium">{[med.dosage, med.route].filter(Boolean).join(", ") || "Not stated"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Frequency</dt>
            <dd className="font-medium">{med.frequency ?? "Not stated"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Started</dt>
            <dd className="font-medium">{formatDate(med.startDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Stopped</dt>
            <dd className="font-medium">{med.endDate ? formatDate(med.endDate) : "Not stated"}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            {med.facilityName ?? "Facility not stated"}
          </span>
          <span className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
            {med.prescriberName ?? "Prescriber not stated"}
          </span>
        </div>
        <SourceLink source={sourceOf(med, documentNames)} canOpen={live} />
        {live && (
          <div className="flex flex-wrap items-start justify-between gap-2 pt-1 border-t">
            <MedicationEditor medication={med} />
            <DeleteRecordButton kind="medication" id={med.id} label={med.name} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
