import { Card, CardContent } from "@/components/ui/card";
import { Pill, ShieldCheck, Activity, TrendingUp } from "lucide-react";
import { getDemoStats } from "@/lib/demo/data";

export function HealthSnapshot() {
  const stats = getDemoStats();

  const cards = [
    {
      title: "Active Medications",
      value: stats.activeMedications,
      subtitle: "Across 3 clinical sources",
      icon: Pill,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      title: "Known Allergies",
      value: stats.knownAllergies,
      subtitle: "Penicillin documented",
      icon: ShieldCheck,
      color: "text-health-rose",
      bg: "bg-health-rose/10",
      border: "border-health-rose/20",
    },
    {
      title: "Chronic Conditions",
      value: stats.activeConditions,
      subtitle: "Type 2 Diabetes, HTN",
      icon: Activity,
      color: "text-health-indigo",
      bg: "bg-health-indigo/10",
      border: "border-health-indigo/20",
    },
    {
      title: "Latest HbA1c",
      value: stats.latestKeyResult?.value || "7.2%",
      subtitle: "Down from 7.8% (Improving)",
      icon: TrendingUp,
      color: "text-health-emerald",
      bg: "bg-health-emerald/10",
      border: "border-health-emerald/20",
      tag: "Trending Down",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card
          key={c.title}
          className={`border ${c.border} bg-card/60 backdrop-blur-sm hover:shadow-md transition-all duration-200`}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{c.title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">{c.value}</span>
                {c.tag && (
                  <span className="text-[10px] font-semibold text-health-emerald bg-health-emerald/10 px-1.5 py-0.5 rounded">
                    {c.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{c.subtitle}</p>
            </div>
            <div className={`p-3 rounded-2xl ${c.bg} ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
