import { FlaskConical, Pill, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Allergy, Condition, LabResult, Medication } from "@/lib/data/types";
import { formatDate } from "@/lib/format";

interface HealthSnapshotProps {
  medications: Medication[];
  allergies: Allergy[];
  conditions: Condition[];
  latestLab: LabResult | null;
}

function listPreview(rawNames: string[]): string {
  const seen = new Set<string>();
  const names = rawNames.filter((n) => {
    const key = n.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (names.length === 0) return "None recorded";
  return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export function HealthSnapshot({ medications, allergies, conditions, latestLab }: HealthSnapshotProps) {
  const current = medications.filter((m) => m.status === "current");
  const uncertain = medications.filter((m) => m.status === "uncertain");
  const activeConditions = conditions.filter((c) => c.status === "active");

  return (
    <section aria-label="Health snapshot" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" data-purpose="metrics-summary-grid">
      {/* Metric 1: Medication */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div className="text-3xl font-bold tracking-tight text-slate-900">{current.length}</div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Pill className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-900">Medication</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {uncertain.length > 0 ? `${uncertain.length} uncertain` : current.length > 0 ? "As recorded in records" : "None recorded"}
          </div>
        </div>
      </div>

      {/* Metric 2: Allergies */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div className="text-3xl font-bold tracking-tight text-slate-900">{allergies.length}</div>
          <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-900">Allergies</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium truncate">
            {listPreview(allergies.map((a) => a.substance))}
          </div>
        </div>
      </div>

      {/* Metric 3: Active Conditions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div className="text-3xl font-bold tracking-tight text-slate-900">{activeConditions.length}</div>
          <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-900">Active conditions</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">
            {listPreview(activeConditions.map((c) => c.name))}
          </div>
        </div>
      </div>

      {/* Metric 4: Latest Lab Result */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {latestLab ? (latestLab.value ?? "—") : "—"}
            </span>
            {latestLab?.unit && (
              <span className="text-xl font-semibold text-slate-600">{latestLab.unit}</span>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FlaskConical className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {latestLab ? latestLab.testName : "Lab result"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {latestLab ? formatDate(latestLab.testDate) : "None recorded"}
          </div>
        </div>
      </div>
    </section>
  );
}
