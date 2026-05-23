"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Copy, Database, FileCheck2, FolderUp, Search, ShieldAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  adminTaskControlRows,
  commandCenterPeriod,
  monthOptions,
  yearOptions,
  type AdminTaskControlRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";

type AdminFilter = {
  module: string;
  property: string;
  unit: string;
  priority: string;
  status: string;
  approval: boolean;
  proof: boolean;
  drive: boolean;
  calendarTask: boolean;
  blocked: boolean;
  search: string;
};

type AdminCommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  tone: SignalTone;
  prompt: string;
};

const defaultFilters: AdminFilter = {
  module: "All",
  property: "All",
  unit: "All",
  priority: "All",
  status: "All",
  approval: false,
  proof: false,
  drive: false,
  calendarTask: false,
  blocked: false,
  search: ""
};

const blockedWarnings = [
  "Do not close admin tasks without proof if proof is required.",
  "Do not update Google Drive until owner approval.",
  "Do not create Google Tasks until owner approval.",
  "Do not create Calendar events until owner approval.",
  "Do not close mortgage, notice, rent, or maintenance tasks based only on expected activity.",
  "Do not mark Section 8/HAP items complete until verified."
];

const weeklyChecklist = [
  "Rent collection status",
  "Maintenance critical issues",
  "Notices/legal holds",
  "Mortgage/arrears status",
  "Utility account status",
  "Calendar follow-ups",
  "Gmail follow-ups",
  "Drive update needs",
  "Proof needed",
  "Owner approvals required",
  "Blocked items",
  "Dashboard data corrections"
];

const completionRules = [
  "Complete only after proof is verified.",
  "Close only after owner approval if approval is required.",
  "Drive update only after owner approval.",
  "Calendar/task update only after owner approval.",
  "Legal/payment/tenant actions require separate owner approval.",
  "Local Sample Mode data is not a live source of truth."
];

const commandTemplates: AdminCommandTemplate[] = [
  {
    id: "admin-review",
    title: "Codex Command - Admin Task Review",
    actionName: "Generate Codex Command: Admin Task Review",
    controls: "Open admin tasks, owner approvals, proof needs, Drive needs, Calendar/Task needs, and blocked items.",
    tone: "yellow",
    prompt: `Run an Admin Tasks review for the Property Command Center.

Rules:
- Read-only/local review first.
- Do not create, update, complete, or delete Google Tasks.
- Do not update Google Drive, Gmail, Calendar, Sheets, RentRedi, tenant, legal, mortgage, payment, lender, or vendor records without owner approval.
- Review open admin tasks, owner approvals, proof needs, Drive update needs, Calendar/Task needs, blocked-until-verified items, and weekly review items.
- Produce an admin task preview report.
- Stop before all live actions.`
  },
  {
    id: "approval-review",
    title: "Codex Command - Owner Approval Queue Review",
    actionName: "Generate Codex Command: Owner Approval Queue Review",
    controls: "Owner approval queue grouped by Drive, Calendar, Tasks, Gmail, operational actions, and data corrections.",
    tone: "yellow",
    prompt: `Prepare an owner approval queue review.

Rules:
- Do not perform any live action.
- Identify all tasks requiring owner approval.
- Group approvals by risk area:
  1. Drive updates
  2. Calendar events
  3. Google Tasks
  4. Gmail drafts/sends
  5. Tenant/legal/payment/mortgage actions
  6. Data corrections
- Stop before live actions.`
  },
  {
    id: "proof-checklist",
    title: "Codex Command - Proof Collection Checklist",
    actionName: "Generate Codex Command: Proof Collection Checklist",
    controls: "Proof needed before task closure across rent, maintenance, mortgage, notices, utilities, and admin items.",
    tone: "red",
    prompt: `Prepare a proof collection checklist.

Rules:
- Do not upload, move, rename, delete, or update Drive files.
- Do not mark items complete.
- Identify proof needed before task closure for rent, maintenance, mortgage, notices, utilities, and admin items.
- Produce a checklist grouped by module.
- Stop before live actions.`
  },
  {
    id: "drive-prep",
    title: "Codex Command - Google Drive Update Prep",
    actionName: "Generate Codex Command: Google Drive Update Prep",
    controls: "Weekly review package, proof folders, dashboard snapshot, blocked items, approvals, and data corrections.",
    tone: "yellow",
    prompt: `Prepare a Google Drive admin update package.

Rules:
- Do not upload, move, rename, delete, or update Drive files without owner approval.
- Prepare a preview package only.
- Include weekly review package, proof folders needed, dashboard snapshot, blocked items, owner approvals, and data correction list.
- Stop and ask for owner approval before any Drive write.`
  },
  {
    id: "weekly-review",
    title: "Codex Command - Weekly Command Review",
    actionName: "Generate Codex Command: Weekly Command Review",
    controls: "Weekly command review across every local sample operating module.",
    tone: "green",
    prompt: `Prepare the Weekly Property Command Review.

Rules:
- Do not perform live Google Drive, Gmail, Calendar, Task, Sheets, RentRedi, tenant, legal, payment, mortgage, lender, or vendor actions.
- Prepare a weekly review preview covering:
  1. Rent collection
  2. Maintenance
  3. Notices/legal holds
  4. Mortgage/arrears
  5. Utilities
  6. Calendar follow-ups
  7. Gmail follow-ups
  8. Drive update needs
  9. Proof needed
  10. Owner approvals required
  11. Blocked items
  12. Dashboard corrections
- Stop before live actions.`
  },
  {
    id: "task-sync",
    title: "Codex Command - Google Task Sync Preview",
    actionName: "Generate Codex Command: Google Task Sync Preview",
    controls: "Preview which admin tasks should become future Google Tasks.",
    tone: "yellow",
    prompt: `Prepare a Google Task sync preview.

Rules:
- Do not create, update, complete, or delete Google Tasks.
- Produce a preview of which admin tasks should become Google Tasks.
- For each proposed task, include:
  1. Task title
  2. Due date
  3. Related module
  4. Proof requirement
  5. Owner approval requirement
  6. Trigger prompt
  7. Blocked status
- Stop before live actions.`
  },
  {
    id: "data-accuracy",
    title: "Codex Command - Dashboard Data Accuracy Review",
    actionName: "Generate Codex Command: Dashboard Data Accuracy Review",
    controls: "Local values that should remain pending, estimated, or unverified before live migration.",
    tone: "red",
    prompt: `Prepare a dashboard data accuracy review.

Rules:
- Do not update Sheets, Drive, dashboard code, RentRedi, Gmail, Calendar, Tasks, tenant, legal, payment, mortgage, lender, or vendor records without owner approval.
- Compare local sample dashboard values against known proof requirements and open verification items.
- Identify values that should remain marked pending, estimated, or unverified.
- Produce a data correction preview.
- Stop before live actions.`
  }
];

function yes(value: string) {
  return value.toLowerCase() === "yes";
}

function rowTone(row: AdminTaskControlRow): SignalTone {
  if (yes(row.blockedUntilVerified) || row.priority === "Critical" || yes(row.proofNeeded)) return "red";
  if (yes(row.ownerApprovalRequired) || yes(row.driveUpdateNeeded) || yes(row.calendarTaskNeeded)) return "yellow";
  return "green";
}

function uniqueValues(key: keyof Pick<AdminTaskControlRow, "relatedModule" | "property" | "unit" | "priority" | "status">) {
  return ["All", ...Array.from(new Set(adminTaskControlRows.map((row) => row[key]).filter(Boolean)))];
}

function matchesFilters(row: AdminTaskControlRow, filters: AdminFilter) {
  const searchable = `${row.id} ${row.taskTitle} ${row.relatedModule} ${row.property} ${row.unit} ${row.priority} ${row.status} ${row.resultNotes} ${row.nextOwnerAction}`.toLowerCase();

  return (
    (filters.module === "All" || row.relatedModule === filters.module) &&
    (filters.property === "All" || row.property === filters.property) &&
    (filters.unit === "All" || row.unit === filters.unit) &&
    (filters.priority === "All" || row.priority === filters.priority) &&
    (filters.status === "All" || row.status === filters.status) &&
    (!filters.approval || yes(row.ownerApprovalRequired)) &&
    (!filters.proof || yes(row.proofNeeded)) &&
    (!filters.drive || yes(row.driveUpdateNeeded)) &&
    (!filters.calendarTask || yes(row.calendarTaskNeeded)) &&
    (!filters.blocked || yes(row.blockedUntilVerified)) &&
    (!filters.search || searchable.includes(filters.search.toLowerCase()))
  );
}

function buildSummary(rows: AdminTaskControlRow[]) {
  return {
    open: rows.filter((row) => row.status.toLowerCase() !== "complete").length,
    approval: rows.filter((row) => yes(row.ownerApprovalRequired)).length,
    proof: rows.filter((row) => yes(row.proofNeeded)).length,
    drive: rows.filter((row) => yes(row.driveUpdateNeeded)).length,
    calendarTask: rows.filter((row) => yes(row.calendarTaskNeeded)).length,
    blocked: rows.filter((row) => yes(row.blockedUntilVerified)).length,
    weekly: rows.filter((row) => row.dueDate.toLowerCase().includes("weekly") || row.dueDate.toLowerCase().includes("friday")).length,
    complete: rows.filter((row) => row.status.toLowerCase().includes("complete") || row.status.toLowerCase().includes("verified")).length
  };
}

function AdminHeader() {
  return (
    <section className="admin-command-header">
      <div>
        <span className="eyebrow">Local Sample Mode</span>
        <h2>Admin Tasks Command</h2>
        <p>Owner approvals, proof collection, Drive update needs, weekly reviews, blocked items, and task-sync preparation.</p>
      </div>
      <div className="admin-header-stack">
        <StatusBadge label="No live Google Tasks, Drive, Gmail, Calendar, or Sheets updates" />
        <StatusBadge label="Last updated: May 21, 2026, 9:00 AM local sample workbook" />
        <div className="filter-inline">
          <label>
            Month
            <select value={commandCenterPeriod.monthName} disabled>
              {monthOptions.map((month) => (
                <option key={month}>{month}</option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select value={commandCenterPeriod.year} disabled>
              {yearOptions.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function AdminKpis({ rows }: { rows: AdminTaskControlRow[] }) {
  const summary = buildSummary(rows);
  const items = [
    { label: "Open Admin Tasks", value: summary.open, tone: "yellow" as SignalTone },
    { label: "Owner Approval Required", value: summary.approval, tone: "yellow" as SignalTone },
    { label: "Proof Needed", value: summary.proof, tone: "red" as SignalTone },
    { label: "Drive Update Needed", value: summary.drive, tone: "yellow" as SignalTone },
    { label: "Calendar / Task Needed", value: summary.calendarTask, tone: "yellow" as SignalTone },
    { label: "Blocked Until Verified", value: summary.blocked, tone: "red" as SignalTone },
    { label: "Weekly Review Items", value: summary.weekly, tone: "yellow" as SignalTone },
    { label: "Completed / Verified", value: summary.complete, tone: "green" as SignalTone }
  ];

  return (
    <section className="calendar-kpi-grid">
      {items.map((item) => (
        <article className={`kpi-card status-strip ${item.tone}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.tone === "green" ? "Verified only" : item.tone === "red" ? "Do not close without proof" : "Owner review needed"}</small>
        </article>
      ))}
    </section>
  );
}

function AdminHealth() {
  return (
    <section className="admin-health-panel">
      <span className="eyebrow">Command Evaluation</span>
      <h3>Watch / Admin Load Active</h3>
      <p>
        Multiple open admin tasks remain across rent, maintenance, mortgage, notices, utilities, Drive updates, and weekly review.
        Several tasks require owner approval before any live action, and proof collection is still needed before closing high-risk items.
        Google Tasks are not live-connected yet.
      </p>
      <div className="calendar-cause-grid">
        {[
          ["Review owner approval queue", "Start with Drive, Calendar/Task, proof, and data correction approvals."],
          ["Collect proof for blocked items", "Mortgage posting, maintenance completion, rent payment proof, and Section 8/HAP proof stay open."],
          ["Prepare weekly command review", "Use the preview workflow only. No live writes happen from this dashboard."]
        ].map(([title, text]) => (
          <article key={title}>
            <ShieldAlert size={18} />
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminFilters({ filters, setFilters }: { filters: AdminFilter; setFilters: (filters: AdminFilter) => void }) {
  return (
    <section className="admin-filter-panel">
      <div className="calendar-filter-grid">
        {[
          ["Related Module", "module", uniqueValues("relatedModule")],
          ["Property", "property", uniqueValues("property")],
          ["Unit", "unit", uniqueValues("unit")],
          ["Priority", "priority", uniqueValues("priority")],
          ["Status", "status", uniqueValues("status")]
        ].map(([label, key, options]) => (
          <label key={key as string}>
            {label as string}
            <select value={filters[key as keyof AdminFilter] as string} onChange={(event) => setFilters({ ...filters, [key as string]: event.target.value })}>
              {(options as string[]).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Search task/result text
          <span className="search-field">
            <Search size={16} />
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search admin tasks" />
          </span>
        </label>
      </div>
      <div className="admin-toggle-grid">
        {[
          ["Owner Approval Required", "approval"],
          ["Proof Needed", "proof"],
          ["Drive Update Needed", "drive"],
          ["Calendar / Task Needed", "calendarTask"],
          ["Blocked Until Verified", "blocked"]
        ].map(([label, key]) => (
          <label key={key}>
            <input type="checkbox" checked={filters[key as keyof AdminFilter] as boolean} onChange={(event) => setFilters({ ...filters, [key]: event.target.checked })} />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}

function AdminQueues({ rows }: { rows: AdminTaskControlRow[] }) {
  const queues = [
    {
      title: "Owner Approval Queue",
      icon: ShieldAlert,
      items: rows.filter((row) => yes(row.ownerApprovalRequired)),
      note: "Requires approval before live Drive, Calendar, Gmail, Tasks, Sheets, tenant, legal, payment, or mortgage action."
    },
    {
      title: "Proof Needed Queue",
      icon: FileCheck2,
      items: rows.filter((row) => yes(row.proofNeeded)),
      note: "Mortgage posting proof, maintenance completion proof, rent payment proof, Section 8/HAP proof, notice/service proof, and utility proof stay open."
    },
    {
      title: "Drive Update Queue",
      icon: FolderUp,
      items: rows.filter((row) => yes(row.driveUpdateNeeded)),
      note: "Future Drive updates include weekly review, mortgage proof, maintenance proof, rent/payment proof, legal proof, and dashboard archive packages."
    },
    {
      title: "Calendar / Task Needed Queue",
      icon: ClipboardList,
      items: rows.filter((row) => yes(row.calendarTaskNeeded)),
      note: "Future Calendar events or Google Tasks can be prepared after owner approval."
    }
  ];

  return (
    <section className="admin-queue-grid">
      {queues.map((queue) => {
        const Icon = queue.icon;
        return (
          <article className="calendar-queue-card" key={queue.title}>
            <Icon size={20} />
            <h3>{queue.title}</h3>
            <p>{queue.note}</p>
            <div className="calendar-mini-list">
              {queue.items.slice(0, 4).map((row) => (
                <div key={`${queue.title}-${row.id}`}>
                  <strong>{row.taskTitle}</strong>
                  <span>{row.relatedModule} / {row.dueDate}</span>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function AdminRulesAndPreview({ rows }: { rows: AdminTaskControlRow[] }) {
  return (
    <section className="calendar-two-column">
      <article className="calendar-blocked-panel">
        <h3>Blocked Until Verified</h3>
        <ul>
          {blockedWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </article>
      <article className="calendar-preview-panel">
        <h3>Weekly Command Review Checklist</h3>
        <div className="admin-checklist-grid">
          {weeklyChecklist.map((item) => (
            <span key={item}><CheckCircle2 size={15} /> {item}</span>
          ))}
        </div>
      </article>
      <article className="calendar-preview-panel">
        <h3>Future Google Task Sync Preview</h3>
        <p className="warning-note">Preview only / Not created. Live Google Tasks disabled.</p>
        <div className="calendar-preview-list">
          {rows.filter((row) => yes(row.calendarTaskNeeded)).slice(0, 4).map((row) => (
            <div key={`task-preview-${row.id}`}>
              <strong>{row.taskTitle}</strong>
              <span>Due: {row.dueDate} / Module: {row.relatedModule}</span>
              <small>Proof: {row.proofNeeded} / Approval: {row.ownerApprovalRequired}</small>
              <p>Trigger prompt: Prepare Google Task sync preview for {row.id}. Do not create the task.</p>
            </div>
          ))}
        </div>
      </article>
      <article className="calendar-blocked-panel">
        <h3>Admin Completion Rules</h3>
        <ul>
          {completionRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}

function AdminCommandButtons() {
  const [activeCommand, setActiveCommand] = useState<AdminCommandTemplate | null>(null);
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);

  async function copyCommand(command: AdminCommandTemplate) {
    await navigator.clipboard.writeText(command.prompt);
    setCopiedCommandId(command.id);
  }

  return (
    <section className="calendar-command-panel">
      <span className="eyebrow">Draft Command Buttons</span>
      <h3>Admin Codex Commands</h3>
      <p>This dashboard does not perform live Google actions. It only prepares the Codex command.</p>
      <div className="calendar-command-button-grid">
        {commandTemplates.map((command) => (
          <article className={`codex-command-card command-tone-${command.tone}`} key={command.id}>
            <span>Draft command only</span>
            <strong>{command.actionName}</strong>
            <p>{command.controls}</p>
            <button type="button" onClick={() => setActiveCommand(command)}>
              <Copy size={15} />
              Generate Command
            </button>
          </article>
        ))}
      </div>
      {activeCommand ? (
        <div className="admin-command-preview command-preview-panel">
          <div className="command-preview-header">
            <div>
              <span className="eyebrow">Command Preview</span>
              <h3>{activeCommand.title}</h3>
            </div>
            <button type="button" onClick={() => setActiveCommand(null)}>
              Close
            </button>
          </div>
          <div className="command-preview-labels">
            <span>Draft command only</span>
            <span>Owner approval required</span>
            <span>Live writes disabled</span>
            <span>No Google Task created</span>
            <span>No Drive upload</span>
            <span>No Calendar event created</span>
            <span>No Gmail sent</span>
          </div>
          <p className="command-preview-warning">This dashboard does not perform live Google actions. It only prepares the Codex command.</p>
          <pre>{activeCommand.prompt}</pre>
          <div className="command-preview-actions">
            <button type="button" onClick={() => copyCommand(activeCommand)}>
              <Copy size={15} />
              Copy Command
            </button>
            {copiedCommandId === activeCommand.id ? <span>Copied command to clipboard.</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

const columns: DataTableColumn<AdminTaskControlRow>[] = [
  { key: "id", header: "Task ID", render: (row) => row.id },
  { key: "taskTitle", header: "Task Title", render: (row) => row.taskTitle },
  { key: "relatedModule", header: "Related Module", render: (row) => row.relatedModule },
  { key: "property", header: "Property", render: (row) => row.property },
  { key: "unit", header: "Unit", render: (row) => row.unit },
  { key: "priority", header: "Priority", render: (row) => <StatusBadge label={row.priority} /> },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "ownerApprovalRequired", header: "Owner Approval Required", render: (row) => <StatusBadge label={yes(row.ownerApprovalRequired) ? "Owner Approval Required" : "No approval required"} /> },
  { key: "proofNeeded", header: "Proof Needed", render: (row) => <StatusBadge label={yes(row.proofNeeded) ? "Proof Needed" : "No proof needed"} /> },
  { key: "driveUpdateNeeded", header: "Drive Update Needed", render: (row) => row.driveUpdateNeeded },
  { key: "calendarTaskNeeded", header: "Calendar / Task Needed", render: (row) => row.calendarTaskNeeded },
  { key: "blockedUntilVerified", header: "Blocked Until Verified", render: (row) => <StatusBadge label={yes(row.blockedUntilVerified) ? "Blocked Until Verified" : "Not blocked"} /> },
  { key: "dueDate", header: "Due Date", render: (row) => row.dueDate },
  { key: "resultNotes", header: "Result / Notes", render: (row) => row.resultNotes },
  { key: "nextOwnerAction", header: "Next Owner Action", render: (row) => row.nextOwnerAction }
];

export function AdminTasksView() {
  const [filters, setFilters] = useState<AdminFilter>(defaultFilters);
  const filteredRows = useMemo(() => adminTaskControlRows.filter((row) => matchesFilters(row, filters)), [filters]);

  return (
    <div className="admin-command-page">
      <AdminHeader />
      <AdminKpis rows={adminTaskControlRows} />
      <AdminHealth />
      <AdminFilters filters={filters} setFilters={setFilters} />
      {filteredRows.length ? (
        <DataTable rows={filteredRows} columns={columns} />
      ) : (
        <EmptyState title="No admin tasks match these filters" message="Adjust the Local Sample Mode filters to review the admin task-control queue." />
      )}
      <AdminQueues rows={adminTaskControlRows} />
      <AdminRulesAndPreview rows={adminTaskControlRows} />
      <AdminCommandButtons />
      <section className="admin-safety-footer">
        <Database size={18} />
        <p>
          Local Sample Mode only. No Google Tasks, Drive, Gmail, Calendar, Sheets, RentRedi, tenant, legal, lender, vendor, or payment records were created,
          updated, sent, uploaded, moved, renamed, deleted, or completed.
        </p>
      </section>
    </div>
  );
}
