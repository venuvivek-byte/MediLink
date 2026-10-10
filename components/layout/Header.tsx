"use client";

import Link from "next/link";
import { LogOut, Settings, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  title: string;
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
  const { displayName, bloodGroup } = useShell();
  const handleSignOut = useSignOut();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-8 h-16 border-b border-border bg-background/90 backdrop-blur">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href="/documents" className={cn(buttonVariants({ size: "lg" }), "hidden sm:inline-flex gap-2 px-3.5")}>
          <Upload className="w-4 h-4" aria-hidden="true" />
          Upload document
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initialsOf(displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden lg:block text-sm font-medium max-w-40 truncate">{displayName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold truncate">{displayName}</span>
                {bloodGroup && (
                  <span className="text-xs text-muted-foreground font-normal">Blood group: {bloodGroup}</span>
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
            <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
