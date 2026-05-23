import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { AdminTasksView } from "@/components/views/AdminTasksView";

export default async function AdminTasksPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell
      title="Admin Tasks Command"
      subtitle="Owner approvals, proof collection, Drive update needs, weekly reviews, blocked items, and task-sync preparation"
    >
      <AdminTasksView />
    </LuxuryShell>
  );
}
