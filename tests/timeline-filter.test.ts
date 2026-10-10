import { describe, expect, it } from "vitest";
import { filterTimeline, NO_FILTERS } from "@/components/timeline/TimelineView";
import type { TimelineEvent } from "@/lib/data/types";

const evt = (id: string, o: Partial<TimelineEvent>): TimelineEvent => ({
  id,
  eventType: "prescription",
  eventDate: "2025-06-01",
  title: "Prescription",
  summary: null,
  providerName: null,
  facilityName: null,
  reviewStatus: "patient_reviewed",
  sourceDocumentId: null,
  sourcePage: null,
  ...o,
});

const EVENTS = [
  evt("a", { eventDate: "2025-01-10", facilityName: "Apollo", providerName: "Dr. Nair" }),
  evt("b", { eventDate: "2025-06-01", eventType: "lab", facilityName: "City Labs" }),
  evt("c", { eventDate: "2025-09-30", facilityName: "Apollo", providerName: "Dr. Rao" }),
  evt("d", { eventDate: null, title: "Undated discharge note" }),
];
const ids = (f: Partial<typeof NO_FILTERS>) => filterTimeline(EVENTS, { ...NO_FILTERS, ...f }).map((e) => e.id);

describe("timeline filters", () => {
  it("no filters shows everything, including undated events", () => {
    expect(ids({})).toEqual(["a", "b", "c", "d"]);
  });

  it("date range is inclusive at both ends and hides undated events", () => {
    expect(ids({ from: "2025-01-10", to: "2025-06-01" })).toEqual(["a", "b"]);
    expect(ids({ from: "2025-06-02" })).toEqual(["c"]);
  });

  it("filters by clinic, doctor and type, combined", () => {
    expect(ids({ facility: "Apollo" })).toEqual(["a", "c"]);
    expect(ids({ facility: "Apollo", provider: "Dr. Rao" })).toEqual(["c"]);
    expect(ids({ type: "lab" })).toEqual(["b"]);
  });

  it("search matches title, clinic or doctor, case-insensitively", () => {
    expect(ids({ query: "nair" })).toEqual(["a"]);
    expect(ids({ query: "DISCHARGE" })).toEqual(["d"]);
  });
});
