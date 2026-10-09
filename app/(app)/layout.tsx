"use client";

import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import DemoModeBanner from "@/components/ui/DemoModeBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-[260px]">
        {/* Demo mode banner */}
        {isDemoMode && <DemoModeBanner />}

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
