import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Repeat, ArrowRight } from "lucide-react";
import { getDemoDuplicateAlerts, getDemoRepeatTestAlerts } from "@/lib/demo/data";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AlertsPanel() {
  const duplicateAlerts = getDemoDuplicateAlerts();
  const repeatAlerts = getDemoRepeatTestAlerts();

  const totalAlerts = duplicateAlerts.length + repeatAlerts.length;

  return (
    <Card className="border-health-amber/30 bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-health-amber/10 pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-health-amber/20 text-health-amber">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Clinical & Medication Alerts
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-health-amber/20 text-health-amber">
                {totalAlerts} Active
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Cross-record anomalies flagged for your clinical review
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {duplicateAlerts.map((alert, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl border border-health-amber/30 bg-health-amber/5 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-health-amber shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">
                  {alert.title}
                </span>
                <span className="text-[10px] font-medium text-health-amber bg-health-amber/15 px-2 py-0.5 rounded">
                  Duplicate Warning
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {alert.message}
              </p>
              <div className="pt-1 flex gap-2">
                <Link href="/medications">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1 px-2">
                    Review in Medications <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}

        {repeatAlerts.map((alert, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl border border-primary/25 bg-primary/5 text-sm"
          >
            <Repeat className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">
                  {alert.title}
                </span>
                <span className="text-[10px] font-medium text-primary bg-primary/15 px-2 py-0.5 rounded">
                  Lab Test Interval
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {alert.message}
              </p>
              <div className="pt-1">
                <Link href="/lab-results">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1 px-2">
                    View Lab Trends <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
