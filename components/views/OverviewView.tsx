"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  FolderArchive,
  MailCheck,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { EmptyState } from "@/components/DataState";
import { OperationalAutomationPanels } from "@/components/OperationalAutomationPanels";
import { SheetsRefreshStatus } from "@/components/SheetsRefreshStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  adminTaskRows,
  blockedUntilVerifiedQueue,
  calendarSuspenseQueue,
  commandCenterPeriod,
  commandActionCards,
  codexCommandTemplates,
  communicationFollowUpQueue,
  computeDashboardHealth,
  dashboardNotifications,
  documentDraftStatuses,
  followUpRows,
  leaseViolations,
  maintenanceRows,
  money,
  monthOptions,
  monthlyCashflowTrend,
  monthlyRentTrend,
  mortgageRows,
  nextSevenDaysQueue,
  noticeRows,
  ownerApprovalQueue,
  percent,
  proofNeededQueue,
  rentTotals,
  tasksNeedingCompletionQueue,
  toneForStatus,
  todayCommandBrief,
  yearOptions,
  type AdminTaskCommandRow,
  type CodexCommandTemplate,
  type CommandQueueItem,
  type HealthStatus,
  type SignalTone
} from "@/lib/propertyCommandCenterData";
import { useSheetsView } from "@/components/views/useSheetsView";
import type { SystemStatus } from "@/types/sheets";

type SettingsPayload = {
  system: SystemStatus;
};

type CommandKpi = {
  label: string;
  value: string;
  helper: string;
  tone: SignalTone;
  footer: string;
};

type ExecutiveSummaryCard = {
  title: string;
  value: string;
  detail: string;
  href?: Route;
  action: string;
  tone: SignalTone;
};

function getTaskBadge(row: AdminTaskCommandRow) {
  const status = row.status.toLowerCase();
  const blocked = row.blockedAction?.toLowerCase() ?? "";

  if (row.taskBadge) {
    return row.taskBadge;
  }
  if (status.includes("verification")) {
    return "Verification Required";
  }
  if (status.includes("approval") || status.includes("owner review")) {
    return "Owner Approval Required";
  }
  if (status.includes("proof") || status.includes("confirmation")) {
    return "Proof Needed";
  }
  if (blocked.includes("do not") || status.includes("blocked")) {
    return "Blocked Until Verified";
  }
  return row.status.toLowerCase() === "complete" ? "Complete" : "Ready for Review";
}

function buildTaskSummary(rows: AdminTaskCommandRow[]) {
  return [
    { label: "Critical open tasks", value: rows.filter((row) => row.priority === "Critical" && row.status.toLowerCase() !== "complete").length, tone: "red" },
    { label: "Verification tasks", value: rows.filter((row) => getTaskBadge(row) === "Verification Required").length, tone: "yellow" },
    { label: "Approval tasks", value: rows.filter((row) => getTaskBadge(row) === "Owner Approval Required").length, tone: "yellow" },
    { label: "Proof-needed tasks", value: rows.filter((row) => getTaskBadge(row) === "Proof Needed").length, tone: "red" },
    { label: "Completed tasks", value: rows.filter((row) => row.status.toLowerCase() === "complete").length, tone: "green" }
  ] as const;
}

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

function ExecutiveSummaryCards() {
  const openMaintenance = maintenanceRows.filter((row) => row.status.toLowerCase() !== "complete").length;
  const openFollowUps = followUpRows.filter((row) => row.status.toLowerCase() !== "complete").length;
  const criticalTasks = adminTaskRows.filter((row) => row.priority === "Critical" && row.status.toLowerCase() !== "complete").length;
  const mortgageArrears = mortgageRows.reduce((total, row) => total + row.currentArrears, 0);
  const noticeWatch = noticeRows.filter((row) => row.status.toLowerCase().includes("verification") || row.status.toLowerCase().includes("review")).length;
  const draftBlocks = documentDraftStatuses.filter((row) => row.tone !== "green").length;
  const cards: ExecutiveSummaryCard[] = [
    {
      title: "Rent Collection Summary",
      value: `${percent(rentTotals.collected / rentTotals.projected)} collected`,
      detail: `${money(rentTotals.balance)} balance remains in local sample data.`,
      href: "/rent-collection",
      action: "Open Rent Collection tab",
      tone: "yellow"
    },
    {
      title: "Maintenance Summary",
      value: `${openMaintenance} open`,
      detail: "Critical Unit 6 heat/breathing follow-up remains visible.",
      href: "/maintenance",
      action: "Open Maintenance tab",
      tone: "red"
    },
    {
      title: "Lease Violations Summary",
      value: `${leaseViolations.length} active`,
      detail: leaseViolations.length ? "Lease violation records need review." : "No active lease violations in sample data.",
      href: "/lease-violations",
      action: "Open Lease Violations tab",
      tone: "green"
    },
    {
      title: "Notice / Legal Summary",
      value: `${noticeWatch} review items`,
      detail: "Display only. No notices are sent, filed, served, or created.",
      href: "/notices-evictions",
      action: "Open Notices tab",
      tone: "yellow"
    },
    {
      title: "Codex Draft Summary",
      value: `${draftBlocks} blocked/review`,
      detail: "Draft status remains owner-review only; no legal documents are created here.",
      href: "/draft-status",
      action: "Open Draft Status tab",
      tone: "red"
    },
    {
      title: "Mortgage / Allotment Summary",
      value: money(mortgageArrears),
      detail: "MBFS posting confirmation and allotment setup remain priority checks.",
      href: "/mortgage-arrears",
      action: "Open Mortgage tab",
      tone: "red"
    },
    {
      title: "Follow-Up Summary",
      value: `${openFollowUps} open`,
      detail: "Calendar/suspense items are tracked locally for owner review.",
      href: "/calendar-follow-ups",
      action: "Open Follow-Up Calendar tab",
      tone: "yellow"
    },
    {
      title: "Admin Tasks Summary",
      value: `${criticalTasks} critical`,
      detail: "Verification, proof, and approval tasks are ready for daily review.",
      href: "/admin-tasks",
      action: "Open Admin Tasks tab",
      tone: "red"
    },
    {
      title: "Live Readiness Summary",
      value: "Drive read-only first",
      detail: "Real data cleanup, proof verification, and integration planning stay preview-only.",
      href: "/live-readiness",
      action: "Open Live Readiness tab",
      tone: "yellow"
    },
    {
      title: "Real Data Cleanup",
      value: "Import prep blocked",
      detail: "Verify source data, track proof gaps, prepare import worksheet, and block unverified values.",
      href: "/real-data-cleanup",
      action: "Open Real Data Cleanup tab",
      tone: "red"
    },
    {
      title: "Operations Readiness",
      value: "5-phase plan",
      detail: "Verify live site, clean real data, and prepare Drive read-only as the first safe integration.",
      href: "/operations-readiness",
      action: "Open Operations Readiness tab",
      tone: "yellow"
    },
    {
      title: "Drive Read-Only",
      value: "Metadata only",
      detail: "Folder listing only, proof folder visibility, no Drive writes, token outside repo.",
      href: "/drive-readonly",
      action: "Open Drive Read-Only tab",
      tone: "green"
    },
    {
      title: "Final Integration",
      value: "Launch prep",
      detail: "Drive correction preview, verified data forms, import mapping, SOP launch checklist.",
      href: "/final-integration",
      action: "Open Final Integration tab",
      tone: "yellow"
    }
  ];

  return (
    <Section eyebrow="Executive Summaries" title="Operational tabs at a glance" icon={<ShieldCheck size={20} aria-hidden />}>
      <div className="overview-summary-grid">
        {cards.map((card) => (
          <article key={card.title} className={`overview-summary-card queue-${card.tone}`}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
            {card.href ? (
              <Link href={card.href} className="summary-link-button">
                {card.action}
              </Link>
            ) : (
              <button type="button" className="summary-link-button pending" disabled>
                {card.action} · Tab buildout pending
              </button>
            )}
          </article>
        ))}
      </div>
    </Section>
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

function CodexCommandGenerator() {
  const [activeCommand, setActiveCommand] = useState<CodexCommandTemplate | null>(null);
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);

  async function copyCommand(command: CodexCommandTemplate) {
    const commandText = `${command.title}\n\n${command.prompt}`;
    const copied = await copyTextToClipboard(commandText);
    setCopiedCommandId(copied ? command.id : null);
  }

  return (
    <div className="codex-command-generator">
      <div className="command-button-grid">
        {codexCommandTemplates.map((command) => (
          <article key={command.id} className={`codex-command-card command-kpi-${command.tone}`}>
            <span>{command.actionName}</span>
            <strong>{command.controls}</strong>
            <p>{command.safetyStatus}</p>
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
        <aside className="command-preview-panel" aria-live="polite">
          <div className="command-preview-header">
            <div>
              <p className="eyebrow">Command Preview</p>
              <h3>{activeCommand.title}</h3>
            </div>
            <button type="button" className="ghost-button" onClick={() => setActiveCommand(null)}>
              Close
            </button>
          </div>
          <div className="command-preview-labels">
            <span>Draft command only</span>
            <span>Owner approval required</span>
            <span>Live write disabled from dashboard</span>
            <span>Paste into Codex to execute</span>
          </div>
          <p className="command-preview-warning">
            This dashboard does not perform live Google actions. It only prepares the Codex command.
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
      <CodexCommandGenerator />
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

function VerificationHighlights() {
  const taskSummary = buildTaskSummary(adminTaskRows);
  const highlightedTasks = adminTaskRows
    .filter((row) => ["Verification Required", "Owner Approval Required", "Proof Needed", "Blocked Until Verified", "Ready for Review"].includes(getTaskBadge(row)))
    .slice(0, 6);

  return (
    <Section eyebrow="Verification / Approval Highlights" title="Tasks that still need owner attention" icon={<Bell size={20} aria-hidden />}>
      <div className="task-summary-grid">
        {taskSummary.map((item) => (
          <article key={item.label} className={`task-summary-card queue-${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
      <div className="verification-highlight-grid">
        {highlightedTasks.map((task) => (
          <article key={task.id} className={`verification-highlight-card queue-${task.priority === "Critical" ? "red" : "yellow"}`}>
            <div>
              <span>{task.category ?? "Admin / Operations"}</span>
              <StatusBadge label={getTaskBadge(task)} />
            </div>
            <strong>{task.task}</strong>
            <p>{task.blockedAction ?? `Due ${task.due}. Live Google Tasks disabled until owner approval.`}</p>
            <footer>
              <span>Live Google Tasks disabled</span>
              <span>Ready for future sync</span>
              <span>Owner approval required before creation</span>
            </footer>
          </article>
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

function MonthlyCashflowTrendChart() {
  const maxMagnitude = Math.max(...monthlyCashflowTrend.flatMap((row) => [Math.abs(row.cashflow), Math.abs(row.noi)]), 1);
  const points = monthlyCashflowTrend.map((row, index) => {
    const x = monthlyCashflowTrend.length === 1 ? 50 : (index / (monthlyCashflowTrend.length - 1)) * 100;
    const y = 100 - ((row.noi + maxMagnitude) / (maxMagnitude * 2)) * 100;
    return `${x},${y}`;
  });

  return (
    <Section eyebrow="Cashflow Charts" title="Monthly Cashflow Trend" icon={<TrendingUp size={20} aria-hidden />}>
      <div className="cashflow-trend-card">
        <div className="cashflow-chart-area" aria-label="Monthly cashflow bar chart with NOI line trend">
          <svg className="cashflow-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline points={points.join(" ")} />
          </svg>
          {monthlyCashflowTrend.map((row) => {
            const positive = row.cashflow >= 0;
            const barHeight = Math.max((Math.abs(row.cashflow) / maxMagnitude) * 48, 4);
            return (
              <div key={row.month} className="cashflow-month">
                <div className="cashflow-bar-stage">
                  <span
                    className={positive ? "cashflow-bar positive" : "cashflow-bar negative"}
                    style={{ "--bar-height": `${barHeight}%` } as CSSProperties}
                  />
                </div>
                <strong>{row.month.replace(" 2026", "")}</strong>
              </div>
            );
          })}
        </div>
        <div className="cashflow-trend-legend">
          <span><i className="legend-bar" /> Monthly cashflow bar</span>
          <span><i className="legend-line" /> NOI line</span>
        </div>
        <div className="cashflow-detail-grid">
          {monthlyCashflowTrend.map((row) => (
            <article key={row.month} className={row.cashflow >= 0 ? "cashflow-detail positive" : "cashflow-detail negative"}>
              <span>{row.month}</span>
              <strong>{money(row.cashflow)}</strong>
              <dl>
                <div><dt>Projected</dt><dd>{money(row.projectedRent)}</dd></div>
                <div><dt>Collected</dt><dd>{money(row.rentCollected)}</dd></div>
                <div><dt>Utilities</dt><dd>{money(row.utilities)}</dd></div>
                <div><dt>Maintenance</dt><dd>{money(row.maintenance)}</dd></div>
                <div><dt>Mortgage Paid</dt><dd>{money(row.mortgagePaid)}</dd></div>
                <div><dt>NOI</dt><dd>{money(row.noi)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <p className="cashflow-chart-note">
          Cashflow is based on local sample dashboard data. Live bank, lender, Google Sheets, and RentRedi data are not connected.
        </p>
      </div>
    </Section>
  );
}

export function OverviewView() {
  const [selectedMonth, setSelectedMonth] = useState(commandCenterPeriod.monthName);
  const [selectedYear, setSelectedYear] = useState(commandCenterPeriod.year);
  const { system } = useSheetsView<SettingsPayload>("settings");
  const health = useMemo(() => computeDashboardHealth(), []);
  const kpis = useMemo(() => commandKpis(), []);
  const hasPeriodData = selectedMonth === commandCenterPeriod.monthName && selectedYear === commandCenterPeriod.year;
  const dataSourceLabel = system?.dataMode === "live" ? "Live Google Sheets" : "Local Sample";
  const lastRefreshLabel = system?.lastSuccessfulRefresh ? new Date(system.lastSuccessfulRefresh).toLocaleString() : "Not available";

  return (
    <div className="view-stack command-dashboard">
      <FilterBar month={selectedMonth} year={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
      <SheetsRefreshStatus system={system} />
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
                <span>{dataSourceLabel}</span>
                <span>Last refreshed: {lastRefreshLabel}</span>
                <span>Refresh page to pull latest Google Sheets data</span>
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
          <OperationalAutomationPanels />
          <CommandAutomationTracker />
          <DailyCommandQueues />
          <ExecutiveSummaryCards />
          <VerificationHighlights />

          <div className="chart-grid">
            <ComparisonChart title="Month Paid vs Projected" projected={rentTotals.projected} collected={rentTotals.collected} />
            <YearTrendChart />
          </div>

          <MonthlyCashflowTrendChart />
        </>
      )}
    </div>
  );
}
