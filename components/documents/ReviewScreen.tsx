"use client";

import { useRouter } from "next/navigation";
import { ReviewForm } from "./ReviewForm";
import { cancelReviewAction, confirmReviewAction } from "@/app/(app)/documents/actions";
import type { ReviewPayload } from "@/lib/documents/review-payload";

/** Real-user review: confirm/cancel go through server actions that re-check the session. */
export function ReviewScreen({ review }: { review: ReviewPayload }) {
  const router = useRouter();
  return (
    <ReviewForm
      review={review}
      onConfirm={async (submission) => {
        const result = await confirmReviewAction(submission);
        if (result.ok) router.push("/timeline");
        return result;
      }}
      onCancel={async () => {
        const result = await cancelReviewAction(review.documentId);
        if (result.ok) router.push("/documents");
      }}
    />
  );
}
