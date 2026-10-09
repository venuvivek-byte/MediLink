import { Suspense } from "react";
import { connection } from "next/server";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmergencySummary } from "@/components/emergency/EmergencySummary";
import { PublicNotice } from "@/components/share/PublicNotice";
import { resolveEmergencyToken } from "@/lib/sharing/public-access";
import { getConfig } from "@/lib/config/env";

export const metadata = { title: "Emergency information", robots: { index: false, follow: false } };

export default function EmergencyAccessPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-64" />}>
      <EmergencyContent params={params} />
    </Suspense>
  );
}

async function EmergencyContent({ params }: { params: Promise<{ token: string }> }) {
  // Token, expiry and revocation are evaluated per request, never prerendered.
  await connection();
  const { token } = await params;
  const repo = resolveEmergencyToken(token);
  if (!repo) {
    return (
      <PublicNotice title="This emergency link is not available">
        The link may be incorrect, expired or turned off by the patient.
      </PublicNotice>
    );
  }

  const [profile, allergies, conditions] = await Promise.all([
    repo.getProfile(),
    repo.listAllergies(),
    repo.listConditions(),
  ]);
  if (!profile) {
    return <PublicNotice title="This emergency link is not available">No emergency information is available.</PublicNotice>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center">
      <div className="max-w-xl w-full space-y-4">
        <div className="text-center space-y-1">
          <p className="inline-flex items-center gap-2 text-destructive text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" /> Emergency information
          </p>
          {getConfig().mode === "demo" && <Badge variant="outline">Demo · fictional patient</Badge>}
          <p className="text-xs text-muted-foreground">
            Shared by the patient for emergencies. Patient-provided; not clinically verified.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmergencySummary profile={profile} allergies={allergies} conditions={conditions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
