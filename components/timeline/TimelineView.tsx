"use client";

import { useId, useMemo, useState } from "react";
import { Building2, Calendar, FileText, FlaskConical, Search, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { DeleteRecordButton } from "@/components/records/RecordControls";
import { SourceLink, sourceOf } from "@/components/records/SourceLink";
import type { TimelineEvent } from "@/lib/data/types";
import { formatDate, humanize } from "@/lib/format";

export interface TimelineFilters {
  type: string;
  query: string;
  from: string;
  to: string;
  facility: string;
  provider: string;
}

export const NO_FILTERS: TimelineFilters = { type: "all", query: "", from: "", to: "", facility: "", provider: "" };

/**
 * Pure filter, exported for tests. With a date range set, undated events are
 * excluded (their date is unknown, so they cannot be placed in the range).
 */
export function filterTimeline(events: TimelineEvent[], f: TimelineFilters): TimelineEvent[] {
  const q = f.query.trim().toLowerCase();
  return events.filter((evt) => {
    if (f.type !== "all" && evt.eventType !== f.type) return false;
    if (f.facility && evt.facilityName !== f.facility) return false;
    if (f.provider && evt.providerName !== f.provider) return false;
    if ((f.from || f.to) && !evt.eventDate) return false;
    if (f.from && evt.eventDate! < f.from) return false;
    if (f.to && evt.eventDate! > f.to) return false;
    if (q && ![evt.title, evt.summary, evt.providerName, evt.facilityName].some((v) => v?.toLowerCase().includes(q))) {
      return false;
    }
    return true;
  });
}

const distinct = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => Boolean(v)))].sort();

export function TimelineView({
  events,
  documentNames,
  live,
}: {
  events: TimelineEvent[];
  documentNames: Record<string, string>;
  live: boolean;
}) {
  const id = useId();
  const [filters, setFilters] = useState<TimelineFilters>(NO_FILTERS);
  const set = (patch: Partial<TimelineFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const eventTypes = useMemo(() => distinct(events.map((e) => e.eventType)), [events]);
  const facilities = useMemo(() => distinct(events.map((e) => e.facilityName)), [events]);
  const providers = useMemo(() => distinct(events.map((e) => e.providerName)), [events]);
  const filtered = filterTimeline(events, filters);
  const active = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const undatedHidden = (filters.from || filters.to) && events.some((e) => !e.eventDate);

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Your timeline is empty. Confirmed documents will appear here.
        </CardContent>
      </Card>
    );
  }

  const selectClass = "w-full h-9 rounded-md border bg-background px-2 text-xs text-foreground";

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search timeline"
              placeholder="Search title, doctor or clinic"
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              className="pl-9 h-10 text-sm"
            />
          </div>
          <div role="group" aria-label="Filter by event type" className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["all", ...eventTypes].map((type) => (
              <Button
                key={type}
                variant={filters.type === type ? "default" : "outline"}
                size="sm"
                aria-pressed={filters.type === type}
                onClick={() => set({ type })}
                className="text-xs h-8"
              >
                {type === "all" ? "All events" : humanize(type)}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label htmlFor={`${id}-from`} className="text-[11px] text-muted-foreground space-y-1">
            <span>From</span>
            <input id={`${id}-from`} type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={selectClass} />
          </label>
          <label htmlFor={`${id}-to`} className="text-[11px] text-muted-foreground space-y-1">
            <span>To</span>
            <input id={`${id}-to`} type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={selectClass} />
          </label>
          <label htmlFor={`${id}-facility`} className="text-[11px] text-muted-foreground space-y-1">
            <span>Clinic or lab</span>
            <select id={`${id}-facility`} value={filters.facility} onChange={(e) => set({ facility: e.target.value })} className={selectClass}>
              <option value="">All</option>
              {facilities.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-provider`} className="text-[11px] text-muted-foreground space-y-1">
            <span>Doctor</span>
            <select id={`${id}-provider`} value={filters.provider} onChange={(e) => set({ provider: e.target.value })} className={selectClass}>
              <option value="">All</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <p aria-live="polite">
          Showing {filtered.length} of {events.length} events
          {undatedHidden ? " (events without a date are hidden while a date range is set)" : ""}
        </p>
        {active && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFilters(NO_FILTERS)}>
            Clear filters
          </Button>
        )}
      </div>

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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SourceLink source={sourceOf(evt, documentNames)} canOpen={live} />
                    {live && <DeleteRecordButton kind="medical_event" id={evt.id} label={`the event "${evt.title}"`} />}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
