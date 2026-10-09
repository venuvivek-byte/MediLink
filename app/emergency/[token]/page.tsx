import { DEMO_PATIENT, DEMO_ALLERGIES, DEMO_CONDITIONS } from "@/lib/demo/data";
import { ShieldAlert, Phone, AlertTriangle, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function EmergencyTriagePage() {
  const patient = DEMO_PATIENT;

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 bg-rose-600/30 text-rose-400 border border-rose-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" /> Emergency First Responder Access
          </div>
          <h1 className="text-2xl font-bold">Critical Medical Triage Summary</h1>
          <p className="text-xs text-neutral-400">
            Lost in Transit • Verified Patient Identification
          </p>
        </div>

        <Card className="bg-neutral-800 border-neutral-700 text-white">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
              <div>
                <h2 className="text-xl font-black">{patient.display_name}</h2>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  DOB: {patient.date_of_birth} (Age 52)
                </p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                  Blood Group
                </span>
                <span className="text-2xl font-black bg-rose-600 text-white px-3 py-0.5 rounded-lg">
                  {patient.blood_group}
                </span>
              </div>
            </div>

            {/* Critical Allergy Warning */}
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-600/50 space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Severe Drug Allergies
              </span>
              <div className="space-y-1">
                {DEMO_ALLERGIES.map((a) => (
                  <p key={a.id} className="text-sm font-semibold text-rose-200">
                    ⚠ {a.substance.toUpperCase()} — Causes {a.reaction}
                  </p>
                ))}
              </div>
            </div>

            {/* Diagnosed Conditions */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Pre-existing Conditions
              </span>
              <div className="flex flex-wrap gap-2">
                {DEMO_CONDITIONS.map((c) => (
                  <Badge key={c.id} className="bg-neutral-700 text-neutral-200 border-neutral-600 text-xs py-1">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-700 space-y-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Primary Emergency Contact
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{patient.emergency_contact.name}</p>
                  <p className="text-xs text-neutral-400">
                    Relationship: {patient.emergency_contact.relationship}
                  </p>
                </div>
                <a
                  href={`tel:${patient.emergency_contact.phone}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-4 h-4" /> Call Now
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
