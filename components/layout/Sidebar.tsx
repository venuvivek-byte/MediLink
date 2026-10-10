"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, Settings } from "lucide-react";
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
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-slate-200/80 bg-white transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
      data-purpose="primary-sidebar"
    >
      <div className={cn("p-6", collapsed && "p-4")}>
        {/* App Brand Logo */}
        <Link
          href="/"
          aria-label="MediLink Homepage"
          className={cn(
            "flex items-center gap-3 mb-8 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-vault-600 transition-opacity hover:opacity-90 group",
            collapsed && "justify-center mb-6"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-vault-800 flex items-center justify-center text-white shadow-md shadow-emerald-900/10 shrink-0 group-hover:scale-105 transition-transform">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="M12 9v4" />
              <path d="M10 11h4" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-tight block group-hover:text-vault-800 transition-colors">
                MediLink
              </span>
              <span className="text-xs font-medium text-slate-400">
                {mode === "demo" ? "Health Vault (Demo)" : "Health Vault"}
              </span>
            </div>
          )}
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Main" className="space-y-1.5">
          {NAVIGATION.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            const linkContent = (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  isActive
                    ? "bg-emerald-50 text-vault-800 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon
                  className={cn(
                    "shrink-0 transition-colors",
                    collapsed ? "w-5 h-5" : "w-5 h-5",
                    isActive ? "text-vault-800" : "text-slate-400 group-hover:text-slate-600"
                  )}
                  aria-hidden="true"
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
      </div>

      {/* Bottom Sidebar Utilities */}
      <div className={cn("p-6 border-t border-slate-100 space-y-1.5 mt-auto", collapsed && "p-3")}>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium text-sm transition-all group",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-600 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-medium text-sm transition-all w-full cursor-pointer group",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-600 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
