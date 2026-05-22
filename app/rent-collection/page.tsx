import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { RentCollectionView } from "@/components/views/RentCollectionView";

export default async function RentCollectionPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Rent Collection Command" subtitle="Monthly rent ledger, payment status, balances, reminders, and verification issues.">
      <RentCollectionView />
    </LuxuryShell>
  );
}
