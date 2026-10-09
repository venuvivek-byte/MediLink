import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getConfig } from "@/lib/config/env";

// PHASE 1 STATUS: authenticated, but processing is intentionally disabled.
// The validated pipeline (magic-byte checks, private storage, PDF text
// layer, OCR, schema-validated AI extraction, patient review) lands in
// Phase 3. Until then this endpoint never forwards files anywhere and never
// returns fabricated extraction output.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to upload documents." }, { status: 401 });
  }

  if (getConfig().mode === "demo") {
    return NextResponse.json(
      { error: "Demo mode does not accept real files. Use the sample document instead." },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: "Document upload is not available yet." }, { status: 501 });
}
