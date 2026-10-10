import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload, Share2, ShieldAlert, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function QuickActions() {
  const actions = [
    {
      title: "Upload record",
      desc: "Prescription, lab PDF, or scan",
      href: "/documents",
      icon: Upload,
      primary: true,
      color: "bg-primary-foreground/15 text-primary-foreground",
    },
    {
      title: "Share with a clinician",
      desc: "PIN-protected, expiring link",
      href: "/share",
      icon: Share2,
      primary: false,
      color: "bg-health-emerald/10 text-health-emerald",
    },
    {
      title: "Emergency card",
      desc: "QR access to vital info",
      href: "/emergency",
      icon: ShieldAlert,
      primary: false,
      color: "bg-health-rose/10 text-health-rose",
    },
    {
      title: "Full timeline",
      desc: "Filter by date and provider",
      href: "/timeline",
      icon: Clock,
      primary: false,
      color: "bg-health-indigo/10 text-health-indigo",
    },
  ];

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Quick actions</CardTitle>
      </CardHeader>
      {/* One column inside the narrow lg sidebar slot; two columns only on
          mid-width screens where the card spans the full content width. */}
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {actions.map((act) => (
          <Link
            key={act.title}
            href={act.href}
            className={cn(
              "flex items-center gap-3 min-h-14 p-3 rounded-xl border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              act.primary
                ? "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
                : "bg-background border-border/80 hover:bg-muted"
            )}
          >
            <div className={cn("p-2.5 rounded-xl shrink-0", act.color)}>
              <act.icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{act.title}</div>
              <div className={cn("text-xs", act.primary ? "text-primary-foreground/85" : "text-muted-foreground")}>
                {act.desc}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
