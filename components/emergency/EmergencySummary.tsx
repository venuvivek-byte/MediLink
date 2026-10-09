import { differenceInYears, isValid, parseISO } from "date-fns";
import { AlertTriangle, Phone } from "lucide-react";
import type { Allergy, Condition, PatientProfile } from "@/lib/data/types";
import { formatDate } from "@/lib/format";

interface EmergencySummaryProps {
  profile: PatientProfile;
  allergies: Allergy[];
  conditions: Condition[];
}

function ageOf(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = parseISO(dateOfBirth);
  return isValid(dob) ? `${differenceInYears(new Date(), dob)} years` : null;
}

/** Only the fields a patient has approved for emergency access. */
export function EmergencySummary({ profile, allergies, conditions }: EmergencySummaryProps) {
  const age = ageOf(profile.dateOfBirth);
  const activeConditions = conditions.filter((c) => c.status === "active");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground">Patient</p>
          <p className="text-xl font-bold">{profile.displayName}</p>
          {profile.dateOfBirth && (
            <p className="text-xs text-muted-foreground">
              Born {formatDate(profile.dateOfBirth)}
              {age ? ` (${age})` : ""}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Blood group (patient-reported)</p>
          <p className="text-2xl font-black">{profile.bloodGroup ?? "Not recorded"}</p>
        </div>
      </div>

      <section aria-labelledby="em-allergies" className="p-4 rounded-xl border-2 border-destructive/40 bg-destructive/5 space-y-2">
        <h2 id="em-allergies" className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Allergies
        </h2>
        {allergies.length === 0 ? (
          <p className="text-sm">No allergies documented. This does not mean the patient has none.</p>
        ) : (
          <ul className="space-y-1">
            {allergies.map((a) => (
              <li key={a.id} className="text-sm font-semibold">
                {a.substance}
                {a.reaction ? ` — ${a.reaction}` : ""}
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  ({a.reviewStatus === "patient_reviewed" ? "patient-reviewed" : "pending review"})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="em-conditions" className="space-y-2">
        <h2 id="em-conditions" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Documented conditions
        </h2>
        {activeConditions.length === 0 ? (
          <p className="text-sm">None documented.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {activeConditions.map((c) => (
              <li key={c.id} className="text-sm px-2 py-0.5 rounded border border-border">{c.name}</li>
            ))}
          </ul>
        )}
      </section>

      {profile.emergencyContact && (
        <section aria-labelledby="em-contact" className="space-y-1">
          <h2 id="em-contact" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Emergency contact
          </h2>
          <p className="text-sm font-semibold">
            {profile.emergencyContact.name}
            {profile.emergencyContact.relationship ? ` (${profile.emergencyContact.relationship})` : ""}
          </p>
          <a href={`tel:${profile.emergencyContact.phone.replace(/[^\d+]/g, "")}`} className="text-sm text-primary underline inline-flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" aria-hidden="true" /> {profile.emergencyContact.phone}
          </a>
        </section>
      )}
    </div>
  );
}
