"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The error message is intentionally not rendered: it may contain details
  // that are meaningless or sensitive for the patient.
  return (
    <div className="p-8 max-w-xl mx-auto w-full">
      <div role="alert" className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
          Something went wrong loading this page
        </div>
        <p className="text-sm text-muted-foreground">
          Your records were not changed. Try again, and if it keeps happening, sign out and back in.
        </p>
        <Button onClick={reset} size="sm">Try again</Button>
      </div>
    </div>
  );
}
