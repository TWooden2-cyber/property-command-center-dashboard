import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function GmailFollowUpsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Gmail Follow-Up Center" subtitle="Email follow-up tracking, draft-needed items, readback approval gates, and communication safety controls">
      <CommandPageView config={commandPages["gmail-follow-ups"]} />
    </LuxuryShell>
  );
}
