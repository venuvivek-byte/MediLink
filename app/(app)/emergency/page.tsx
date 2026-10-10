import { Suspense } from "react";
import Link from "next/link";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { QrCode } from "lucide-react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmergencySummary } from "@/components/emergency/EmergencySummary";
import { EmergencyManager } from "@/components/emergency/EmergencyManager";
import { requireSession } from "@/lib/auth/session";
import { repositoryForSession } from "@/lib/data";
import { buildEmergencyView } from "@/lib/sharing/emergency-view";
import { emergencyUrlFor } from "@/lib/sharing/service";
import { shareState } from "@/lib/sharing/policy";

export const metadata = { title: "Emergency card" };

const SUBTITLE = "What a first responder sees when they scan your QR code";

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function EmergencyPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Emergency card" subtitle={SUBTITLE} />}>
      <EmergencyContent />
    </Suspense>
  );
}

async function EmergencyContent() {
  const session = await requireSession();
  const repo = await repositoryForSession(session);
  const [profile, allergies, conditions, medications, stored] = await Promise.all([
    repo.getProfile(),
    repo.listAllergies(),
    repo.listConditions(),
    repo.listMedications(),
    repo.getEmergencySettings(),
  ]);
  // An expired link is treated like no link: the patient creates a new one.
  const settings = stored && shareState({ expiresAt: stored.expiresAt, revokedAt: null }) === "active" ? stored : null;
  const url = settings ? emergencyUrlFor(session, settings.id) : null;
  const view = settings && profile ? buildEmergencyView(settings, { profile, allergies, conditions, medications }) : null;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Emergency card" subtitle={SUBTITLE} />
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" aria-hidden="true" />
              Emergency link and QR code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmergencyManager
              key={settings?.id ?? "none"}
              settings={settings}
              url={url}
              demo={session.kind === "demo"}
              medications={medications.map((m) => ({ id: m.id, name: m.name, current: m.status === "current" }))}
            />
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Preview: exactly what a responder sees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {view ? (
              <EmergencySummary view={view} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {profile ? "Create an emergency link to see the preview." : "No profile found."}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Blood group, date of birth and emergency contact come from your{" "}
              <Link href="/settings" className="text-primary underline">
                profile settings
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
