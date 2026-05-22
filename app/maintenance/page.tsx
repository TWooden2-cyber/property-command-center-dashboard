import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { MaintenanceView } from "@/components/views/MaintenanceView";

export default async function MaintenancePage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Maintenance Command" subtitle="Open work orders, health/safety issues, vendor status, proof tracking, tenant updates, and completion verification.">
      <MaintenanceView />
    </LuxuryShell>
  );
}
