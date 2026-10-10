import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmergencySummary } from "@/components/emergency/EmergencySummary";
import { PublicNotice } from "@/components/share/PublicNotice";
import { clientInfoFrom, isExampleToken, openEmergencyLink } from "@/lib/sharing/public-access";

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
  let view;
  try {
    view = await openEmergencyLink(token, clientInfoFrom(await headers()));
  } catch (error) {
    console.error((error as Error).message);
    return (
      <PublicNotice title="Emergency information could not be loaded">
        Please try again. If this is an emergency, follow standard care and contact local emergency services.
      </PublicNotice>
    );
  }
  if (!view) {
    return (
      <PublicNotice title="This emergency link is not available">
        The link may be incorrect, expired or turned off by the patient.
      </PublicNotice>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center">
      <div className="max-w-xl w-full space-y-4">
        <div className="text-center space-y-1">
          <p className="inline-flex items-center gap-2 text-destructive text-sm font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" /> Emergency information
          </p>
          {isExampleToken(token) && <Badge variant="outline">Example · not a real patient</Badge>}
          <p className="text-sm text-muted-foreground">
            Shared by the patient for emergencies. Patient-provided; not clinically verified.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmergencySummary view={view} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
