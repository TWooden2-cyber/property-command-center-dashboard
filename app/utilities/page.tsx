import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { UtilitiesView } from "@/components/views/UtilitiesView";

export default async function UtilitiesPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Utilities" subtitle="Usage, monthly cost trends, spikes, and property utility performance">
      <UtilitiesView />
    </LuxuryShell>
  );
}
