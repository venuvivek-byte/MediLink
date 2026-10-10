import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/ui/PrintButton";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { Allergy, Condition, LabResult, Medication } from "@/lib/data/types";
import { formatDate, formatDateTime } from "@/lib/format";

interface ClinicianSummaryProps {
  patientName: string;
  expiresAt: string;
  isDemo: boolean;
  /** null = category not included in this share. */
  conditions: Condition[] | null;
  medications: Medication[] | null;
  allergies: Allergy[] | null;
  labs: LabResult[] | null;
}

/** Read-only. Contains no forms, links into the app, or record identifiers. */
export function ClinicianSummary(props: ClinicianSummaryProps) {
  const { patientName, expiresAt, isDemo, conditions, medications, allergies, labs } = props;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg">{patientName}</h1>
              {isDemo && <Badge variant="outline">Demo · fictional patient</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Read-only summary shared by the patient · access expires {formatDateTime(expiresAt)}
            </p>
          </div>
          <PrintButton label="Print" />
        </header>

        <p className="text-sm text-muted-foreground">
          Records were extracted from the patient&apos;s documents. &quot;Patient-reviewed&quot; means the patient
          confirmed the entry against the source; it has not been clinically verified.
        </p>

        {allergies && (
          <Section title="Allergies">
            {allergies.length === 0 ? (
              <Empty>None documented (this does not rule out allergies).</Empty>
            ) : (
              <ul className="space-y-1.5">
                {allergies.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{a.substance}</span>
                    {a.reaction && <span className="text-muted-foreground">— {a.reaction}</span>}
                    <VerificationBadge status={a.reviewStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {conditions && (
          <Section title="Conditions">
            {conditions.length === 0 ? (
              <Empty>None documented.</Empty>
            ) : (
              <ul className="space-y-1.5">
                {conditions.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-muted-foreground">({c.status})</span>
                    <VerificationBadge status={c.reviewStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {medications && (
          <Section title="Medications">
            {medications.length === 0 ? (
              <Empty>None documented.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {medications.map((m) => (
                  <li key={m.id} className="py-2 text-sm flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-muted-foreground">
                      {[m.dosage, m.frequency].filter(Boolean).join(", ")} · from {formatDate(m.startDate)}
                    </span>
                    <Badge variant="outline" className="text-xs">{m.status}</Badge>
                    <VerificationBadge status={m.reviewStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {labs && (
          <Section title="Lab results">
            {labs.length === 0 ? (
              <Empty>None documented.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-sm text-muted-foreground border-b border-border">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-medium">Test</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Result</th>
                      <th scope="col" className="py-2 font-medium">Reference range (from report)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {labs.map((l) => (
                      <tr key={l.id}>
                        <th scope="row" className="py-2 pr-4 font-semibold">{l.testName}</th>
                        <td className="py-2 pr-4 whitespace-nowrap">{formatDate(l.testDate)}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{l.value ?? "—"} {l.unit ?? ""}</td>
                        <td className="py-2 text-muted-foreground">{l.referenceRange ?? "Not on report"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
