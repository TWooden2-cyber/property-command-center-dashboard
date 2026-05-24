import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function LeaseViolationsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Lease Violations Command" subtitle="Lease issue tracking, proof status, owner approval, communication review, and blocked legal-sensitive actions">
      <CommandPageView config={commandPages["lease-violations"]} />
    </LuxuryShell>
  );
}
