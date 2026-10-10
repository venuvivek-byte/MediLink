"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRecordAction, dismissDuplicateAction } from "@/app/(app)/records/actions";
import type { RecordKind } from "@/lib/data/types";

function useRecordAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, onDone?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onDone?.();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };
  return { pending, error, run };
}

/** Two-step delete: nothing is removed until the patient confirms. */
export function DeleteRecordButton({ kind, id, label }: { kind: RecordKind; id: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const { pending, error, run } = useRecordAction();

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {confirming ? (
        <div role="group" aria-label={`Confirm deleting ${label}`} className="inline-flex flex-wrap items-center gap-2">
          <span className="text-xs text-destructive">Delete {label} from your records?</span>
          <Button
            size="sm"
            variant="destructive"
            className="h-9 text-sm"
            disabled={pending}
            onClick={() => run(() => deleteRecordAction({ kind, id }), () => setConfirming(false))}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
          <Button size="sm" variant="outline" className="h-9 text-sm" disabled={pending} onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-9 text-sm text-destructive gap-1 px-2"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${label}`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
        </Button>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Records the patient's decision that a flagged group is not a duplicate. */
export function NotDuplicateButton({ kind, recordIds }: { kind: "medication" | "lab_result"; recordIds: string[] }) {
  const { pending, error, run } = useRecordAction();
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-9 text-sm"
        disabled={pending}
        onClick={() => run(() => dismissDuplicateAction({ kind, recordIds }))}
      >
        {pending ? "Saving…" : "Not a duplicate"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
