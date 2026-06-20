import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { UtilitiesView } from "@/components/views/UtilitiesView";

export default async function UtilitiesPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Utilities Command" subtitle="Utility usage, account setup, payment proof, paperless/autopay status, and due-date controls">
      <UtilitiesView />
    </LuxuryShell>
  );
}
