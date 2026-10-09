import Header from "@/components/layout/Header";
import { HealthSnapshot } from "@/components/dashboard/HealthSnapshot";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { getPatientRepository } from "@/lib/data";
import { findDuplicateMedications, findRepeatTests } from "@/lib/domain/insights";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const repo = await getPatientRepository();
  const [profile, medications, labs, events, allergies, conditions] = await Promise.all([
    repo.getProfile(),
    repo.listMedications(),
    repo.listLabResults(),
    repo.listTimelineEvents(),
    repo.listAllergies(),
    repo.listConditions(),
  ]);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={profile ? `Welcome, ${profile.displayName}` : "Welcome"}
        subtitle="Your records from every clinic, lab and pharmacy in one place"
      />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <HealthSnapshot
          medications={medications}
          allergies={allergies}
          conditions={conditions}
          latestLab={labs[0] ?? null}
        />
        <AlertsPanel duplicates={findDuplicateMedications(medications)} repeats={findRepeatTests(labs)} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivity events={events.slice(0, 4)} />
          </div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
