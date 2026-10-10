import type { Allergy, Condition, EmergencyContact, EmergencySettings, Medication, PatientProfile, ReviewStatus } from "@/lib/data/types";

/**
 * Exactly what a first responder sees. Built in one place so the patient's
 * preview and the public page cannot drift apart. A field the patient did not
 * opt into is `undefined` (not shown at all), never an empty list, so the page
 * cannot imply "no allergies" when allergies were simply not shared.
 */
export interface EmergencyView {
  displayName: string;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  allergies?: { id: string; substance: string; reaction: string | null; reviewStatus: ReviewStatus }[];
  conditions?: { id: string; name: string }[];
  medications?: { id: string; name: string; dosage: string | null; frequency: string | null }[];
  emergencyContact?: EmergencyContact | null;
  patientNote: string | null;
}

export function buildEmergencyView(
  settings: Pick<
    EmergencySettings,
    "showBloodGroup" | "showDateOfBirth" | "showAllergies" | "showConditions" | "showEmergencyContact" | "medicationIds" | "patientNote"
  >,
  data: { profile: PatientProfile; allergies: Allergy[]; conditions: Condition[]; medications: Medication[] }
): EmergencyView {
  const { profile } = data;
  const chosen = new Set(settings.medicationIds);
  return {
    displayName: profile.displayName,
    dateOfBirth: settings.showDateOfBirth ? profile.dateOfBirth : undefined,
    bloodGroup: settings.showBloodGroup ? profile.bloodGroup : undefined,
    allergies: settings.showAllergies
      ? data.allergies.map((a) => ({ id: a.id, substance: a.substance, reaction: a.reaction, reviewStatus: a.reviewStatus }))
      : undefined,
    conditions: settings.showConditions
      ? data.conditions.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }))
      : undefined,
    medications:
      chosen.size > 0
        ? data.medications
            .filter((m) => chosen.has(m.id))
            .map((m) => ({ id: m.id, name: m.name, dosage: m.dosage, frequency: m.frequency }))
        : undefined,
    emergencyContact: settings.showEmergencyContact ? profile.emergencyContact : undefined,
    patientNote: settings.patientNote,
  };
}
