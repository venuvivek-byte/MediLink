import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Info, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/ui/PrintButton";
import { EmergencySummary } from "@/components/emergency/EmergencySummary";
import { getPatientRepository } from "@/lib/data";
import { getConfig } from "@/lib/config/env";
import { DEMO_EMERGENCY_TOKEN } from "@/lib/demo/data";

export const metadata = { title: "Emergency card" };

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function EmergencyPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Emergency card" subtitle="What a first responder sees when they scan your QR code" />}>
      <EmergencyContent />
    </Suspense>
  );
}

async function EmergencyContent() {
  const repo = await getPatientRepository();
  const [profile, allergies, conditions] = await Promise.all([
    repo.getProfile(),
    repo.listAllergies(),
    repo.listConditions(),
  ]);
  const config = getConfig();
  const emergencyUrl = config.mode === "demo" ? `${config.appUrl}/emergency/${DEMO_EMERGENCY_TOKEN}` : null;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Emergency card" subtitle="What a first responder sees when they scan your QR code" />
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <Card className="border-border/80">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Preview</CardTitle>
            <PrintButton label="Print card" />
          </CardHeader>
          <CardContent>
            {profile ? (
              <EmergencySummary profile={profile} allergies={allergies} conditions={conditions} />
            ) : (
              <p className="text-sm text-muted-foreground">Add your profile details in Settings first.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" aria-hidden="true" />
              Emergency QR code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {emergencyUrl ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Demo mode uses one fixed sample link. The QR code holds only this link, never medical data.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="p-2 bg-white rounded-lg border self-start">
                    <QRCodeSVG value={emergencyUrl} size={96} aria-label="QR code for the demo emergency link" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      readOnly
                      aria-label="Emergency link"
                      value={emergencyUrl}
                      className="w-full text-xs font-mono p-2.5 rounded-lg border bg-muted"
                    />
                    <a href={emergencyUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" className="text-xs">Open responder view</Button>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <p role="note" className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-4 h-4" aria-hidden="true" />
                Emergency QR access is not available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
