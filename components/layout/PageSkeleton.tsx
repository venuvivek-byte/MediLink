import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant placeholder for a page whose patient data streams in behind
 * Suspense. Shows the real page title so navigation feels immediate; the data
 * itself is never cached on the server.
 */
export function PageSkeleton({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex-1 flex flex-col">
      <Header title={title} subtitle={subtitle} />
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
