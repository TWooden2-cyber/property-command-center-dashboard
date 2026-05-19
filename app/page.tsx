import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { OverviewView } from "@/components/views/OverviewView";

export default async function OverviewPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Overview" subtitle="Private owner command center">
      <OverviewView />
    </LuxuryShell>
  );
}
