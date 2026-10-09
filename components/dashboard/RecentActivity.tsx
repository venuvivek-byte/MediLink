import Link from "next/link";
import { ArrowUpRight, FileText, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { TimelineEvent } from "@/lib/data/types";
import { formatDate } from "@/lib/format";

export function RecentActivity({ events }: { events: TimelineEvent[] }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
          <p className="text-xs text-muted-foreground">Latest entries in your timeline</p>
        </div>
        <Link href="/timeline" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          View all <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing here yet. Upload a document to start your timeline.</p>
        )}
        {events.map((evt) => {
          const Icon = evt.eventType === "lab" ? FlaskConical : FileText;
          return (
            <div key={evt.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold truncate">{evt.title}</h3>
                  {evt.summary && <p className="text-[11px] text-muted-foreground line-clamp-1">{evt.summary}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[11px] text-muted-foreground">{formatDate(evt.eventDate)}</span>
                <VerificationBadge status={evt.reviewStatus} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
