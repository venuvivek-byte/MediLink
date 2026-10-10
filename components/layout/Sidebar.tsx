"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Heart, LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NAVIGATION, isActivePath } from "./nav";
import { useShell, useSignOut } from "./ShellContext";

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const handleSignOut = useSignOut();
  const { mode } = useShell();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-[15px] leading-tight">MyHealthVault</span>
            <span className="text-xs text-muted-foreground leading-tight">
              {mode === "demo" ? "Demo mode · fictional data" : "Your health records"}
            </span>
          </div>
        )}
      </div>

      <Separator className="mx-4 w-auto" />

      {/* Navigation */}
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAVIGATION.map((item) => {
          const isActive = isActivePath(pathname, item.href);

          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={cn(
                  "shrink-0 transition-colors",
                  collapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger className="w-full text-left">
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      <Separator className="mx-4 w-auto" />

      {/* Bottom section */}
      <div className="px-3 py-4">
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
