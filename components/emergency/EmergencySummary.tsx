import { differenceInYears, isValid, parseISO } from "date-fns";
import { AlertTriangle, Phone } from "lucide-react";
import type { EmergencyView } from "@/lib/sharing/emergency-view";
import { formatDate } from "@/lib/format";

function ageOf(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) return null;
  const dob = parseISO(dateOfBirth);
  return isValid(dob) ? `${differenceInYears(new Date(), dob)} years` : null;
}

/**
 * Renders only the fields the patient opted into. A section the patient did
 * not share is left out entirely, so it never reads as "none".
 */
export function EmergencySummary({ view }: { view: EmergencyView }) {
  const age = ageOf(view.dateOfBirth);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-sm text-muted-foreground">Patient</p>
          <p className="text-xl font-bold">{view.displayName}</p>
          {view.dateOfBirth && (
            <p className="text-sm text-muted-foreground">
              Born {formatDate(view.dateOfBirth)}
              {age ? ` (${age})` : ""}
            </p>
          )}
        </div>
        {view.bloodGroup !== undefined && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Blood group (patient-reported)</p>
            <p className="text-2xl font-black">{view.bloodGroup ?? "Not recorded"}</p>
          </div>
        )}
      </div>

      {view.allergies && (
        <section aria-labelledby="em-allergies" className="p-4 rounded-xl border-2 border-destructive/40 bg-destructive/5 space-y-2">
          <h2 id="em-allergies" className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Allergies
          </h2>
          {view.allergies.length === 0 ? (
            <p className="text-sm">No allergies documented. This does not mean the patient has none.</p>
          ) : (
            <ul className="space-y-1">
              {view.allergies.map((a) => (
                <li key={a.id} className="text-sm font-semibold">
                  {a.substance}
                  {a.reaction ? ` — ${a.reaction}` : ""}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({a.reviewStatus === "patient_reviewed" ? "patient-reviewed" : "pending review"})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view.conditions && (
        <section aria-labelledby="em-conditions" className="space-y-2">
          <h2 id="em-conditions" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Documented conditions
          </h2>
          {view.conditions.length === 0 ? (
            <p className="text-sm">None documented.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {view.conditions.map((c) => (
                <li key={c.id} className="text-sm px-2 py-0.5 rounded border border-border">{c.name}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view.medications && view.medications.length > 0 && (
        <section aria-labelledby="em-medications" className="space-y-2">
          <h2 id="em-medications" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Medications (chosen by the patient)
          </h2>
          <ul className="space-y-1">
            {view.medications.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-semibold">{m.name}</span>
                {(m.dosage || m.frequency) && (
                  <span className="text-muted-foreground"> — {[m.dosage, m.frequency].filter(Boolean).join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.patientNote && (
        <section aria-labelledby="em-note" className="space-y-1">
          <h2 id="em-note" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Note from the patient
          </h2>
          <p className="text-sm whitespace-pre-line break-words">{view.patientNote}</p>
        </section>
      )}

      {view.emergencyContact && (
        <section aria-labelledby="em-contact" className="space-y-1">
          <h2 id="em-contact" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Emergency contact
          </h2>
          <p className="text-sm font-semibold">
            {view.emergencyContact.name}
            {view.emergencyContact.relationship ? ` (${view.emergencyContact.relationship})` : ""}
          </p>
          <a href={`tel:${view.emergencyContact.phone.replace(/[^\d+]/g, "")}`} className="text-sm text-primary underline inline-flex items-center gap-1 min-h-11">
            <Phone className="w-3.5 h-3.5" aria-hidden="true" /> {view.emergencyContact.phone}
          </a>
        </section>
      )}
    </div>
  );
}
