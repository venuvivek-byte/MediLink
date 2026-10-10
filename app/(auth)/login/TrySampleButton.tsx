"use client";

import { useState, useTransition } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { startSampleSessionAction } from "../actions";

/** Opens the read-only sample patient. Nothing a visitor does here is saved. */
export function TrySampleButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startSampleSessionAction();
            if (result?.error) setError(result.error);
          });
        }}
        className={cn(
          "inline-flex items-center gap-3 px-8 sm:px-9 py-4 rounded-full font-medium text-base sm:text-lg bg-white/85 hover:bg-white text-[#0a3528] border border-[#0a3528]/20 backdrop-blur-md shadow-lg shadow-emerald-950/10 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed",
          className
        )}
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        ) : (
          <PlayCircle className="w-5 h-5" aria-hidden="true" />
        )}
        <span>{isPending ? "Opening sample…" : "Try sample"}</span>
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
