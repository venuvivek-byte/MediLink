"use client";

import { useMemo, useState } from "react";
import { Building2, Calendar, FileText, FlaskConical, Search, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { TimelineEvent } from "@/lib/data/types";
import { formatDate, humanize } from "@/lib/format";

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  const [filterType, setFilterType] = useState<string>("all");
  const [query, setQuery] = useState("");

  const eventTypes = useMemo(() => [...new Set(events.map((e) => e.eventType))].sort(), [events]);

  const filtered = events.filter((evt) => {
    const q = query.trim().toLowerCase();
    const matchesType = filterType === "all" || evt.eventType === filterType;
    const matchesQuery =
      q === "" ||
      [evt.title, evt.summary, evt.providerName, evt.facilityName].some((v) => v?.toLowerCase().includes(q));
    return matchesType && matchesQuery;
  });

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Your timeline is empty. Confirmed documents will appear here.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Search timeline"
            placeholder="Search title, doctor or clinic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <div role="group" aria-label="Filter by event type" className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {["all", ...eventTypes].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              aria-pressed={filterType === type}
              onClick={() => setFilterType(type)}
              className="text-xs h-8"
            >
              {type === "all" ? "All events" : humanize(type)}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {events.length} events
      </p>

      <ol className="relative border-l-2 border-border ml-4 md:ml-6 space-y-6 pl-6 md:pl-8 py-2">
        {filtered.map((evt) => {
          const Icon = evt.eventType === "lab" ? FlaskConical : FileText;
          return (
            <li key={evt.id} className="relative">
              <div className="absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-7 md:h-7 rounded-full border-4 border-background bg-primary text-primary-foreground flex items-center justify-center">
                <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" aria-hidden="true" />
              </div>
              <Card className="border-border/80">
                <CardContent className="p-5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-sm md:text-base">{evt.title}</h2>
                    <VerificationBadge status={evt.reviewStatus} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      {formatDate(evt.eventDate)}
                    </span>
                    {evt.facilityName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {evt.facilityName}
                      </span>
                    )}
                    {evt.providerName && (
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
                        {evt.providerName}
                      </span>
                    )}
                  </div>
                  {evt.summary && <p className="text-sm text-muted-foreground leading-relaxed">{evt.summary}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {evt.sourceDocumentId ? "Linked to a source document" : "No source document linked"}
                  </p>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
