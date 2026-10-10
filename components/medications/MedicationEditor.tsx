"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMedicationAction } from "@/app/(app)/records/actions";
import type { Medication, MedicationStatus } from "@/lib/data/types";

export const STATUS_OPTIONS: { value: MedicationStatus; label: string }[] = [
  { value: "uncertain", label: "Not sure" },
  { value: "current", label: "Currently taking" },
  { value: "discontinued", label: "Stopped" },
  { value: "historical", label: "Past prescription (not current)" },
];

/** The patient states whether they take a medicine; the app never decides it. */
export function MedicationEditor({ medication }: { medication: Medication }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MedicationStatus>(medication.status);
  const [startDate, setStartDate] = useState(medication.startDate ?? "");
  const [endDate, setEndDate] = useState(medication.endDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="h-9 text-sm gap-1" onClick={() => setOpen(true)}>
        <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Update status
      </Button>
    );
  }

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateMedicationAction({ id: medication.id, status, startDate, endDate });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form
      className="w-full space-y-2 p-3 rounded-lg border bg-muted/30"
      aria-label={`Update ${medication.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-xs text-muted-foreground space-y-1" htmlFor={`${id}-status`}>
          <span>Are you taking it?</span>
          <select
            id={`${id}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as MedicationStatus)}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground space-y-1" htmlFor={`${id}-start`}>
          <span>Started (optional)</span>
          <input
            id={`${id}-start`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground space-y-1" htmlFor={`${id}-end`}>
          <span>Stopped (optional)</span>
          <input
            id={`${id}-end`}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-9 text-sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-9 text-sm" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
