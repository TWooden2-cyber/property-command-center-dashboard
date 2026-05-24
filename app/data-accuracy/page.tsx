import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function DataAccuracyPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Data Accuracy / Source Verification" subtitle="Local sample data review, source-of-truth verification, proof gaps, pending values, and migration readiness">
      <CommandPageView config={commandPages["data-accuracy"]} />
    </LuxuryShell>
  );
}
