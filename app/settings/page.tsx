import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { SettingsView } from "@/components/views/SettingsView";

export default async function SettingsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Settings / System Status" subtitle="Connection, tabs, auth, and safe environment checks">
      <SettingsView />
    </LuxuryShell>
  );
}
