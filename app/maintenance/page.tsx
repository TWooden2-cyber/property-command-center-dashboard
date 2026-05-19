import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { MaintenanceView } from "@/components/views/MaintenanceView";

export default async function MaintenancePage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Maintenance" subtitle="Open work, vendor status, costs, and request links">
      <MaintenanceView />
    </LuxuryShell>
  );
}
