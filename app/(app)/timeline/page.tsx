"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEMO_MEDICAL_EVENTS } from "@/lib/demo/data";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import {
  FileText,
  TestTube,
  Activity,
  Search,
  Filter,
  Calendar,
  Building2,
  Stethoscope,
} from "lucide-react";

export default function TimelinePage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = DEMO_MEDICAL_EVENTS.filter((evt) => {
    const matchesType = filterType === "all" || evt.event_type === filterType;
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Unified Health Timeline"
        subtitle="Chronological record of verified clinical encounters, prescriptions, and lab tests"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs bg-card/60"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              className="text-xs h-8"
            >
              All Events
            </Button>
            <Button
              variant={filterType === "prescription" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("prescription")}
              className="text-xs h-8 gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Prescriptions
            </Button>
            <Button
              variant={filterType === "lab" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("lab")}
              className="text-xs h-8 gap-1.5"
            >
              <TestTube className="w-3.5 h-3.5" /> Labs
            </Button>
          </div>
        </div>

        {/* Timeline Items */}
        <div className="relative border-l-2 border-border/80 ml-4 md:ml-6 space-y-8 pl-6 md:pl-8 py-2">
          {filteredEvents.map((evt) => {
            const isLab = evt.event_type === "lab";
            const Icon = isLab ? TestTube : FileText;

            return (
              <div key={evt.id} className="relative group">
                {/* Timeline node marker */}
                <div
                  className={`absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-7 md:h-7 rounded-full border-4 border-background flex items-center justify-center shadow-sm ${
                    isLab
                      ? "bg-health-indigo text-white"
                      : "bg-primary text-white"
                  }`}
                >
                  <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </div>

                <Card className="bg-card/70 backdrop-blur-sm hover:shadow-md transition-all border-border/80">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm md:text-base text-foreground">
                            {evt.title}
                          </h3>
                          <VerificationBadge status={evt.verification_status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {evt.event_date}
                          </span>
                          {evt.structured_data?.facility && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              {evt.structured_data.facility}
                            </span>
                          )}
                          {evt.structured_data?.provider && (
                            <span className="flex items-center gap-1">
                              <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                              {evt.structured_data.provider}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {evt.summary}
                    </p>

                    {evt.structured_data?.alert === "duplicate_medication" && (
                      <div className="p-2.5 rounded-lg bg-health-amber/10 border border-health-amber/30 text-health-amber text-xs font-medium flex items-center gap-2">
                        <Activity className="w-4 h-4 shrink-0" />
                        Cross-provider alert: Potential duplicate prescription identified.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
