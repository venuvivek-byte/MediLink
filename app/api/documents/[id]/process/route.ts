import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { processDocument } from "@/lib/documents/service";
import { documentErrorResponse, NO_STORE } from "@/lib/documents/http";

// OCR of a multi-page scan plus the AI call can take a while.
export const maxDuration = 300;

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to process documents." }, { status: 401, headers: NO_STORE });
  }
  if (session.kind !== "live") {
    return NextResponse.json({ error: "Not available in demo mode." }, { status: 403, headers: NO_STORE });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Document not found." }, { status: 404, headers: NO_STORE });
  }

  const result = await processDocument(session, id);
  if (!result.ok) return documentErrorResponse(result.code, result.retryable);
  return NextResponse.json({ extractionId: result.extractionId }, { headers: NO_STORE });
}
