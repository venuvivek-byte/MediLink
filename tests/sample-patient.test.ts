import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookieJar, cookiesMock, createSupabaseClientMock, redirectMock, supabaseState } from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, TEST_SECRET, useEnv } from "./helpers/env";
import { createSignedToken } from "@/lib/security/signed-token";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/constants";
import { DEMO_PATIENT_ID } from "@/lib/demo/data";
import {
  SAMPLE_DOCUMENTS,
  SAMPLE_EMERGENCY_TOKEN,
  SAMPLE_MEDICATION_SPECS,
  SAMPLE_PATIENT_ID,
  SAMPLE_SHARE_PIN,
  SAMPLE_SHARE_TOKEN,
} from "@/lib/demo/sample/data";
import { SAMPLE_DATASET } from "@/lib/demo/sample";
import { FICTIONAL_DATASET } from "@/lib/demo/datasets";
import { DemoPatientRepository } from "@/lib/data/demo-repository";
import { buildLabSeries, findDuplicateMedications, findRepeatTests } from "@/lib/domain/insights";

vi.mock("next/headers", () => ({ cookies: cookiesMock, headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createSupabaseClientMock }));
// The sample must never reach the service-role store.
vi.mock("@/lib/sharing/store", () => ({
  getPublicAccessStore: () => {
    throw new Error("sample links must not touch the database");
  },
}));

const FILES_DIR = path.join(process.cwd(), "lib", "demo", "sample", "files");
const client = { ipHash: null, userAgent: null };

function demoCookie(dataset?: "fictional" | "sample") {
  return createSignedToken({ sid: crypto.randomUUID(), ...(dataset ? { dataset } : {}) }, TEST_SECRET, 3600);
}

async function fresh<T>(load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  return load();
}

beforeEach(() => {
  cookieJar.clear();
  supabaseState.user = null;
});

describe("sample dataset", () => {
  const repo = new DemoPatientRepository(SAMPLE_PATIENT_ID);

  it("is synthetic, separate from the fictional demo patient, and clearly marked", () => {
    expect(SAMPLE_DATASET?.patient.user_id).toBe(SAMPLE_PATIENT_ID);
    expect(SAMPLE_PATIENT_ID).not.toBe(DEMO_PATIENT_ID);
    const sampleIds = new Set(
      [SAMPLE_DATASET!.documents, SAMPLE_DATASET!.labResults, SAMPLE_DATASET!.medications].flat().map((r) => r.id)
    );
    for (const row of [FICTIONAL_DATASET.documents, FICTIONAL_DATASET.labResults, FICTIONAL_DATASET.medications].flat()) {
      expect(sampleIds.has(row.id)).toBe(false);
    }
    expect(SAMPLE_DATASET!.documents.every((d) => (d.metadata as { is_sample?: boolean }).is_sample)).toBe(true);
  });

  it("bundles one original PDF per document, each marked as a synthetic sample", () => {
    const files = Object.values(SAMPLE_DATASET!.files);
    expect(files).toHaveLength(SAMPLE_DATASET!.documents.length);
    expect(fs.readdirSync(FILES_DIR).sort()).toEqual([...files].sort());
    for (const name of files) {
      const text = fs.readFileSync(path.join(FILES_DIR, name), "latin1");
      expect(text.startsWith("%PDF-")).toBe(true);
      expect(text).toContain("SYNTHETIC SAMPLE");
    }
  });

  it("shows every lab value and medicine exactly as printed on its source PDF", () => {
    const pdf = (id: string) => fs.readFileSync(path.join(FILES_DIR, SAMPLE_DATASET!.files[id]), "latin1");
    for (const doc of SAMPLE_DOCUMENTS) {
      for (const lab of doc.labs ?? []) {
        const text = pdf(doc.id);
        expect(text, `${doc.filename}: ${lab.test}`).toContain(`(${lab.test})`);
        expect(text, `${doc.filename}: ${lab.test} value`).toContain(`(${lab.value})`);
        if (lab.flag) expect(text).toContain(`(${lab.flag})`);
      }
    }
    for (const med of SAMPLE_MEDICATION_SPECS) {
      expect(pdf(med.doc.id), med.name).toContain(med.name);
    }
  });

  it("has enough history for the lab trend charts", async () => {
    const series = buildLabSeries(await repo.listLabResults());
    expect(series.length).toBeGreaterThanOrEqual(5);
    expect(series.filter((s) => s.points.length >= 4).map((s) => s.testName)).toEqual(
      expect.arrayContaining(["TSH", "Hemoglobin", "Serum Ferritin", "25-OH Vitamin D"])
    );
  });

  it("demonstrates the duplicate-medicine and repeat-test alerts", async () => {
    const duplicates = findDuplicateMedications(await repo.listMedications());
    expect(duplicates.map((d) => d.key)).toEqual(["pantoprazole"]);
    const repeats = findRepeatTests(await repo.listLabResults());
    expect(repeats.map((r) => [r.key, r.daysApart])).toEqual([["hemoglobin", 20]]);
  });

  it("returns nothing for any other patient id", async () => {
    const other = new DemoPatientRepository("someone-else");
    expect(await other.getProfile()).toBeNull();
    expect(await other.listLabResults()).toEqual([]);
  });
});

describe("sample session", () => {
  const load = () => fresh(() => import("@/lib/auth/session"));

  it("works in real-user mode without a Supabase account", async () => {
    useEnv(LIVE_ENV);
    const { startDemoSession, getSession, isSampleSession } = await load();
    await startDemoSession("sample");
    const session = await getSession();
    expect(session).toEqual({ kind: "demo", patientId: SAMPLE_PATIENT_ID });
    expect(isSampleSession(session!)).toBe(true);
  });

  it("still refuses the fictional demo patient in real-user mode", async () => {
    useEnv(LIVE_ENV);
    const { startDemoSession, getSession } = await load();
    await expect(startDemoSession("fictional")).rejects.toThrow(/disabled/);
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie("fictional"));
    expect(await getSession()).toBeNull();
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie()); // pre-sample cookies are fictional
    expect(await getSession()).toBeNull();
  });

  it("rejects a forged sample cookie and falls back to the Supabase user", async () => {
    useEnv(LIVE_ENV);
    cookieJar.set(DEMO_SESSION_COOKIE, createSignedToken({ sid: crypto.randomUUID(), dataset: "sample" }, "x".repeat(48), 3600));
    supabaseState.user = { id: "user-a", email: "a@example.com" };
    const { getSession } = await load();
    expect(await getSession()).toEqual({ kind: "live", patientId: "user-a", email: "a@example.com" });
  });

  it("offers both patients in demo mode", async () => {
    useEnv(DEMO_ENV);
    const { getSession } = await load();
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie("sample"));
    expect((await getSession())?.patientId).toBe(SAMPLE_PATIENT_ID);
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie());
    expect((await getSession())?.patientId).toBe(DEMO_PATIENT_ID);
  });

  it("can never edit", async () => {
    useEnv(LIVE_ENV);
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie("sample"));
    const { sessionAccess } = await load();
    expect(await sessionAccess()).toEqual({ canEdit: false, canOpenFiles: true, sample: true });
  });
});

describe("sample share and emergency links (real-user mode)", () => {
  beforeEach(() => useEnv(LIVE_ENV));
  const load = () => fresh(() => import("@/lib/sharing/public-access"));

  it("resolve to the sample only, without touching the database", async () => {
    const { resolveShareToken, verifySharePin, loadSharedRecords, openEmergencyLink } = await load();
    const share = await resolveShareToken(SAMPLE_SHARE_TOKEN);
    expect(share).toMatchObject({ patientId: SAMPLE_PATIENT_ID, state: "active" });
    expect(await verifySharePin(SAMPLE_SHARE_TOKEN, "000000", client)).toEqual({ ok: false, reason: "invalid" });
    const granted = await verifySharePin(SAMPLE_SHARE_TOKEN, SAMPLE_SHARE_PIN, client);
    expect(granted.ok).toBe(true);
    const records = await loadSharedRecords(share!);
    expect(records.patientName).toBe("Meera Krishnan");
    expect(records.timeline).toBeNull(); // not in this share's categories
    const card = await openEmergencyLink(SAMPLE_EMERGENCY_TOKEN, client);
    expect(card?.displayName).toBe("Meera Krishnan");
    expect(card?.allergies?.map((a) => a.substance)).toContain("Peanuts");
  });

  it("a real-shaped token still goes to the database", async () => {
    const { resolveShareToken } = await load();
    await expect(resolveShareToken("A".repeat(43))).rejects.toThrow(/must not touch the database/);
  });
});

describe("sample original files", () => {
  const firstDoc = SAMPLE_DOCUMENTS[0];
  const load = () => fresh(() => import("@/app/api/documents/[id]/file/route"));
  const get = async (id: string) => {
    const { GET } = await load();
    return GET(new NextRequest(`http://localhost/api/documents/${id}/file`), { params: Promise.resolve({ id }) });
  };

  it("are served inline to a sample session", async () => {
    useEnv(LIVE_ENV);
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie("sample"));
    const res = await get(firstDoc.id);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(new TextDecoder().decode((await res.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
  });

  it("are not served to other read-only sessions or for unknown ids", async () => {
    useEnv(DEMO_ENV);
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie("fictional"));
    expect((await get(firstDoc.id)).status).toBe(404);
    cookieJar.set(DEMO_SESSION_COOKIE, demoCookie("sample"));
    expect((await get("5a3e0000-0000-4000-8000-ffffffffffff")).status).toBe(404);
  });

  it("require a session", async () => {
    useEnv(LIVE_ENV);
    expect((await get(firstDoc.id)).status).toBe(401);
  });
});
