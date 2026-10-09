import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 to 1.0
  className?: string;
  showPercent?: boolean;
}

export function ConfidenceBadge({
  confidence,
  className,
  showPercent = true,
}: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);

  let variantClass = "bg-health-emerald/15 text-health-emerald border-health-emerald/30";
  let label = "High Confidence";

  if (confidence < 0.7) {
    variantClass = "bg-health-amber/15 text-health-amber border-health-amber/30 animate-pulse";
    label = "Please Verify";
  } else if (confidence < 0.85) {
    variantClass = "bg-primary/15 text-primary border-primary/30";
    label = "Moderate";
  }

  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-semibold gap-1 px-2 py-0.5", variantClass, className)}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
      {showPercent && <span className="opacity-75">({percentage}%)</span>}
    </Badge>
  );
}
