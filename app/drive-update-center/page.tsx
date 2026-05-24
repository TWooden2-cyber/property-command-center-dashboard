import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { commandPages } from "@/lib/remainingCommandCenterData";

export default async function DriveUpdateCenterPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Google Drive Update Center" subtitle="Preview-only Drive update packages, proof folders, weekly archives, dashboard exports, and owner approval gates">
      <CommandPageView config={commandPages["drive-update-center"]} />
    </LuxuryShell>
  );
}
