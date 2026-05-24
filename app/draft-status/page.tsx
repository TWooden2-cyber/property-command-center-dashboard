import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function DraftStatusPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Draft Status / Document Drafts Command" subtitle="Draft notices, tenant messages, owner letters, vendor messages, reports, and document-review status">
      <CommandPageView config={commandPages["draft-status"]} />
    </LuxuryShell>
  );
}
