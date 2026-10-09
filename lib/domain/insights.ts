// Transparent, rule-based observations over a patient's records. These are
// prompts for the patient to check with a clinician, never clinical findings.
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { LabResult, Medication } from "@/lib/data/types";

export interface DuplicateMedicationAlert {
  key: string;
  displayName: string;
  reason: string;
  records: Medication[];
}

/**
 * Flags medicines whose normalised name appears in more than one record that
 * is current or of uncertain status. Historical/discontinued entries are not
 * compared, because an old prescription is not evidence of a current one.
 */
export function findDuplicateMedications(medications: Medication[]): DuplicateMedicationAlert[] {
  const groups = new Map<string, Medication[]>();
  for (const med of medications) {
    if (med.status !== "current" && med.status !== "uncertain") continue;
    if (!med.normalizedName) continue;
    const group = groups.get(med.normalizedName) ?? [];
    group.push(med);
    groups.set(med.normalizedName, group);
  }

  return [...groups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([key, records]) => {
      const doses = new Set(records.map((r) => `${r.strength ?? "?"}|${r.frequency ?? "?"}`));
      const reason =
        doses.size > 1
          ? `${records.length} records list "${key}" with different strengths or frequencies.`
          : `${records.length} records list "${key}" with the same strength and frequency.`;
      return {
        key,
        displayName: key.charAt(0).toUpperCase() + key.slice(1),
        reason,
        records,
      };
    });
}

export interface RepeatTestAlert {
  key: string;
  testName: string;
  daysApart: number;
  earlier: LabResult;
  later: LabResult;
}

export const REPEAT_TEST_WINDOW_DAYS = 90;

/** Flags the same test recorded twice within the window. Not a judgement on whether it was needed. */
export function findRepeatTests(labs: LabResult[]): RepeatTestAlert[] {
  const groups = new Map<string, LabResult[]>();
  for (const lab of labs) {
    if (!lab.testDate) continue;
    const group = groups.get(lab.normalizedTestName) ?? [];
    group.push(lab);
    groups.set(lab.normalizedTestName, group);
  }

  const alerts: RepeatTestAlert[] = [];
  for (const [key, results] of groups) {
    const sorted = [...results].sort((a, b) => (a.testDate! < b.testDate! ? -1 : 1));
    for (let i = 1; i < sorted.length; i++) {
      const daysApart = differenceInCalendarDays(parseISO(sorted[i].testDate!), parseISO(sorted[i - 1].testDate!));
      if (daysApart < REPEAT_TEST_WINDOW_DAYS) {
        alerts.push({ key, testName: sorted[i].testName, daysApart, earlier: sorted[i - 1], later: sorted[i] });
      }
    }
  }
  return alerts;
}

export interface LabSeries {
  key: string;
  testName: string;
  unit: string;
  referenceRange: string | null;
  points: { date: string; value: number; resultId: string }[];
}

const NUMERIC = /^-?\d+(?:\.\d+)?$/;

/**
 * Groups numeric results of the same test AND the same unit. Results with a
 * different unit are never mixed into one series.
 */
export function buildLabSeries(labs: LabResult[]): LabSeries[] {
  const groups = new Map<string, LabSeries>();
  for (const lab of labs) {
    if (!lab.testDate || !lab.unit || !lab.value || !NUMERIC.test(lab.value.trim())) continue;
    const key = `${lab.normalizedTestName}|${lab.unit}`;
    const series = groups.get(key) ?? {
      key,
      testName: lab.testName,
      unit: lab.unit,
      referenceRange: lab.referenceRange,
      points: [],
    };
    series.points.push({ date: lab.testDate, value: Number(lab.value), resultId: lab.id });
    groups.set(key, series);
  }
  return [...groups.values()]
    .filter((s) => s.points.length >= 2)
    .map((s) => ({ ...s, points: s.points.sort((a, b) => (a.date < b.date ? -1 : 1)) }))
    .sort((a, b) => b.points.length - a.points.length);
}
