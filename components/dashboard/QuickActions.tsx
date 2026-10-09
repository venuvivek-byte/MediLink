import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload, Share2, ShieldAlert, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  const actions = [
    {
      title: "Upload Record",
      desc: "Prescription, lab PDF, or scan",
      href: "/documents",
      icon: Upload,
      color: "bg-primary/10 text-primary hover:bg-primary/20",
    },
    {
      title: "Share with Clinician",
      desc: "PIN-protected, expiring link",
      href: "/share",
      icon: Share2,
      color: "bg-health-emerald/10 text-health-emerald hover:bg-health-emerald/20",
    },
    {
      title: "Emergency Card",
      desc: "Instant QR access to vital info",
      href: "/emergency",
      icon: ShieldAlert,
      color: "bg-health-rose/10 text-health-rose hover:bg-health-rose/20",
    },
    {
      title: "Full Timeline",
      desc: "Filter events by date & provider",
      href: "/timeline",
      icon: Clock,
      color: "bg-health-indigo/10 text-health-indigo hover:bg-health-indigo/20",
    },
  ];

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {actions.map((act) => (
          <Link key={act.title} href={act.href}>
            <Button
              variant="outline"
              className="w-full h-auto p-3.5 flex items-center justify-start gap-3 border-border/80 hover:bg-accent/40 rounded-xl transition-all"
            >
              <div className={`p-2.5 rounded-xl ${act.color}`}>
                <act.icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold">{act.title}</div>
                <div className="text-[11px] text-muted-foreground">{act.desc}</div>
              </div>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
