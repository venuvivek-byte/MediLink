"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export default function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-health-amber/20 via-health-amber/10 to-health-amber/20 border-b border-health-amber/30 demo-stripe">
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-health-amber shrink-0" />
        <span className="font-medium text-foreground/80">
          <strong>Demo Mode</strong> — Viewing fictional patient data (Ananya Rao). No real medical information is displayed.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 p-0.5 rounded-md hover:bg-health-amber/20 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
