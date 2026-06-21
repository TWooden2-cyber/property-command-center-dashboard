import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { formatCurrency, toNumber } from "@/lib/formatters";
import { getWorkbookSnapshot } from "@/lib/googleSheets";

export default async function ExpensesPage() {
  await requireOwnerSession();
  const snapshot = await getWorkbookSnapshot();
  const summaryRows = snapshot.tabs["Expense Import Summary"]?.rows ?? [];
  const totalExpenses = summaryRows
    .map((row) => toNumber(row["Total Imported Expenses"]))
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
  const liveConnected = Boolean(snapshot.system.lastSuccessfulRefresh);

  return (
    <LuxuryShell title="Expenses / NOI" subtitle="Read-only operating expense and NOI review">
      <div className="command-page">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{liveConnected ? "Live Google Sheets" : "Live data unavailable"}</p>
              <h2>{summaryRows.length ? "Expenses / NOI live expense summary" : "Expenses / NOI live rows not found"}</h2>
            </div>
            <span className={summaryRows.length ? "status-pill green" : "status-pill red"}>{summaryRows.length ? "Live parser enabled" : "No sample financial data shown"}</span>
          </div>
          {summaryRows.length ? (
            <>
              <div className="kpi-grid">
                <article className="kpi-card status-strip Normal">
                  <span>Expense summary rows</span>
                  <strong>{String(summaryRows.length)}</strong>
                  <small>From Expense Import Summary</small>
                </article>
                <article className="kpi-card status-strip Watch">
                  <span>Total imported expenses</span>
                  <strong>{formatCurrency(totalExpenses)}</strong>
                  <small>Sum of live Total Imported Expenses values</small>
                </article>
                <article className="kpi-card status-strip Stable">
                  <span>Summary rows available</span>
                  <strong>{String(summaryRows.length)}</strong>
                  <small>Read-only Google Sheets parser</small>
                </article>
              </div>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Property</th>
                      <th>Management Fees</th>
                      <th>Repairs</th>
                      <th>Utilities</th>
                      <th>Total Imported Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.slice(0, 12).map((row, index) => (
                      <tr key={`${row.Month}-${row.Property}-${index}`}>
                        <td>{row.Month || "Not mapped"}</td>
                        <td>{row.Property || "Not mapped"}</td>
                        <td>{row["Management Fees"] || "Live value unavailable"}</td>
                        <td>{row.Repairs || "Live value unavailable"}</td>
                        <td>{row.Utilities || "Live value unavailable"}</td>
                        <td>{row["Total Imported Expenses"] || "Live value unavailable"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>
              This production page will not display sample, local, or hardcoded NOI values. The live Expense Import Summary tab is missing
              rows or the live Google Sheets read failed.
            </p>
          )}
        </section>
      </div>
    </LuxuryShell>
  );
}
