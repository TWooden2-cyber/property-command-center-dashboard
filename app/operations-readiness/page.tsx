import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { createLiveUnavailableCommandConfig } from "@/lib/liveUnavailableCommandConfig";

const pageConfig = createLiveUnavailableCommandConfig(
  "operations-readiness",
  "Operations Readiness / Final QA",
  "Launch readiness, source verification, proof requirements, and owner approval gates"
);

export default async function OperationsReadinessPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Operations Readiness Command" subtitle="Five-phase readiness plan for live-site review, verified data cleanup, source-of-truth packaging, proof folders, and safe live integration.">
      <CommandPageView config={pageConfig} />
    </LuxuryShell>
  );
}
