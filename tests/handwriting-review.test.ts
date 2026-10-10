// Phase 5.5: handling hard-to-read (handwritten) documents during review.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeSupabase } from "./helpers/fake-supabase";
import { lookAlikeNames } from "@/lib/domain/lookalike";
import { hasIllegibleMarker, verifyExtraction } from "@/lib/ai/verify";
import { reviewSubmissionSchema } from "@/lib/documents/review-schema";
import { attentionFor } from "@/components/documents/ReviewForm";
import type { Extraction } from "@/lib/ai/extraction-schema";

const fake = { db: new FakeSupabase(), session: null as null | { kind: "live"; patientId: string; email: null } };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fake.db }));
vi.mock("@/lib/auth/session", () => ({ getSession: async () => fake.session }));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const DOC = "33333333-3333-4333-8333-333333333333";
const SHA = "a".repeat(64);

describe("lookAlikeNames", () => {
  it("warns for known confusable names, in either direction", () => {
    expect(lookAlikeNames("Tab Metformin 500 mg")).toEqual(["metronidazole"]);
    expect(lookAlikeNames("METRONIDAZOLE 400")).toEqual(["metformin"]);
    expect(lookAlikeNames("Hydroxyzine 25mg")).toEqual(["hydralazine"]);
    expect(lookAlikeNames("Zantac").sort()).toEqual(["xanax", "zyrtec"]);
  });

  it("catches a one-letter misread of a long name", () => {
    expect(lookAlikeNames("Metformn")).toEqual(["metronidazole"]);
    expect(lookAlikeNames("Prednisolon")).toEqual(["prednisone"]);
  });

  it("does not warn for unrelated or short names", () => {
    expect(lookAlikeNames("Paracetamol 650")).toEqual([]);
    expect(lookAlikeNames("Atorvastatin")).toEqual([]);
    expect(lookAlikeNames("")).toEqual([]);
    expect(lookAlikeNames("Tab")).toEqual([]);
  });

  it("never warns that a name looks like itself", () => {
    expect(lookAlikeNames("Celexa (not Celebrex)")).toEqual(["cerebyx"]);
  });
});

const med = (over: Partial<Extraction["medications"][number]> = {}): Extraction["medications"][number] => ({
  name: "Amoxicillin",
  strength: "500 mg",
  dosage: null,
  frequency: "TDS",
  duration: null,
  route: null,
  instructions: null,
  uncertain: false,
  evidence: { page: 1, quote: "Amoxicillin 500 mg TDS" },
  ...over,
});

function extraction(medications: Extraction["medications"]): Extraction {
  return {
    document_type: "prescription",
    document_date: null,
    encounter_date: null,
    patient_name: null,
    provider_name: null,
    facility_name: null,
    diagnoses: [],
    medications,
    lab_results: [],
    allergies: [],
    instructions: [],
    unreadable_notes: [],
  };
}

describe("illegible marker", () => {
  const pages = [{ pageNumber: 1, text: "Amoxicillin 500 mg TDS\n[illegible] 1-0-1 x 5 days" }];

  it("flags items with [illegible] in any field, but not in the evidence quote alone", () => {
    expect(hasIllegibleMarker(med({ frequency: "[Illegible]" }))).toBe(true);
    expect(hasIllegibleMarker(med({ evidence: { page: 1, quote: "[illegible] 1-0-1" } }))).toBe(false);

    const verified = verifyExtraction(
      extraction([med(), med({ name: "[illegible]", strength: null, frequency: "1-0-1", evidence: { page: 1, quote: "[illegible] 1-0-1" } })]),
      pages
    );
    expect(verified.medications[0].flags).toEqual([]);
    expect(verified.medications[1].flags).toContain("illegible_text");
    expect(verified.medications[1].uncertain).toBe(true);
  });

  it("can never be saved: the review submission rejects it in any record field", () => {
    const base = {
      extractionId: "44444444-4444-4444-8444-444444444444",
      header: {},
      lab_results: [],
      conditions: [],
      allergies: [],
    };
    const bad = reviewSubmissionSchema.safeParse({ ...base, medications: [{ name: "Tab [illegible]" }] });
    expect(bad.success).toBe(false);
    const badDose = reviewSubmissionSchema.safeParse({ ...base, medications: [{ name: "Amoxicillin", frequency: "[ illegible ]" }] });
    expect(badDose.success).toBe(false);
    // The verbatim source excerpt may contain the marker: it documents what was read.
    const ok = reviewSubmissionSchema.safeParse({
      ...base,
      medications: [{ name: "Amoxicillin", source_page: 1, source_excerpt: "[illegible] 1-0-1" }],
    });
    expect(ok.success).toBe(true);
  });
});

describe("attentionFor (review form gate)", () => {
  it("requires a decision for flagged, illegible and look-alike entries, recomputed as the patient edits", () => {
    expect(attentionFor({ values: { name: "Amoxicillin" }, flags: [] }, true).needsDecision).toBe(false);
    expect(attentionFor({ values: { name: "Amoxicillin" }, flags: ["model_uncertain"] }, true).needsDecision).toBe(true);
    expect(attentionFor({ values: { name: "Metformin" }, flags: [] }, true)).toMatchObject({
      needsDecision: true,
      lookAlikes: ["metronidazole"],
    });
    // Look-alike checks apply to medicines only.
    expect(attentionFor({ values: { name: "Metformin" }, flags: [] }, false).needsDecision).toBe(false);

    const illegible = attentionFor({ values: { name: "[illegible]" }, flags: ["illegible_text"] }, true);
    expect(illegible).toMatchObject({ illegible: true, needsDecision: true, flags: [] });
    // Once the patient types the real name, the illegible state clears (the entry still needs a decision).
    const fixed = attentionFor({ values: { name: "Amoxicillin" }, flags: ["illegible_text"] }, true);
    expect(fixed).toMatchObject({ illegible: false, needsDecision: true });
  });
});

describe("GET /api/documents/[id]/original", () => {
  async function get(id = DOC) {
    vi.resetModules();
    const { GET } = await import("@/app/api/documents/[id]/original/route");
    return GET(new NextRequest(`http://localhost/api/documents/${id}/original`), { params: Promise.resolve({ id }) });
  }

  function addDoc(owner: string, mime: string, pathOwner = owner) {
    const path = `${pathOwner}/${DOC}/${SHA}.${mime === "application/pdf" ? "pdf" : "png"}`;
    fake.db.tables.documents.push({ id: DOC, patient_id: owner, storage_path: path, mime_type: mime });
    fake.db.files.set(path, new Uint8Array([137, 80, 78, 71]));
  }

  beforeEach(() => {
    fake.db = new FakeSupabase();
    fake.session = { kind: "live", patientId: A, email: null };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("serves the owner's image from this origin with locked-down headers", async () => {
    addDoc(A, "image/png");
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it("requires a session", async () => {
    addDoc(A, "image/png");
    fake.session = null;
    expect((await get()).status).toBe(401);
  });

  it("is not found for another patient's document, a foreign storage path or a bad id", async () => {
    addDoc(B, "image/png");
    expect((await get()).status).toBe(404);
    fake.db = new FakeSupabase();
    addDoc(A, "image/png", B);
    expect((await get()).status).toBe(404);
    expect((await get("not-a-uuid")).status).toBe(404);
  });

  it("refuses PDFs (they open through the download route instead)", async () => {
    addDoc(A, "application/pdf");
    expect((await get()).status).toBe(415);
  });
});
