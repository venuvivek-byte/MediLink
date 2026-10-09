import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createDocumentDownloadUrl } from "@/lib/storage/documents";

const NO_STORE = { "Cache-Control": "no-store" };

/** Redirects the signed-in owner to a 60-second signed URL for the original file. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view documents." }, { status: 401, headers: NO_STORE });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Document not found." }, { status: 404, headers: NO_STORE });
  }

  const result = await createDocumentDownloadUrl(session, id);
  if (!result.ok) {
    return result.reason === "not_found"
      ? NextResponse.json({ error: "Document not found." }, { status: 404, headers: NO_STORE })
      : NextResponse.json({ error: "The document is temporarily unavailable." }, { status: 503, headers: NO_STORE });
  }

  return NextResponse.redirect(result.url, { status: 303, headers: { ...NO_STORE, "Referrer-Policy": "no-referrer" } });
}
