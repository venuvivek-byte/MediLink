// Migration 008: share links, emergency access, profile edits and the
// server-only access functions, executed on real Postgres with RLS.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectDbError, TestDatabase } from "./harness";
import { BCRYPT_LIKE, hex64, seedPatient, type PatientRecords } from "./fixtures";

let db: TestDatabase;
let alice: PatientRecords;
let bob: PatientRecords;

beforeAll(async () => {
  db = await TestDatabase.create();
  alice = await seedPatient(db, "alice-share@example.test");
  bob = await seedPatient(db, "bob-share@example.test");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const as = <T = Record<string, unknown>>(user: PatientRecords, sql: string, params: unknown[] = []) =>
  db.asUser(user.userId, (tx) => tx.query<T>(sql, params));
const service = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  db.asService((tx) => tx.query<T>(sql, params));
const owner = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  db.asOwner((d) => d.query<T>(sql, params));

let tokenSeq = 0;
const nextHash = () => hex64(`d${(++tokenSeq).toString(16).padStart(8, "0")}`);

async function createShare(user: PatientRecords, categories = ["medications", "allergies"], expiry = "7 days"): Promise<string> {
  const { rows } = await as<{ id: string }>(
    user,
    `SELECT public.create_record_share($1, $2, 'Dr. Rao', $3, false, now() + $4::interval) AS id`,
    [nextHash(), BCRYPT_LIKE, categories, expiry]
  );
  return rows[0].id;
}

async function auditTypes(user: PatientRecords): Promise<string[]> {
  const { rows } = await owner<{ event_type: string }>(
    "SELECT event_type FROM public.audit_logs WHERE patient_id = $1 ORDER BY created_at, id",
    [user.userId]
  );
  return rows.map((r) => r.event_type);
}

describe("create_record_share / revoke_record_share", () => {
  it("creates a share with a normalised scope and audits it", async () => {
    const id = await createShare(alice, ["medications", "allergies", "medications"]);
    const { rows } = await owner<{ scope: unknown; label: string; consent: boolean }>(
      "SELECT scope, label, consent_given_at IS NOT NULL AS consent FROM public.record_shares WHERE id = $1",
      [id]
    );
    expect(rows[0]).toEqual({
      scope: { categories: ["allergies", "medications"], include_unreviewed: false },
      label: "Dr. Rao",
      consent: true,
    });
    const audit = await owner<{ metadata: unknown }>(
      "SELECT metadata FROM public.audit_logs WHERE share_id = $1 AND event_type = 'share_created'",
      [id]
    );
    expect(audit.rows[0].metadata).toEqual({ label: "Dr. Rao", categories: 2 });
  });

  it("rejects unsupported categories, empty scope and out-of-range expiry", async () => {
    expect(await expectDbError(createShare(alice, ["documents"]))).toMatch(/supported category/);
    expect(await expectDbError(createShare(alice, []))).toMatch(/supported category/);
    expect(await expectDbError(createShare(alice, ["medications"], "91 days"))).toMatch(/Expiry/);
    expect(await expectDbError(createShare(alice, ["medications"], "10 minutes"))).toMatch(/Expiry/);
  });

  it("patients cannot set server-controlled columns on insert", async () => {
    const msg = await expectDbError(
      as(
        alice,
        `INSERT INTO public.record_shares (patient_id, token_hash, pin_hash, scope, expires_at, failed_pin_attempts)
         VALUES ($1, $2, $3, '{"categories":[]}', now() + interval '1 day', 0)`,
        [alice.userId, nextHash(), BCRYPT_LIKE]
      )
    );
    expect(msg).toMatch(/permission denied/);
    expect(
      await expectDbError(
        as(
          alice,
          `INSERT INTO public.record_shares (patient_id, token_hash, pin_hash, scope, expires_at, created_at)
           VALUES ($1, $2, $3, '{"categories":[]}', now() + interval '400 days', now() + interval '360 days')`,
          [alice.userId, nextHash(), BCRYPT_LIKE]
        )
      )
    ).toMatch(/permission denied/);
  });

  it("revokes once, audits it, and another patient cannot revoke it", async () => {
    const id = await createShare(alice);
    expect(await expectDbError(as(bob, "SELECT public.revoke_record_share($1)", [id]))).toMatch(/not found/);
    await as(alice, "SELECT public.revoke_record_share($1)", [id]);
    expect(await expectDbError(as(alice, "SELECT public.revoke_record_share($1)", [id]))).toMatch(/already revoked/);
    const { rows } = await owner<{ n: number }>(
      "SELECT count(*)::int n FROM public.audit_logs WHERE share_id = $1 AND event_type = 'share_revoked'",
      [id]
    );
    expect(rows[0].n).toBe(1);
  });

  it("token and PIN hashes stay unreadable to the patient", async () => {
    expect(await expectDbError(as(alice, "SELECT token_hash FROM public.record_shares"))).toMatch(/permission denied/);
    expect(await expectDbError(as(alice, "SELECT pin_hash FROM public.record_shares"))).toMatch(/permission denied/);
  });

  it("is not callable without signing in", async () => {
    expect(
      await expectDbError(
        db.asAnon((tx) =>
          tx.query("SELECT public.create_record_share($1, $2, 'x', ARRAY['medications'], false, now() + interval '1 day')", [
            nextHash(),
            BCRYPT_LIKE,
          ])
        )
      )
    ).toMatch(/permission denied/);
  });
});

describe("claim_share_pin_attempt (service role only)", () => {
  it("allows 5 attempts, then locks for 15 minutes", async () => {
    const id = await createShare(alice);
    const results: (number | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const { rows } = await service<{ n: number | null }>("SELECT public.claim_share_pin_attempt($1) AS n", [id]);
      results.push(rows[0].n);
    }
    expect(results).toEqual([1, 2, 3, 4, 5, null, null]);
    const { rows } = await owner<{ mins: number }>(
      "SELECT round(extract(epoch FROM locked_until - now()) / 60)::int AS mins FROM public.record_shares WHERE id = $1",
      [id]
    );
    expect(rows[0].mins).toBe(15);
  });

  it("locks until expiry after 20 attempts, and a correct PIN resets the counter before that", async () => {
    const id = await createShare(alice);
    await owner("UPDATE public.record_shares SET failed_pin_attempts = 4 WHERE id = $1", [id]);
    await service("SELECT public.record_public_access($1, NULL, 'granted', NULL, NULL)", [id]);
    let state = await owner<{ failed_pin_attempts: number; locked: boolean; accessed: boolean }>(
      "SELECT failed_pin_attempts, locked_until IS NOT NULL AS locked, last_accessed_at IS NOT NULL AS accessed FROM public.record_shares WHERE id = $1",
      [id]
    );
    expect(state.rows[0]).toEqual({ failed_pin_attempts: 0, locked: false, accessed: true });

    await owner("UPDATE public.record_shares SET failed_pin_attempts = 19 WHERE id = $1", [id]);
    const { rows } = await service<{ n: number | null }>("SELECT public.claim_share_pin_attempt($1) AS n", [id]);
    expect(rows[0].n).toBe(20);
    state = await owner(
      "SELECT failed_pin_attempts, locked_until = expires_at AS locked, true AS accessed FROM public.record_shares WHERE id = $1",
      [id]
    );
    expect(state.rows[0].locked).toBe(true);
  });

  it("refuses revoked and expired shares", async () => {
    const revoked = await createShare(alice);
    await as(alice, "SELECT public.revoke_record_share($1)", [revoked]);
    const { rows } = await service<{ n: number | null }>("SELECT public.claim_share_pin_attempt($1) AS n", [revoked]);
    expect(rows[0].n).toBeNull();
  });

  it("is not callable by patients or anonymous visitors", async () => {
    expect(await expectDbError(as(alice, "SELECT public.claim_share_pin_attempt($1)", [alice.shareId]))).toMatch(/permission denied/);
    expect(
      await expectDbError(db.asAnon((tx) => tx.query("SELECT public.claim_share_pin_attempt($1)", [alice.shareId])))
    ).toMatch(/permission denied/);
    expect(
      await expectDbError(
        as(alice, "SELECT public.record_public_access($1, NULL, 'granted', NULL, NULL)", [alice.shareId])
      )
    ).toMatch(/permission denied/);
  });
});

describe("record_public_access", () => {
  it("logs to the owning patient, throttles repeated views, and always logs wrong PINs", async () => {
    const ip = hex64("e1");
    const count = async (outcome: string) =>
      (
        await owner<{ n: number }>(
          "SELECT count(*)::int n FROM public.share_access_logs WHERE emergency_access_id = $1 AND outcome = $2",
          [alice.emergencyId, outcome]
        )
      ).rows[0].n;
    await service("SELECT public.record_public_access(NULL, $1, 'granted', $2, 'UA')", [alice.emergencyId, ip]);
    await service("SELECT public.record_public_access(NULL, $1, 'granted', $2, 'UA')", [alice.emergencyId, ip]);
    expect(await count("granted")).toBe(1);
    await service("SELECT public.record_public_access(NULL, $1, 'granted', $2, 'UA')", [alice.emergencyId, hex64("e2")]);
    expect(await count("granted")).toBe(2);

    const share = await createShare(alice);
    await service("SELECT public.record_public_access($1, NULL, 'pin_failed', $2, NULL)", [share, ip]);
    await service("SELECT public.record_public_access($1, NULL, 'pin_failed', $2, NULL)", [share, ip]);
    const { rows } = await owner<{ n: number; patient: string }>(
      "SELECT count(*)::int n, min(patient_id::text) patient FROM public.share_access_logs WHERE share_id = $1",
      [share]
    );
    expect(rows[0]).toEqual({ n: 2, patient: alice.userId });

    // The patient sees their own access log; Bob does not.
    const own = await as<{ n: number }>(alice, "SELECT count(*)::int n FROM public.share_access_logs WHERE share_id = $1", [share]);
    expect(own.rows[0].n).toBe(2);
    const other = await as<{ n: number }>(bob, "SELECT count(*)::int n FROM public.share_access_logs WHERE share_id = $1", [share]);
    expect(other.rows[0].n).toBe(0);
  });

  it("rejects a missing or unknown target and an invalid outcome", async () => {
    expect(await expectDbError(service("SELECT public.record_public_access(NULL, NULL, 'granted', NULL, NULL)"))).toMatch(/Exactly one/);
    expect(
      await expectDbError(service("SELECT public.record_public_access(gen_random_uuid(), NULL, 'granted', NULL, NULL)"))
    ).toMatch(/Unknown target/);
    expect(
      await expectDbError(service("SELECT public.record_public_access($1, NULL, 'peeked', NULL, NULL)", [alice.shareId]))
    ).toMatch(/check constraint/);
  });
});

describe("emergency access", () => {
  const create = (user: PatientRecords, id: string, meds: string[], expiry = "365 days") =>
    as(
      user,
      `SELECT public.create_emergency_access($1, $2, true, false, true, true, false, $3, ' Diabetic ', now() + $4::interval)`,
      [id, nextHash(), meds, expiry]
    );

  it("replaces the live link in one transaction and audits both steps", async () => {
    const firstId = crypto.randomUUID();
    await create(alice, firstId, [alice.medicationId]);
    const secondId = crypto.randomUUID();
    await create(alice, secondId, []);
    const { rows } = await owner<{ id: string; live: boolean; note: string | null; meds: string[] }>(
      "SELECT id, revoked_at IS NULL AS live, patient_note AS note, medication_ids AS meds FROM public.emergency_access WHERE id = ANY($1) ORDER BY created_at",
      [[firstId, secondId]]
    );
    expect(rows.map((r) => [r.id, r.live])).toEqual([
      [firstId, false],
      [secondId, true],
    ]);
    expect(rows[0]).toMatchObject({ note: "Diabetic", meds: [alice.medicationId] });
    const types = await auditTypes(alice);
    expect(types.filter((t) => t === "emergency_access_created").length).toBeGreaterThanOrEqual(2);
    expect(types).toContain("emergency_access_revoked");
  });

  it("refuses another patient's medication and out-of-range expiry", async () => {
    expect(await expectDbError(create(bob, crypto.randomUUID(), [alice.medicationId]))).toMatch(/Medication not found/);
    expect(await expectDbError(create(bob, crypto.randomUUID(), [], "401 days"))).toMatch(/Expiry/);
  });

  it("updates the live link in place and turns it off", async () => {
    const id = crypto.randomUUID();
    await create(bob, id, []);
    await as(bob, "SELECT public.update_emergency_access(false, true, false, false, true, $1, NULL)", [[bob.medicationId]]);
    const { rows } = await owner(
      "SELECT show_blood_group, show_date_of_birth, show_emergency_contact, medication_ids, patient_note FROM public.emergency_access WHERE id = $1",
      [id]
    );
    expect(rows[0]).toEqual({
      show_blood_group: false,
      show_date_of_birth: true,
      show_emergency_contact: true,
      medication_ids: [bob.medicationId],
      patient_note: null,
    });
    await as(bob, "SELECT public.revoke_emergency_access()");
    expect(await expectDbError(as(bob, "SELECT public.revoke_emergency_access()"))).toMatch(/No active emergency link/);
    expect(
      await expectDbError(as(bob, "SELECT public.update_emergency_access(true, true, true, true, true, '{}', NULL)"))
    ).toMatch(/No active emergency link/);
    expect(await auditTypes(bob)).toEqual(expect.arrayContaining(["emergency_access_updated", "emergency_access_revoked"]));
  });

  it("patients cannot set last_accessed_at or reactivate a revoked link", async () => {
    expect(
      await expectDbError(as(alice, "UPDATE public.emergency_access SET last_accessed_at = now() WHERE patient_id = $1", [alice.userId]))
    ).toMatch(/permission denied/);
    expect(
      await expectDbError(
        as(alice, "UPDATE public.emergency_access SET revoked_at = NULL WHERE patient_id = $1 AND revoked_at IS NOT NULL", [
          alice.userId,
        ])
      )
    ).toMatch(/cannot be reactivated/);
  });
});

describe("update_profile", () => {
  it("saves validated fields, keeps only known contact keys, and audits without values", async () => {
    await as(alice, "SELECT public.update_profile(' Alice  A ', '1990-02-03', 'O+', $1)", [
      JSON.stringify({ name: "Bob", phone: "+91 98765 43210", relationship: "Brother", extra: "dropped" }),
    ]);
    const { rows } = await owner(
      "SELECT display_name, date_of_birth::text dob, blood_group, emergency_contact FROM public.profiles WHERE user_id = $1",
      [alice.userId]
    );
    expect(rows[0]).toEqual({
      display_name: "Alice  A",
      dob: "1990-02-03",
      blood_group: "O+",
      emergency_contact: { name: "Bob", phone: "+91 98765 43210", relationship: "Brother" },
    });
    const audit = await owner<{ metadata: unknown }>(
      "SELECT metadata FROM public.audit_logs WHERE patient_id = $1 AND event_type = 'profile_updated'",
      [alice.userId]
    );
    expect(audit.rows.at(-1)?.metadata).toEqual({});
  });

  it("clears an empty contact and rejects invalid values", async () => {
    await as(alice, "SELECT public.update_profile('Alice', NULL, '', $1)", [JSON.stringify({ name: "", phone: "" })]);
    const { rows } = await owner("SELECT blood_group, emergency_contact FROM public.profiles WHERE user_id = $1", [alice.userId]);
    expect(rows[0]).toEqual({ blood_group: null, emergency_contact: null });

    expect(await expectDbError(as(alice, "SELECT public.update_profile('', NULL, NULL, NULL)"))).toMatch(/Name/);
    expect(await expectDbError(as(alice, "SELECT public.update_profile('A', NULL, 'Z+', NULL)"))).toMatch(/blood group/);
    expect(await expectDbError(as(alice, "SELECT public.update_profile('A', '2999-01-01', NULL, NULL)"))).toMatch(/date of birth/);
    expect(
      await expectDbError(as(alice, "SELECT public.update_profile('A', NULL, NULL, $1)", [JSON.stringify({ name: "Bob" })]))
    ).toMatch(/name and a phone/);
  });
});
