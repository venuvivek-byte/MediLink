import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import {
  ClipboardList,
  Eye,
  FileText,
  KeyRound,
  Lock,
  Pencil,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatientRepository } from "@/lib/data";
import type { AccessLogEntry, AccessOutcome } from "@/lib/data/types";
import { formatDateTime, humanize } from "@/lib/format";

export const metadata = { title: "Audit history" };

const SUBTITLE = "Who opened your shared links, and every change on your account";

const ICONS: Record<string, typeof Upload> = {
  document_uploaded: Upload,
  document_deleted: Trash2,
  extraction_completed: FileText,
  extraction_confirmed: FileText,
  record_edited: Pencil,
  record_deleted: Trash2,
  share_created: Lock,
  share_accessed: Eye,
  share_revoked: XCircle,
  emergency_access_created: QrCode,
  emergency_access_updated: QrCode,
  emergency_access_revoked: XCircle,
  profile_updated: UserRound,
};

const EVENT_LABELS: Record<string, string> = {
  share_created: "Share link created",
  share_revoked: "Share link revoked",
  emergency_access_created: "Emergency link created",
  emergency_access_updated: "Emergency link settings changed",
  emergency_access_revoked: "Emergency link turned off",
  profile_updated: "Profile updated",
  duplicate_flag_resolved: "Marked as not a duplicate",
};

const OUTCOME: Record<AccessOutcome, { label: string; icon: typeof Eye; alert: boolean }> = {
  granted: { label: "Opened", icon: Eye, alert: false },
  pin_failed: { label: "Wrong PIN entered", icon: KeyRound, alert: true },
  locked: { label: "Blocked: too many wrong PINs", icon: ShieldAlert, alert: true },
  expired: { label: "Tried after it expired", icon: XCircle, alert: false },
  revoked: { label: "Tried after you revoked it", icon: XCircle, alert: true },
};

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function AuditPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Audit history" subtitle={SUBTITLE} />}>
      <AuditContent />
    </Suspense>
  );
}

function targetLabel(entry: AccessLogEntry, shareLabels: Map<string, string>): string {
  if (entry.target === "emergency") return "Emergency link";
  return `Share link “${(entry.shareId && shareLabels.get(entry.shareId)) || "Clinician share"}”`;
}

async function AuditContent() {
  const repo = await getPatientRepository();
  const [events, access, shares] = await Promise.all([repo.listAuditEvents(), repo.listAccessLogs(), repo.listShareLinks()]);
  const shareLabels = new Map(shares.map((s) => [s.id, s.label]));

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Audit history" subtitle={SUBTITLE} />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <Card className="border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" aria-hidden="true" />
              Access to your links
            </CardTitle>
            <span className="text-sm text-muted-foreground">{access.length} attempts</span>
          </CardHeader>
          <CardContent className="p-0">
            {access.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Nobody has opened your share or emergency links.</p>
            ) : (
              <ul className="divide-y divide-border">
                {access.map((entry) => {
                  const outcome = OUTCOME[entry.outcome];
                  const Icon = outcome.icon;
                  return (
                    <li key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={
                            outcome.alert
                              ? "p-2 rounded-xl bg-destructive/10 text-destructive shrink-0"
                              : "p-2 rounded-xl bg-primary/10 text-primary shrink-0"
                          }
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {outcome.label} · {targetLabel(entry, shareLabels)}
                          </p>
                          {entry.userAgent && (
                            <p className="text-sm text-muted-foreground line-clamp-1 break-all">Device: {entry.userAgent}</p>
                          )}
                        </div>
                      </div>
                      <time dateTime={entry.occurredAt} className="text-sm text-muted-foreground shrink-0">
                        {formatDateTime(entry.occurredAt)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="px-4 pb-4 text-xs text-muted-foreground">
              Repeated views from the same device within 10 minutes are recorded once. IP addresses are never stored.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" aria-hidden="true" />
              Account activity
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
                          <p className="font-semibold">{EVENT_LABELS[event.eventType] ?? humanize(event.eventType)}</p>
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
