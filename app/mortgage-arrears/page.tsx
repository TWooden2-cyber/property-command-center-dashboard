import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { MortgageArrearsView } from "@/components/views/MortgageArrearsView";

export default async function MortgageArrearsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Mortgage & Arrears" subtitle="Allotment setup, arrears risk, and payoff tracking">
      <MortgageArrearsView />
    </LuxuryShell>
  );
}
