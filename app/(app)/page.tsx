"use client";

import Header from "@/components/layout/Header";
import { HealthSnapshot } from "@/components/dashboard/HealthSnapshot";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DEMO_PATIENT } from "@/lib/demo/data";

export default function DashboardPage() {
  const patient = DEMO_PATIENT;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`Welcome, ${patient.display_name}`}
        subtitle="Your unified, patient-controlled health dashboard across 3 health systems"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top 4 stat snapshot cards */}
        <HealthSnapshot />

        {/* Clinical alerts (Duplicate Metformin & Repeat HbA1c test) */}
        <AlertsPanel />

        {/* Grid: Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}
