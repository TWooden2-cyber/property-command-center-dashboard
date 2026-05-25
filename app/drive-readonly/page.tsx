import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { DriveReadonlyView } from "@/components/views/DriveReadonlyView";

export default async function DriveReadonlyPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Google Drive Read-Only Command" subtitle="Read-only proof-folder listing, folder health review, and safe Drive integration status.">
      <DriveReadonlyView />
    </LuxuryShell>
  );
}
