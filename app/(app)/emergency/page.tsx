"use client";

import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Phone,
  Heart,
  AlertTriangle,
  QrCode,
  Share2,
  RefreshCw,
  Printer,
} from "lucide-react";
import { DEMO_PATIENT, DEMO_ALLERGIES, DEMO_CONDITIONS } from "@/lib/demo/data";
import { QRCodeSVG } from "qrcode.react";

export default function EmergencyPage() {
  const patient = DEMO_PATIENT;
  const emergencyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/emergency/demo-emergency-token`
    : "http://localhost:3000/emergency/demo-emergency-token";

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Emergency Medical Card & QR"
        subtitle="Critical medical profile for paramedics and emergency first responders"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {/* Physical Emergency Card Simulation */}
        <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-red-600 via-rose-700 to-rose-900 text-white shadow-2xl relative overflow-hidden">
          {/* Card background watermark */}
          <Heart className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-xl tracking-tight">EMERGENCY MEDICAL ID</h2>
                  <p className="text-xs text-white/80">Lost in Transit • First Responder Card</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-white/70">Blood Type</span>
                <span className="text-2xl font-black bg-white text-rose-800 px-3 py-0.5 rounded-lg">
                  {patient.blood_group}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-white/70 block">Patient Name</span>
                <span className="text-lg font-bold">{patient.display_name}</span>
                <span className="text-xs text-white/80 block mt-0.5">
                  DOB: {patient.date_of_birth} (52 years)
                </span>
              </div>

              <div>
                <span className="text-xs text-white/70 block">Emergency Contact</span>
                <span className="text-base font-semibold">
                  {patient.emergency_contact.name} ({patient.emergency_contact.relationship})
                </span>
                <a
                  href={`tel:${patient.emergency_contact.phone}`}
                  className="text-xs text-white underline flex items-center gap-1 mt-0.5 hover:text-white/90"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {patient.emergency_contact.phone}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-black/20 backdrop-blur-md">
                <span className="text-xs font-semibold text-rose-200 block mb-1">
                  CRITICAL ALLERGIES
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_ALLERGIES.map((a) => (
                    <span
                      key={a.id}
                      className="text-xs font-bold bg-white text-rose-900 px-2 py-0.5 rounded shadow-sm"
                    >
                      {a.substance} ({a.reaction})
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/20 backdrop-blur-md">
                <span className="text-xs font-semibold text-white/80 block mb-1">
                  KNOWN MEDICAL CONDITIONS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_CONDITIONS.map((c) => (
                    <span
                      key={c.id}
                      className="text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-md">
                  <QRCodeSVG value={emergencyUrl} size={64} />
                </div>
                <div className="text-xs text-white/80">
                  <p className="font-semibold text-white">Scan for Emergency Responder Summary</p>
                  <p className="text-[11px]">Direct public access • Renewed every 24h</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.print()}
                  className="text-xs gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Card
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* QR Access Details */}
        <Card className="bg-card/70 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              Emergency Access URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              This link is formatted for rapid triage in emergency departments and ambulances. It only reveals critical vitals, severe allergies, and primary contact details.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={emergencyUrl}
                className="w-full text-xs font-mono p-2.5 rounded-lg border bg-muted"
              />
              <a href="/emergency/demo-emergency-token" target="_blank">
                <Button size="sm" className="text-xs shrink-0">
                  Preview Triage View
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
