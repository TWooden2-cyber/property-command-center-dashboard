import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { AdminTasksView } from "@/components/views/AdminTasksView";

export default async function AdminTasksPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell
      title="Admin Tasks"
      subtitle="Owner prompts, proof review, approvals, and task preparation"
    >
      <AdminTasksView />
    </LuxuryShell>
  );
}
