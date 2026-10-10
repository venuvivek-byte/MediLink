import Link from "next/link";
import { AlertCircle, ArrowRight, Repeat } from "lucide-react";
import type { DuplicateMedicationAlert, RepeatTestAlert } from "@/lib/domain/insights";
import { formatDate } from "@/lib/format";

interface AlertsPanelProps {
  duplicates: DuplicateMedicationAlert[];
  repeats: RepeatTestAlert[];
}

export function AlertsPanel({ duplicates, repeats }: AlertsPanelProps) {
  const total = duplicates.length + repeats.length;

  return (
    <section
      aria-label="Records to double-check"
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm"
      data-purpose="clinical-double-check-panel"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-slate-900">Records to double-check</h2>
          {total > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {total}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 font-medium">Automatic clinical rule engine active</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Flagged by simple matching rules. A flag is not proof of an error; check with your doctor or pharmacist.
      </p>

      {total === 0 ? (
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
          <p className="text-xs text-slate-500">No possible duplicates or repeated tests flagged across your records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((alert) => (
            <div
              key={`dup-${alert.key}`}
              className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    Possible duplicate medication: {alert.displayName}
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    {alert.records.length} records list &ldquo;{alert.displayName}&rdquo; with the same strength and frequency:
                  </p>
                  <ul className="mt-2.5 space-y-1.5 text-slate-700 bg-white/70 p-3 rounded-lg border border-amber-100/80 text-xs font-medium">
                    {alert.records.map((m) => (
                      <li key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span>
                          • {m.name}
                          {m.frequency ? `, ${m.frequency}` : ""} · {formatDate(m.startDate)}
                        </span>
                        {m.prescriberName && (
                          <span className="text-slate-500 font-normal sm:text-right">{m.prescriberName}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3.5 flex flex-wrap items-center gap-3">
                    <Link
                      href="/medications"
                      className="text-xs font-semibold text-vault-800 hover:text-vault-900 inline-flex items-center gap-1 hover:underline"
                    >
                      Review medications <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {repeats.map((alert) => (
            <div
              key={`rep-${alert.key}-${alert.later.id}`}
              className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Repeat className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    Repeat Lab Test Flag: {alert.testName}
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Re-ordered within {alert.daysApart} days (between {formatDate(alert.earlier.testDate)} and{" "}
                    {formatDate(alert.later.testDate)}). Repeat testing is often intentional; check with your doctor if unsure.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      href="/lab-results"
                      className="text-xs font-semibold text-vault-800 hover:text-vault-900 inline-flex items-center gap-1 hover:underline"
                    >
                      Reconcile Test <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
