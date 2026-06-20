import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { createLiveUnavailableCommandConfig } from "@/lib/liveUnavailableCommandConfig";

const pageConfig = createLiveUnavailableCommandConfig(
  "reports",
  "Reports / Owner Packets",
  "Owner reports, packet readiness, proof summaries, and status exports"
);

export default async function ReportsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Reports / Weekly Command Review" subtitle="Weekly owner review, operational health, cashflow snapshot, proof gaps, blocked items, and approval decisions">
      <CommandPageView config={pageConfig} />
    </LuxuryShell>
  );
}
