import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { createLiveUnavailableCommandConfig } from "@/lib/liveUnavailableCommandConfig";

const pageConfig = createLiveUnavailableCommandConfig(
  "real-data-cleanup",
  "Real Data Cleanup / Migration Readiness",
  "Source-of-truth cleanup, proof mapping, duplicate resolution, and migration blockers"
);

export default async function RealDataCleanupPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Real Data Cleanup Command" subtitle="Source-of-truth worksheet, proof collection, import prep, and verified-data migration planning.">
      <CommandPageView config={pageConfig} />
    </LuxuryShell>
  );
}
