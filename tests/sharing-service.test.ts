import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { FakeSupabase } from "./helpers/fake-supabase";
import { LIVE_ENV, TEST_SECRET, useEnv } from "./helpers/env";
import { buildEmergencyView } from "@/lib/sharing/emergency-view";
import {
  clientIpFrom,
  emergencyTokenFor,
  generatePin,
  generateShareToken,
  hashClientIp,
  hashToken,
  TOKEN_PATTERN,
} from "@/lib/sharing/tokens";
import type { Allergy, Condition, Medication, PatientProfile } from "@/lib/data/types";

const fake = { db: new FakeSupabase() };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fake.db }));

const live = { kind: "live" as const, patientId: "11111111-1111-4111-8111-111111111111", email: null };
const demo = { kind: "demo" as const, patientId: "demo-patient" };
const MED = "22222222-2222-4222-8222-222222222222";

async function service() {
  vi.resetModules();
  return import("@/lib/sharing/service");
}

beforeEach(() => {
  fake.db = new FakeSupabase();
  useEnv({ ...LIVE_ENV, SUPABASE_SERVICE_ROLE_KEY: "test-service-key", NEXT_PUBLIC_APP_URL: "https://vault.example" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("tokens", () => {
  it("generates 256-bit url-safe tokens and stores only a SHA-256 hash", () => {
    const a = generateShareToken();
    expect(a).toMatch(TOKEN_PATTERN);
    expect(generateShareToken()).not.toBe(a);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates 6-digit PINs, keeping leading zeros", () => {
    const pins = Array.from({ length: 300 }, generatePin);
    expect(pins.every((p) => /^\d{6}$/.test(p))).toBe(true);
    expect(new Set(pins).size).toBeGreaterThan(290);
  });

  it("derives the emergency token from the id and secret only", () => {
    const t = emergencyTokenFor("id-1", TEST_SECRET);
    expect(t).toMatch(TOKEN_PATTERN);
    expect(emergencyTokenFor("id-1", TEST_SECRET)).toBe(t);
    expect(emergencyTokenFor("id-2", TEST_SECRET)).not.toBe(t);
    expect(emergencyTokenFor("id-1", `${TEST_SECRET}x`)).not.toBe(t);
  });

  it("hashes the first forwarded IP with a key, never returning it raw", () => {
    const h = new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.2" });
    expect(clientIpFrom(h)).toBe("198.51.100.4");
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.5" }))).toBe("198.51.100.5");
    expect(clientIpFrom(new Headers())).toBeNull();
    expect(hashClientIp("198.51.100.4", TEST_SECRET)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClientIp("198.51.100.4", TEST_SECRET)).not.toBe(hashClientIp("198.51.100.4", "other-secret-xxxxxxxxxxxxxxxxxxxxxxxx"));
    expect(hashClientIp(null, TEST_SECRET)).toBeNull();
  });
});

describe("createShare", () => {
  const valid = { label: " Dr. Rao ", categories: ["medications", "allergies"], includeUnreviewed: false, expiryHours: 168, consent: true };

  it("stores only hashes and returns the link and PIN once", async () => {
    const { createShare } = await service();
    const result = await createShare(live, valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const token = result.url.replace("https://vault.example/share/", "");
    expect(token).toMatch(TOKEN_PATTERN);
    expect(result.pin).toMatch(/^\d{6}$/);

    const [call] = fake.db.rpcCalls;
    expect(call.fn).toBe("create_record_share");
    expect(call.args.p_token_hash).toBe(hashToken(token));
    expect(await bcrypt.compare(result.pin, call.args.p_pin_hash as string)).toBe(true);
    expect(JSON.stringify(call.args)).not.toContain(token);
    expect(JSON.stringify(call.args)).not.toContain(`"${result.pin}"`);
    expect(call.args).toMatchObject({ p_label: "Dr. Rao", p_categories: ["medications", "allergies"], p_include_unreviewed: false });
    const hours = (new Date(call.args.p_expires_at as string).getTime() - Date.now()) / 3600_000;
    expect(hours).toBeGreaterThan(167.9);
    expect(hours).toBeLessThanOrEqual(168);
  });

  it.each([
    ["no consent", { ...valid, consent: false }],
    ["no categories", { ...valid, categories: [] }],
    ["documents (not offered)", { ...valid, categories: ["documents"] }],
    ["an arbitrary expiry", { ...valid, expiryHours: 5000 }],
    ["a long label", { ...valid, label: "x".repeat(101) }],
  ])("rejects %s before touching the database", async (_label, input) => {
    const { createShare } = await service();
    expect(await createShare(live, input)).toMatchObject({ ok: false });
    expect(fake.db.rpcCalls).toHaveLength(0);
  });

  it("refuses to create links that could never open (no service-role key)", async () => {
    useEnv({ ...LIVE_ENV });
    const { createShare, createEmergencyAccess } = await service();
    expect(await createShare(live, valid)).toMatchObject({ ok: false, error: expect.stringMatching(/SUPABASE_SERVICE_ROLE_KEY/) });
    expect(fake.db.rpcCalls).toHaveLength(0);
    expect(
      await createEmergencyAccess(live, {
        showBloodGroup: true, showDateOfBirth: false, showAllergies: true, showConditions: false,
        showEmergencyContact: false, medicationIds: [], patientNote: "", expiryDays: 365, consent: true,
      })
    ).toMatchObject({ ok: false });
  });

  it("is read-only in demo mode", async () => {
    const { createShare, revokeShare, updateProfile, revokeEmergencyAccess } = await service();
    expect(await createShare(demo, valid)).toMatchObject({ ok: false, error: "Changes are not saved in demo mode." });
    expect(await revokeShare(demo, { id: MED })).toMatchObject({ ok: false });
    expect(await revokeEmergencyAccess(demo)).toMatchObject({ ok: false });
    expect(await updateProfile(demo, {})).toMatchObject({ ok: false });
    expect(fake.db.rpcCalls).toHaveLength(0);
  });

  it("maps a missing share to a plain message", async () => {
    const { revokeShare } = await service();
    fake.db.failNext.rpc = { code: "P0002" };
    expect(await revokeShare(live, { id: MED })).toEqual({
      ok: false,
      error: "This link no longer exists or is already turned off. Refresh the page.",
    });
  });
});

describe("emergency access", () => {
  const fields = {
    showBloodGroup: true, showDateOfBirth: false, showAllergies: true, showConditions: true,
    showEmergencyContact: false, medicationIds: [MED], patientNote: "  Diabetic ",
  };

  it("creates a link whose stored hash matches the URL shown to the patient", async () => {
    const { createEmergencyAccess, emergencyUrlFor } = await service();
    expect(await createEmergencyAccess(live, { ...fields, expiryDays: 365, consent: true })).toEqual({ ok: true });
    const [call] = fake.db.rpcCalls;
    expect(call.fn).toBe("create_emergency_access");
    const url = emergencyUrlFor(live, call.args.p_id as string);
    expect(hashToken(url.split("/emergency/")[1])).toBe(call.args.p_token_hash);
    expect(call.args).toMatchObject({ p_show_blood_group: true, p_show_emergency_contact: false, p_medication_ids: [MED], p_patient_note: "Diabetic" });
  });

  it("requires consent and a supported expiry", async () => {
    const { createEmergencyAccess } = await service();
    expect(await createEmergencyAccess(live, { ...fields, expiryDays: 365, consent: false })).toMatchObject({ ok: false });
    expect(await createEmergencyAccess(live, { ...fields, expiryDays: 3650, consent: true })).toMatchObject({ ok: false });
    expect(fake.db.rpcCalls).toHaveLength(0);
  });
});

describe("updateProfile", () => {
  const base = { displayName: "Ananya", dateOfBirth: "1990-01-31", bloodGroup: "O+", contactName: "", contactPhone: "", contactRelationship: "" };

  it("sends NULLs for cleared fields and no contact when it is empty", async () => {
    const { updateProfile } = await service();
    expect(await updateProfile(live, { ...base, dateOfBirth: "", bloodGroup: "" })).toEqual({ ok: true });
    expect(fake.db.rpcCalls[0]).toEqual({
      fn: "update_profile",
      args: { p_display_name: "Ananya", p_date_of_birth: null, p_blood_group: "", p_emergency_contact: null },
    });
  });

  it("rejects half a contact, bad phone numbers, bad dates and unknown blood groups", async () => {
    const { updateProfile } = await service();
    expect(await updateProfile(live, { ...base, contactName: "Vikram" })).toMatchObject({ ok: false, error: expect.stringMatching(/name and a phone/) });
    expect(await updateProfile(live, { ...base, contactName: "V", contactPhone: "call me" })).toMatchObject({ ok: false, error: expect.stringMatching(/phone/) });
    expect(await updateProfile(live, { ...base, dateOfBirth: "1990-02-30" })).toMatchObject({ ok: false });
    expect(await updateProfile(live, { ...base, bloodGroup: "Z" })).toMatchObject({ ok: false });
    expect(fake.db.rpcCalls).toHaveLength(0);
  });
});

describe("buildEmergencyView", () => {
  const profile: PatientProfile = {
    displayName: "Ananya",
    dateOfBirth: "1973-03-15",
    bloodGroup: "B+",
    emergencyContact: { name: "Vikram", phone: "+91 1", relationship: null },
  };
  const allergies = [{ id: "a1", substance: "Penicillin", reaction: null, reviewStatus: "patient_reviewed" }] as Allergy[];
  const conditions = [
    { id: "c1", name: "Diabetes", status: "active" },
    { id: "c2", name: "Old fracture", status: "resolved" },
  ] as Condition[];
  const medications = [
    { id: "m1", name: "Metformin", dosage: "500 mg", frequency: "BD" },
    { id: "m2", name: "Secret med", dosage: null, frequency: null },
  ] as Medication[];
  const none = {
    showBloodGroup: false, showDateOfBirth: false, showAllergies: false, showConditions: false,
    showEmergencyContact: false, medicationIds: [] as string[], patientNote: null,
  };

  it("shows only the name when nothing is opted in", () => {
    const view = buildEmergencyView(none, { profile, allergies, conditions, medications });
    expect(view).toEqual({
      displayName: "Ananya",
      dateOfBirth: undefined,
      bloodGroup: undefined,
      allergies: undefined,
      conditions: undefined,
      medications: undefined,
      emergencyContact: undefined,
      patientNote: null,
    });
  });

  it("shows active conditions only and exactly the chosen medications", () => {
    const view = buildEmergencyView(
      { ...none, showConditions: true, medicationIds: ["m1"], showBloodGroup: true },
      { profile, allergies, conditions, medications }
    );
    expect(view.conditions).toEqual([{ id: "c1", name: "Diabetes" }]);
    expect(view.medications?.map((m) => m.name)).toEqual(["Metformin"]);
    expect(view.bloodGroup).toBe("B+");
    expect(JSON.stringify(view)).not.toContain("Secret med");
    expect(JSON.stringify(view)).not.toContain("Vikram");
  });

  it("keeps an opted-in empty allergy list distinct from 'not shared'", () => {
    const view = buildEmergencyView({ ...none, showAllergies: true }, { profile, allergies: [], conditions, medications });
    expect(view.allergies).toEqual([]);
  });
});
