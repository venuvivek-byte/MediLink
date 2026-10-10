import { Suspense } from "react";
import { connection } from "next/server";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClinicianSummary } from "@/components/share/ClinicianSummary";
import { PublicNotice } from "@/components/share/PublicNotice";
import {
  examplePinFor,
  hasValidShareSession,
  isExampleToken,
  loadSharedRecords,
  resolveShareToken,
} from "@/lib/sharing/public-access";
import { PinForm } from "./PinForm";

export const metadata = { title: "Shared health summary", robots: { index: false, follow: false } };

export default function ClinicianSharePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-64" />}>
      <ShareContent params={params} />
    </Suspense>
  );
}

async function ShareContent({ params }: { params: Promise<{ token: string }> }) {
  // Token, expiry and revocation are evaluated per request, never prerendered.
  await connection();
  const { token } = await params;
  let share;
  try {
    share = await resolveShareToken(token);
  } catch (error) {
    console.error((error as Error).message);
    return (
      <PublicNotice title="This link cannot be checked right now">
        Please try again in a few minutes.
      </PublicNotice>
    );
  }

  if (!share || share.state !== "active") {
    // Same page for unknown, expired and revoked links.
    return (
      <PublicNotice title="This link is not available">
        The link may be incorrect, expired or revoked by the patient. Ask the patient for a new link.
      </PublicNotice>
    );
  }

  if (!(await hasValidShareSession(share))) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg font-bold">Shared health summary</CardTitle>
            <p className="text-sm text-muted-foreground">Enter the 6-digit PIN the patient gave you.</p>
          </CardHeader>
          <CardContent className="pt-4">
            {share.locked && (
              <p role="status" className="mb-3 text-sm text-center text-destructive font-medium">
                Too many incorrect PINs. This link is paused; try again later or ask the patient for a new link.
              </p>
            )}
            <PinForm token={token} />
            {examplePinFor(token) && (
              <p className="mt-3 text-xs text-center text-muted-foreground">
                Example PIN: {examplePinFor(token)} (read-only example patient)
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const records = await loadSharedRecords(share);
  return <ClinicianSummary {...records} expiresAt={share.expiresAt} isDemo={isExampleToken(token)} />;
}

