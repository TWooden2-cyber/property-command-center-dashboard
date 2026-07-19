import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { DriveReadonlyView } from "@/components/views/DriveReadonlyView";

export default async function DriveUpdateCenterPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Google Drive System" subtitle="Read-only folder health, proof routing visibility, and owner-approved Drive update planning.">
      <DriveReadonlyView />
    </LuxuryShell>
  );
}
