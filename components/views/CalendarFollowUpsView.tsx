"use client";

import { useMemo, useState } from "react";
import { Bell, CalendarClock, CheckCircle2, ClipboardList, Copy, Mail, Search, ShieldAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  commandCenterPeriod,
  followUpRows,
  monthOptions,
  yearOptions,
  type FollowUpCommandRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";

type FollowUpFilter = {
  property: string;
  unit: string;
  type: string;
  module: string;
  priority: string;
  status: string;
  calendarNeeded: boolean;
  emailNeeded: boolean;
  ownerApproval: boolean;
  blocked: boolean;
  dueToday: boolean;
  nextSevenDays: boolean;
  search: string;
};

type CalendarCommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  tone: SignalTone;
  prompt: string;
};

const defaultFilters: FollowUpFilter = {
  property: "All",
  unit: "All",
  type: "All",
  module: "All",
  priority: "All",
  status: "All",
  calendarNeeded: false,
  emailNeeded: false,
  ownerApproval: false,
  blocked: false,
  dueToday: false,
  nextSevenDays: false,
  search: ""
};

const currentDate = new Date("2026-05-13T12:00:00");

const blockedWarnings = [
  "Do not create notice-related calendar follow-ups until ledger/Section 8 status is verified.",
  "Do not close mortgage follow-up until lender posting proof is saved.",
  "Do not close maintenance safety follow-up until tenant/vendor confirmation or proof is saved.",
  "Do not mark payment arrangement follow-up complete until payment proof is verified."
];

const commandTemplates: CalendarCommandTemplate[] = [
  {
    id: "followup-review",
    title: "Codex Command - Calendar Follow-Up Review",
    actionName: "Generate Codex Command: Calendar Follow-Up Review",
    controls: "Suspense dates, due-soon items, calendar-needed items, approvals, and blocked items.",
    tone: "yellow",
    prompt: `Run a Calendar Follow-Ups review for the Property Command Center.

Rules:
- Read-only/local review first.
- Do not create, update, or delete Google Calendar events.
- Do not create/update/complete Google Tasks.
- Do not send emails or messages.
- Do not update Google Drive, Gmail, Sheets, RentRedi, tenant, legal, mortgage, or vendor records without owner approval.
- Review suspense dates, recurring reviews, due-soon items, overdue items, calendar-needed items, email-needed items, owner approval items, and blocked-until-verified items.
- Produce a calendar follow-up preview report.
- Stop before all live actions.`
  },
  {
    id: "event-prep",
    title: "Codex Command - Calendar Event Prep",
    actionName: "Generate Codex Command: Calendar Event Prep",
    controls: "Proposed event titles, times, descriptions, modules, trigger prompts, and approvals.",
    tone: "yellow",
    prompt: `Prepare Google Calendar event previews for the Property Command Center.

Rules:
- Do not create or update calendar events without owner approval.
- Generate proposed calendar events only.
- For each event, show:
  1. Event title
  2. Date/time
  3. Description
  4. Related module
  5. Trigger prompt
  6. Owner approval requirement
- Stop before live Calendar actions.`
  },
  {
    id: "weekly-review",
    title: "Codex Command - Weekly Admin Review Prep",
    actionName: "Generate Codex Command: Weekly Admin Review Prep",
    controls: "Weekly review across rent, maintenance, notices, mortgage, utilities, Gmail, Drive, Calendar, tasks, and approvals.",
    tone: "green",
    prompt: `Prepare the Weekly Property Admin Review.

Rules:
- Do not perform live Google Drive, Gmail, Calendar, Task, Sheets, RentRedi, tenant, legal, payment, or mortgage actions.
- Prepare a weekly review preview covering:
  1. Rent collection
  2. Maintenance
  3. Notices/legal holds
  4. Mortgage/arrears
  5. Utilities
  6. Gmail follow-ups
  7. Drive update needs
  8. Calendar follow-ups
  9. Open tasks
  10. Owner approvals required
- Stop before live actions.`
  },
  {
    id: "rent-calendar",
    title: "Codex Command - Rent Follow-Up Calendar Prep",
    actionName: "Generate Codex Command: Rent Follow-Up Calendar Prep",
    controls: "Rent due checks, late rent review, arrangement dates, ledger checks, and Section 8/HAP verification.",
    tone: "yellow",
    prompt: `Prepare rent-related calendar follow-ups.

Rules:
- Do not create calendar events.
- Do not send tenant messages.
- Do not create notices.
- Prepare event previews for rent due checks, late rent review, payment arrangement dates, ledger verification, and Section 8/HAP verification.
- Stop before live actions.`
  },
  {
    id: "mortgage-calendar",
    title: "Codex Command - Mortgage Follow-Up Calendar Prep",
    actionName: "Generate Codex Command: Mortgage Follow-Up Calendar Prep",
    controls: "Payment posting, updated balance, proof, next due date, allotment, and arrears review.",
    tone: "red",
    prompt: `Prepare mortgage-related calendar follow-ups.

Rules:
- Do not create calendar events or tasks.
- Do not contact lender, MBFS, bank, tenants, or property manager.
- Prepare event previews for payment posting confirmation, updated balance, proof saving, next due date, allotment setup, and weekly arrears review.
- Stop before live actions.`
  },
  {
    id: "maintenance-calendar",
    title: "Codex Command - Maintenance Follow-Up Calendar Prep",
    actionName: "Generate Codex Command: Maintenance Follow-Up Calendar Prep",
    controls: "Safety follow-up, vendor follow-up, proof collection, invoice/photos, and tenant update review.",
    tone: "red",
    prompt: `Prepare maintenance-related calendar follow-ups.

Rules:
- Do not create calendar events or tasks.
- Do not contact tenants or vendors.
- Prepare event previews for safety issue follow-up, vendor follow-up, proof collection, invoice/photo confirmation, and tenant update review.
- Stop before live actions.`
  },
  {
    id: "sync-preview",
    title: "Codex Command - Calendar / Task Sync Preview",
    actionName: "Generate Codex Command: Calendar / Task Sync Preview",
    controls: "Preview which follow-ups should become calendar events or future tasks.",
    tone: "yellow",
    prompt: `Prepare a Calendar and Task sync preview.

Rules:
- Do not create, update, complete, or delete Calendar events or Google Tasks.
- Produce a preview of which follow-ups should become calendar events and which should become tasks.
- Include owner approvals required and blocked-until-verified items.
- Stop before live actions.`
  }
];

function parseDate(row: FollowUpCommandRow) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null;
  return new Date(`${row.date}T12:00:00`);
}

function priority(row: FollowUpCommandRow): "Critical" | "High" | "Medium" {
  const text = `${row.item} ${row.detail} ${row.category}`.toLowerCase();
  if (text.includes("mortgage") || text.includes("safety") || text.includes("notice status")) return "Critical";
  if (text.includes("utility")) return "Medium";
  return "High";
}

function isRecurring(row: FollowUpCommandRow) {
  return row.date.startsWith("Every");
}

function isPastDue(row: FollowUpCommandRow) {
  const date = parseDate(row);
  return Boolean(date && date < currentDate && row.status.toLowerCase() !== "complete");
}

function isDueToday(row: FollowUpCommandRow) {
  const date = parseDate(row);
  return Boolean(date && date.toDateString() === currentDate.toDateString());
}

function isNextSevenDays(row: FollowUpCommandRow) {
  const date = parseDate(row);
  if (!date) return false;
  const until = new Date(currentDate);
  until.setDate(until.getDate() + 7);
  return date >= currentDate && date <= until;
}

function calendarNeeded(row: FollowUpCommandRow) {
  return row.calendarNeeded.toLowerCase().includes("calendar");
}

function emailNeeded(row: FollowUpCommandRow) {
  const value = row.emailNeeded.toLowerCase();
  return value.includes("needed") || value.includes("as needed") || value.includes("email as");
}

function ownerApprovalNeeded(row: FollowUpCommandRow) {
  return calendarNeeded(row) || emailNeeded(row) || priority(row) === "Critical";
}

function blocked(row: FollowUpCommandRow) {
  const text = `${row.item} ${row.detail} ${row.category}`.toLowerCase();
  return text.includes("notice") || text.includes("mortgage") || text.includes("safety") || text.includes("payment arrangement");
}

function groupDateLabel(row: FollowUpCommandRow) {
  if (isRecurring(row)) return "Recurring";
  if (isDueToday(row)) return "Today";
  if (isPastDue(row)) return "Past Due";
  if (isNextSevenDays(row)) return "Next 7 Days";
  return "Later";
}

function matchesFilters(row: FollowUpCommandRow, filters: FollowUpFilter) {
  const haystack = [row.date, row.time, row.property, row.unit, row.item, row.detail, row.category, row.calendarNeeded, row.emailNeeded, priority(row), row.status]
    .join(" ")
    .toLowerCase();

  if (filters.property !== "All" && row.property !== filters.property) return false;
  if (filters.unit !== "All" && row.unit !== filters.unit) return false;
  if (filters.type !== "All" && row.item !== filters.type) return false;
  if (filters.module !== "All" && row.category !== filters.module) return false;
  if (filters.priority !== "All" && priority(row) !== filters.priority) return false;
  if (filters.status !== "All" && row.status !== filters.status) return false;
  if (filters.calendarNeeded && !calendarNeeded(row)) return false;
  if (filters.emailNeeded && !emailNeeded(row)) return false;
  if (filters.ownerApproval && !ownerApprovalNeeded(row)) return false;
  if (filters.blocked && !blocked(row)) return false;
  if (filters.dueToday && !isDueToday(row)) return false;
  if (filters.nextSevenDays && !isNextSevenDays(row)) return false;
  if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
  return true;
}

function statusTone(row: FollowUpCommandRow): SignalTone {
  if (isPastDue(row) || blocked(row) && priority(row) === "Critical") return "red";
  if (isDueToday(row) || isNextSevenDays(row) || calendarNeeded(row) || ownerApprovalNeeded(row)) return "yellow";
  return "green";
}

function CalendarHeader() {
  return (
    <section className="calendar-command-header">
      <div>
        <p className="eyebrow">Local Sample Mode</p>
        <h2>Calendar Follow-Ups Command</h2>
        <p>Suspense dates, owner follow-ups, recurring reviews, calendar-needed actions, email-needed actions, and task reminders.</p>
        <div className="hero-source-strip">
          <span>Local Sample Mode</span>
          <span>No live Google Calendar, Gmail, Drive, or Task updates</span>
          <span>Last updated: May 21, 2026, 9:00 AM</span>
        </div>
      </div>
      <div className="rent-period-filter">
        <label>
          Month
          <select value={commandCenterPeriod.monthName} disabled>
            {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
        <label>
          Year
          <select value={commandCenterPeriod.year} disabled>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function CalendarKpis() {
  const open = followUpRows.filter((row) => row.status.toLowerCase() !== "complete").length;
  const today = followUpRows.filter(isDueToday).length;
  const week = followUpRows.filter(isNextSevenDays).length;
  const overdue = followUpRows.filter(isPastDue).length;
  const calendarCount = followUpRows.filter(calendarNeeded).length;
  const emailCount = followUpRows.filter(emailNeeded).length;
  const approval = followUpRows.filter(ownerApprovalNeeded).length;
  const blockedCount = followUpRows.filter(blocked).length;

  const cards = [
    { label: "Open Follow-Ups", value: String(open), helper: "Open local suspense items", tone: "yellow" as SignalTone },
    { label: "Due Today", value: String(today), helper: "May 13 local sample due date", tone: today ? "yellow" as SignalTone : "green" as SignalTone },
    { label: "Due This Week", value: String(week), helper: "Upcoming dated follow-ups", tone: week ? "yellow" as SignalTone : "green" as SignalTone },
    { label: "Overdue / Past Due", value: String(overdue), helper: "Past due local follow-ups", tone: overdue ? "red" as SignalTone : "green" as SignalTone },
    { label: "Calendar Needed", value: String(calendarCount), helper: "Preview only; no events created", tone: "yellow" as SignalTone },
    { label: "Email Needed", value: String(emailCount), helper: "No emails drafted or sent here", tone: "yellow" as SignalTone },
    { label: "Owner Approval Required", value: String(approval), helper: "Needed before live Calendar/Gmail/Tasks", tone: "yellow" as SignalTone },
    { label: "Blocked Until Verified", value: String(blockedCount), helper: "Verification gates stay active", tone: blockedCount ? "red" as SignalTone : "green" as SignalTone }
  ];

  return (
    <section className="calendar-kpi-grid">
      {cards.map((card) => (
        <article key={card.label} className="kpi-card command-kpi">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.helper}</p>
          <div className={`kpi-status-strip ${card.tone}`}>{card.tone === "green" ? "Clear" : card.tone === "yellow" ? "Review" : "Blocked / urgent"}</div>
        </article>
      ))}
    </section>
  );
}

function CalendarHealthEvaluation() {
  return (
    <section className="calendar-health-panel">
      <div>
        <p className="eyebrow">Follow-up health evaluation</p>
        <h3>Watch / Active Follow-Up Load</h3>
        <p>
          Multiple operational follow-ups remain open across rent, mortgage, maintenance, notices, utilities, and owner decisions.
          Calendar events are not live-created yet; this page prepares the owner review queue only.
        </p>
      </div>
      <div className="calendar-cause-grid">
        <article><Bell size={18} /><strong>Priority load</strong><p>Mortgage posting confirmation remains high priority, and the Unit 6 maintenance safety follow-up remains critical.</p></article>
        <article><CalendarClock size={18} /><strong>Calendar preview</strong><p>Rent/payment arrangement dates need monitoring, but live Google Calendar updates require owner approval later.</p></article>
        <article><ShieldAlert size={18} /><strong>Owner next actions</strong><p>Review today/this week, decide future events, keep blocked items blocked, and use command buttons for previews.</p></article>
      </div>
    </section>
  );
}

function CalendarFilters({ filters, onChange }: { filters: FollowUpFilter; onChange: (next: FollowUpFilter) => void }) {
  const properties = ["All", ...Array.from(new Set(followUpRows.map((row) => row.property)))];
  const units = ["All", ...Array.from(new Set(followUpRows.map((row) => row.unit)))];
  const types = ["All", ...Array.from(new Set(followUpRows.map((row) => row.item)))];
  const modules = ["All", ...Array.from(new Set(followUpRows.map((row) => row.category)))];
  const priorities = ["All", "Critical", "High", "Medium"];
  const statuses = ["All", ...Array.from(new Set(followUpRows.map((row) => row.status)))];

  return (
    <section className="calendar-filter-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Follow-up filters</p>
          <h3>Find due, blocked, and owner approval items</h3>
        </div>
        <div className="search-pill">
          <Search size={16} />
          <input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search reason or follow-up text" />
        </div>
      </div>
      <div className="calendar-filter-grid">
        {[
          ["Property", "property", properties],
          ["Unit", "unit", units],
          ["Follow-Up Type", "type", types],
          ["Related Module", "module", modules],
          ["Priority", "priority", priorities],
          ["Status", "status", statuses]
        ].map(([label, key, options]) => (
          <label key={key as string}>
            {label as string}
            <select value={filters[key as keyof FollowUpFilter] as string} onChange={(event) => onChange({ ...filters, [key as string]: event.target.value })}>
              {(options as string[]).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="filter-toggle-row">
        <label><input type="checkbox" checked={filters.calendarNeeded} onChange={(event) => onChange({ ...filters, calendarNeeded: event.target.checked })} /> Calendar Needed</label>
        <label><input type="checkbox" checked={filters.emailNeeded} onChange={(event) => onChange({ ...filters, emailNeeded: event.target.checked })} /> Email Needed</label>
        <label><input type="checkbox" checked={filters.ownerApproval} onChange={(event) => onChange({ ...filters, ownerApproval: event.target.checked })} /> Owner Approval Needed</label>
        <label><input type="checkbox" checked={filters.blocked} onChange={(event) => onChange({ ...filters, blocked: event.target.checked })} /> Blocked</label>
        <label><input type="checkbox" checked={filters.dueToday} onChange={(event) => onChange({ ...filters, dueToday: event.target.checked })} /> Due Today</label>
        <label><input type="checkbox" checked={filters.nextSevenDays} onChange={(event) => onChange({ ...filters, nextSevenDays: event.target.checked })} /> Next 7 Days</label>
      </div>
    </section>
  );
}

function CalendarQueues() {
  const dueToday = followUpRows.filter((row) => isDueToday(row) || priority(row) === "Critical");
  const nextSeven = followUpRows.filter(isNextSevenDays);
  const recurring = followUpRows.filter(isRecurring);
  const calendarQueue = followUpRows.filter(calendarNeeded);
  const emailQueue = followUpRows.filter(emailNeeded);
  const ownerQueue = followUpRows.filter(ownerApprovalNeeded);

  const groups = [
    { title: "Today's Follow-Ups", items: dueToday, icon: <Bell size={17} /> },
    { title: "Next 7 Days", items: nextSeven, icon: <CalendarClock size={17} /> },
    { title: "Recurring Reviews", items: recurring, icon: <CheckCircle2 size={17} /> },
    { title: "Calendar Needed Queue", items: calendarQueue, icon: <CalendarClock size={17} /> },
    { title: "Email Draft Needed Queue", items: emailQueue, icon: <Mail size={17} />, warning: "No emails are drafted or sent from this dashboard." },
    { title: "Owner Approval Queue", items: ownerQueue, icon: <ShieldAlert size={17} /> }
  ];

  return (
    <section className="calendar-queue-grid">
      {groups.map((group) => (
        <article key={group.title} className="calendar-queue-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">{group.title}</p>
              <h3>{group.items.length} items</h3>
            </div>
            {group.icon}
          </div>
          {group.warning ? <p className="warning-note">{group.warning}</p> : null}
          <div className="calendar-mini-list">
            {group.items.slice(0, 5).map((row) => (
              <div key={`${group.title}-${row.id}`}>
                <strong>{row.item}</strong>
                <span>{row.date} {row.time} / {row.property} / {row.unit}</span>
                <p>{row.detail}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function CalendarBlockedAndPreview() {
  const previewItems = followUpRows.filter((row) => calendarNeeded(row) && !isRecurring(row)).slice(0, 4);

  return (
    <section className="calendar-two-column">
      <article className="calendar-blocked-panel">
        <p className="eyebrow">Blocked until verified</p>
        <h3>Verification gates</h3>
        <ul>{blockedWarnings.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
      <article className="calendar-preview-panel">
        <p className="eyebrow">Calendar / Task Preview</p>
        <h3>Preview only / Not created</h3>
        <div className="calendar-preview-list">
          {previewItems.map((row) => (
            <div key={row.id}>
              <span>Event Title</span>
              <strong>{row.item}</strong>
              <p>{row.date} at {row.time} - {row.detail}</p>
              <small>Trigger prompt: Prepare {row.category} follow-up preview for owner approval.</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function CalendarCommandButtons() {
  const [selected, setSelected] = useState<CalendarCommandTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="calendar-command-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Codex command buttons</p>
          <h3>Calendar workflow prompts</h3>
        </div>
        <StatusBadge label="Draft command only" />
      </div>
      <div className="calendar-command-button-grid">
        {commandTemplates.map((template) => (
          <button key={template.id} className={`command-action-button ${template.tone}`} type="button" onClick={() => setSelected(template)}>
            <ClipboardList size={18} />
            <span>{template.actionName}</span>
            <small>{template.controls}</small>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="calendar-command-preview">
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
            <span>No Calendar event created</span>
            <span>No Gmail sent</span>
            <span>No Google Task created</span>
          </div>
          <pre>{selected.prompt}</pre>
          <p>This dashboard does not create calendar events, send emails, create tasks, update Drive, or change live records.</p>
        </div>
      ) : null}
    </section>
  );
}

export function CalendarFollowUpsView() {
  const [filters, setFilters] = useState(defaultFilters);
  const filteredRows = useMemo(() => followUpRows.filter((row) => matchesFilters(row, filters)), [filters]);

  const columns: DataTableColumn<FollowUpCommandRow>[] = [
    { key: "date", header: "Follow-Up Date", render: (row) => row.date },
    { key: "time", header: "Time", render: (row) => row.time },
    { key: "property", header: "Property", render: (row) => row.property },
    { key: "unit", header: "Unit", render: (row) => row.unit },
    { key: "item", header: "Follow-Up Type", render: (row) => row.item },
    { key: "reason", header: "Reason", render: (row) => row.detail },
    { key: "module", header: "Related Sheet / Module", render: (row) => row.category },
    { key: "calendar", header: "Calendar Event Needed", render: (row) => row.calendarNeeded },
    { key: "email", header: "Email Draft Needed", render: (row) => row.emailNeeded.replace("Email ", "") },
    { key: "priority", header: "Priority", render: (row) => <StatusBadge label={priority(row)} /> },
    { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
    { key: "approval", header: "Owner Approval Needed", render: (row) => ownerApprovalNeeded(row) ? "Yes" : "No" },
    { key: "blocked", header: "Blocked Until Verified", render: (row) => blocked(row) ? "Yes" : "No" },
    { key: "notes", header: "Result / Notes", render: (row) => groupDateLabel(row) },
    { key: "risk", header: "Risk", render: (row) => <span className={`risk-dot ${statusTone(row)}`}>{statusTone(row) === "red" ? "Urgent" : statusTone(row) === "yellow" ? "Review" : "Clear"}</span> }
  ];

  return (
    <div className="calendar-command-page">
      <CalendarHeader />
      <CalendarKpis />
      <CalendarHealthEvaluation />
      <CalendarFilters filters={filters} onChange={setFilters} />
      {filteredRows.length ? (
        <DataTable rows={filteredRows} columns={columns} />
      ) : (
        <EmptyState title="No follow-ups match these filters" message="Adjust the local sample filters to view suspense and follow-up records." />
      )}
      <CalendarQueues />
      <CalendarBlockedAndPreview />
      <CalendarCommandButtons />
    </div>
  );
}
