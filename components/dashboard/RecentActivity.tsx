import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DEMO_MEDICAL_EVENTS } from "@/lib/demo/data";
import { FileText, TestTube, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { VerificationBadge } from "@/components/ui/VerificationBadge";

export function RecentActivity() {
  const events = DEMO_MEDICAL_EVENTS.slice(0, 4);

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent Health Timeline</CardTitle>
          <p className="text-xs text-muted-foreground">Latest consolidated clinical records</p>
        </div>
        <Link
          href="/timeline"
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((evt) => {
          const isLab = evt.event_type === "lab";
          const Icon = isLab ? TestTube : FileText;

          return (
            <div
              key={evt.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    isLab ? "bg-health-indigo/10 text-health-indigo" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">{evt.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{evt.summary}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                <span className="text-[11px] text-muted-foreground font-mono">{evt.event_date}</span>
                <VerificationBadge status={evt.verification_status} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
