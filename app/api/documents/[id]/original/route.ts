import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { readDocumentImage } from "@/lib/storage/documents";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** The signed-in owner's original photo/scan, for display on the review screen. Images only. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view documents." }, { status: 401, headers: NO_STORE });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Document not found." }, { status: 404, headers: NO_STORE });
  }

  const result = await readDocumentImage(session, id);
  if (!result.ok) {
    if (result.reason === "not_image") {
      return NextResponse.json({ error: "Only photos and scans can be shown here." }, { status: 415, headers: NO_STORE });
    }
    return result.reason === "not_found"
      ? NextResponse.json({ error: "Document not found." }, { status: 404, headers: NO_STORE })
      : NextResponse.json({ error: "The document is temporarily unavailable." }, { status: 503, headers: NO_STORE });
  }

  return new NextResponse(result.bytes as BodyInit, {
    headers: {
      ...NO_STORE,
      "Content-Type": result.mimeType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      // Opened directly, the image is inert: no scripts, no embedding elsewhere.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
