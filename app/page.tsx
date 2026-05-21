// Owner-authored deployment sync
import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { OverviewView } from "@/components/views/OverviewView";

export default async function OverviewPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Owner Command Center - Local Dashboard" subtitle="Local read-only sample mode. Live Google services are disabled.">
      <OverviewView />
    </LuxuryShell>
  );
}
