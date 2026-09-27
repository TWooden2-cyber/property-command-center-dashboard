import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { formatCurrency, toNumber } from "@/lib/formatters";
import { getWorkbookSnapshot } from "@/lib/googleSheets";
import { parseWorkbook } from "@/lib/sheetParsers";

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

function sumFinite(values: number[]) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((total, value) => total + value, 0) : 0;
}

function moneyCell(value: number) {
  return Number.isFinite(value) ? formatCurrency(value) : "No value in PMOS";
}

export default async function ExpensesPage() {
  await requireOwnerSession();
  const snapshot = await getWorkbookSnapshot();
  const parsed = parseWorkbook(snapshot);
  const summaryRows = snapshot.tabs["Expense Import Summary"]?.rows ?? [];
  const totalExpenses = summaryRows
    .map((row) => toNumber(row["Total Imported Expenses"]))
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
  const liveConnected = Boolean(snapshot.system.lastSuccessfulRefresh);
  const rentRows = parsed.rentCollection;
  const utilityRows = parsed.utilities;
  const maintenanceRows = parsed.maintenance;
  const mortgageRows = parsed.mortgageArrears;
  const grossPotentialRent = sumFinite(rentRows.map((row) => row.rentDue));
  const rentCollected = sumFinite(rentRows.map((row) => row.amountPaid));
  const outstandingRent = sumFinite(rentRows.map((row) => row.balance));
  const concessions = 0;
  const otherIncome = sumFinite(rentRows.map((row) => row.lateFee));
  const effectiveGrossIncome = rentCollected + otherIncome;
  const utilities = sumFinite(utilityRows.map((row) => row.totalCost));
  const repairs = sumFinite(maintenanceRows.map((row) => Number.isFinite(row.actualCost) ? row.actualCost : row.estimatedCost));
  const mortgageDue = sumFinite(mortgageRows.map((row) => row.mortgageDueMonthly));
  const importedExpenseFallback = Number.isFinite(totalExpenses) ? totalExpenses : 0;
  const operatingExpenses = summaryRows.length ? importedExpenseFallback : utilities + repairs;
  const operatingNoi = effectiveGrossIncome - operatingExpenses;
  const cashAfterMortgage = operatingNoi - mortgageDue;
  const units = new Set(rentRows.map((row) => `${row.property}|${row.unit}`).filter((value) => value !== "|"));
  const occupiedUnits = Array.from(units).length;
  const unitsWithOpenBalance = rentRows.filter((row) => row.balance > 0).length;
  const financeRows = [
    {
      month: "Current PMOS refresh",
      property: "Portfolio",
      managementFees: 0,
      repairs,
      utilities,
      totalImportedExpenses: operatingExpenses
    }
  ];
  const incomeValues = {
    Property: "Portfolio",
    Month: "Current PMOS refresh",
    Units: `${occupiedUnits} tracked / ${unitsWithOpenBalance} with open balances`,
    "Occupancy Rate": occupiedUnits ? "Tracked from rent roll" : "No rent roll rows",
    "Gross Potential Rent": moneyCell(grossPotentialRent),
    "Vacancy Loss": moneyCell(outstandingRent),
    Concessions: moneyCell(concessions),
    "Other Income": moneyCell(otherIncome),
    "Effective Gross Income (EGI)": moneyCell(effectiveGrossIncome)
  } satisfies Record<string, string>;
  const expenseValues = {
    Utilities: moneyCell(utilities),
    Maintenance: moneyCell(repairs),
    Management: summaryRows.length ? "Mapped from Expense Import Summary" : moneyCell(0),
    Administrative: "Tracked in Admin Tasks / not a dollar row yet",
    Insurance: "No value in PMOS",
    Taxes: "No value in PMOS",
    Professional: "No value in PMOS",
    "HOA / Association Fees": "No value in PMOS",
    "Licenses & Permits": "No value in PMOS"
  } satisfies Record<string, string>;

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
                    <strong>{incomeValues[section as keyof typeof incomeValues]}</strong>
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
                    <strong>{expenseValues[group.title as keyof typeof expenseValues]}</strong>
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
            <span className={liveConnected ? "status-pill green" : "status-pill red"}>{summaryRows.length ? "Expense import rows" : "PMOS rollup fallback"}</span>
          </div>
          <div className="kpi-grid">
            <article className="kpi-card status-strip Normal">
              <span>Effective Gross Income</span>
              <strong>{formatCurrency(effectiveGrossIncome)}</strong>
              <small>Rent collected plus other income in PMOS</small>
            </article>
            <article className="kpi-card status-strip Watch">
              <span>Operating Expenses</span>
              <strong>{formatCurrency(operatingExpenses)}</strong>
              <small>{summaryRows.length ? "Expense Import Summary" : "Utilities plus maintenance rollup"}</small>
            </article>
            <article className="kpi-card status-strip Stable">
              <span>Operating NOI</span>
              <strong>{formatCurrency(operatingNoi)}</strong>
              <small>Before mortgage debt service</small>
            </article>
            <article className="kpi-card status-strip Watch">
              <span>Cash After Mortgage</span>
              <strong>{formatCurrency(cashAfterMortgage)}</strong>
              <small>NOI less mapped mortgage due</small>
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
                  <th>Total Operating Expenses</th>
                </tr>
              </thead>
              <tbody>
                {(summaryRows.length
                  ? summaryRows.slice(0, 12).map((row) => ({
                      month: row.Month || "Current PMOS refresh",
                      property: row.Property || "Portfolio",
                      managementFees: toNumber(row["Management Fees"]),
                      repairs: toNumber(row.Repairs),
                      utilities: toNumber(row.Utilities),
                      totalImportedExpenses: toNumber(row["Total Imported Expenses"])
                    }))
                  : financeRows
                ).map((row, index) => (
                  <tr key={`${row.month}-${row.property}-${index}`}>
                    <td>{row.month}</td>
                    <td>{row.property}</td>
                    <td>{moneyCell(row.managementFees)}</td>
                    <td>{moneyCell(row.repairs)}</td>
                    <td>{moneyCell(row.utilities)}</td>
                    <td>{moneyCell(row.totalImportedExpenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </LuxuryShell>
  );
}
