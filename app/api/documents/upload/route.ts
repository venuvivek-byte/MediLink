import { NextRequest, NextResponse } from "next/server";
import { extractMedicalDocument } from "@/lib/ai/extraction";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as any) || "prescription";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Call extraction pipeline
    const extraction = await extractMedicalDocument(buffer, file.type, documentType);

    return NextResponse.json({
      success: true,
      document: {
        filename: file.name,
        size: file.size,
        type: file.type,
      },
      extraction,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process document" },
      { status: 500 }
    );
  }
}
