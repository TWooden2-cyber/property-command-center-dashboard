import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";

export default async function ExpensesPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Expenses / NOI" subtitle="Read-only operating expense and NOI review">
      <div className="command-page">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live data not connected</p>
              <h2>Expenses / NOI live parser is not enabled</h2>
            </div>
            <span className="status-pill red">No sample financial data shown</span>
          </div>
          <p>
            This production page will not display sample, local, or hardcoded NOI values. Wire this page to a verified live Google Sheets
            expense/NOI tab before showing operating income, expenses, or cashflow totals.
          </p>
        </section>
      </div>
    </LuxuryShell>
  );
}
