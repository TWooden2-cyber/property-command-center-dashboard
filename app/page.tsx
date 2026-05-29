// Owner-authored deployment sync
import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { OverviewView } from "@/components/views/OverviewView";

export default async function OverviewPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Owner Command Center" subtitle="Owner-only dashboard with local sample fallback and optional live Google Sheets read-only data.">
      <OverviewView />
    </LuxuryShell>
  );
}
