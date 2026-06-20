import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { createLiveUnavailableCommandConfig } from "@/lib/liveUnavailableCommandConfig";

const pageConfig = createLiveUnavailableCommandConfig(
  "live-readiness",
  "Live Readiness / Deployment Checklist",
  "Production connection status, live data gates, and deployment readiness"
);

export default async function LiveReadinessPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Live Readiness Command" subtitle="Real data cleanup, proof verification, source-of-truth review, and safe live-integration planning.">
      <CommandPageView config={pageConfig} />
    </LuxuryShell>
  );
}
