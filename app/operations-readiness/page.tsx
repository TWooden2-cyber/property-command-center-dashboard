import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function OperationsReadinessPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Operations Readiness Command" subtitle="Five-phase readiness plan for live-site review, verified data cleanup, source-of-truth packaging, proof folders, and safe live integration.">
      <CommandPageView config={commandPages["operations-readiness"]} />
    </LuxuryShell>
  );
}
