"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, LayoutDashboard, LogOut, Menu, Pill, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAVIGATION, isActivePath } from "./nav";
import { useSignOut } from "./ShellContext";

const PRIMARY = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Upload", href: "/documents", icon: Plus, isAction: true },
  { name: "Meds", href: "/medications", icon: Pill },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const handleSignOut = useSignOut();

  return (
    <nav aria-label="Main" className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-around px-2 py-1">
        {PRIMARY.map((item) => {
          const active = isActivePath(pathname, item.href);
          if (item.isAction) {
            return (
              <Link key={item.name} href={item.href} className="flex flex-col items-center -mt-5">
                <span className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
                  <item.icon className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="text-xs font-medium mt-1 text-primary">{item.name}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-xl",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" aria-hidden="true" />
              <span className={cn("text-xs mt-0.5", active ? "font-semibold" : "font-medium")}>{item.name}</span>
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="flex flex-col items-center py-2 px-3 rounded-xl text-muted-foreground">
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs mt-0.5 font-medium">More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-6">
            <SheetHeader>
              <SheetTitle>All pages</SheetTitle>
            </SheetHeader>
            <ul className="grid grid-cols-2 gap-2 px-4">
              {NAVIGATION.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                    className="flex items-center gap-2 p-3 rounded-xl border border-border text-sm hover:bg-accent"
                  >
                    <item.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border text-sm hover:bg-accent"
                >
                  <Settings className="w-4 h-4 text-primary" aria-hidden="true" />
                  Settings
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 p-3 rounded-xl border border-border text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign out
                </button>
              </li>
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
