import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import Header from "@/components/layout/Header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewScreen } from "@/components/documents/ReviewScreen";
import { requireSession } from "@/lib/auth/session";
import { getReviewData } from "@/lib/documents/service";

export const metadata = { title: "Review document" };

// Patient data is request-time: stream it behind Suspense so navigation shows
// the page immediately (Cache Components). Health data is never server-cached.
export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton title="Review extracted details" subtitle="Check everything against your document before it is saved" />}>
      <ReviewContent params={params} />
    </Suspense>
  );
}

async function ReviewContent({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (session.kind !== "live" || !z.string().uuid().safeParse(id).success) notFound();

  const data = await getReviewData(session, id);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Review extracted details" subtitle="Check everything against your document before it is saved" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
        {data ? (
          <ReviewScreen
            review={{
              documentId: id,
              extractionId: data.extractionId,
              documentName: data.document.filename,
              verified: data.verified,
              pages: data.pages,
              provider: data.provider,
              model: data.model,
              isSimulated: data.isSimulated,
              textReadByAi: data.textReadByAi,
            }}
          />
        ) : (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">There is nothing to review for this document right now.</p>
              <Link href="/documents" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Back to documents
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
