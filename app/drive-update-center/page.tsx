import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CommandPageView } from "@/components/views/CommandPageView";
import { createLiveUnavailableCommandConfig } from "@/lib/liveUnavailableCommandConfig";

const pageConfig = createLiveUnavailableCommandConfig(
  "drive-update-center",
  "Google Drive Update Center",
  "Preview-only Drive update packages, proof folders, weekly archives, dashboard exports, and owner approval gates"
);

export default async function DriveUpdateCenterPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Google Drive Update Center" subtitle="Preview-only Drive update packages, proof folders, weekly archives, dashboard exports, and owner approval gates">
      <CommandPageView config={pageConfig} />
    </LuxuryShell>
  );
}
