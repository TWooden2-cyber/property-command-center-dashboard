// Owner-authored deployment sync
import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { OverviewView } from "@/components/views/OverviewView";

export default async function OverviewPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Owner Command Center" subtitle="Owner-only dashboard using live Google Sheets read-only data or clear operational errors.">
      <OverviewView />
    </LuxuryShell>
  );
}
