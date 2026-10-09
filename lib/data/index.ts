import "server-only";
import { cache } from "react";
import { requireSession, type Session } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DemoPatientRepository } from "./demo-repository";
import { SupabasePatientRepository } from "./supabase-repository";
import type { PatientRepository } from "./repository";

export type { PatientRepository } from "./repository";
export { DataAccessError } from "./repository";

/** Builds the repository for an already-verified session (route handlers). */
export async function repositoryForSession(session: Session): Promise<PatientRepository> {
  if (session.kind === "demo") return new DemoPatientRepository(session.patientId);
  return new SupabasePatientRepository(await createClient(), session.patientId);
}

/**
 * Data Access Layer entry point for pages: verifies the session (redirecting
 * to /login if absent) and returns a repository bound to that patient.
 */
export const getPatientRepository = cache(async (): Promise<PatientRepository> => {
  return repositoryForSession(await requireSession());
});
