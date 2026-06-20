import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { LiveSourceChecklistPanel } from "@/components/LiveSourceChecklistPanel";
import { CommandPageView } from "@/components/views/CommandPageView";
import { createLiveUnavailableCommandConfig } from "@/lib/liveUnavailableCommandConfig";

const pageConfig = createLiveUnavailableCommandConfig(
  "data-accuracy",
  "Data Accuracy / Source Verification",
  "Live source verification, proof gaps, pending values, and migration readiness"
);

export default async function DataAccuracyPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Data Accuracy / Source Verification" subtitle="Live source verification, proof gaps, pending values, and migration readiness">
      <LiveSourceChecklistPanel />
      <CommandPageView config={pageConfig} />
    </LuxuryShell>
  );
}
