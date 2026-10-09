"use client";

import { createContext, use } from "react";
import { useRouter } from "next/navigation";
import type { AppMode } from "@/lib/config/schema";

export interface ShellInfo {
  displayName: string;
  bloodGroup: string | null;
  mode: AppMode;
}

const ShellContext = createContext<ShellInfo | null>(null);

export function ShellProvider({ value, children }: { value: ShellInfo; children: React.ReactNode }) {
  return <ShellContext value={value}>{children}</ShellContext>;
}

export function useShell(): ShellInfo {
  const value = use(ShellContext);
  if (!value) throw new Error("useShell must be used inside ShellProvider");
  return value;
}

export function useSignOut() {
  const router = useRouter();
  return async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };
}
