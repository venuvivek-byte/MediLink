import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import Header from "@/components/layout/Header";
import { TimelineView } from "@/components/timeline/TimelineView";
import { getPatientRepository } from "@/lib/data";
import { getPublicConfig } from "@/lib/config/env";

export const metadata = { title: "Timeline" };

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function TimelinePage() {
  return (
    <Suspense fallback={<PageSkeleton title="Health timeline" subtitle="Your medical events in date order, linked to their source documents" />}>
      <TimelineContent />
    </Suspense>
  );
}

async function TimelineContent() {
  const repo = await getPatientRepository();
  const [events, documents] = await Promise.all([repo.listTimelineEvents(), repo.listDocuments()]);
  const documentNames = Object.fromEntries(documents.map((d) => [d.id, d.filename]));
  const live = getPublicConfig().mode === "live";
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Health timeline" subtitle="Your medical events in date order, linked to their source documents" />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <TimelineView events={events} documentNames={documentNames} live={live} />
      </div>
    </div>
  );
}
