import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";
import { TEST_SECRET } from "./helpers/env";

const schema = z.object({ sid: z.string() });
const NOW = Date.UTC(2026, 0, 1);

describe("signed tokens", () => {
  it("round-trips a valid payload", () => {
    const token = createSignedToken({ sid: "abc" }, TEST_SECRET, 60, NOW);
    expect(verifySignedToken(token, TEST_SECRET, schema, NOW)).toMatchObject({ sid: "abc" });
  });

  it("rejects a token whose payload was edited", () => {
    const token = createSignedToken({ sid: "abc" }, TEST_SECRET, 60, NOW);
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sid: "other", exp: NOW / 1000 + 60 })).toString("base64url");
    expect(verifySignedToken(`${forgedPayload}.${signature}`, TEST_SECRET, schema, NOW)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSignedToken({ sid: "abc" }, "another-secret-another-secret-another", 60, NOW);
    expect(verifySignedToken(token, TEST_SECRET, schema, NOW)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSignedToken({ sid: "abc" }, TEST_SECRET, 60, NOW);
    expect(verifySignedToken(token, TEST_SECRET, schema, NOW + 61_000)).toBeNull();
  });

  it("rejects the legacy unsigned demo cookie value and other junk", () => {
    for (const junk of ["demo", "", "a.b.c", "....", "x".repeat(5000), undefined, null]) {
      expect(verifySignedToken(junk, TEST_SECRET, schema, NOW)).toBeNull();
    }
  });

  it("rejects a validly signed payload that does not match the schema", () => {
    const token = createSignedToken({ other: 1 }, TEST_SECRET, 60, NOW);
    expect(verifySignedToken(token, TEST_SECRET, schema, NOW)).toBeNull();
  });
});
