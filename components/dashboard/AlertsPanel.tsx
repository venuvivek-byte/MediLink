import Link from "next/link";
import { AlertCircle, ArrowRight, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DuplicateMedicationAlert, RepeatTestAlert } from "@/lib/domain/insights";
import { formatDate } from "@/lib/format";

interface AlertsPanelProps {
  duplicates: DuplicateMedicationAlert[];
  repeats: RepeatTestAlert[];
}

export function AlertsPanel({ duplicates, repeats }: AlertsPanelProps) {
  const total = duplicates.length + repeats.length;

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Records to double-check {total > 0 && <span className="text-muted-foreground font-normal">({total})</span>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Flagged by simple matching rules. A flag is not proof of an error; check with your doctor or pharmacist.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 && <p className="text-sm text-muted-foreground">No possible duplicates found.</p>}

        {duplicates.map((alert) => (
          <div key={`dup-${alert.key}`} className="flex items-start gap-3 p-3 rounded-xl border border-health-amber/40 bg-health-amber/5">
            <AlertCircle className="w-5 h-5 text-health-amber shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <p className="font-semibold text-sm">Possible duplicate medication: {alert.displayName}</p>
              <p className="text-sm text-muted-foreground">{alert.reason}</p>
              <ul className="text-sm space-y-0.5">
                {alert.records.map((m) => (
                  <li key={m.id}>
                    {m.name}
                    {m.frequency ? `, ${m.frequency}` : ""} · from {formatDate(m.startDate)}
                    {m.prescriberName ? ` · ${m.prescriberName}` : ""}
                  </li>
                ))}
              </ul>
              <Link href="/medications" className="inline-flex items-center gap-1 min-h-11 -my-1.5 text-sm text-primary font-medium hover:underline">
                Review medications <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}

        {repeats.map((alert) => (
          <div key={`rep-${alert.key}-${alert.later.id}`} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <Repeat className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <p className="font-semibold text-sm">
                {alert.testName} recorded {alert.daysApart} days apart
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(alert.earlier.testDate)} and {formatDate(alert.later.testDate)}. Repeat testing is often
                intentional; ask your doctor if you are unsure why it was repeated.
              </p>
              <Link href="/lab-results" className="inline-flex items-center gap-1 min-h-11 -my-1.5 text-sm text-primary font-medium hover:underline">
                View lab results <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
