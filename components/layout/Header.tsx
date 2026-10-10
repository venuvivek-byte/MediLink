"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useShell } from "./ShellContext";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { displayName, mode } = useShell();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 h-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 hidden sm:inline-block shrink-0">
          HIPAA Compliant Vault
        </span>
        {title && (
          <div className="min-w-0 sm:hidden">
            <h1 className="text-base font-semibold tracking-tight truncate text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <Link
          href="/settings"
          aria-label="Profile and settings"
          className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-vault-600 transition-colors group"
        >
          <Avatar className="w-9 h-9 ring-2 ring-emerald-100 shadow-sm transition-transform group-hover:scale-105">
            <AvatarFallback className="bg-vault-800 text-white font-bold text-xs">
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-slate-900 leading-snug max-w-44 truncate group-hover:text-vault-800 transition-colors">
              {displayName}
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {mode === "demo" ? "Demo Patient" : "Verified Patient"}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
