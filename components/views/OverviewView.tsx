"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderArchive,
  MailCheck,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  adminTaskRows,
  blockedUntilVerifiedQueue,
  calendarSuspenseQueue,
  commandCenterPeriod,
  commandActionCards,
  communicationFollowUpQueue,
  computeDashboardHealth,
  dashboardNotifications,
  documentDraftStatuses,
  followUpRows,
  leaseViolations,
  maintenanceRows,
  money,
  monthOptions,
  monthlyRentTrend,
  mortgageRows,
  nextSevenDaysQueue,
  noticeRows,
  ownerApprovalQueue,
  percent,
  proofNeededQueue,
  rentRows,
  rentTotals,
  tasksNeedingCompletionQueue,
  toneForStatus,
  todayCommandBrief,
  yearOptions,
  type AdminTaskCommandRow,
  type CommandQueueItem,
  type DocumentDraftStatus,
  type FollowUpCommandRow,
  type HealthStatus,
  type LeaseViolationRow,
  type MaintenanceCommandRow,
  type MortgageCommandRow,
  type NoticeCommandRow,
  type RentCollectionRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";

type CommandKpi = {
  label: string;
  value: string;
  helper: string;
  tone: SignalTone;
  footer: string;
};

function commandKpis(): CommandKpi[] {
  const health = computeDashboardHealth();
  const rentRate = health.rentCollectionRate;
  const maintenanceCritical = maintenanceRows.some((row) => row.priority === "Critical" && row.status.toLowerCase() !== "complete");
  const mortgagePaidCurrent = mortgageRows.every((row) => row.currentArrears === 0 && !row.confirmationSaved.toLowerCase().includes("pending"));
  const mortgagePending = mortgageRows.some((row) => row.confirmationSaved.toLowerCase().includes("pending"));
  const noi = rentTotals.collected - health.utilityCost - health.maintenanceCost - mortgageRows.reduce((total, row) => total + row.mortgageDueMonthly, 0);
  const cashflow = rentTotals.collected - health.utilityCost - health.maintenanceCost - mortgageRows.reduce((total, row) => total + row.paidThisMonth, 0);

  return [
    {
      label: "Month Total Rent Collected",
      value: money(rentTotals.collected),
      helper: `${percent(rentRate)} of projected rent`,
      tone: rentRate >= 1 ? "green" : rentRate > 0.5 ? "yellow" : "red",
      footer: rentRate >= 1 ? "100% collected" : rentRate > 0.5 ? "Above 50%, verification needed" : "Under 50%, urgent"
    },
    {
      label: "Month Projected Rent",
      value: money(rentTotals.projected),
      helper: `${money(rentTotals.balance)} balance tracked`,
      tone: rentTotals.balance === 0 ? "green" : rentRate > 0.5 ? "yellow" : "red",
      footer: "Projection uses May 2026 local sample"
    },
    {
      label: "Month Utility Cost",
      value: money(health.utilityCost),
      helper: "Electric and water sample total",
      tone: health.utilityCost > 550 ? "red" : "green",
      footer: health.utilityCost > 550 ? "Over $550 threshold" : "Under $550 threshold"
    },
    {
      label: "Month Maintenance Cost",
      value: money(health.maintenanceCost),
      helper: maintenanceCritical ? "Critical heat complaint open" : "No urgent issue",
      tone: health.maintenanceCost > 500 || maintenanceCritical ? "red" : "green",
      footer: maintenanceCritical ? "Urgent issue open" : "$500 or under"
    },
    {
      label: "Mortgage Payments Paid",
      value: money(mortgageRows.reduce((total, row) => total + row.paidThisMonth, 0)),
      helper: "MBFS posting confirmation pending",
      tone: mortgagePaidCurrent ? "green" : mortgagePending ? "yellow" : "red",
      footer: mortgagePending ? "Confirmation pending" : mortgagePaidCurrent ? "Paid/current" : "Arrears or unpaid"
    },
    {
      label: "NOI",
      value: money(noi),
      helper: "Rent collected minus operating costs and mortgage due",
      tone: noi > 500 ? "green" : noi >= 0 ? "yellow" : "red",
      footer: noi > 0 ? "Positive" : noi === 0 ? "Near break-even" : "Negative"
    },
    {
      label: "Month Cashflow",
      value: money(cashflow),
      helper: "Includes actual mortgage payments paid this month",
      tone: cashflow > 500 ? "green" : cashflow >= 0 ? "yellow" : "red",
      footer: cashflow > 0 ? "Positive" : cashflow === 0 ? "Near break-even" : "Negative"
    }
  ];
}

function CommandKpiTile({ item }: { item: CommandKpi }) {
  return (
    <article className={`command-kpi command-kpi-${item.tone}`}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <small>{item.helper}</small>
      <footer>{item.footer}</footer>
    </article>
  );
}

function HealthCard({ label, status, explanation }: { label: string; status: HealthStatus; explanation: string }) {
  return (
    <article className={`health-card health-${toneForStatus(status)}`}>
      <div>
        <span>{label}</span>
        <strong>{status}</strong>
      </div>
      <p>{explanation}</p>
    </article>
  );
}

function Section({
  eyebrow,
  title,
  children,
  icon
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="section-block command-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {icon}
      </div>
      {children}
    </section>
  );
}

function FilterBar({
  month,
  year,
  onMonthChange,
  onYearChange
}: {
  month: string;
  year: number;
  onMonthChange: (value: string) => void;
  onYearChange: (value: number) => void;
}) {
  return (
    <section className="command-filter-bar">
      <div className="dashboard-updated">
        <span>Last updated</span>
        <strong>May 21, 2026, 9:00 AM</strong>
      </div>
      <label>
        <span>Month</span>
        <select value={month} onChange={(event) => onMonthChange(event.target.value)}>
          {monthOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Year</span>
        <select value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function NotificationStrip() {
  return (
    <section className="notification-strip">
      {dashboardNotifications.map((item, index) => (
        <article key={item}>
          {index === 0 ? <CalendarClock size={16} aria-hidden /> : index > 3 ? <AlertTriangle size={16} aria-hidden /> : <Bell size={16} aria-hidden />}
          <span>{item}</span>
        </article>
      ))}
    </section>
  );
}

function ComparisonChart({ title, projected, collected }: { title: string; projected: number; collected: number }) {
  const max = Math.max(projected, collected, 1);
  const bars = [
    { label: "Projected", value: projected },
    { label: "Collected", value: collected }
  ];

  return (
    <section className="chart-card command-chart">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chart</p>
          <h2>{title}</h2>
        </div>
        <TrendingUp size={18} aria-hidden />
      </div>
      <div className="command-chart-bars">
        {bars.map((bar) => (
          <div key={bar.label} className="command-chart-row">
            <span>{bar.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ "--bar-width": `${Math.max((bar.value / max) * 100, 4)}%` } as CSSProperties} />
            </div>
            <strong>{money(bar.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function YearTrendChart() {
  const projected = monthlyRentTrend.reduce((total, item) => total + item.projected, 0);
  const collected = monthlyRentTrend.reduce((total, item) => total + item.collected, 0);

  return <ComparisonChart title="Year Paid vs Projected" projected={projected} collected={collected} />;
}

const rentColumns: DataTableColumn<RentCollectionRow>[] = [
  { key: "month", header: "Month", render: (row) => row.month },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant },
  { key: "due", header: "Rent Due", render: (row) => money(row.rentDue), className: "numeric" },
  { key: "paid", header: "Paid", render: (row) => money(row.paid), className: "numeric" },
  { key: "balance", header: "Balance", render: (row) => money(row.balance), className: "numeric" },
  { key: "date", header: "Due / Paid", render: (row) => row.datePaid || row.dueDate || "Not set" },
  { key: "method", header: "Method", render: (row) => row.method || "Not set" },
  { key: "late", header: "Late Fee", render: (row) => money(row.lateFee), className: "numeric" },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "reminder", header: "Reminder", render: (row) => <StatusBadge label={row.reminder === "Yes" ? "Follow-Up" : "Stable"} /> }
];

const maintenanceColumns: DataTableColumn<MaintenanceCommandRow>[] = [
  { key: "date", header: "Date Reported", render: (row) => row.dateReported },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant },
  { key: "issue", header: "Issue", render: (row) => row.issue },
  { key: "priority", header: "Priority", render: (row) => <StatusBadge label={row.priority} /> },
  { key: "vendor", header: "Assigned Vendor", render: (row) => row.assignedVendor },
  { key: "estimated", header: "Estimated Cost", render: (row) => money(row.estimatedCost), className: "numeric" },
  { key: "actual", header: "Actual Cost", render: (row) => (row.actualCost === undefined ? "Unknown" : money(row.actualCost)), className: "numeric" },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "completed", header: "Date Completed", render: (row) => row.dateCompleted || "Open" },
  { key: "update", header: "Tenant Update Sent", render: (row) => row.tenantUpdateSent },
  { key: "link", header: "Photos/Receipts Link", render: (row) => row.photosReceiptsLink },
  { key: "notes", header: "Notes", render: (row) => row.notes }
];

const leaseColumns: DataTableColumn<LeaseViolationRow>[] = [
  { key: "date", header: "Date", render: (row) => row.date },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant },
  { key: "type", header: "Violation Type", render: (row) => row.violationType },
  { key: "description", header: "Description", render: (row) => row.description },
  { key: "proof", header: "Photo/Proof Link", render: (row) => row.proofLink },
  { key: "message", header: "Message Sent", render: (row) => row.messageSent },
  { key: "notice", header: "Notice Required", render: (row) => row.noticeRequired },
  { key: "follow", header: "Follow-Up Date", render: (row) => row.followUpDate },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "notes", header: "Notes", render: (row) => row.notes }
];

const noticeColumns: DataTableColumn<NoticeCommandRow>[] = [
  { key: "dateStarted", header: "Date Started", render: (row) => row.dateStarted },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant },
  { key: "noticeType", header: "Notice Type", render: (row) => row.noticeType },
  { key: "amount", header: "Amount Owed", render: (row) => row.amountOwed },
  { key: "noticeDate", header: "Notice Date", render: (row) => row.noticeDate },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> }
];

const mortgageColumns: DataTableColumn<MortgageCommandRow>[] = [
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "due", header: "Mortgage Due Monthly", render: (row) => money(row.mortgageDueMonthly), className: "numeric" },
  { key: "source", header: "Payment Source", render: (row) => row.paymentSource },
  { key: "allotment", header: "Allotment Status", render: (row) => <StatusBadge label={row.allotmentStatus} /> },
  { key: "arrears", header: "Current Arrears", render: (row) => money(row.currentArrears), className: "numeric" },
  { key: "plan", header: "Payoff Plan", render: (row) => row.payoffPlan },
  { key: "dueDate", header: "Due Date", render: (row) => row.dueDate },
  { key: "lastPaid", header: "Last Paid Date", render: (row) => row.lastPaidDate || "Not set" },
  { key: "confirmation", header: "Confirmation Saved", render: (row) => row.confirmationSaved },
  { key: "notes", header: "Notes", render: (row) => row.notes }
];

const followUpColumns: DataTableColumn<FollowUpCommandRow>[] = [
  { key: "date", header: "Date", render: (row) => row.date },
  { key: "time", header: "Time", render: (row) => row.time },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "item", header: "Follow-Up", render: (row) => row.item },
  { key: "detail", header: "Details", render: (row) => row.detail },
  { key: "category", header: "Category", render: (row) => row.category },
  { key: "calendar", header: "Calendar", render: (row) => row.calendarNeeded },
  { key: "email", header: "Email", render: (row) => row.emailNeeded },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> }
];

const adminColumns: DataTableColumn<AdminTaskCommandRow>[] = [
  { key: "task", header: "Task", render: (row) => row.task },
  { key: "priority", header: "Priority", render: (row) => <StatusBadge label={row.priority} /> },
  { key: "due", header: "Due", render: (row) => row.due },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> }
];

function DocumentStatusCards({ rows }: { rows: DocumentDraftStatus[] }) {
  return (
    <div className="document-status-grid">
      {rows.map((row) => (
        <article key={row.id} className={`document-status-card command-kpi-${row.tone}`}>
          <FileText size={18} aria-hidden />
          <span>{row.document}</span>
          <strong>{row.status}</strong>
          <p>{row.notes}</p>
        </article>
      ))}
    </div>
  );
}

function MortgageTrackerCards() {
  return (
    <div className="amortization-grid">
      {mortgageRows.map((row) => (
        <article key={row.id} className={row.currentArrears > 0 ? "amortization-card danger" : "amortization-card"}>
          <span>{row.property}</span>
          <strong>{money(row.currentArrears)}</strong>
          <dl>
            <div>
              <dt>Monthly mortgage due</dt>
              <dd>{money(row.mortgageDueMonthly)}</dd>
            </div>
            <div>
              <dt>Paid this month</dt>
              <dd>{money(row.paidThisMonth)}</dd>
            </div>
            <div>
              <dt>Confirmation status</dt>
              <dd>{row.confirmationSaved}</dd>
            </div>
            <div>
              <dt>Next owner action</dt>
              <dd>{row.nextOwnerAction}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function CommandActionCards() {
  return (
    <div className="command-action-grid">
      {commandActionCards.map((action) => (
        <article key={action.id} className={`command-action-card command-kpi-${action.tone}`}>
          <div className="command-action-topline">
            <span>{action.actionType}</span>
            <StatusBadge label={action.status} />
          </div>
          <div className="safety-label-row">
            {action.safetyLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <dl className="action-safety-grid">
            <div>
              <dt>Safety gate</dt>
              <dd>Local sample mode only</dd>
            </div>
            <div>
              <dt>Live write disabled</dt>
              <dd>{action.liveWriteDisabled ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Owner approval required</dt>
              <dd>{action.ownerApprovalRequired ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <div>
            <span className="mini-heading">Will prepare</span>
            <ul className="action-prepare-list">
              {action.willPrepare.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className="action-disclaimer">{action.disclaimer}</p>
          <button type="button" className="command-disabled-button" disabled>
            Draft preview only
          </button>
        </article>
      ))}
    </div>
  );
}

function CommandQueue({ title, items }: { title: string; items: CommandQueueItem[] }) {
  return (
    <article className="command-queue-card">
      <div className="command-queue-heading">
        <span>{title}</span>
        <strong>{items.length}</strong>
      </div>
      <div className="command-queue-list">
        {items.map((item) => (
          <div key={item.id} className={`command-queue-item queue-${item.tone}`}>
            <span>{item.meta}</span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CommandAutomationTracker() {
  return (
    <Section eyebrow="Local Automation Readiness" title="Command Actions & Automation Tracker" icon={<ClipboardList size={20} aria-hidden />}>
      <p className="section-note">
        These controls prepare local review packages only. Google Drive, Gmail, Calendar, and Google Tasks writes are disabled until owner approval
        and a future live integration batch.
      </p>
      <CommandActionCards />
    </Section>
  );
}

function DailyCommandQueues() {
  const queues = [
    { title: "Today's Command Brief", items: todayCommandBrief },
    { title: "Next 7 Days", items: nextSevenDaysQueue },
    { title: "Tasks Needing Completion", items: tasksNeedingCompletionQueue },
    { title: "Proof Needed", items: proofNeededQueue },
    { title: "Blocked Until Verified", items: blockedUntilVerifiedQueue },
    { title: "Owner Approval Queue", items: ownerApprovalQueue },
    { title: "Communication Follow-Up Queue", items: communicationFollowUpQueue },
    { title: "Calendar/Suspense Queue", items: calendarSuspenseQueue }
  ];

  return (
    <Section eyebrow="Daily Use" title="Owner command queues" icon={<Bell size={20} aria-hidden />}>
      <div className="queue-grid">
        {queues.map((queue) => (
          <CommandQueue key={queue.title} title={queue.title} items={queue.items} />
        ))}
      </div>
    </Section>
  );
}

function IntegrationSafetySummary() {
  const items = [
    { label: "Google Drive", value: "No files created, moved, renamed, deleted, or updated", icon: <FolderArchive size={17} aria-hidden /> },
    { label: "Gmail", value: "No messages read, drafted, sent, archived, labeled, or deleted", icon: <MailCheck size={17} aria-hidden /> },
    { label: "Calendar", value: "No events created, updated, or deleted", icon: <CalendarClock size={17} aria-hidden /> },
    { label: "Google Tasks", value: "No tasks created, updated, completed, or deleted", icon: <ClipboardList size={17} aria-hidden /> }
  ];

  return (
    <div className="integration-safety-strip">
      {items.map((item) => (
        <article key={item.label}>
          {item.icon}
          <div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

export function OverviewView() {
  const [selectedMonth, setSelectedMonth] = useState(commandCenterPeriod.monthName);
  const [selectedYear, setSelectedYear] = useState(commandCenterPeriod.year);
  const health = useMemo(() => computeDashboardHealth(), []);
  const kpis = useMemo(() => commandKpis(), []);
  const hasPeriodData = selectedMonth === commandCenterPeriod.monthName && selectedYear === commandCenterPeriod.year;

  return (
    <div className="view-stack command-dashboard">
      <FilterBar month={selectedMonth} year={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
      <NotificationStrip />

      {!hasPeriodData ? (
        <EmptyState title="No local sample data available for this period." message="Choose May 2026 to view the current local command-center sample." />
      ) : (
        <>
          <section className="command-health-hero">
            <div>
              <p className="eyebrow">Command Evaluation</p>
              <h2>Property operation health: {health.overallHealth}</h2>
              <p>
                Critical status is driven by open mortgage arrears and a health/safety-sensitive maintenance item. Rent collection is above
                50% but still has ledger and verification risk.
              </p>
              <div className="hero-source-strip">
                <span>Local Sample Mode</span>
                <span>No live Google data</span>
                <span>No live actions</span>
              </div>
            </div>
            <div className={`health-score health-${toneForStatus(health.overallHealth)}`}>
              <span>Health score</span>
              <strong>{health.overallHealth}</strong>
              <small>{percent(health.rentCollectionRate)} rent collected</small>
            </div>
          </section>

          <section className="command-kpi-grid">
            {kpis.map((item) => (
              <CommandKpiTile key={item.label} item={item} />
            ))}
          </section>

          <section className="health-grid">
            {health.signals.map((signal) => (
              <HealthCard key={signal.label} label={signal.label} status={signal.status} explanation={signal.explanation} />
            ))}
          </section>

          <Section eyebrow="Cause of increase/decrease" title="Why totals changed" icon={<AlertTriangle size={20} aria-hidden />}>
            <div className="cause-grid">
              {health.causes.map((cause) => (
                <article key={cause}>
                  <CheckCircle2 size={17} aria-hidden />
                  <p>{cause}</p>
                </article>
              ))}
            </div>
          </Section>

          <IntegrationSafetySummary />
          <CommandAutomationTracker />
          <DailyCommandQueues />

          <div className="chart-grid">
            <ComparisonChart title="Month Paid vs Projected" projected={rentTotals.projected} collected={rentTotals.collected} />
            <YearTrendChart />
          </div>

          <Section eyebrow="Rent Collection" title="May 2026 rent ledger view" icon={<TrendingUp size={20} aria-hidden />}>
            <div className="rent-summary-strip">
              <span>Projected: <strong>{money(rentTotals.projected)}</strong></span>
              <span>Collected: <strong>{money(rentTotals.collected)}</strong></span>
              <span>Balance: <strong>{money(rentTotals.balance)}</strong></span>
              <span>Late fees: <strong>{money(rentTotals.lateFees)}</strong></span>
            </div>
            <DataTable rows={rentRows} columns={rentColumns} />
          </Section>

          <Section eyebrow="Maintenance" title="Maintenance health and open work" icon={<AlertTriangle size={20} aria-hidden />}>
            <div className="section-note critical-note">Critical maintenance follow-up is open for Unit 6 / Building Heat.</div>
            <DataTable rows={maintenanceRows} columns={maintenanceColumns} />
          </Section>

          <Section eyebrow="Lease Violations" title="Lease violations watchlist" icon={<ShieldCheck size={20} aria-hidden />}>
            {leaseViolations.length ? (
              <DataTable rows={leaseViolations} columns={leaseColumns} />
            ) : (
              <EmptyState title="No active lease violations in sample data" message="This section is ready for future local or approved live data." />
            )}
          </Section>

          <Section eyebrow="Notice / Legal Status" title="Notice status tracking" icon={<FileText size={20} aria-hidden />}>
            <p className="section-note">Display only. No notices are sent, filed, served, or created from this dashboard.</p>
            <DataTable rows={noticeRows} columns={noticeColumns} />
          </Section>

          <Section eyebrow="Codex Draft Status" title="Documents drafted by Codex" icon={<FileText size={20} aria-hidden />}>
            <DocumentStatusCards rows={documentDraftStatuses} />
          </Section>

          <Section eyebrow="Mortgage / Allotment" title="Mortgage and arrears command tracking" icon={<ShieldCheck size={20} aria-hidden />}>
            <MortgageTrackerCards />
            <DataTable rows={mortgageRows} columns={mortgageColumns} />
          </Section>

          <Section eyebrow="Follow-Up Calendar" title="Suspense and owner follow-ups" icon={<CalendarClock size={20} aria-hidden />}>
            <DataTable rows={followUpRows} columns={followUpColumns} />
          </Section>

          <Section eyebrow="Admin Tasks" title="Owner command task queue" icon={<Bell size={20} aria-hidden />}>
            <DataTable rows={adminTaskRows} columns={adminColumns} />
          </Section>
        </>
      )}
    </div>
  );
}
