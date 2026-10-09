import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookieJar, cookiesMock, createSupabaseClientMock, redirectMock, supabaseState } from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, TEST_SECRET, useEnv } from "./helpers/env";
import { createSignedToken } from "@/lib/security/signed-token";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/constants";
import { DocumentError } from "@/lib/documents/errors";

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createSupabaseClientMock }));

const uploadDocument = vi.fn();
const processDocument = vi.fn();
vi.mock("@/lib/documents/service", () => ({ uploadDocument, processDocument }));

const DOC_ID = "33333333-3333-4333-8333-333333333333";

async function routes() {
  vi.resetModules();
  return {
    upload: (await import("@/app/api/documents/upload/route")).POST,
    process: (await import("@/app/api/documents/[id]/process/route")).POST,
  };
}

function uploadRequest(file: File | string | null, headers: Record<string, string> = {}) {
  const form = new FormData();
  if (file !== null) form.set("file", file);
  return new NextRequest("http://localhost/api/documents/upload", { method: "POST", body: form, headers });
}

beforeEach(() => {
  cookieJar.clear();
  supabaseState.user = null;
  uploadDocument.mockReset();
  processDocument.mockReset();
  useEnv(LIVE_ENV);
});

const signIn = () => (supabaseState.user = { id: "11111111-1111-4111-8111-111111111111", email: "a@example.test" });

describe("POST /api/documents/upload", () => {
  it("returns 401 JSON without a session", async () => {
    const { upload } = await routes();
    expect((await upload(uploadRequest(new File(["x"], "a.pdf")))).status).toBe(401);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("refuses real files in demo mode", async () => {
    useEnv(DEMO_ENV);
    cookieJar.set(DEMO_SESSION_COOKIE, createSignedToken({ sid: crypto.randomUUID() }, TEST_SECRET, 60));
    const { upload } = await routes();
    expect((await upload(uploadRequest(new File(["x"], "a.pdf")))).status).toBe(403);
  });

  it("rejects an oversized body from its Content-Length before reading it", async () => {
    signIn();
    const { upload } = await routes();
    const res = await upload(uploadRequest(new File(["x"], "a.pdf"), { "content-length": String(50 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("requires an actual file field", async () => {
    signIn();
    const { upload } = await routes();
    expect((await upload(uploadRequest("just text"))).status).toBe(400);
    expect((await upload(uploadRequest(null))).status).toBe(400);
  });

  it("maps validation errors to clear status codes", async () => {
    signIn();
    uploadDocument.mockRejectedValue(new DocumentError("file_duplicate"));
    const { upload } = await routes();
    const res = await upload(uploadRequest(new File(["%PDF-"], "a.pdf", { type: "application/pdf" })));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "file_duplicate", error: "You have already uploaded this exact file." });
  });

  it("returns 201 with the new document and is never cached", async () => {
    signIn();
    uploadDocument.mockResolvedValue({ id: DOC_ID, filename: "a.pdf" });
    const { upload } = await routes();
    const res = await upload(uploadRequest(new File(["%PDF-"], "a.pdf", { type: "application/pdf" })));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(uploadDocument.mock.calls[0][1]).toMatchObject({ name: "a.pdf", type: "application/pdf" });
  });

  it("never leaks unexpected error details", async () => {
    signIn();
    uploadDocument.mockRejectedValue(new Error("db password is hunter2"));
    const { upload } = await routes();
    const res = await upload(uploadRequest(new File(["%PDF-"], "a.pdf", { type: "application/pdf" })));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
  });
});

describe("POST /api/documents/[id]/process", () => {
  const call = async (id: string) => {
    const { process } = await routes();
    return process(new NextRequest(`http://localhost/api/documents/${id}/process`, { method: "POST" }), {
      params: Promise.resolve({ id }),
    });
  };

  it("returns 401 without a session and 404 for malformed ids", async () => {
    expect((await call(DOC_ID)).status).toBe(401);
    signIn();
    expect((await call("../../x")).status).toBe(404);
    expect(processDocument).not.toHaveBeenCalled();
  });

  it("reports pipeline failures with their reason and whether a retry may help", async () => {
    signIn();
    processDocument.mockResolvedValue({ ok: false, code: "ai_unavailable", retryable: true });
    const res = await call(DOC_ID);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "ai_unavailable", retryable: true });
  });

  it("returns the extraction id on success", async () => {
    signIn();
    processDocument.mockResolvedValue({ ok: true, extractionId: "e1" });
    const res = await call(DOC_ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ extractionId: "e1" });
  });
});
