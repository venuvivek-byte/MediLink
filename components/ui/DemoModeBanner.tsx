import { FlaskConical } from "lucide-react";

/** Always visible in demo mode; deliberately not dismissible. */
export default function DemoModeBanner() {
  return (
    <div role="note" className="bg-health-amber/15 border-b border-health-amber/30">
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-foreground/85">
        <FlaskConical className="w-4 h-4 text-health-amber shrink-0" aria-hidden="true" />
        <span>
          <strong>Demo mode</strong>: all records belong to a fictional patient. AI output shown here is
          simulated.
        </span>
      </div>
    </div>
  );
}
