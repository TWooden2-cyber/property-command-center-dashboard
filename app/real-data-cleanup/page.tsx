import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function RealDataCleanupPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Real Data Cleanup Command" subtitle="Source-of-truth worksheet, proof collection, import prep, and verified-data migration planning.">
      <CommandPageView config={commandPages["real-data-cleanup"]} />
    </LuxuryShell>
  );
}
