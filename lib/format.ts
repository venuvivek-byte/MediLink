import { format, isValid, parseISO } from "date-fns";

/** "15 Jan 2025"; "Date unknown" for missing or unparseable values. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "Date unknown";
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMM yyyy") : "Date unknown";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Time unknown";
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMM yyyy, HH:mm") : "Time unknown";
}

export function humanize(value: string): string {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
