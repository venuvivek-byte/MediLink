import {
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Share2,
  ShieldAlert,
} from "lucide-react";

export const NAVIGATION = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Medications", href: "/medications", icon: Pill },
  { name: "Lab results", href: "/lab-results", icon: FlaskConical },
  { name: "Share records", href: "/share", icon: Share2 },
  { name: "Emergency card", href: "/emergency", icon: ShieldAlert },
  { name: "Audit history", href: "/audit", icon: ClipboardList },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
