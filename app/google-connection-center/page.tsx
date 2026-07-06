import { LuxuryShell } from "@/components/LuxuryShell";
import { GoogleConnectionCenterView } from "@/components/views/GoogleConnectionCenterView";

export default function GoogleConnectionCenterPage() {
  return (
    <LuxuryShell
      title="Google Connection Center"
      subtitle="Permanent health, recovery, and read-only scope verification for Gmail, Drive, Calendar, Tasks, and Sheets."
    >
      <GoogleConnectionCenterView />
    </LuxuryShell>
  );
}
