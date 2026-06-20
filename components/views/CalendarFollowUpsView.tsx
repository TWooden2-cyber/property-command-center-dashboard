"use client";

import { useMemo, useState } from "react";
import { Bell, CalendarClock, CheckCircle2, ClipboardList, Mail, Search, ShieldAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { SheetsSourcePanel } from "@/components/SheetsSourcePanel";
import { StatusBadge } from "@/components/StatusBadge";
import { flattenCalendarGroups, localDevelopmentFallbackAllowed } from "@/components/views/liveSheetAdapters";
import { useSheetsView } from "@/components/views/useSheetsView";
import {
  commandCenterPeriod,
  followUpRows,
  monthOptions,
  yearOptions,
  type FollowUpCommandRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";
import type { CalendarFollowUpRecord } from "@/types/sheets";

type CalendarPayload = {
  groups: Record<CalendarFollowUpRecord["group"], CalendarFollowUpRecord[]>;
};

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

const currentDate = new Date();

const blockedWarnings = [
  "Do not create notice-related calendar follow-ups until ledger/Section 8 status is verified.",
  "Do not close mortgage follow-up until lender posting proof is saved.",
  "Do not close maintenance safety follow-up until tenant/vendor confirmation or proof is saved.",
  "Do not mark payment arrangement follow-up complete until payment proof is verified."
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
        <p className="eyebrow">Read-only follow-up tracker</p>
        <h2>Calendar Follow-Ups Command</h2>
        <p>Suspense dates, owner follow-ups, recurring reviews, calendar-needed actions, email-needed actions, and task reminders.</p>
        <div className="hero-source-strip">
          <span>Google Sheets preferred</span>
          <span>No Google Calendar, Gmail, Drive, or Task writes</span>
          <span>Follow-up status only</span>
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

function CalendarKpis({ rows }: { rows: FollowUpCommandRow[] }) {
  const open = rows.filter((row) => row.status.toLowerCase() !== "complete").length;
  const today = rows.filter(isDueToday).length;
  const week = rows.filter(isNextSevenDays).length;
  const overdue = rows.filter(isPastDue).length;
  const calendarCount = rows.filter(calendarNeeded).length;
  const emailCount = rows.filter(emailNeeded).length;
  const approval = rows.filter(ownerApprovalNeeded).length;
  const blockedCount = rows.filter(blocked).length;

  const cards = [
    { label: "Open Follow-Ups", value: String(open), helper: "Open suspense items", tone: "yellow" as SignalTone },
    { label: "Due Today", value: String(today), helper: "Due against current date", tone: today ? "yellow" as SignalTone : "green" as SignalTone },
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

function CalendarFilters({ filters, onChange, rows }: { filters: FollowUpFilter; onChange: (next: FollowUpFilter) => void; rows: FollowUpCommandRow[] }) {
  const properties = ["All", ...Array.from(new Set(rows.map((row) => row.property)))];
  const units = ["All", ...Array.from(new Set(rows.map((row) => row.unit)))];
  const types = ["All", ...Array.from(new Set(rows.map((row) => row.item)))];
  const modules = ["All", ...Array.from(new Set(rows.map((row) => row.category)))];
  const priorities = ["All", "Critical", "High", "Medium"];
  const statuses = ["All", ...Array.from(new Set(rows.map((row) => row.status)))];

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

function CalendarQueues({ rows }: { rows: FollowUpCommandRow[] }) {
  const dueToday = rows.filter((row) => isDueToday(row) || priority(row) === "Critical");
  const nextSeven = rows.filter(isNextSevenDays);
  const recurring = rows.filter(isRecurring);
  const calendarQueue = rows.filter(calendarNeeded);
  const emailQueue = rows.filter(emailNeeded);
  const ownerQueue = rows.filter(ownerApprovalNeeded);

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

function CalendarBlockedAndPreview({ rows }: { rows: FollowUpCommandRow[] }) {
  const previewItems = rows.filter((row) => calendarNeeded(row) && !isRecurring(row)).slice(0, 4);

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
              <small>Review note: Prepare {row.category} follow-up preview for owner approval.</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export function CalendarFollowUpsView() {
  const [filters, setFilters] = useState(defaultFilters);
  const { data, system, error, loading } = useSheetsView<CalendarPayload>("calendar-follow-ups");
  const rows = useMemo(() => {
    if (data?.groups) return flattenCalendarGroups(data.groups);
    return localDevelopmentFallbackAllowed ? followUpRows : [];
  }, [data]);
  const filteredRows = useMemo(() => rows.filter((row) => matchesFilters(row, filters)), [filters, rows]);

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
      <SheetsSourcePanel system={system} error={error} loading={loading} />
      <CalendarKpis rows={rows} />
      <CalendarFilters filters={filters} onChange={setFilters} rows={rows} />
      {filteredRows.length ? (
        <DataTable rows={filteredRows} columns={columns} />
      ) : (
        <EmptyState title="No follow-ups match these filters" message="Reset filters or check the live Google Sheets source." />
      )}
      <CalendarQueues rows={rows} />
      {localDevelopmentFallbackAllowed ? (
        <>
          <CalendarHealthEvaluation />
          <CalendarBlockedAndPreview rows={rows} />
        </>
      ) : null}
    </div>
  );
}
