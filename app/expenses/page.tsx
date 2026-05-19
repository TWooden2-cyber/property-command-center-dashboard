import { requireOwnerSession } from "@/lib/auth";
import { EmptyState } from "@/components/DataState";
import { LuxuryShell } from "@/components/LuxuryShell";

export default async function ExpensesPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Expenses / NOI" subtitle="Read-only operating expense and NOI review">
      <EmptyState
        title="Expenses / NOI view ready."
        message="This protected page is reserved for expense and NOI reporting from the Master Tracker."
      />
    </LuxuryShell>
  );
}
