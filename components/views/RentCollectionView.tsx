"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Copy, Search, ShieldCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  commandCenterPeriod,
  money,
  monthOptions,
  monthlyRentTrend,
  percent,
  rentRows,
  rentTotals,
  yearOptions,
  type RentCollectionRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";

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

type RentCommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  tone: SignalTone;
  prompt: string;
};

const defaultFilters: RentFilter = {
  month: commandCenterPeriod.monthName,
  year: commandCenterPeriod.year,
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

const commandTemplates: RentCommandTemplate[] = [
  {
    id: "rent-review",
    title: "Codex Command - Rent Collection Review",
    actionName: "Generate Codex Command: Rent Collection Review",
    controls: "Monthly rent ledger, balances, owner actions, and blocked verification items.",
    tone: "yellow",
    prompt: `Run a Rent Collection Review for the Property Command Center.

Rules:
- Read-only/local review first.
- Do not send tenant messages.
- Do not create or serve notices.
- Do not update Google Drive, Gmail, Calendar, Tasks, Sheets, RentRedi, or tenant records without owner approval.
- Review the rent ledger, balances, payment arrangements, ledger conflicts, Section 8/HAP verification items, and owner action items.
- Produce a rent collection preview report with:
  1. Total projected rent
  2. Total collected
  3. Total balance
  4. Collection percentage
  5. Paid units
  6. Units with balance
  7. Verification issues
  8. Owner decisions required
  9. Blocked-until-verified items
- Stop before all live actions.`
  },
  {
    id: "rentredi-ledger",
    title: "Codex Command - RentRedi Ledger Verification",
    actionName: "Generate Codex Command: RentRedi Ledger Verification",
    controls: "Ledger conflict, payment discrepancy, and unresolved payment source checklist.",
    tone: "yellow",
    prompt: `Prepare a RentRedi ledger verification review.

Rules:
- Do not connect to RentRedi or update live records.
- Do not send tenant messages.
- Do not create notices.
- Review dashboard rent ledger items with ledger conflict, payment discrepancy, or unresolved payment source.
- Identify units needing ledger verification.
- Produce a verification checklist.
- Stop before any live action.`
  },
  {
    id: "late-rent-prep",
    title: "Codex Command - Late Rent Follow-Up Prep",
    actionName: "Generate Codex Command: Late Rent Follow-Up Prep",
    controls: "Owner-review draft prep for unpaid balances and late rent watch items.",
    tone: "red",
    prompt: `Prepare late rent follow-up drafts for owner review.

Rules:
- Do not send messages.
- Do not create legal notices.
- Do not contact tenants.
- Draft only general follow-up language for owner review.
- Flag legal/notice-sensitive items separately.
- Stop before all live communication.`
  },
  {
    id: "hap-verification",
    title: "Codex Command - Section 8 / HAP Verification",
    actionName: "Generate Codex Command: Section 8 / HAP Verification",
    controls: "Section 8, HAP, PM statement, and subsidy payment proof checklist.",
    tone: "yellow",
    prompt: `Prepare Section 8 / HAP verification review.

Rules:
- Do not contact tenants, agencies, property manager, or housing authority.
- Do not send emails.
- Do not change records.
- Review units requiring Section 8/HAP verification.
- Produce a checklist of what proof or confirmation is needed.
- Stop before live actions.`
  },
  {
    id: "drive-rent-update",
    title: "Codex Command - Rent Collection Google Drive Update",
    actionName: "Generate Codex Command: Rent Collection Google Drive Update",
    controls: "Drive preview package for rent ledger, balances, verification items, and owner actions.",
    tone: "green",
    prompt: `Prepare a Google Drive rent collection update package.

Rules:
- Do not upload, move, rename, delete, or update Drive files without owner approval.
- Prepare a preview package only.
- Include rent ledger snapshot, balance list, verification items, owner action list, and blocked-until-verified items.
- Stop and ask for owner approval before any Drive write.`
  }
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

function RentKpiCards() {
  const collectionRate = rentTotals.collected / rentTotals.projected;
  const paidUnits = rentRows.filter((row) => row.balance <= 0).length;
  const unitsWithBalance = rentRows.filter((row) => row.balance > 0).length;
  const verificationIssues = rentRows.filter((row) => verificationFlag(row) !== "Clear").length;
  const kpis = [
    { label: "Total Projected Rent", value: money(rentTotals.projected), helper: "May 2026 local sample", tone: "green" as SignalTone },
    { label: "Total Rent Collected", value: money(rentTotals.collected), helper: `${percent(collectionRate)} collection rate`, tone: collectionRate >= 1 ? "green" as SignalTone : "yellow" as SignalTone },
    { label: "Total Balance", value: money(rentTotals.balance), helper: "Balances and verification issues remain", tone: rentTotals.balance > 0 ? "red" as SignalTone : "green" as SignalTone },
    { label: "Total Late Fees", value: money(rentTotals.lateFees), helper: "Late fee total in local ledger", tone: rentTotals.lateFees > 0 ? "yellow" as SignalTone : "green" as SignalTone },
    { label: "Collection Rate", value: percent(collectionRate), helper: "Collected / projected", tone: collectionRate >= 1 ? "green" as SignalTone : collectionRate > 0.5 ? "yellow" as SignalTone : "red" as SignalTone },
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
  onFiltersChange
}: {
  filters: RentFilter;
  onFiltersChange: (next: RentFilter) => void;
}) {
  return (
    <section className="rent-command-header">
      <div>
        <p className="eyebrow">Local Sample Mode</p>
        <h2>Rent Collection Command</h2>
        <p>Monthly rent ledger, payment status, balances, reminders, and verification issues.</p>
        <div className="hero-source-strip">
          <span>Local Sample Mode</span>
          <span>No live RentRedi / Google Sheets data</span>
          <span>Last updated: May 21, 2026, 9:00 AM</span>
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
  const max = Math.max(projected, collected, 1);
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
              <div className={`bar-fill rent-${bar.tone}`} style={{ "--bar-width": `${Math.max((bar.value / max) * 100, 4)}%` } as CSSProperties} />
            </div>
            <strong>{money(bar.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function BalanceByUnitChart() {
  const rows = rentRows.filter((row) => row.balance > 0);
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
              <div className="bar-fill rent-balance" style={{ "--bar-width": `${Math.max((row.balance / max) * 100, 4)}%` } as CSSProperties} />
            </div>
            <strong>{money(row.balance)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionRateGauge() {
  const rate = rentTotals.collected / rentTotals.projected;

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
        <strong>{percent(rate)}</strong>
        <div className="bar-track">
          <div className="bar-fill" style={{ "--bar-width": `${Math.min(rate * 100, 100)}%` } as CSSProperties} />
        </div>
        <p>Above 50%, but verification issues keep the ledger in Watch status.</p>
      </div>
    </section>
  );
}

function RentCharts() {
  const projectedYtd = monthlyRentTrend.reduce((total, row) => total + row.projected, 0);
  const collectedYtd = monthlyRentTrend.reduce((total, row) => total + row.collected, 0);

  return (
    <section className="rent-chart-grid">
      <PaidProjectedChart title="Monthly Paid vs Projected" projected={rentTotals.projected} collected={rentTotals.collected} />
      <PaidProjectedChart title="Year-to-Date Paid vs Projected" projected={projectedYtd} collected={collectedYtd} />
      <BalanceByUnitChart />
      <CollectionRateGauge />
    </section>
  );
}

function RentFilters({
  filters,
  onFiltersChange
}: {
  filters: RentFilter;
  onFiltersChange: (next: RentFilter) => void;
}) {
  const propertyOptions = ["All", ...Array.from(new Set(rentRows.map((row) => row.property)))];
  const unitOptions = ["All", ...Array.from(new Set(rentRows.map((row) => row.unit)))];
  const statusOptions = ["All", ...Array.from(new Set(rentRows.map((row) => row.status)))];

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
  const inSamplePeriod = filters.month === commandCenterPeriod.monthName && filters.year === commandCenterPeriod.year;

  if (!inSamplePeriod) {
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
  { key: "rentDue", header: "Rent Due", render: (row) => money(row.rentDue), className: "numeric" },
  { key: "paid", header: "Amount Paid", render: (row) => money(row.paid), className: "numeric" },
  { key: "balance", header: "Balance", render: (row) => money(row.balance), className: "numeric" },
  { key: "dueDate", header: "Due Date", render: (row) => row.dueDate || "May 1" },
  { key: "datePaid", header: "Date Paid", render: (row) => row.datePaid || "Not paid" },
  { key: "method", header: "Payment Method", render: (row) => row.method || "Not set" },
  { key: "lateFee", header: "Late Fee", render: (row) => money(row.lateFee), className: "numeric" },
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

function RentCommandButtons() {
  const [activeCommand, setActiveCommand] = useState<RentCommandTemplate | null>(null);
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);

  async function copyCommand(command: RentCommandTemplate) {
    const copied = await copyTextToClipboard(`${command.title}\n\n${command.prompt}`);
    setCopiedCommandId(copied ? command.id : null);
  }

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Codex Commands</p>
          <h2>Rent collection command buttons</h2>
        </div>
        <Copy size={18} aria-hidden />
      </div>
      <div className="rent-command-button-grid">
        {commandTemplates.map((command) => (
          <article key={command.id} className={`codex-command-card command-kpi-${command.tone}`}>
            <span>{command.actionName}</span>
            <strong>{command.controls}</strong>
            <p>Draft command only. Owner approval required. Live writes disabled.</p>
            <button type="button" onClick={() => {
              setActiveCommand(command);
              setCopiedCommandId(null);
            }}>
              Generate command
            </button>
          </article>
        ))}
      </div>
      {activeCommand ? (
        <aside className="command-preview-panel rent-command-preview" aria-live="polite">
          <div className="command-preview-header">
            <div>
              <p className="eyebrow">Command Preview</p>
              <h3>{activeCommand.title}</h3>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveCommand(null)}>Close</button>
          </div>
          <div className="command-preview-labels">
            <span>Draft command only</span>
            <span>Owner approval required</span>
            <span>Live writes disabled</span>
            <span>No tenant messages sent</span>
            <span>No notices created</span>
          </div>
          <p className="command-preview-warning">
            This dashboard does not perform RentRedi, Google, tenant, notice, or payment actions. It only prepares the Codex command.
          </p>
          <pre>{activeCommand.prompt}</pre>
          <div className="command-preview-actions">
            <button type="button" onClick={() => copyCommand(activeCommand)}>
              <Copy size={16} aria-hidden />
              Copy Command
            </button>
            {copiedCommandId === activeCommand.id ? <span>Copied command to clipboard.</span> : null}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

export function RentCollectionView() {
  const [filters, setFilters] = useState<RentFilter>(defaultFilters);
  const filteredRows = useMemo(() => rentRows.filter((row) => matchesFilters(row, filters)), [filters]);

  return (
    <div className="view-stack rent-command-page">
      <RentCommandHeader filters={filters} onFiltersChange={setFilters} />
      <RentKpiCards />
      <RentHealthEvaluation />
      <RentCharts />
      <RentFilters filters={filters} onFiltersChange={setFilters} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Detailed Ledger</p>
            <h2>May 2026 rent collection ledger</h2>
          </div>
          <StatusBadge label={`${filteredRows.length} rows`} />
        </div>
        {filteredRows.length ? (
          <DataTable rows={filteredRows} columns={columns} />
        ) : (
          <EmptyState title="No local sample rent records match these filters." message="Reset filters or choose May 2026 to view the local sample ledger." />
        )}
      </section>

      <RentActionQueue />
      <BlockedUntilVerified />
      <RentCommandButtons />
    </div>
  );
}
