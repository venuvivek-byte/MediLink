import { Activity, FlaskConical, Pill, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Allergy, Condition, LabResult, Medication } from "@/lib/data/types";
import { formatDate } from "@/lib/format";

interface HealthSnapshotProps {
  medications: Medication[];
  allergies: Allergy[];
  conditions: Condition[];
  latestLab: LabResult | null;
}

function listPreview(rawNames: string[]): string {
  // The same substance is often recorded by several documents; preview each once.
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

  const cards = [
    {
      title: "Current medications",
      value: String(current.length),
      subtitle: uncertain.length > 0 ? `${uncertain.length} with uncertain status` : "As recorded in your documents",
      icon: Pill,
    },
    {
      title: "Documented allergies",
      value: String(allergies.length),
      subtitle: listPreview(allergies.map((a) => a.substance)),
      icon: ShieldAlert,
    },
    {
      title: "Active conditions",
      value: String(activeConditions.length),
      subtitle: listPreview(activeConditions.map((c) => c.name)),
      icon: Activity,
    },
    {
      title: "Latest lab result",
      value: latestLab ? `${latestLab.value ?? "—"}${latestLab.unit ? ` ${latestLab.unit}` : ""}` : "—",
      subtitle: latestLab ? `${latestLab.testName} · ${formatDate(latestLab.testDate)}` : "No lab results yet",
      icon: FlaskConical,
    },
  ];

  return (
    <section aria-label="Health snapshot" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((c) => (
        <Card key={c.title} className="border-border/80">
          <CardContent className="p-4 md:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">{c.title}</p>
              <p className="text-2xl md:text-3xl font-bold tracking-tight truncate">{c.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{c.subtitle}</p>
            </div>
            <div className="hidden sm:block p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
              <c.icon className="w-5 h-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
