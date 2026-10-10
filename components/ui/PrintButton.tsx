"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print", variant = "outline" }: { label?: string; variant?: "outline" | "secondary" }) {
  return (
    <Button size="lg" variant={variant} onClick={() => window.print()} className="gap-1.5 px-3.5">
      <Printer className="w-3.5 h-3.5" aria-hidden="true" /> {label}
    </Button>
  );
}
