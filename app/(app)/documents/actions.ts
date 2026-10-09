"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { cancelReview, confirmReview, deleteDocument, type ConfirmResult } from "@/lib/documents/service";
import type { ReviewPayload } from "@/lib/documents/review-payload";
import { runExtraction } from "@/lib/ai";
import { SimulatedExtractionProvider } from "@/lib/ai/providers/simulated";
import { getDemoSample } from "@/lib/demo/samples";

const NOT_SIGNED_IN: ConfirmResult = { ok: false, error: "Your session has ended. Please sign in again." };
const documentId = z.string().uuid();

// Each action re-checks the session itself: server actions are public
// endpoints and must never trust that the page that rendered them was authorised.

export async function confirmReviewAction(submission: unknown): Promise<ConfirmResult> {
  const session = await getSession();
  if (!session || session.kind !== "live") return NOT_SIGNED_IN;
  const result = await confirmReview(session, submission);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function cancelReviewAction(id: string): Promise<ConfirmResult> {
  const session = await getSession();
  if (!session || session.kind !== "live") return NOT_SIGNED_IN;
  if (!documentId.safeParse(id).success) return { ok: false, error: "Document not found." };
  const result = await cancelReview(session, id);
  if (result.ok) revalidatePath("/documents");
  return result;
}

export async function deleteDocumentAction(id: string): Promise<ConfirmResult> {
  const session = await getSession();
  if (!session || session.kind !== "live") return NOT_SIGNED_IN;
  if (!documentId.safeParse(id).success) return { ok: false, error: "Document not found." };
  const result = await deleteDocument(session, id);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/**
 * Demo mode: runs a bundled synthetic sample through the simulated provider
 * and the same validation/evidence checks as real documents. Nothing is stored.
 */
export async function runDemoSampleAction(sampleId: string): Promise<{ ok: true; review: ReviewPayload } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.kind !== "demo") return { ok: false, error: "Samples are only available in demo mode." };
  const sample = getDemoSample(sampleId);
  if (!sample) return { ok: false, error: "Unknown sample." };
  const outcome = await runExtraction(new SimulatedExtractionProvider(sample.simulatedOutput), sample.pages);
  return {
    ok: true,
    review: {
      documentId: `demo-${sample.id}`,
      extractionId: crypto.randomUUID(),
      documentName: sample.filename,
      verified: outcome.verified,
      pages: sample.pages,
      provider: outcome.provider,
      model: outcome.model,
      isSimulated: true,
    },
  };
}
