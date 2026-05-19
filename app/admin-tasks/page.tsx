import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { AdminTasksView } from "@/components/views/AdminTasksView";

export default async function AdminTasksPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Admin Tasks" subtitle="Critical operations work and owner review queue">
      <AdminTasksView />
    </LuxuryShell>
  );
}
