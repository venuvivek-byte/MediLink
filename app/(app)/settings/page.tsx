import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Server, User } from "lucide-react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatientRepository } from "@/lib/data";
import { getConfig } from "@/lib/config/env";
import { ProfileForm } from "@/components/settings/ProfileForm";

export const metadata = { title: "Settings" };

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Settings" subtitle="Your profile and how this app is configured" />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const profile = await (await getPatientRepository()).getProfile();
  const config = getConfig();

  // Reports configuration only. Nothing here claims a service is reachable.
  const status = [
    {
      label: "Data source",
      value: config.mode === "demo" ? "Demo data (no database)" : "Supabase (configured)",
    },
    {
      label: "AI extraction",
      value:
        config.mode === "demo"
          ? "Simulated in demo mode"
          : config.ai.configured
            ? `${config.ai.provider} · ${config.ai.model}`
            : "Not configured",
    },
    {
      label: "Share and emergency links",
      value:
        config.mode === "demo"
          ? "Fixed demo links"
          : config.supabase?.serviceRoleKey
            ? "Enabled"
            : "Not available (SUPABASE_SERVICE_ROLE_KEY not set)",
    },
    {
      label: "OCR",
      value: config.ocr.enabled ? `${config.ocr.provider} (enabled in config)` : "Disabled",
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Settings" subtitle="Your profile and how this app is configured" />
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" aria-hidden="true" /> Profile
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your name appears on records you share. Blood group, date of birth and emergency contact appear only on
              your emergency card, and only if you tick them there.
            </p>
          </CardHeader>
          <CardContent>
            {profile ? (
              <ProfileForm profile={profile} readOnly={config.mode === "demo"} />
            ) : (
              <p className="text-sm text-muted-foreground">No profile yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" aria-hidden="true" /> System configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DefinitionList rows={status.map((s) => [s.label, s.value])} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DefinitionList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
