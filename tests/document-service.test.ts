import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeSupabase } from "./helpers/fake-supabase";
import { LIVE_ENV, useEnv } from "./helpers/env";
import { makePdf } from "./fixtures/make-pdf";
import type { Extraction } from "@/lib/ai/extraction-schema";

const fake = { db: new FakeSupabase() };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fake.db }));

const aiCalls: { pages: { pageNumber: number; text: string }[] }[] = [];
let aiBehaviour: "ok" | "unavailable" = "ok";
const EXTRACTION: Extraction = {
  document_type: "prescription",
  document_date: null,
  encounter_date: null,
  patient_name: null,
  provider_name: null,
  facility_name: null,
  diagnoses: [],
  medications: [
    {
      name: "Tab Metformin",
      strength: "500 mg",
      dosage: null,
      frequency: "BD",
      duration: null,
      route: null,
      instructions: null,
      uncertain: false,
      evidence: { page: 1, quote: "Tab Metformin 500 mg BD" },
    },
  ],
  lab_results: [],
  allergies: [],
  instructions: [],
  unreadable_notes: [],
};
vi.mock("@/lib/ai/providers/gemini", () => ({
  GeminiExtractionProvider: class {
    readonly name = "gemini";
    readonly isSimulated = false;
    constructor(
      _key: string,
      readonly model: string
    ) {}
    async extract(request: { pages: { pageNumber: number; text: string }[] }) {
      aiCalls.push(request);
      if (aiBehaviour === "unavailable") {
        const { ProviderError } = await import("@/lib/ai/providers/types");
        throw new ProviderError("auth", "403", 403);
      }
      return EXTRACTION;
    }
  },
}));

const ocrCalls: unknown[] = [];
let ocrAvailable = true;
let ocrCrash = false;
vi.mock("@/lib/ocr", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ocr")>();
  return {
    ...original,
    getOcrProvider: () => ({
      name: ocrAvailable ? "paddleocr" : "none",
      available: ocrAvailable,
      recognize: async (req: { pages?: number[] }) => {
        ocrCalls.push(req);
        if (ocrCrash) throw new TypeError("boom near 'Tab Metformin 500 mg'");
        if (!ocrAvailable) {
          const { DocumentError } = await import("@/lib/documents/errors");
          throw new DocumentError("ocr_unavailable");
        }
        return (req.pages ?? [1]).map((n) => ({ pageNumber: n, text: `OCR text of page ${n}: HbA1c 7.0 %`, confidence: 0.9 }));
      },
    }),
  };
});

const PATIENT = "11111111-1111-4111-8111-111111111111";
const session = { kind: "live" as const, patientId: PATIENT, email: null };
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function service() {
  vi.resetModules();
  return import("@/lib/documents/service");
}

beforeEach(() => {
  useEnv({ ...LIVE_ENV, AI_PROVIDER: "gemini", GEMINI_API_KEY: "k", GEMINI_MODEL: "gemini-test" });
  fake.db = new FakeSupabase();
  aiCalls.length = 0;
  ocrCalls.length = 0;
  aiBehaviour = "ok";
  ocrAvailable = true;
  ocrCrash = false;
});

describe("uploadDocument", () => {
  it("stores the file privately under the patient's folder and records it", async () => {
    const { uploadDocument } = await service();
    const doc = await uploadDocument(session, { bytes: PNG, name: "../scan.png", type: "image/png" });
    expect(doc).toMatchObject({ filename: "scan.png", processingStatus: "pending", reviewStatus: "pending_review" });
    const [path] = [...fake.db.files.keys()];
    expect(path).toMatch(new RegExp(`^${PATIENT}/[0-9a-f-]{36}/[0-9a-f]{64}\\.png$`));
    expect(fake.db.tables.audit_logs.map((a) => a.event_type)).toEqual(["document_uploaded"]);
  });

  it("rejects the same file twice", async () => {
    const { uploadDocument } = await service();
    await uploadDocument(session, { bytes: PNG, name: "a.png", type: "image/png" });
    await expect(uploadDocument(session, { bytes: PNG, name: "b.png", type: "image/png" })).rejects.toMatchObject({
      code: "file_duplicate",
    });
    expect(fake.db.files.size).toBe(1);
  });

  it("removes the stored file if the database insert fails (no orphans)", async () => {
    const { uploadDocument } = await service();
    fake.db.failNext["insert:documents"] = { code: "XX000" };
    await expect(uploadDocument(session, { bytes: PNG, name: "a.png", type: "image/png" })).rejects.toMatchObject({
      code: "storage_failed",
    });
    expect(fake.db.files.size).toBe(0);
  });

  it("rate-limits uploads per patient", async () => {
    const { uploadDocument, UPLOADS_PER_HOUR } = await service();
    for (let i = 0; i < UPLOADS_PER_HOUR; i++) {
      fake.db.tables.documents.push({ id: crypto.randomUUID(), patient_id: PATIENT, created_at: new Date().toISOString() });
    }
    await expect(uploadDocument(session, { bytes: PNG, name: "a.png", type: "image/png" })).rejects.toMatchObject({
      code: "too_many_attempts",
    });
  });

  it("refuses to run for demo sessions", async () => {
    const { uploadDocument } = await service();
    await expect(
      uploadDocument({ kind: "demo", patientId: "demo" }, { bytes: PNG, name: "a.png", type: "image/png" })
    ).rejects.toThrow(/real-user mode/);
  });
});

async function uploaded(bytes: Uint8Array, type: string) {
  const { uploadDocument } = await service();
  return uploadDocument(session, { bytes, name: "doc", type });
}

describe("processDocument", () => {
  it("text PDF: uses the embedded text, calls AI, stores pages and an extraction awaiting review", async () => {
    const doc = await uploaded(new Uint8Array(makePdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD"])), "application/pdf");
    const { processDocument, getReviewData } = await service();
    const result = await processDocument(session, doc.id);
    expect(result.ok).toBe(true);
    expect(ocrCalls).toHaveLength(0);
    expect(aiCalls[0].pages[0].text).toContain("Tab Metformin 500 mg BD");
    expect(fake.db.tables.document_pages).toHaveLength(1);
    expect(fake.db.tables.documents[0]).toMatchObject({ extraction_status: "completed", page_count: 1 });
    expect(fake.db.tables.document_extractions[0]).toMatchObject({ status: "succeeded", ai_provider: "gemini", ai_model: "gemini-test" });

    const review = await getReviewData(session, doc.id);
    expect(review?.verified.medications[0]).toMatchObject({ flags: [], uncertain: false });
  });

  it("scanned PDF page: OCRs only the pages without a text layer", async () => {
    const doc = await uploaded(new Uint8Array(makePdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD", ""])), "application/pdf");
    const { processDocument } = await service();
    expect((await processDocument(session, doc.id)).ok).toBe(true);
    expect(ocrCalls).toEqual([expect.objectContaining({ pages: [2] })]);
    expect(aiCalls[0].pages.map((p) => p.pageNumber)).toEqual([1, 2]);
    // Each stored page says where its text came from; only OCR pages carry a confidence.
    const stored = fake.db.tables.document_pages.map((p) => [p.page_number, p.text_source, p.ocr_confidence]);
    expect(stored).toEqual([
      [1, "pdf_text", null],
      [2, "ocr", 0.9],
    ]);
    expect(fake.db.tables.document_extractions[0]).toMatchObject({ text_source: "mixed", ocr_provider: "paddleocr" });
  });

  it("image: goes straight to OCR", async () => {
    const doc = await uploaded(PNG, "image/png");
    const { processDocument } = await service();
    expect((await processDocument(session, doc.id)).ok).toBe(true);
    expect(ocrCalls).toHaveLength(1);
    expect(fake.db.tables.document_pages[0]).toMatchObject({ text_source: "ocr", ocr_confidence: 0.9 });
    expect(fake.db.tables.document_extractions[0]).toMatchObject({ text_source: "ocr" });
  });

  it("never drops pages silently: OCR unavailable fails the whole document with a clear reason", async () => {
    ocrAvailable = false;
    const doc = await uploaded(new Uint8Array(makePdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD", ""])), "application/pdf");
    const { processDocument } = await service();
    expect(await processDocument(session, doc.id)).toEqual({ ok: false, code: "ocr_unavailable", retryable: false });
    expect(aiCalls).toHaveLength(0);
    expect(fake.db.tables.documents[0]).toMatchObject({ extraction_status: "failed", processing_error: "ocr_unavailable" });
    expect(fake.db.tables.audit_logs.map((a) => a.event_type)).toContain("extraction_failed");
  });

  it("an unexpected internal failure is reported as ours (not 'damaged file' or 'AI down') and logs no content", async () => {
    ocrCrash = true;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const doc = await uploaded(PNG, "image/png");
    const { processDocument } = await service();
    expect(await processDocument(session, doc.id)).toEqual({ ok: false, code: "internal_error", retryable: true });
    expect(fake.db.tables.documents[0]).toMatchObject({ extraction_status: "failed", processing_error: "internal_error" });
    expect(JSON.stringify(errors.mock.calls)).not.toContain("Metformin");
    expect(JSON.stringify(errors.mock.calls)).toContain("TypeError");
    errors.mockRestore();
  });

  it("AI not configured: fails clearly and NEVER substitutes simulated output", async () => {
    useEnv({ ...LIVE_ENV, AI_PROVIDER: "none" });
    const doc = await uploaded(new Uint8Array(makePdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD"])), "application/pdf");
    const { processDocument } = await service();
    expect(await processDocument(session, doc.id)).toMatchObject({ ok: false, code: "ai_not_configured" });
    expect(fake.db.tables.document_extractions).toHaveLength(0);
    // Nothing is parsed, stored or sent to OCR when extraction cannot run.
    expect(fake.db.tables.document_pages ?? []).toHaveLength(0);
    expect(ocrCalls).toHaveLength(0);
  });

  it("provider rejects the key: extraction marked failed, document can be retried later", async () => {
    aiBehaviour = "unavailable";
    const doc = await uploaded(new Uint8Array(makePdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD"])), "application/pdf");
    const { processDocument } = await service();
    expect(await processDocument(session, doc.id)).toMatchObject({ ok: false, code: "ai_not_configured" });
    expect(fake.db.tables.document_extractions[0]).toMatchObject({ status: "failed", error_code: "ai_not_configured" });
    expect(fake.db.tables.documents[0]).toMatchObject({ extraction_status: "failed" });
  });

  it("does not process a document that is already being processed", async () => {
    const doc = await uploaded(new Uint8Array(makePdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD"])), "application/pdf");
    fake.db.tables.documents[0].extraction_status = "processing";
    const { processDocument } = await service();
    expect(await processDocument(session, doc.id)).toMatchObject({ ok: false, code: "already_processing" });
    expect(aiCalls).toHaveLength(0);
  });

  it("stops after the retry limit", async () => {
    const doc = await uploaded(new Uint8Array(makePdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD"])), "application/pdf");
    Object.assign(fake.db.tables.documents[0], { extraction_status: "failed", processing_attempts: 3 });
    const { processDocument } = await service();
    expect(await processDocument(session, doc.id)).toMatchObject({ ok: false, code: "too_many_attempts" });
  });
});

describe("confirmReview", () => {
  it("rejects invalid submissions before touching the database", async () => {
    const { confirmReview } = await service();
    const result = await confirmReview(session, { extractionId: "not-a-uuid", header: {}, medications: [], lab_results: [], conditions: [], allergies: [] });
    expect(result.ok).toBe(false);
    expect(fake.db.rpcCalls).toHaveLength(0);
  });

  it("sends one atomic confirm call with unknown fields as null and status defaulting to unknown", async () => {
    const { confirmReview } = await service();
    const extractionId = crypto.randomUUID();
    const result = await confirmReview(session, {
      extractionId,
      header: { document_type: "prescription", document_date: "", provider_name: " Dr. Nair ", facility_name: "" },
      medications: [{ name: "Tab Metformin", strength: "500 mg", frequency: "", source_page: 1, source_excerpt: "Tab Metformin 500 mg BD" }],
      lab_results: [],
      conditions: [],
      allergies: [],
    });
    expect(result).toEqual({ ok: true });
    expect(fake.db.rpcCalls).toHaveLength(1);
    const { fn, args } = fake.db.rpcCalls[0];
    expect(fn).toBe("confirm_extraction");
    expect(args.p_extraction_id).toBe(extractionId);
    const review = args.p_review as { header: Record<string, unknown>; medications: Record<string, unknown>[] };
    expect(review.header).toEqual({ document_type: "prescription", document_date: null, provider_name: "Dr. Nair", facility_name: null });
    expect(review.medications[0]).toMatchObject({ status: "unknown", frequency: null, normalized_name: "metformin" });
  });

  it("reports a database failure without claiming success", async () => {
    const { confirmReview } = await service();
    fake.db.failNext.rpc = { code: "P0002" };
    const result = await confirmReview(session, {
      extractionId: crypto.randomUUID(),
      header: {},
      medications: [],
      lab_results: [],
      conditions: [],
      allergies: [],
    });
    expect(result).toMatchObject({ ok: false });
  });
});
