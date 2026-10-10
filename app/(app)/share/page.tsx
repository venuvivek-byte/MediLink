import { Suspense } from "react";
import Header from "@/components/layout/Header";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ShareView } from "@/components/share/ShareView";
import { getPatientRepository } from "@/lib/data";
import { getConfig } from "@/lib/config/env";
import { requireSession } from "@/lib/auth/session";
import { datasetForPatient } from "@/lib/demo/datasets";
import { isLocked, shareState } from "@/lib/sharing/policy";

export const metadata = { title: "Share records" };

const SUBTITLE = "Give a clinician time-limited, read-only access to records you choose";

// Patient data is request-time: stream it behind Suspense (Cache Components).
export default function SharePage() {
  return (
    <Suspense fallback={<PageSkeleton title="Share records" subtitle={SUBTITLE} />}>
      <ShareContent />
    </Suspense>
  );
}

async function ShareContent() {
  const shares = (await (await getPatientRepository()).listShareLinks()).map((share) => ({
    ...share,
    state: shareState(share),
    locked: isLocked(share.lockedUntil),
  }));
  const config = getConfig();
  const session = await requireSession();
  // Read-only sessions show their dataset's fixed example link instead of creating one.
  const links = session.kind === "demo" ? datasetForPatient(session.patientId)?.publicLinks : undefined;
  const demo = links ? { url: `${config.appUrl}/share/${links.shareToken}`, pin: links.sharePin } : null;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Share records" subtitle={SUBTITLE} />
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <ShareView shares={shares} demo={demo} />
      </div>
    </div>
  );
}
