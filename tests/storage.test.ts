import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildDocumentPath, isOwnedPath } from "@/lib/storage/paths";
import { cookieJar, cookiesMock, redirectMock, supabaseState } from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, TEST_SECRET, useEnv } from "./helpers/env";
import { createSignedToken } from "@/lib/security/signed-token";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/constants";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const DOC = "33333333-3333-4333-8333-333333333333";
const SHA = "a".repeat(64);

describe("buildDocumentPath", () => {
  it("puts the owner id first and never uses the original filename", () => {
    expect(buildDocumentPath(A, DOC, SHA, "application/pdf")).toBe(`${A}/${DOC}/${SHA}.pdf`);
    expect(buildDocumentPath(A, DOC, SHA, "image/jpeg")).toBe(`${A}/${DOC}/${SHA}.jpg`);
  });

  it.each([
    ["patient id", () => buildDocumentPath("../etc", DOC, SHA, "application/pdf")],
    ["document id", () => buildDocumentPath(A, "x/../y", SHA, "application/pdf")],
    ["hash", () => buildDocumentPath(A, DOC, "not-a-hash", "application/pdf")],
    ["mime type", () => buildDocumentPath(A, DOC, SHA, "text/html")],
    ["prototype key as mime type", () => buildDocumentPath(A, DOC, SHA, "constructor")],
  ])("rejects an invalid %s", (_label, build) => {
    expect(build).toThrow();
  });
});

describe("isOwnedPath", () => {
  it("accepts only paths inside the owner's folder", () => {
    expect(isOwnedPath(`${A}/${DOC}/${SHA}.pdf`, A)).toBe(true);
    expect(isOwnedPath(`${B}/${DOC}/${SHA}.pdf`, A)).toBe(false);
    expect(isOwnedPath(`${A}/../${B}/x.pdf`, A)).toBe(false);
    expect(isOwnedPath(`${A}//x.pdf`, A)).toBe(false);
    expect(isOwnedPath(A, A)).toBe(false);
  });
});

// ─── GET /api/documents/[id]/file ──────────────────────────────────────────

const db: {
  row: { storage_path: string; original_filename: string; mime_type: string } | null;
  filters: [string, unknown][];
  signed: string | null;
} = { row: null, filters: [], signed: null };

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        db.filters.push([column, value]);
        return query;
      },
      maybeSingle: async () => {
        // Emulates RLS + filters: only A's own document row is ever returned.
        const ownerFilter = db.filters.find(([c]) => c === "patient_id")?.[1];
        return { data: ownerFilter === supabaseState.user?.id ? db.row : null, error: null };
      },
    };
    return {
      auth: { getUser: async () => ({ data: { user: supabaseState.user }, error: null }) },
      from: () => query,
      storage: {
        from: () => ({
          createSignedUrl: async (_path: string, ttl: number) =>
            db.signed ? { data: { signedUrl: `${db.signed}?ttl=${ttl}` }, error: null } : { data: null, error: new Error("x") },
        }),
      },
    };
  },
}));

async function get(id: string) {
  vi.resetModules();
  const { GET } = await import("@/app/api/documents/[id]/file/route");
  return GET(new NextRequest(`http://localhost/api/documents/${id}/file`), { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  cookieJar.clear();
  supabaseState.user = null;
  db.row = { storage_path: `${A}/${DOC}/${SHA}.pdf`, original_filename: "rx.pdf", mime_type: "application/pdf" };
  db.filters = [];
  db.signed = "https://storage.example/signed";
});

describe("GET /api/documents/[id]/file", () => {
  it("returns 401 without a session", async () => {
    useEnv(LIVE_ENV);
    expect((await get(DOC)).status).toBe(401);
  });

  it("redirects the owner to a 60-second signed URL and is never cached", async () => {
    useEnv(LIVE_ENV);
    supabaseState.user = { id: A, email: "a@example.test" };
    const res = await get(DOC);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://storage.example/signed?ttl=60");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(db.filters).toContainEqual(["patient_id", A]);
  });

  it("returns 404 (not 403) when another patient asks for the document", async () => {
    useEnv(LIVE_ENV);
    supabaseState.user = { id: B, email: "b@example.test" };
    const res = await get(DOC);
    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();
  });

  it("refuses to sign a stored path outside the owner's folder", async () => {
    useEnv(LIVE_ENV);
    supabaseState.user = { id: A, email: "a@example.test" };
    db.row = { ...db.row!, storage_path: `${B}/${DOC}/${SHA}.pdf` };
    expect((await get(DOC)).status).toBe(404);
  });

  it("rejects malformed ids before touching the database", async () => {
    useEnv(LIVE_ENV);
    supabaseState.user = { id: A, email: "a@example.test" };
    expect((await get("../../etc/passwd")).status).toBe(404);
    expect(db.filters).toEqual([]);
  });

  it("reports 503, not success, when signing fails", async () => {
    useEnv(LIVE_ENV);
    supabaseState.user = { id: A, email: "a@example.test" };
    db.signed = null;
    expect((await get(DOC)).status).toBe(503);
  });

  it("has no real files to serve in demo mode", async () => {
    useEnv(DEMO_ENV);
    cookieJar.set(DEMO_SESSION_COOKIE, createSignedToken({ sid: crypto.randomUUID() }, TEST_SECRET, 60));
    expect((await get(DOC)).status).toBe(404);
  });
});
