import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { LiveOperationsView } from "@/components/views/LiveOperationsView";

export default async function LiveOperationsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Live Operations Center" subtitle="Dry-run, owner approval, execution gates, and live operations audit">
      <LiveOperationsView />
    </LuxuryShell>
  );
}
