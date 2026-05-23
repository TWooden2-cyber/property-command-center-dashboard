"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, CheckCircle2, ClipboardList, Copy, Search, ShieldCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  commandCenterPeriod,
  money,
  monthOptions,
  mortgageRows,
  yearOptions,
  type MortgageCommandRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";

type MortgageFilter = {
  property: string;
  riskStatus: string;
  allotmentStatus: string;
  confirmationStatus: string;
  arrearsOnly: boolean;
  proofMissing: boolean;
  ownerActionRequired: boolean;
  search: string;
};

type MortgageCommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  tone: SignalTone;
  prompt: string;
};

const defaultFilters: MortgageFilter = {
  property: "All",
  riskStatus: "All",
  allotmentStatus: "All",
  confirmationStatus: "All",
  arrearsOnly: false,
  proofMissing: false,
  ownerActionRequired: false,
  search: ""
};

const payoffTracker = {
  startingArrears: 26000,
  paymentRequestsAccepted: 13254.1,
  estimatedRemaining: 12745.9,
  gregPayments: "$900 May 20 and $900 May 30",
  kevinFunds: "Pending verification",
  finalBalance: "Pending lender confirmation"
};

const proofChecklist = [
  "MBFS accepted payment email for $7,045.71",
  "MBFS accepted payment email for $6,208.39",
  "Lender portal posted payment proof",
  "Updated reinstatement/current balance",
  "Next due date confirmation",
  "Foreclosure/legal pause confirmation",
  "Drive proof folder update later",
  "Calendar follow-up later",
  "Task completion later"
];

const blockedWarnings = [
  "Do not close mortgage tracker until lender confirms posted payments.",
  "Do not mark arrears cured until updated balance is confirmed.",
  "Do not remove mortgage risk flag until proof is saved.",
  "Do not rely on payment request emails alone as final posting proof.",
  "Do not treat expected tenant/Section 8 funds as received until verified."
];

const actionQueue = [
  "Confirm 7-unit MBFS payments posted.",
  "Get updated balance.",
  "Save proof.",
  "Confirm next due date.",
  "Set up allotment.",
  "Track Greg Mckinney payment arrangement funds.",
  "Track Kevin Royster Section 8 funds after verification.",
  "Keep 4-unit current."
];

const followUpPreview = [
  "Mortgage payment confirmation follow-up",
  "Confirm MBFS payments posted",
  "Set up 7-unit allotment",
  "Save MBFS confirmations to Drive",
  "Confirm updated remaining arrears balance",
  "Keep 4-unit current"
];

const commandTemplates: MortgageCommandTemplate[] = [
  {
    id: "mortgage-review",
    title: "Codex Command - Mortgage Review",
    actionName: "Generate Codex Command: Mortgage Review",
    controls: "Mortgage due amounts, arrears, proof, posting status, allotment setup, and owner action items.",
    tone: "red",
    prompt: `Run a Mortgage / Allotment Review for the Property Command Center.

Rules:
- Read-only/local review first.
- Do not contact lender, MBFS, bank, tenants, property manager, or vendors.
- Do not make payments.
- Do not update Google Drive, Gmail, Calendar, Google Tasks, Sheets, lender portal, or mortgage records without owner approval.
- Review mortgage due amounts, arrears, payment proof, posting status, allotment setup, and owner action items.
- Produce a mortgage preview report with:
  1. Mortgage risk status
  2. Monthly mortgage due by property
  3. Payment requests accepted
  4. Current arrears
  5. Proof needed
  6. Allotment setup status
  7. Owner decisions required
  8. Blocked-until-verified items
- Stop before all live actions.`
  },
  {
    id: "payment-proof",
    title: "Codex Command - Payment Proof Verification",
    actionName: "Generate Codex Command: Payment Proof Verification",
    controls: "Proof checklist for MBFS payment requests and lender posting confirmation.",
    tone: "red",
    prompt: `Prepare a mortgage payment proof verification review.

Rules:
- Do not read Gmail message bodies unless owner approves.
- Do not update Drive or mortgage records.
- Do not contact lender or MBFS.
- Identify what proof is needed to confirm MBFS payment requests posted.
- Produce a checklist for:
  1. Accepted payment request emails
  2. Lender posted payment proof
  3. Updated balance
  4. Next due date
  5. Legal/foreclosure pause confirmation
- Stop before any live action.`
  },
  {
    id: "arrears-payoff",
    title: "Codex Command - Arrears Payoff Update",
    actionName: "Generate Codex Command: Arrears Payoff Update",
    controls: "Estimated arrears progress and expected funds requiring verification.",
    tone: "yellow",
    prompt: `Prepare a mortgage arrears payoff update.

Rules:
- Do not change records or make payments.
- Use current dashboard values only.
- Calculate estimated arrears progress from local sample data.
- Identify expected funds that still need verification.
- Explain what cannot be marked complete until lender proof is saved.
- Stop before live actions.`
  },
  {
    id: "allotment-setup",
    title: "Codex Command - Allotment Setup Prep",
    actionName: "Generate Codex Command: Allotment Setup Prep",
    controls: "Checklist for 7-unit and 4-unit mortgage payment setup.",
    tone: "yellow",
    prompt: `Prepare mortgage allotment setup checklist.

Rules:
- Do not change payroll, bank, lender, or allotment settings.
- Do not create tasks or calendar events without owner approval.
- Prepare a checklist for setting up:
  1. 7-unit $2,500 monthly mortgage allotment
  2. 4-unit $2,000 monthly mortgage payment process
  3. Proof and follow-up tracking
- Stop before live actions.`
  },
  {
    id: "drive-update",
    title: "Codex Command - Mortgage Google Drive Update",
    actionName: "Generate Codex Command: Mortgage Google Drive Update",
    controls: "Drive preview package for mortgage tracker, arrears, proof, and blocked items.",
    tone: "green",
    prompt: `Prepare a Google Drive mortgage update package.

Rules:
- Do not upload, move, rename, delete, or update Drive files without owner approval.
- Prepare a preview package only.
- Include mortgage tracker snapshot, arrears progress, MBFS proof checklist, payment posting status, allotment status, and blocked-until-verified items.
- Stop and ask for owner approval before any Drive write.`
  },
  {
    id: "calendar-task",
    title: "Codex Command - Mortgage Calendar / Task Prep",
    actionName: "Generate Codex Command: Mortgage Calendar / Task Prep",
    controls: "Calendar and Google Tasks preview for mortgage proof and arrears follow-ups.",
    tone: "yellow",
    prompt: `Prepare mortgage calendar and task updates.

Rules:
- Do not create, update, complete, or delete Calendar events or Google Tasks without owner approval.
- Prepare preview only.
- Include follow-ups for:
  1. Confirm MBFS payments posted
  2. Get updated balance
  3. Save proof
  4. Confirm next due date
  5. Set up allotment
  6. Weekly arrears review
- Stop before live actions.`
  }
];

function riskStatus(row: MortgageCommandRow) {
  if (row.currentArrears > 0) return "Critical";
  if (row.confirmationSaved.toLowerCase().includes("pending") || row.confirmationSaved.toLowerCase().includes("verify")) return "Stable / Watch";
  return "Stable";
}

function riskTone(row: MortgageCommandRow): SignalTone {
  if (row.currentArrears > 0) return "red";
  if (row.confirmationSaved.toLowerCase().includes("pending") || row.allotmentStatus.toLowerCase().includes("needs")) return "yellow";
  return "green";
}

function proofMissing(row: MortgageCommandRow) {
  const confirmation = row.confirmationSaved.toLowerCase();
  return confirmation.includes("pending") || confirmation.includes("verify") || confirmation.includes("posting");
}

function ownerActionRequired(row: MortgageCommandRow) {
  return row.nextOwnerAction.trim().length > 0 || row.allotmentStatus.toLowerCase().includes("needs") || row.currentArrears > 0;
}

function matchesFilters(row: MortgageCommandRow, filters: MortgageFilter) {
  const haystack = [
    row.property,
    row.paymentSource,
    row.allotmentStatus,
    row.confirmationSaved,
    row.payoffPlan,
    row.notes,
    row.nextOwnerAction,
    riskStatus(row)
  ]
    .join(" ")
    .toLowerCase();

  if (filters.property !== "All" && row.property !== filters.property) return false;
  if (filters.riskStatus !== "All" && riskStatus(row) !== filters.riskStatus) return false;
  if (filters.allotmentStatus !== "All" && row.allotmentStatus !== filters.allotmentStatus) return false;
  if (filters.confirmationStatus !== "All" && !row.confirmationSaved.toLowerCase().includes(filters.confirmationStatus.toLowerCase())) return false;
  if (filters.arrearsOnly && row.currentArrears <= 0) return false;
  if (filters.proofMissing && !proofMissing(row)) return false;
  if (filters.ownerActionRequired && !ownerActionRequired(row)) return false;
  if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
  return true;
}

function MortgageHeader() {
  return (
    <section className="mortgage-command-header">
      <div>
        <p className="eyebrow">Local Sample Mode</p>
        <h2>Mortgage / Allotment Command</h2>
        <p>Mortgage payment tracking, arrears status, payoff plan, allotment setup, proof confirmation, and owner financial risk controls.</p>
        <div className="hero-source-strip">
          <span>Local Sample Mode</span>
          <span>No live lender, MBFS, bank, Google Drive, Gmail, Calendar, or Task updates</span>
          <span>Last updated: May 21, 2026, 9:00 AM</span>
        </div>
      </div>
      <div className="rent-period-filter">
        <label>
          Month
          <select value={commandCenterPeriod.monthName} disabled>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <label>
          Year
          <select value={commandCenterPeriod.year} disabled>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function MortgageKpis() {
  const totalDue = mortgageRows.reduce((total, row) => total + row.mortgageDueMonthly, 0);
  const requested = mortgageRows.find((row) => row.property === "7-Unit")?.paidThisMonth ?? 0;
  const arrears = mortgageRows.reduce((total, row) => total + row.currentArrears, 0);
  const proofCount = proofChecklist.length;

  const cards = [
    { label: "Total Monthly Mortgage Due", value: money(totalDue), helper: "7-Unit: $2,500.00 / 4-Unit: $2,000.00", tone: "yellow" as SignalTone },
    { label: "Mortgage Payments Paid / Requested", value: money(requested), helper: "Payment requests accepted; final lender posting pending", tone: "yellow" as SignalTone },
    { label: "Current Arrears", value: money(arrears), helper: "7-Unit: $12,745.90 / 4-Unit: $0.00", tone: "red" as SignalTone },
    { label: "Confirmation Status", value: "Pending", helper: "Email confirmations found / final posting pending", tone: "red" as SignalTone },
    { label: "Allotment Setup", value: "Needs setup", helper: "7-Unit and 4-Unit payment automation not verified", tone: "yellow" as SignalTone },
    { label: "Mortgage Risk", value: "Critical", helper: "7-Unit arrears and posting proof remain unresolved", tone: "red" as SignalTone },
    { label: "Proof Needed", value: String(proofCount), helper: "Portal proof, posted payments, updated balance, next due date", tone: "red" as SignalTone },
    { label: "Next Owner Action", value: "Confirm posting", helper: "Get exact remaining cure/reinstatement balance", tone: "red" as SignalTone }
  ];

  return (
    <section className="mortgage-kpi-grid">
      {cards.map((card) => (
        <article key={card.label} className="kpi-card command-kpi">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.helper}</p>
          <div className={`kpi-status-strip ${card.tone}`}>{card.tone === "green" ? "Stable" : card.tone === "yellow" ? "Watch" : "Critical"}</div>
        </article>
      ))}
    </section>
  );
}

function MortgageHealthEvaluation() {
  return (
    <section className="mortgage-health-panel">
      <div>
        <p className="eyebrow">Mortgage health evaluation</p>
        <h3>Critical / High Risk</h3>
        <p>
          The 7-unit mortgage had major arrears, and MBFS payment requests were accepted for $7,045.71 and $6,208.39, totaling $13,254.10.
          Final lender posting is still pending, so the mortgage cannot be marked cured or current from local sample data alone.
        </p>
      </div>
      <div className="mortgage-cause-grid">
        <article>
          <AlertTriangle size={18} />
          <strong>Why this is critical</strong>
          <p>Estimated remaining arrears are $12,745.90 if starting arrears were $26,000. Proof is still needed for posted payments and updated lender balance.</p>
        </article>
        <article>
          <ShieldCheck size={18} />
          <strong>Proof required</strong>
          <p>Need lender portal proof, updated reinstatement/current balance, next due date, and confirmation foreclosure/legal action is paused.</p>
        </article>
        <article>
          <ClipboardList size={18} />
          <strong>Owner next actions</strong>
          <p>Confirm both MBFS payments posted, save proof, confirm next due date, set up $2,500 allotment, and keep the 4-unit payment process current.</p>
        </article>
      </div>
    </section>
  );
}

function MortgageFilters({ filters, onChange }: { filters: MortgageFilter; onChange: (next: MortgageFilter) => void }) {
  const properties = ["All", ...Array.from(new Set(mortgageRows.map((row) => row.property)))];
  const riskOptions = ["All", ...Array.from(new Set(mortgageRows.map((row) => riskStatus(row))))];
  const allotmentOptions = ["All", ...Array.from(new Set(mortgageRows.map((row) => row.allotmentStatus)))];
  const confirmationOptions = ["All", "pending", "verify", "posting"];

  return (
    <section className="mortgage-filter-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mortgage filters</p>
          <h3>Find proof gaps and owner actions</h3>
        </div>
        <div className="search-pill">
          <Search size={16} />
          <input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search mortgage tracker"
          />
        </div>
      </div>
      <div className="mortgage-filter-grid">
        <label>
          Property
          <select value={filters.property} onChange={(event) => onChange({ ...filters, property: event.target.value })}>
            {properties.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Risk status
          <select value={filters.riskStatus} onChange={(event) => onChange({ ...filters, riskStatus: event.target.value })}>
            {riskOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Allotment status
          <select value={filters.allotmentStatus} onChange={(event) => onChange({ ...filters, allotmentStatus: event.target.value })}>
            {allotmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Confirmation status
          <select value={filters.confirmationStatus} onChange={(event) => onChange({ ...filters, confirmationStatus: event.target.value })}>
            {confirmationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-toggle-row">
        <label><input type="checkbox" checked={filters.arrearsOnly} onChange={(event) => onChange({ ...filters, arrearsOnly: event.target.checked })} /> Arrears &gt; 0</label>
        <label><input type="checkbox" checked={filters.proofMissing} onChange={(event) => onChange({ ...filters, proofMissing: event.target.checked })} /> Proof missing</label>
        <label><input type="checkbox" checked={filters.ownerActionRequired} onChange={(event) => onChange({ ...filters, ownerActionRequired: event.target.checked })} /> Owner action required</label>
      </div>
    </section>
  );
}

function ArrearsPayoffTracker() {
  const progress = Math.round((payoffTracker.paymentRequestsAccepted / payoffTracker.startingArrears) * 100);

  return (
    <section className="mortgage-payoff-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Arrears payoff tracker</p>
          <h3>Estimated payoff progress</h3>
        </div>
        <StatusBadge label="Final lender balance pending" />
      </div>
      <div className="mortgage-payoff-grid">
        <article><span>Starting arrears</span><strong>{money(payoffTracker.startingArrears)}</strong></article>
        <article><span>Payment requests accepted</span><strong>{money(payoffTracker.paymentRequestsAccepted)}</strong></article>
        <article><span>Estimated remaining arrears</span><strong>{money(payoffTracker.estimatedRemaining)}</strong></article>
        <article><span>Greg Mckinney expected payments</span><strong>{payoffTracker.gregPayments}</strong></article>
        <article><span>Kevin Royster Section 8 funds</span><strong>{payoffTracker.kevinFunds}</strong></article>
        <article><span>Final lender balance</span><strong>{payoffTracker.finalBalance}</strong></article>
      </div>
      <div className="mortgage-progress">
        <div className="mortgage-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p>{progress}% estimated progress based on local sample data. Final cure/reinstatement amount is pending lender confirmation.</p>
    </section>
  );
}

function AllotmentSetupTracker() {
  return (
    <section className="mortgage-two-column">
      <article className="mortgage-action-card">
        <p className="eyebrow">Allotment setup tracker</p>
        <h3>Payment automation not verified</h3>
        <ul>
          <li>7-Unit $2,500 monthly allotment: Needs setup</li>
          <li>4-Unit $2,000 monthly allotment: Needs setup</li>
          <li>Payment source: Military paycheck / rental income</li>
          <li>Risk: not automated yet</li>
          <li>Next action: owner setup/verification</li>
        </ul>
      </article>
      <article className="mortgage-action-card">
        <p className="eyebrow">Amortization / paydown view</p>
        <h3>Sample paydown only</h3>
        <div className="mortgage-mini-grid">
          <span>Monthly due <strong>{money(4500)}</strong></span>
          <span>Paid/requested this month <strong>{money(13254.1)}</strong></span>
          <span>Estimated remaining arrears <strong>{money(12745.9)}</strong></span>
          <span>Next required proof <strong>Lender posting</strong></span>
        </div>
        <p>Sample paydown view only. Live lender amortization and escrow data are not connected.</p>
      </article>
    </section>
  );
}

function MortgageOperationalSections() {
  return (
    <>
      <section className="mortgage-proof-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Payment proof checklist</p>
            <h3>Proof needed before closing risk</h3>
          </div>
          <StatusBadge label="Proof missing" />
        </div>
        <div className="mortgage-proof-grid">
          {proofChecklist.map((item) => (
            <article key={item}>
              <CheckCircle2 size={16} />
              <span>{item}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="mortgage-two-column">
        <article className="mortgage-blocked-panel">
          <p className="eyebrow">Blocked until verified</p>
          <h3>Do not downgrade risk yet</h3>
          <ul>
            {blockedWarnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="mortgage-action-card">
          <p className="eyebrow">Mortgage action queue</p>
          <h3>Owner financial controls</h3>
          <ul>
            {actionQueue.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mortgage-action-card">
        <p className="eyebrow">Calendar / task follow-up preview</p>
        <h3>Prepared only - no live events or tasks</h3>
        <div className="mortgage-follow-grid">
          {followUpPreview.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </>
  );
}

function MortgageCommandButtons() {
  const [selected, setSelected] = useState<MortgageCommandTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mortgage-command-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Codex command buttons</p>
          <h3>Mortgage workflow prompts</h3>
        </div>
        <StatusBadge label="Draft command only" />
      </div>
      <div className="mortgage-command-button-grid">
        {commandTemplates.map((template) => (
          <button key={template.id} className={`command-action-button ${template.tone}`} type="button" onClick={() => setSelected(template)}>
            <Banknote size={18} />
            <span>{template.actionName}</span>
            <small>{template.controls}</small>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mortgage-command-preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Command preview</p>
              <h3>{selected.title}</h3>
            </div>
            <button className="copy-command-button" type="button" onClick={copyPrompt}>
              <Copy size={16} />
              {copied ? "Copied" : "Copy Command"}
            </button>
          </div>
          <div className="command-safety-strip">
            <span>Draft command only</span>
            <span>Owner approval required</span>
            <span>Live writes disabled</span>
            <span>No lender contacted</span>
            <span>No mortgage payment made</span>
            <span>No Drive upload</span>
          </div>
          <pre>{selected.prompt}</pre>
          <p>This dashboard does not contact lenders, make payments, update Google services, or move proof files. It only prepares the Codex command.</p>
        </div>
      ) : null}
    </section>
  );
}

export function MortgageArrearsView() {
  const [filters, setFilters] = useState(defaultFilters);
  const filteredRows = useMemo(() => mortgageRows.filter((row) => matchesFilters(row, filters)), [filters]);

  const columns: DataTableColumn<MortgageCommandRow>[] = [
    { key: "property", header: "Property", render: (row) => row.property },
    { key: "mortgageDueMonthly", header: "Mortgage Due Monthly", render: (row) => money(row.mortgageDueMonthly), className: "numeric" },
    { key: "paymentSource", header: "Payment Source", render: (row) => row.paymentSource },
    { key: "allotmentStatus", header: "Allotment Status", render: (row) => <StatusBadge label={row.allotmentStatus} /> },
    { key: "currentArrears", header: "Current Arrears", render: (row) => money(row.currentArrears), className: "numeric" },
    { key: "payoffPlan", header: "Payoff Plan", render: (row) => row.payoffPlan },
    { key: "dueDate", header: "Due Date", render: (row) => row.dueDate },
    { key: "lastPaidDate", header: "Last Paid Date", render: (row) => row.lastPaidDate || "Unknown / verify" },
    { key: "confirmationSaved", header: "Confirmation Saved", render: (row) => row.confirmationSaved },
    { key: "notes", header: "Notes", render: (row) => row.notes },
    { key: "riskStatus", header: "Risk Status", render: (row) => <StatusBadge label={riskStatus(row)} /> },
    { key: "ownerAction", header: "Owner Action", render: (row) => row.nextOwnerAction }
  ];

  return (
    <div className="mortgage-command-page">
      <MortgageHeader />
      <MortgageKpis />
      <MortgageHealthEvaluation />
      <MortgageFilters filters={filters} onChange={setFilters} />
      {filteredRows.length ? (
        <DataTable rows={filteredRows} columns={columns} />
      ) : (
        <EmptyState title="No mortgage records match these filters" message="Adjust the local sample filters to view mortgage and allotment records." />
      )}
      <ArrearsPayoffTracker />
      <AllotmentSetupTracker />
      <MortgageOperationalSections />
      <MortgageCommandButtons />
    </div>
  );
}
