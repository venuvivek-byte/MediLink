"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShell, useSignOut } from "./ShellContext";

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
  const { displayName, bloodGroup, mode } = useShell();
  const handleSignOut = useSignOut();

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
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-vault-600 transition-colors"
          >
            <Avatar className="w-9 h-9 ring-2 ring-emerald-100 shadow-sm">
              <AvatarFallback className="bg-vault-800 text-white font-bold text-xs">
                {initialsOf(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-slate-900 leading-snug max-w-44 truncate">
                {displayName}
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {mode === "demo" ? "Demo Patient" : "Verified Patient"}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold truncate">{displayName}</span>
                {bloodGroup && (
                  <span className="text-xs text-muted-foreground font-normal">
                    Blood group: {bloodGroup}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="w-4 h-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
