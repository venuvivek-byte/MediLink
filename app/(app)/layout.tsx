import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import DemoModeBanner from "@/components/ui/DemoModeBanner";
import { ShellProvider } from "@/components/layout/ShellContext";
import { Skeleton } from "@/components/ui/skeleton";
import { isSampleSession, requireSession } from "@/lib/auth/session";
import { getPatientRepository } from "@/lib/data";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Reading the session is request-time work, so it must sit behind Suspense
  // (Cache Components). Nothing patient-specific is prerendered.
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const profile = await (await getPatientRepository()).getProfile();
  // Read-only (demo or sample) is a property of the session, not the server:
  // the sample runs on the live site next to real accounts.
  const mode = session.kind === "demo" ? "demo" : "live";
  const sample = isSampleSession(session);
  const displayName =
    profile?.displayName ?? (session.kind === "live" && session.email ? session.email : "Patient");

  return (
    <ShellProvider value={{ displayName, bloodGroup: profile?.bloodGroup ?? null, mode, sample }}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-[260px] min-w-0">
          {mode === "demo" && <DemoModeBanner sample={sample} />}
          <main id="main" className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </ShellProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen" aria-busy="true" aria-label="Loading">
      <div className="hidden md:block w-[260px] border-r border-border bg-sidebar" />
      <div className="flex-1 p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
