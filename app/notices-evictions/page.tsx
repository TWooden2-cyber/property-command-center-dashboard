import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { NoticesEvictionsView } from "@/components/views/NoticesEvictionsView";

export default async function NoticesEvictionsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Notices & Evictions" subtitle="Read-only notice tracking and owner review">
      <NoticesEvictionsView />
    </LuxuryShell>
  );
}
