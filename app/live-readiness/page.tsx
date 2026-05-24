import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function LiveReadinessPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Live Readiness Command" subtitle="Real data cleanup, proof verification, source-of-truth review, and safe live-integration planning.">
      <CommandPageView config={commandPages["live-readiness"]} />
    </LuxuryShell>
  );
}
