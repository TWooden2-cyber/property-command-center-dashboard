import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function ReportsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Reports / Weekly Command Review" subtitle="Weekly owner review, operational health, cashflow snapshot, proof gaps, blocked items, and approval decisions">
      <CommandPageView config={commandPages.reports} />
    </LuxuryShell>
  );
}
