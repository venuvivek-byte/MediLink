import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  status: "verified" | "unverified" | "pending" | string;
  className?: string;
}

export function VerificationBadge({ status, className }: VerificationBadgeProps) {
  if (status === "verified") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-health-emerald/10 text-health-emerald border-health-emerald/25 gap-1 text-[11px] font-medium py-0.5",
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3" />
        Verified
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-primary/10 text-primary border-primary/25 gap-1 text-[11px] font-medium py-0.5",
          className
        )}
      >
        <Clock className="w-3 h-3 animate-spin" />
        Processing
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-health-amber/10 text-health-amber border-health-amber/25 gap-1 text-[11px] font-medium py-0.5",
        className
      )}
    >
      <AlertCircle className="w-3 h-3" />
      Unverified
    </Badge>
  );
}
