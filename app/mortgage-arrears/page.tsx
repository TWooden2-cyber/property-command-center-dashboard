import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { MortgageArrearsView } from "@/components/views/MortgageArrearsView";

export default async function MortgageArrearsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell
      title="Mortgage / Allotment Command"
      subtitle="Mortgage payment tracking, arrears status, payoff plan, allotment setup, proof confirmation, and owner financial risk controls."
    >
      <MortgageArrearsView />
    </LuxuryShell>
  );
}
