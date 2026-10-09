import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewScreen } from "@/components/documents/ReviewScreen";
import { requireSession } from "@/lib/auth/session";
import { getReviewData } from "@/lib/documents/service";

export const metadata = { title: "Review document" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
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
            }}
          />
        ) : (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">There is nothing to review for this document right now.</p>
              <Link href="/documents">
                <Button variant="outline" size="sm">Back to documents</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
