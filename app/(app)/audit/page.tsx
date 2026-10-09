"use client";

import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  ShieldCheck,
  Eye,
  Upload,
  Lock,
  XCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { DEMO_AUDIT_LOGS } from "@/lib/demo/data";

export default function AuditPage() {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "document_uploaded":
        return { icon: Upload, color: "text-primary bg-primary/10" };
      case "extraction_completed":
      case "extraction_confirmed":
        return { icon: FileText, color: "text-health-emerald bg-health-emerald/10" };
      case "share_created":
        return { icon: Lock, color: "text-health-indigo bg-health-indigo/10" };
      case "share_accessed":
        return { icon: Eye, color: "text-health-amber bg-health-amber/10" };
      case "share_revoked":
        return { icon: XCircle, color: "text-destructive bg-destructive/10" };
      default:
        return { icon: ShieldCheck, color: "text-muted-foreground bg-muted" };
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Security & Access Audit Trail"
        subtitle="Immutable tamper-evident record of all patient data interactions and external clinician access"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every data event is cryptographically timestamped. Access tokens and patient PINs are never saved in logs, guaranteeing strict Zero-Knowledge verification.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Event History
            </CardTitle>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {DEMO_AUDIT_LOGS.length} Logged Events
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {DEMO_AUDIT_LOGS.map((log) => {
                const { icon: Icon, color } = getEventIcon(log.event_type);

                return (
                  <div
                    key={log.id}
                    className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                          {log.event_type.replace(/_/g, " ")}
                        </span>
                        <p className="text-muted-foreground mt-0.5">
                          {log.metadata?.filename && `File: ${log.metadata.filename}`}
                          {log.metadata?.confidence && ` (Confidence: ${Math.round(log.metadata.confidence * 100)}%)`}
                          {log.metadata?.label && `Share Target: ${log.metadata.label}`}
                          {log.metadata?.accessor && `Accessor: ${log.metadata.accessor}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
