"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  FileText,
  Pill,
  TestTube,
  Share2,
  ShieldAlert,
  Settings,
  Plus,
} from "lucide-react";

const mobileNavItems = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Upload", href: "/documents", icon: Plus, isAction: true },
  { name: "Meds", href: "/medications", icon: Pill },
  { name: "More", href: "/settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-1 safe-area-bottom">
        {mobileNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          if (item.isAction) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-health-emerald flex items-center justify-center shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95">
                  <item.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-medium mt-1 text-primary">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-xl transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] mt-0.5",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.name}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
