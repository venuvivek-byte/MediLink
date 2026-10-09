import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/lib/data/types";

const COPY: Record<ReviewStatus, { label: string; title: string }> = {
  patient_reviewed: {
    label: "Patient-reviewed",
    title: "You confirmed this against the source document. It has not been verified by a clinician.",
  },
  pending_review: {
    label: "Pending review",
    title: "Imported but not yet confirmed by you. It may contain extraction errors.",
  },
};

export function VerificationBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  const reviewed = status === "patient_reviewed";
  const Icon = reviewed ? CheckCircle2 : AlertCircle;
  return (
    <Badge
      variant="outline"
      title={COPY[status].title}
      className={cn(
        "gap-1 text-[11px] font-medium py-0.5",
        reviewed
          ? "bg-health-emerald/10 text-health-emerald border-health-emerald/25"
          : "bg-health-amber/10 text-health-amber border-health-amber/25",
        className
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {COPY[status].label}
    </Badge>
  );
}
