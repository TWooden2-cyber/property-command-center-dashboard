import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { createLiveUnavailableCommandConfig } from "@/lib/liveUnavailableCommandConfig";

const pageConfig = createLiveUnavailableCommandConfig(
  "draft-status",
  "Draft Status / Document Drafts Command",
  "Draft notices, tenant messages, owner letters, vendor messages, reports, and document-review status"
);

export default async function DraftStatusPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Draft Status / Document Drafts Command" subtitle="Draft notices, tenant messages, owner letters, vendor messages, reports, and document-review status">
      <CommandPageView config={pageConfig} />
    </LuxuryShell>
  );
}
