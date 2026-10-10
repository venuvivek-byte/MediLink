import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ClipboardList, Eye, FileText, Lock, ShieldCheck, Upload, XCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatientRepository } from "@/lib/data";
import { formatDateTime, humanize } from "@/lib/format";

export const metadata = { title: "Audit history" };

const ICONS: Record<string, typeof Upload> = {
  document_uploaded: Upload,
  extraction_completed: FileText,
  extraction_confirmed: FileText,
  share_created: Lock,
  share_accessed: Eye,
  share_revoked: XCircle,
};

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function AuditPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Audit history" subtitle="Uploads, reviews and sharing activity on your account" />}>
      <AuditContent />
    </Suspense>
  );
}

async function AuditContent() {
  const events = await (await getPatientRepository()).listAuditEvents();

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Audit history" subtitle="Uploads, reviews and sharing activity on your account" />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <Card className="border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" aria-hidden="true" />
              Events
            </CardTitle>
            <span className="text-sm text-muted-foreground">{events.length} events</span>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {events.map((event) => {
                  const Icon = ICONS[event.eventType] ?? ShieldCheck;
                  return (
                    <li key={event.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{humanize(event.eventType)}</p>
                          {event.details.length > 0 && (
                            <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                              {event.details.map((d) => `${d.label}: ${d.value}`).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <time dateTime={event.occurredAt ?? undefined} className="text-sm text-muted-foreground shrink-0">
                        {formatDateTime(event.occurredAt)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
