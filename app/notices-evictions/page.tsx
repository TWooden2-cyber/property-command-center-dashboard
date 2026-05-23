import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { NoticesEvictionsView } from "@/components/views/NoticesEvictionsView";

export default async function NoticesEvictionsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell
      title="Notices / Evictions Command"
      subtitle="Notice tracking, legal hold status, draft review, ledger verification, service proof, and owner approval controls."
    >
      <NoticesEvictionsView />
    </LuxuryShell>
  );
}
