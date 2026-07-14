import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { TaskAutomationView } from "@/components/views/TaskAutomationView";

export default async function TaskAutomationPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell
      title="Task Automation"
      subtitle="Owner-controlled prompt center for Gmail organization, Calendar monitoring, Google Drive organization, and monitoring resource updates."
    >
      <TaskAutomationView />
    </LuxuryShell>
  );
}
