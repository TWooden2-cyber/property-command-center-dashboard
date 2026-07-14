import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { formatCurrency, toNumber } from "@/lib/formatters";
import { getWorkbookSnapshot } from "@/lib/googleSheets";

const incomeTrackingRows = [
  ["Property", "Property name/address"],
  ["Month", "Reporting month"],
  ["Units", "Occupied / Vacant"],
  ["Occupancy Rate", "% occupied"],
  ["Gross Potential Rent", "Rent if every unit is occupied"],
  ["Vacancy Loss", "Lost rent from vacancies"],
  ["Concessions", "Discounts/free rent"],
  ["Other Income", "Late fees, laundry, pet fees, parking, storage, application fees"],
  ["Effective Gross Income (EGI)", "Gross rent minus vacancy plus other income"]
];

const operatingExpenseGroups = [
  {
    title: "Utilities",
    items: ["Electric", "Gas", "Water", "Sewer", "Trash"]
  },
  {
    title: "Maintenance",
    items: ["Repairs", "Maintenance supplies", "HVAC", "Plumbing", "Electrical", "Landscaping", "Snow removal", "Pest control"]
  },
  {
    title: "Management",
    items: ["Property management fees", "Leasing commissions", "Tenant screening"]
  },
  {
    title: "Administrative",
    items: ["Office supplies", "Software subscriptions", "Phone", "Postage"]
  },
  {
    title: "Insurance",
    items: ["Property insurance"]
  },
  {
    title: "Taxes",
    items: ["Property taxes"]
  },
  {
    title: "Professional",
    items: ["CPA", "Attorney", "Bookkeeping"]
  },
  {
    title: "HOA / Association Fees",
    items: ["HOA dues", "Association fees", "Special assessments"]
  },
  {
    title: "Licenses & Permits",
    items: ["Rental licenses", "Occupancy permits", "Inspection permits"]
  }
];

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
        <section className="section-block noi-command-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NOI tracker structure</p>
              <h2>Income and operating expense sections</h2>
            </div>
            <span className="status-pill yellow">Structure ready for live tracker mapping</span>
          </div>
          <div className="noi-layout-grid">
            <article className="noi-tracker-card">
              <div className="noi-card-heading">
                <span>Income</span>
                <strong>Effective Gross Income inputs</strong>
              </div>
              <div className="noi-field-list">
                {incomeTrackingRows.map(([section, description]) => (
                  <div key={section} className="noi-field-row">
                    <span>{section}</span>
                    <p>{description}</p>
                  </div>
                ))}
              </div>
              <div className="noi-formula-strip">
                <span>EGI Formula</span>
                <strong>Gross Potential Rent - Vacancy Loss - Concessions + Other Income</strong>
              </div>
            </article>

            <article className="noi-tracker-card">
              <div className="noi-card-heading">
                <span>Operating Expenses</span>
                <strong>Expense category breakdown</strong>
              </div>
              <div className="noi-expense-grid">
                {operatingExpenseGroups.map((group) => (
                  <section key={group.title} className="noi-expense-group">
                    <h3>{group.title}</h3>
                    <ul>
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="section-block">
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
