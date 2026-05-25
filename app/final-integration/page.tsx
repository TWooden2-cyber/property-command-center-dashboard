import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { FinalIntegrationView } from "@/components/views/FinalIntegrationView";

export default async function FinalIntegrationPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell
      title="Final Integration Readiness Command"
      subtitle="Drive correction preview, verified data entry prep, source import mapping, Sheets read-only planning, migration preview, SOPs, and final launch checklist."
    >
      <FinalIntegrationView />
    </LuxuryShell>
  );
}
