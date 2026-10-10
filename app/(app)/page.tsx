import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import Header from "@/components/layout/Header";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { WellnessAffirmationCard } from "@/components/dashboard/WellnessAffirmationCard";
import { getPatientRepository } from "@/lib/data";
import { findDuplicateMedications, findRepeatTests } from "@/lib/domain/insights";

export const metadata = { title: "Overview" };

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="Overview"
          subtitle="Your records from every clinic, lab and pharmacy in one place"
        />
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const repo = await getPatientRepository();
  const [profile, medications, labs, events, allergies, conditions, decisions] =
    await Promise.all([
      repo.getProfile(),
      repo.listMedications(),
      repo.listLabResults(),
      repo.listTimelineEvents(),
      repo.listAllergies(),
      repo.listConditions(),
      repo.listDuplicateDecisions(),
    ]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title={profile ? `Welcome, ${profile.displayName}` : "Overview"}
        subtitle="Your records from every clinic, lab and pharmacy in one place"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-7 w-full">
        {/* Hero Landscape Banner */}
        <HeroBanner displayName={profile?.displayName} />

        {/* Clinical Safety Double-Check Alerts */}
        <AlertsPanel
          duplicates={findDuplicateMedications(medications, decisions)}
          repeats={findRepeatTests(labs)}
        />

        {/* Lower Two-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <RecentActivity events={events.slice(0, 4)} />
          </div>
          <div className="space-y-6 flex flex-col">
            <QuickActions />
            <WellnessAffirmationCard />
          </div>
        </div>
      </div>
    </div>
  );
}
