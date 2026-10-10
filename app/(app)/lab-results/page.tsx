import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { FlaskConical, Repeat } from "lucide-react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { LabTrendChart } from "@/components/labs/LabTrendChart";
import { getPatientRepository } from "@/lib/data";
import { buildLabSeries, findRepeatTests } from "@/lib/domain/insights";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Lab results" };

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function LabResultsPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Lab results" subtitle="Results as printed on your reports, compared over time" />}>
      <LabResultsContent />
    </Suspense>
  );
}

async function LabResultsContent() {
  const labs = await (await getPatientRepository()).listLabResults();
  const series = buildLabSeries(labs);
  const repeats = findRepeatTests(labs);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Lab results" subtitle="Results as printed on your reports, compared over time" />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <p className="text-xs text-muted-foreground">
          Reference ranges are copied from the original report. MyHealthVault does not interpret results; discuss them
          with your doctor.
        </p>

        {repeats.map((r) => (
          <div key={`${r.key}-${r.later.id}`} role="note" className="p-3 rounded-xl border border-border bg-muted/30 flex items-start gap-3 text-xs">
            <Repeat className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>{r.testName}</strong> was recorded {r.daysApart} days apart ({formatDate(r.earlier.testDate)} and{" "}
              {formatDate(r.later.testDate)}). This can be intentional; ask your doctor if you are unsure.
            </span>
          </div>
        ))}

        {series.slice(0, 3).map((s) => (
          <Card key={s.key} className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {s.testName} over time <span className="text-muted-foreground font-normal">({s.unit})</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {s.points.length} results in the same unit.
                {s.referenceRange ? ` Reference range on the latest report: ${s.referenceRange}.` : ""}
              </p>
            </CardHeader>
            <CardContent>
              <LabTrendChart series={s} />
            </CardContent>
          </Card>
        ))}

        <Card className="border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" aria-hidden="true" />
              All results
            </CardTitle>
            <span className="text-xs text-muted-foreground">{labs.length} results</span>
          </CardHeader>
          <CardContent className="p-0">
            {labs.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No lab results recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">All lab results, newest first</caption>
                  <thead className="bg-muted/50 border-y border-border text-muted-foreground text-xs">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Test</th>
                      <th scope="col" className="px-4 py-3 font-medium">Date</th>
                      <th scope="col" className="px-4 py-3 font-medium">Result</th>
                      <th scope="col" className="px-4 py-3 font-medium">Reference range (from report)</th>
                      <th scope="col" className="px-4 py-3 font-medium text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {labs.map((lab) => (
                      <tr key={lab.id}>
                        <th scope="row" className="px-4 py-3 font-semibold">{lab.testName}</th>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(lab.testDate)}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {lab.value ?? "—"} {lab.unit ?? ""}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{lab.referenceRange ?? "Not on report"}</td>
                        <td className="px-4 py-3 text-right">
                          <VerificationBadge status={lab.reviewStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
