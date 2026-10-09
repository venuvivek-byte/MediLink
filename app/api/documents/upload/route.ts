import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getConfig } from "@/lib/config/env";
import { uploadDocument } from "@/lib/documents/service";
import { isDocumentError } from "@/lib/documents/errors";
import { documentErrorResponse, NO_STORE } from "@/lib/documents/http";

// Multipart overhead allowance on top of the file size limit.
const ENVELOPE_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to upload documents." }, { status: 401, headers: NO_STORE });
  }
  const config = getConfig();
  if (config.mode === "demo") {
    return NextResponse.json(
      { error: "Demo mode does not accept real files. Use the sample document instead." },
      { status: 403, headers: NO_STORE }
    );
  }

  // Reject oversized bodies before reading them into memory.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > config.upload.maxBytes + ENVELOPE_BYTES) return documentErrorResponse("file_too_large");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return documentErrorResponse("file_type_unsupported");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return documentErrorResponse("file_empty");
  if (file.size > config.upload.maxBytes) return documentErrorResponse("file_too_large");

  try {
    const document = await uploadDocument(session, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      name: file.name,
      type: file.type,
    });
    return NextResponse.json({ document }, { status: 201, headers: NO_STORE });
  } catch (error) {
    if (isDocumentError(error)) return documentErrorResponse(error);
    console.error("[upload] unexpected error");
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500, headers: NO_STORE });
  }
}
