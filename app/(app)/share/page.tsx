import Header from "@/components/layout/Header";
import { ShareView } from "@/components/share/ShareView";
import { getPatientRepository } from "@/lib/data";
import { getConfig } from "@/lib/config/env";
import { DEMO_SHARE_PIN, DEMO_SHARE_TOKEN } from "@/lib/demo/data";
import { shareState } from "@/lib/sharing/policy";

export const metadata = { title: "Share records" };

export default async function SharePage() {
  const shares = (await (await getPatientRepository()).listShareLinks()).map((share) => ({
    ...share,
    state: shareState(share),
  }));
  const config = getConfig();
  const demo =
    config.mode === "demo"
      ? { url: `${config.appUrl}/share/${DEMO_SHARE_TOKEN}`, pin: DEMO_SHARE_PIN }
      : null;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Share records" subtitle="Give a clinician time-limited, read-only access to records you choose" />
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <ShareView shares={shares} demo={demo} />
      </div>
    </div>
  );
}
