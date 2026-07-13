"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { SheetsSourcePanel, sheetSourceLabel } from "@/components/SheetsSourcePanel";
import { StatusBadge } from "@/components/StatusBadge";
import { localDevelopmentFallbackAllowed, rentRecordToCommandRow } from "@/components/views/liveSheetAdapters";
import { useSheetsView } from "@/components/views/useSheetsView";
import { formatCurrency } from "@/lib/formatters";
import {
  monthOptions,
  monthlyRentTrend,
  percent,
  rentRows,
  yearOptions,
  type RentCollectionRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";
import type { RentRecord } from "@/types/sheets";

type RentPayload = {
  rows: RentRecord[];
};

function totalsForRows(rows: RentCollectionRow[]) {
  const sum = (selector: (row: RentCollectionRow) => number) => {
    const values = rows.map(selector).filter(Number.isFinite);
    return values.length ? values.reduce((total, value) => total + value, 0) : Number.NaN;
  };

  return {
    projected: sum((row) => row.rentDue),
    collected: sum((row) => row.paid),
    balance: sum((row) => row.balance),
    lateFees: sum((row) => row.lateFee)
  };
}

function liveMoney(value: number) {
  return formatCurrency(value);
}

function livePercent(value: number) {
  return Number.isFinite(value) ? percent(value) : "Live value unavailable";
}

type RentFilter = {
  month: string;
  year: number;
  property: string;
  unit: string;
  status: string;
  paymentState: string;
  reminder: string;
  balanceOnly: boolean;
  section8Only: boolean;
  ledgerConflictOnly: boolean;
  search: string;
};

const defaultFilters: RentFilter = {
  month: new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date()),
  year: new Date().getFullYear(),
  property: "All",
  unit: "All",
  status: "All",
  paymentState: "All",
  reminder: "All",
  balanceOnly: false,
  section8Only: false,
  ledgerConflictOnly: false,
  search: ""
};

const actionQueue = [
  {
    title: "Unit 1 Greg Mckinney",
    detail: "Confirm May 20 / May 30 payment arrangement payments.",
    tone: "yellow" as SignalTone
  },
  {
    title: "Unit 2 Marc Gosselin",
    detail: "Verify RentRedi ledger discrepancy before any escalation.",
    tone: "yellow" as SignalTone
  },
  {
    title: "Unit 4 Kevin Royster",
    detail: "Verify balance and Section 8 status before notice action.",
    tone: "red" as SignalTone
  },
  {
    title: "Unit A Lacourtney Martin",
    detail: "Verify HAP / Section 8 payment.",
    tone: "yellow" as SignalTone
  },
  {
    title: "Unit 7 Alexandrea McCurdy",
    detail: "Verify UPMC May rent issue.",
    tone: "yellow" as SignalTone
  },
  {
    title: "4-unit property manager report",
    detail: "Verify PM data if needed.",
    tone: "green" as SignalTone
  }
];

const blockedWarnings = [
  "Do not escalate Unit 2 until ledger conflict is verified.",
  "Do not escalate Unit A until HAP payment status is verified.",
  "Do not serve/escalate Unit 4 until Section 8 and ledger are verified.",
  "Do not close Unit 7 issue until UPMC May rent status is verified."
];

function classifyPaymentState(row: RentCollectionRow) {
  const status = row.status.toLowerCase();

  if (status.includes("verification") || status.includes("discrepancy") || status.includes("conflict") || status.includes("upmc")) {
    return "Verification Needed";
  }
  if (row.balance <= 0) {
    return "Paid";
  }
  if (row.paid > 0) {
    return "Partial";
  }
  return "Unpaid";
}

function verificationFlag(row: RentCollectionRow) {
  const search = `${row.status} ${row.method}`.toLowerCase();

  if (search.includes("section 8") || search.includes("hap")) {
    return "Section 8 / HAP";
  }
  if (search.includes("discrepancy") || search.includes("conflict")) {
    return "Ledger conflict";
  }
  if (search.includes("upmc")) {
    return "UPMC unresolved";
  }
  if (search.includes("verify") || search.includes("arrangement")) {
    return "Verify ledger";
  }
  return "Clear";
}

function ownerAction(row: RentCollectionRow) {
  const flag = verificationFlag(row);

  if (row.tenant === "Greg Mckinney") {
    return "Confirm May 20 / May 30 arrangement payments before escalation.";
  }
  if (flag === "Ledger conflict") {
    return "Verify RentRedi ledger discrepancy.";
  }
  if (row.tenant === "Kevin Royster") {
    return "Verify balance and Section 8 status before notice action.";
  }
  if (flag === "Section 8 / HAP") {
    return "Verify HAP / Section 8 payment proof.";
  }
  if (flag === "UPMC unresolved") {
    return "Verify UPMC May rent issue.";
  }
  if (row.balance > 0) {
    return "Follow up remaining balance after ledger review.";
  }
  return "No owner action needed.";
}

function parseRowMonthYear(row: RentCollectionRow) {
  const normalizedMonth = row.month.trim();
  const matchedMonth = monthOptions.find((month) => normalizedMonth.toLowerCase().startsWith(month.toLowerCase()));
  const matchedYear = normalizedMonth.match(/\b(20\d{2}|19\d{2})\b/)?.[1];

  if (matchedMonth && matchedYear) {
    return {
      month: matchedMonth,
      year: Number(matchedYear)
    };
  }

  return {
    month: normalizedMonth,
    year: Number.NaN
  };
}

function collectionTone(row: RentCollectionRow) {
  if (row.rentDue <= 0 && row.balance <= 0) {
    return "paid";
  }

  const paidRatio = row.rentDue > 0 ? row.paid / row.rentDue : 0;

  if (row.balance <= 0 || paidRatio >= 1) {
    return "paid";
  }

  if (paidRatio > 0.5) {
    return "over-half";
  }

  return "under-half";
}

function statusTone(row: RentCollectionRow): SignalTone {
  const state = classifyPaymentState(row);

  if (state === "Paid") {
    return "green";
  }
  if (state === "Verification Needed" || state === "Partial") {
    return "yellow";
  }
  return "red";
}

function RentKpiCards({ rows }: { rows: RentCollectionRow[] }) {
  const totals = totalsForRows(rows);
  const collectionRate = Number.isFinite(totals.projected) && totals.projected > 0 && Number.isFinite(totals.collected) ? totals.collected / totals.projected : Number.NaN;
  const paidUnits = rows.filter((row) => row.balance <= 0).length;
  const unitsWithBalance = rows.filter((row) => row.balance > 0).length;
  const verificationIssues = rows.filter((row) => verificationFlag(row) !== "Clear").length;
  const kpis = [
    { label: "Total Projected Rent", value: liveMoney(totals.projected), helper: "Current sheet rows", tone: Number.isFinite(totals.projected) ? "green" as SignalTone : "yellow" as SignalTone },
    { label: "Total Rent Collected", value: liveMoney(totals.collected), helper: `${livePercent(collectionRate)} collection rate`, tone: collectionRate >= 1 ? "green" as SignalTone : "yellow" as SignalTone },
    { label: "Total Balance", value: liveMoney(totals.balance), helper: "Balances and verification issues remain", tone: totals.balance > 0 ? "red" as SignalTone : "green" as SignalTone },
    { label: "Total Late Fees", value: liveMoney(totals.lateFees), helper: "Late fee total in ledger", tone: totals.lateFees > 0 ? "yellow" as SignalTone : "green" as SignalTone },
    { label: "Collection Rate", value: livePercent(collectionRate), helper: "Collected / projected", tone: collectionRate >= 1 ? "green" as SignalTone : collectionRate > 0.5 ? "yellow" as SignalTone : "red" as SignalTone },
    { label: "Units Paid", value: String(paidUnits), helper: "Rows with zero balance", tone: "green" as SignalTone },
    { label: "Units With Balance", value: String(unitsWithBalance), helper: "Needs follow-up or verification", tone: unitsWithBalance > 0 ? "red" as SignalTone : "green" as SignalTone },
    { label: "Verification Issues", value: String(verificationIssues), helper: "Ledger, HAP, UPMC, or arrangement checks", tone: verificationIssues > 0 ? "yellow" as SignalTone : "green" as SignalTone }
  ];

  return (
    <section className="rent-kpi-grid">
      {kpis.map((kpi) => (
        <article key={kpi.label} className={`rent-kpi-card queue-${kpi.tone}`}>
          <span>{kpi.label}</span>
          <strong>{kpi.value}</strong>
          <p>{kpi.helper}</p>
        </article>
      ))}
    </section>
  );
}

function RentCommandHeader({
  filters,
  onFiltersChange,
  sourceLabel
}: {
  filters: RentFilter;
  onFiltersChange: (next: RentFilter) => void;
  sourceLabel: string;
}) {
  return (
    <section className="rent-command-header">
      <div>
        <p className="eyebrow">{sourceLabel}</p>
        <h2>Rent Collection Command</h2>
        <p>Monthly rent ledger, payment status, balances, reminders, and verification issues.</p>
        <div className="hero-source-strip">
          <span>{sourceLabel}</span>
          <span>Read-only display</span>
          <span>Google Sheets is the preferred live source</span>
        </div>
      </div>
      <div className="rent-period-filter">
        <label>
          <span>Month</span>
          <select value={filters.month} onChange={(event) => onFiltersChange({ ...filters, month: event.target.value })}>
            {monthOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Year</span>
          <select value={filters.year} onChange={(event) => onFiltersChange({ ...filters, year: Number(event.target.value) })}>
            {yearOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function RentHealthEvaluation() {
  return (
    <section className="section-block rent-health-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Command Evaluation</p>
          <h2>Rent health: Watch</h2>
        </div>
        <StatusBadge label="Verification Required" />
      </div>
      <p>
        May 2026 rent collection is above 50%, but not fully green because balances and verification items remain across payment
        arrangements, ledger conflicts, Section 8/HAP, and UPMC payment status.
      </p>
      <div className="rent-cause-grid">
        {[
          "Unit 1 Greg Mckinney payment arrangement / verify ledger",
          "Unit 2 Marc Gosselin ledger discrepancy",
          "Unit 4 Kevin Royster late / Section 8 review",
          "4-Unit Unit A Lacourtney Martin HAP verification",
          "Unit 7 UPMC unresolved issue"
        ].map((item) => (
          <article key={item}>
            <AlertTriangle size={16} aria-hidden />
            <span>{item}</span>
          </article>
        ))}
      </div>
      <div className="rent-owner-actions">
        <span>Owner next actions</span>
        <ul>
          {actionQueue.map((item) => <li key={item.title}>{item.title}: {item.detail}</li>)}
        </ul>
      </div>
    </section>
  );
}

function PaidProjectedChart({ title, projected, collected }: { title: string; projected: number; collected: number }) {
  const max = Math.max(...[projected, collected].filter(Number.isFinite), 1);
  const bars = [
    { label: "Projected", value: projected, tone: "projected" },
    { label: "Collected", value: collected, tone: "collected" }
  ];

  return (
    <section className="chart-card rent-chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chart</p>
          <h2>{title}</h2>
        </div>
        <BarChart3 size={18} aria-hidden />
      </div>
      <div className="rent-chart-bars">
        {bars.map((bar) => (
          <div key={bar.label} className="rent-chart-row">
            <span>{bar.label}</span>
            <div className="bar-track">
              <div className={`bar-fill rent-${bar.tone}`} style={{ "--bar-width": `${Number.isFinite(bar.value) ? Math.max((bar.value / max) * 100, 4) : 4}%` } as CSSProperties} />
            </div>
            <strong>{liveMoney(bar.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function BalanceByUnitChart({ rows: sourceRows }: { rows: RentCollectionRow[] }) {
  const rows = sourceRows;
  const max = Math.max(...rows.map((row) => row.balance), 1);

  return (
    <section className="chart-card rent-chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chart</p>
          <h2>Balance by Unit</h2>
        </div>
        <AlertTriangle size={18} aria-hidden />
      </div>
      <div className="rent-chart-bars">
        {rows.map((row) => (
          <div key={row.id} className="rent-chart-row">
            <span>{row.property} {row.unit}</span>
            <div className="bar-track">
              <div
                className={`bar-fill rent-balance rent-balance-${collectionTone(row)}`}
                style={{ "--bar-width": `${row.balance > 0 ? Math.max((row.balance / max) * 100, 4) : 4}%` } as CSSProperties}
              />
            </div>
            <strong>{liveMoney(row.balance)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionRateGauge({ rows }: { rows: RentCollectionRow[] }) {
  const totals = totalsForRows(rows);
  const rate = totals.projected ? totals.collected / totals.projected : 0;

  return (
    <section className="chart-card rent-chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gauge</p>
          <h2>Collection Rate</h2>
        </div>
        <CheckCircle2 size={18} aria-hidden />
      </div>
      <div className="rent-rate-gauge">
        <strong>{livePercent(rate)}</strong>
        <div className="bar-track">
          <div className="bar-fill" style={{ "--bar-width": `${Number.isFinite(rate) ? Math.min(rate * 100, 100) : 4}%` } as CSSProperties} />
        </div>
        <p>Above 50%, but verification issues keep the ledger in Watch status.</p>
      </div>
    </section>
  );
}

function RentCharts({ rows }: { rows: RentCollectionRow[] }) {
  const totals = totalsForRows(rows);
  const projectedYtd = localDevelopmentFallbackAllowed ? monthlyRentTrend.reduce((total, row) => total + row.projected, 0) : 0;
  const collectedYtd = localDevelopmentFallbackAllowed ? monthlyRentTrend.reduce((total, row) => total + row.collected, 0) : 0;

  return (
    <section className="rent-chart-grid">
      <PaidProjectedChart title="Current Rows Paid vs Projected" projected={totals.projected} collected={totals.collected} />
      {localDevelopmentFallbackAllowed ? <PaidProjectedChart title="Year-to-Date Paid vs Projected" projected={projectedYtd} collected={collectedYtd} /> : null}
      <BalanceByUnitChart rows={rows} />
      <CollectionRateGauge rows={rows} />
    </section>
  );
}

function RentFilters({
  filters,
  onFiltersChange,
  rows
}: {
  filters: RentFilter;
  onFiltersChange: (next: RentFilter) => void;
  rows: RentCollectionRow[];
}) {
  const propertyOptions = ["All", ...Array.from(new Set(rows.map((row) => row.property)))];
  const unitOptions = ["All", ...Array.from(new Set(rows.map((row) => row.unit)))];
  const statusOptions = ["All", ...Array.from(new Set(rows.map((row) => row.status)))];

  return (
    <section className="section-block rent-filter-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Filters</p>
          <h2>Find ledger issues fast</h2>
        </div>
        <Search size={18} aria-hidden />
      </div>
      <div className="rent-filter-grid">
        <label>
          <span>Property</span>
          <select value={filters.property} onChange={(event) => onFiltersChange({ ...filters, property: event.target.value })}>
            {propertyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Unit</span>
          <select value={filters.unit} onChange={(event) => onFiltersChange({ ...filters, unit: event.target.value })}>
            {unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={filters.status} onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}>
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Payment State</span>
          <select value={filters.paymentState} onChange={(event) => onFiltersChange({ ...filters, paymentState: event.target.value })}>
            {["All", "Paid", "Unpaid", "Partial", "Verification Needed"].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Reminder Sent</span>
          <select value={filters.reminder} onChange={(event) => onFiltersChange({ ...filters, reminder: event.target.value })}>
            {["All", "Yes", "No"].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="search-control">
          <span>Tenant Search</span>
          <input value={filters.search} onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })} placeholder="Search tenant name" />
        </label>
      </div>
      <div className="rent-toggle-row">
        <label><input type="checkbox" checked={filters.balanceOnly} onChange={(event) => onFiltersChange({ ...filters, balanceOnly: event.target.checked })} /> Balance greater than zero</label>
        <label><input type="checkbox" checked={filters.section8Only} onChange={(event) => onFiltersChange({ ...filters, section8Only: event.target.checked })} /> Section 8 / HAP verification needed</label>
        <label><input type="checkbox" checked={filters.ledgerConflictOnly} onChange={(event) => onFiltersChange({ ...filters, ledgerConflictOnly: event.target.checked })} /> Ledger conflict</label>
      </div>
    </section>
  );
}

function matchesFilters(row: RentCollectionRow, filters: RentFilter) {
  const rowPeriod = parseRowMonthYear(row);

  if (rowPeriod.month !== filters.month || rowPeriod.year !== filters.year) {
    return false;
  }

  if (filters.property !== "All" && row.property !== filters.property) {
    return false;
  }
  if (filters.unit !== "All" && row.unit !== filters.unit) {
    return false;
  }
  if (filters.status !== "All" && row.status !== filters.status) {
    return false;
  }
  if (filters.paymentState !== "All" && classifyPaymentState(row) !== filters.paymentState) {
    return false;
  }
  if (filters.reminder !== "All" && row.reminder !== filters.reminder) {
    return false;
  }
  if (filters.balanceOnly && row.balance <= 0) {
    return false;
  }
  if (filters.section8Only && verificationFlag(row) !== "Section 8 / HAP") {
    return false;
  }
  if (filters.ledgerConflictOnly && verificationFlag(row) !== "Ledger conflict") {
    return false;
  }
  if (filters.search && !row.tenant.toLowerCase().includes(filters.search.toLowerCase())) {
    return false;
  }
  return true;
}

const columns: DataTableColumn<RentCollectionRow>[] = [
  { key: "month", header: "Month", render: (row) => row.month },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "tenant", header: "Tenant Name", render: (row) => row.tenant },
  { key: "rentDue", header: "Rent Due", render: (row) => liveMoney(row.rentDue), className: "numeric" },
  { key: "paid", header: "Amount Paid", render: (row) => liveMoney(row.paid), className: "numeric" },
  { key: "balance", header: "Balance", render: (row) => liveMoney(row.balance), className: "numeric" },
  { key: "dueDate", header: "Due Date", render: (row) => row.dueDate || "May 1" },
  { key: "datePaid", header: "Date Paid", render: (row) => row.datePaid || "Not paid" },
  { key: "method", header: "Payment Method", render: (row) => row.method || "Not set" },
  { key: "lateFee", header: "Late Fee", render: (row) => liveMoney(row.lateFee), className: "numeric" },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "reminder", header: "Reminder Sent", render: (row) => <StatusBadge label={row.reminder} /> },
  { key: "flag", header: "Verification Flag", render: (row) => <StatusBadge label={verificationFlag(row)} /> },
  { key: "action", header: "Owner Action", render: (row) => ownerAction(row) }
];

function RentActionQueue() {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Action Queue</p>
          <h2>Rent Collection Action Queue</h2>
        </div>
        <ShieldCheck size={18} aria-hidden />
      </div>
      <div className="rent-action-grid">
        {actionQueue.map((item) => (
          <article key={item.title} className={`rent-action-card queue-${item.tone}`}>
            <span>{item.title}</span>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BlockedUntilVerified() {
  return (
    <section className="section-block rent-blocked-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Blocked Until Verified</p>
          <h2>Do not escalate before proof checks</h2>
        </div>
        <AlertTriangle size={18} aria-hidden />
      </div>
      <div className="rent-warning-list">
        {blockedWarnings.map((warning) => (
          <article key={warning}>
            <AlertTriangle size={16} aria-hidden />
            <span>{warning}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RentCollectionView() {
  const [filters, setFilters] = useState<RentFilter>(defaultFilters);
  const { data, system, error, loading } = useSheetsView<RentPayload>("rent-collection");
  const rows = useMemo(() => (data?.rows ? data.rows.map(rentRecordToCommandRow) : localDevelopmentFallbackAllowed ? rentRows : []), [data]);
  const filteredRows = useMemo(() => rows.filter((row) => matchesFilters(row, filters)), [filters, rows]);
  const sourceLabel = sheetSourceLabel(system, error);

  return (
    <div className="view-stack rent-command-page">
      <RentCommandHeader filters={filters} onFiltersChange={setFilters} sourceLabel={sourceLabel} />
      <SheetsSourcePanel system={system} error={error} loading={loading} />
      <RentKpiCards rows={rows} />
      <RentCharts rows={rows} />
      <RentFilters filters={filters} onFiltersChange={setFilters} rows={rows} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Detailed Ledger</p>
            <h2>Rent collection ledger</h2>
          </div>
          <StatusBadge label={`${filteredRows.length} rows`} />
        </div>
        {filteredRows.length ? (
          <DataTable rows={filteredRows} columns={columns} />
        ) : (
          <EmptyState title="No rent records match these filters." message="Reset filters or check the live Google Sheets source." />
        )}
      </section>

      {localDevelopmentFallbackAllowed ? (
        <>
          <RentHealthEvaluation />
          <RentActionQueue />
          <BlockedUntilVerified />
        </>
      ) : null}
    </div>
  );
}
