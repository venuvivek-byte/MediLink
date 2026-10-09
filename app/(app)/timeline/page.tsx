import Header from "@/components/layout/Header";
import { TimelineView } from "@/components/timeline/TimelineView";
import { getPatientRepository } from "@/lib/data";

export const metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const events = await (await getPatientRepository()).listTimelineEvents();
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Health timeline" subtitle="Your medical events in date order, linked to their source documents" />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <TimelineView events={events} />
      </div>
    </div>
  );
}
