import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { RentCollectionView } from "@/components/views/RentCollectionView";

export default async function RentCollectionPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Rent Collection" subtitle="Payment status and owner follow-up priorities">
      <RentCollectionView />
    </LuxuryShell>
  );
}
