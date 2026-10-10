import { FlaskConical } from "lucide-react";
import { ExitSampleButton } from "./ExitSampleButton";

/** Always visible in read-only sessions; deliberately not dismissible. */
export default function DemoModeBanner({ sample = false }: { sample?: boolean }) {
  return (
    <div role="note" className="bg-health-amber/15 border-b border-health-amber/30">
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-foreground/85">
        <FlaskConical className="w-4 h-4 text-health-amber shrink-0" aria-hidden="true" />
        {sample ? (
          <span>
            <strong>Sample</strong>: you are browsing a read-only example patient with personal details
            replaced. Nothing you do here is saved.{" "}
            <ExitSampleButton />
          </span>
        ) : (
          <span>
            <strong>Demo mode</strong>: all records belong to a fictional patient. AI output shown here is
            simulated.
          </span>
        )}
      </div>
    </div>
  );
}
