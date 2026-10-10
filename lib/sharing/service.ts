import "server-only";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Session } from "@/lib/auth/session";
import { getConfig, getSessionSecret } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";
import { datasetForPatient } from "@/lib/demo/datasets";
import { EMERGENCY_EXPIRY_OPTIONS, SHAREABLE_CATEGORIES, SHARE_EXPIRY_OPTIONS } from "./policy";
import { emergencyTokenFor, generatePin, generateShareToken, hashToken } from "./tokens";

// Patient-initiated sharing changes. Each goes through a SECURITY INVOKER
// database function that applies it and writes the audit entry in one
// transaction; RLS limits it to the patient's own rows. The server generates
// tokens and PINs and stores only their hashes.

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateShareResult =
  | { ok: true; url: string; pin: string; expiresAt: string }
  | { ok: false; error: string };

const DEMO_READ_ONLY = { ok: false, error: "Changes are not saved in demo mode." } as const;
const INVALID = { ok: false, error: "Some values are invalid. Check them and try again." } as const;
const NOT_FOUND = { ok: false, error: "This link no longer exists or is already turned off. Refresh the page." } as const;
const FAILED = { ok: false, error: "The change could not be saved. Nothing was changed; please try again." } as const;
const NOT_CONFIGURED = {
  ok: false,
  error: "Links cannot be opened on this server yet (SUPABASE_SERVICE_ROLE_KEY is not set). Nothing was created.",
} as const;

const BCRYPT_COST = 12;

function failure(error: { code?: string } | null, action: string) {
  console.error(`[sharing] ${action} failed`, { code: error?.code ?? "unknown" });
  if (error?.code === "P0002") return NOT_FOUND;
  if (error?.code === "22023") return INVALID;
  return FAILED;
}

/** Public links are resolved with the service-role key; without it they would never open. */
function publicLinksConfigured(): boolean {
  return Boolean(getConfig().supabase?.serviceRoleKey);
}

const hoursOptions = SHARE_EXPIRY_OPTIONS.map((o) => o.hours) as number[];
const daysOptions = EMERGENCY_EXPIRY_OPTIONS.map((o) => o.days) as number[];

export const createShareSchema = z.object({
  label: z.string().trim().max(100).optional().default(""),
  categories: z.array(z.enum(SHAREABLE_CATEGORIES)).min(1).max(SHAREABLE_CATEGORIES.length),
  includeUnreviewed: z.boolean(),
  expiryHours: z.number().refine((h) => hoursOptions.includes(h)),
  consent: z.literal(true),
});

export async function createShare(session: Session, input: unknown): Promise<CreateShareResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = createShareSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  if (!publicLinksConfigured()) return NOT_CONFIGURED;

  const token = generateShareToken();
  const pin = generatePin();
  const expiresAt = new Date(Date.now() + parsed.data.expiryHours * 3600_000).toISOString();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_record_share", {
    p_token_hash: hashToken(token),
    p_pin_hash: await bcrypt.hash(pin, BCRYPT_COST),
    p_label: parsed.data.label,
    p_categories: parsed.data.categories,
    p_include_unreviewed: parsed.data.includeUnreviewed,
    p_expires_at: expiresAt,
  });
  if (error) return failure(error, "create share");
  // The token and PIN are returned once, to the patient, and never stored.
  return { ok: true, url: `${getConfig().appUrl}/share/${token}`, pin, expiresAt };
}

export async function revokeShare(session: Session, input: unknown): Promise<ActionResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return INVALID;
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_record_share", { p_share_id: parsed.data.id });
  return error ? failure(error, "revoke share") : { ok: true };
}

export const emergencyFieldsSchema = z.object({
  showBloodGroup: z.boolean(),
  showDateOfBirth: z.boolean(),
  showAllergies: z.boolean(),
  showConditions: z.boolean(),
  showEmergencyContact: z.boolean(),
  medicationIds: z.array(z.string().uuid()).max(50),
  patientNote: z.string().trim().max(500),
});

const createEmergencySchema = emergencyFieldsSchema.extend({
  expiryDays: z.number().refine((d) => daysOptions.includes(d)),
  consent: z.literal(true),
});

function emergencyArgs(v: z.infer<typeof emergencyFieldsSchema>) {
  return {
    p_show_blood_group: v.showBloodGroup,
    p_show_date_of_birth: v.showDateOfBirth,
    p_show_allergies: v.showAllergies,
    p_show_conditions: v.showConditions,
    p_show_emergency_contact: v.showEmergencyContact,
    p_medication_ids: v.medicationIds,
    p_patient_note: v.patientNote,
  };
}

/** Creates the patient's emergency link, replacing (and disabling) any existing one. */
export async function createEmergencyAccess(session: Session, input: unknown): Promise<ActionResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = createEmergencySchema.safeParse(input);
  if (!parsed.success) return INVALID;
  if (!publicLinksConfigured()) return NOT_CONFIGURED;

  const id = randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_emergency_access", {
    p_id: id,
    p_token_hash: hashToken(emergencyTokenFor(id, getSessionSecret())),
    ...emergencyArgs(parsed.data),
    p_expires_at: new Date(Date.now() + parsed.data.expiryDays * 86400_000).toISOString(),
  });
  return error ? failure(error, "create emergency link") : { ok: true };
}

/** Changes what the existing link shows; the link and QR code stay the same. */
export async function updateEmergencyAccess(session: Session, input: unknown): Promise<ActionResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = emergencyFieldsSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_emergency_access", emergencyArgs(parsed.data));
  return error ? failure(error, "update emergency link") : { ok: true };
}

export async function revokeEmergencyAccess(session: Session): Promise<ActionResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_emergency_access");
  return error ? failure(error, "turn off emergency link") : { ok: true };
}

/** The responder URL for the patient's live emergency link (read-only sessions: their dataset's fixed link). */
export function emergencyUrlFor(session: Session, emergencyAccessId: string): string {
  const { appUrl } = getConfig();
  const token =
    session.kind === "demo"
      ? (datasetForPatient(session.patientId)?.publicLinks.emergencyToken ?? "unavailable")
      : emergencyTokenFor(emergencyAccessId, getSessionSecret());
  return `${appUrl}/emergency/${token}`;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const date = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v;
  });

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  dateOfBirth: z.union([z.literal(""), isoDate]),
  bloodGroup: z.union([z.enum(BLOOD_GROUPS), z.literal("")]),
  contactName: z.string().trim().max(120),
  contactPhone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || /^\+?[\d\s()-]{6,}$/.test(v), { message: "phone" }),
  contactRelationship: z.string().trim().max(60),
});

export async function updateProfile(session: Session, input: unknown): Promise<ActionResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const phone = parsed.error.issues.some((i) => i.message === "phone");
    return phone ? { ok: false, error: "Enter the phone number using digits, spaces and an optional leading +." } : INVALID;
  }
  const v = parsed.data;
  if (Boolean(v.contactName) !== Boolean(v.contactPhone)) {
    return { ok: false, error: "An emergency contact needs both a name and a phone number." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_profile", {
    p_display_name: v.displayName,
    // Generated RPC types mark every argument non-null; SQL NULL clears the value.
    p_date_of_birth: (v.dateOfBirth || null) as string,
    p_blood_group: v.bloodGroup,
    p_emergency_contact: v.contactName
      ? { name: v.contactName, phone: v.contactPhone, relationship: v.contactRelationship }
      : (null as unknown as string),
  });
  return error ? failure(error, "update profile") : { ok: true };
}
