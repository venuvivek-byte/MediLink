import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { AlertTriangle, FlaskConical, Repeat } from "lucide-react";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { LabTrendChart } from "@/components/labs/LabTrendChart";
import { DeleteRecordButton, NotDuplicateButton } from "@/components/records/RecordControls";
import { SourceLink, sourceOf } from "@/components/records/SourceLink";
import { getPatientRepository } from "@/lib/data";
import { sessionAccess } from "@/lib/auth/session";
import { buildLabSeries, findDuplicateLabEntries, findRepeatTests } from "@/lib/domain/insights";
import { formatDate } from "@/lib/format";

/** Tests with 2+ results get a trend chart, most-measured first. */
const MAX_CHARTS = 6;

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
  const repo = await getPatientRepository();
  const [labs, decisions, documents] = await Promise.all([
    repo.listLabResults(),
    repo.listDuplicateDecisions(),
    repo.listDocuments(),
  ]);
  const { canEdit: live, canOpenFiles } = await sessionAccess();
  const documentNames = Object.fromEntries(documents.map((d) => [d.id, d.filename]));
  const series = buildLabSeries(labs);
  const repeats = findRepeatTests(labs);
  const duplicates = findDuplicateLabEntries(labs, decisions);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Lab results" subtitle="Results as printed on your reports, compared over time" />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <p className="text-sm text-muted-foreground">
          Reference ranges and high/low flags are copied from the original report. MyHealthVault does not interpret
          results or decide what is normal; discuss them with your doctor.
        </p>

        {duplicates.map((d) => (
          <section
            key={d.key}
            aria-label={`Possible duplicate entry: ${d.testName}`}
            className="p-4 rounded-xl border border-health-amber/40 bg-health-amber/10 space-y-2 text-sm"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-health-amber shrink-0" aria-hidden="true" />
              <p>
                <strong>Possible duplicate entry:</strong> {d.testName} on {formatDate(d.testDate)} appears{" "}
                {d.records.length} times with the same result. This usually means the same report was added twice.
              </p>
            </div>
            <ul className="pl-8 space-y-1">
              {d.records.map((r) => (
                <li key={r.id}>
                  <SourceLink source={sourceOf(r, documentNames)} canOpen={canOpenFiles} />
                </li>
              ))}
            </ul>
            {live && (
              <div className="pl-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <NotDuplicateButton kind="lab_result" recordIds={d.records.map((r) => r.id)} />
                <span>or delete the extra entry in the table below.</span>
              </div>
            )}
          </section>
        ))}

        {repeats.map((r) => (
          <div key={`${r.key}-${r.later.id}`} role="note" className="p-3 rounded-xl border border-border bg-muted/30 flex items-start gap-3 text-sm">
            <Repeat className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>{r.testName}</strong> was recorded {r.daysApart} days apart ({formatDate(r.earlier.testDate)} and{" "}
              {formatDate(r.later.testDate)}). This can be intentional; ask your doctor if you are unsure.
            </span>
          </div>
        ))}

        {series.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {series.slice(0, MAX_CHARTS).map((s) => (
              <Card key={s.key} className="border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    {s.testName} over time <span className="text-muted-foreground font-normal">({s.unit})</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {s.points.length} results in the same unit.
                    {s.referenceRange ? ` Reference range on the latest report: ${s.referenceRange}.` : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <LabTrendChart series={s} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" aria-hidden="true" />
              All results
            </CardTitle>
            <span className="text-sm text-muted-foreground">{labs.length} results</span>
          </CardHeader>
          <CardContent className="p-0">
            {labs.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No lab results recorded yet.</p>
            ) : (
              <>
              {/* Seven columns cannot fit a phone; below md each result is a stacked row. */}
              <ul className="md:hidden divide-y divide-border border-t border-border" aria-label="All lab results, newest first">
                {labs.map((lab) => (
                  <li key={lab.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{lab.testName}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(lab.testDate)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium whitespace-nowrap">
                          {lab.value ?? "—"} {lab.unit ?? ""}
                        </p>
                        {lab.reportFlag && (
                          <Badge variant="outline" className="border-health-amber/50 text-health-amber text-xs">
                            {lab.reportFlag}
                            <span className="sr-only"> (as printed on the report)</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reference range: {lab.referenceRange ?? "Not on report"}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <SourceLink source={sourceOf(lab, documentNames)} canOpen={canOpenFiles} />
                      <div className="flex items-center gap-2">
                        <VerificationBadge status={lab.reviewStatus} />
                        {live && <DeleteRecordButton kind="lab_result" id={lab.id} label={`${lab.testName} result`} />}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">All lab results, newest first</caption>
                  <thead className="bg-muted/50 border-y border-border text-muted-foreground text-sm">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Test</th>
                      <th scope="col" className="px-4 py-3 font-medium">Date</th>
                      <th scope="col" className="px-4 py-3 font-medium">Result</th>
                      <th scope="col" className="px-4 py-3 font-medium">Flag on report</th>
                      <th scope="col" className="px-4 py-3 font-medium">Reference range (from report)</th>
                      <th scope="col" className="px-4 py-3 font-medium">Source</th>
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
                        <td className="px-4 py-3">
                          {lab.reportFlag ? (
                            <Badge variant="outline" className="border-health-amber/50 text-health-amber text-xs">
                              {lab.reportFlag}
                              <span className="sr-only"> (as printed on the report)</span>
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">None printed</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{lab.referenceRange ?? "Not on report"}</td>
                        <td className="px-4 py-3">
                          <SourceLink source={sourceOf(lab, documentNames)} canOpen={canOpenFiles} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-col items-end gap-1">
                            <VerificationBadge status={lab.reviewStatus} />
                            {live && <DeleteRecordButton kind="lab_result" id={lab.id} label={`${lab.testName} result`} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
