"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Copy, Database, FileCheck2, FolderUp, Search, ShieldAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { SheetsSourcePanel } from "@/components/SheetsSourcePanel";
import { StatusBadge } from "@/components/StatusBadge";
import { adminTaskRecordToControlRow } from "@/components/views/liveSheetAdapters";
import { useSheetsView } from "@/components/views/useSheetsView";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  adminTaskControlRows,
  commandCenterPeriod,
  monthOptions,
  yearOptions,
  type AdminTaskControlRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";
import type { AdminTaskRecord } from "@/types/sheets";

type AdminTasksPayload = {
  rows: AdminTaskRecord[];
};

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
  section: "Daily Command" | "Document / Drive Work" | "Legal / Eviction Work" | "Money / Utilities / Maintenance" | "Dashboard Updates";
  title: string;
  purpose: string;
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

const adminIntakeProcessingRules = {
  coreFlow: ["Upload", "Intake", "Daily Sync Review", "Identify", "Route", "Link to Tracker/Proof/Approval", "Clear Intake"],
  requiredFolders: [
    { folder: "01 New Uploads", purpose: "New documents, screenshots, communications, bills, notices, photos, and proof awaiting review." },
    { folder: "02 Needs Owner Clarification", purpose: "Files that cannot be matched to property, unit, contact, or issue without owner input." },
    { folder: "03 Ready to Route", purpose: "Files identified and ready for owner-approved routing or tracker linking." },
    { folder: "04 Routed - Archive", purpose: "Files already routed or linked after review and approval." },
    { folder: "05 Duplicates or Do Not Use", purpose: "Duplicate files, bad scans, wrong files, unreadable documents, or rejected uploads." }
  ],
  intakeStatusOptions: ["New / Unreviewed", "Needs Owner Clarification", "Ready to Route", "Routed", "Duplicate / Do Not Use"],
  dailySyncReportFields: [
    "File name",
    "Current Intake location",
    "Document type",
    "Property",
    "Unit",
    "Tenant/vendor/contact",
    "What the document proves",
    "Proof classification",
    "Owner approval requirement",
    "Related tracker or approval ID",
    "Blocked action",
    "Next action"
  ],
  ownerApprovalRequiredBefore: [
    "Drive move, rename, archive, delete, or upload",
    "Gmail draft, send, label, archive, or delete",
    "Calendar event or Google Task creation",
    "Legal filing, notice service, or final packet completion",
    "Payment, lender, tenant, vendor, utility, or agency action"
  ]
};

const adminIntakeRoutingRules = [
  {
    id: "INTAKE-LEGAL",
    category: "Legal / eviction files",
    destination: "Owner Approval / Needs Approval / Legal Notices or Unit Legal folder",
    proofDestination: "Proof Archive / Legal or Eviction Proof",
    approvalRequiredWhen: "Any legal notice, service proof, court packet, or tenant-rights action depends on the file."
  },
  {
    id: "INTAKE-RENT",
    category: "Rent collection files",
    destination: "Owner Approval / Needs Approval / Rent Collection",
    proofDestination: "Proof Archive / Rent / Ledger and Payment Proof",
    approvalRequiredWhen: "Ledger, payment, notice, or delinquency status will be updated."
  },
  {
    id: "INTAKE-MAINT",
    category: "Maintenance files",
    destination: "Owner Approval / Needs Approval / Maintenance",
    proofDestination: "Proof Archive / Maintenance / Photos, Invoices, Completion Proof",
    approvalRequiredWhen: "Vendor contact, closeout, payment, or tracker completion depends on the file."
  },
  {
    id: "INTAKE-MORTGAGE",
    category: "Mortgage / arrears files",
    destination: "Owner Approval / Needs Approval / Mortgage and Arrears",
    proofDestination: "Proof Archive / Mortgage / Statements and Payment Posting Proof",
    approvalRequiredWhen: "Mortgage status, cure balance, due date, or financial action will be updated."
  },
  {
    id: "INTAKE-UTILITY",
    category: "Utility files",
    destination: "Owner Approval / Needs Approval / Utilities",
    proofDestination: "Proof Archive / Utilities / Bills and Payment Proof",
    approvalRequiredWhen: "Utility tracker status, payment status, or owner payment decision depends on the file."
  },
  {
    id: "INTAKE-COMM",
    category: "Communication records",
    destination: "Owner Approval / Needs Approval / Communications",
    proofDestination: "Proof Archive / Communications / Source Messages",
    approvalRequiredWhen: "A response, draft, send, or contact decision is needed."
  },
  {
    id: "INTAKE-GVOICE",
    category: "Google Voice workaround files",
    destination: "Owner Approval / Needs Approval / Google Voice Workaround",
    proofDestination: "Proof Archive / Communications / Google Voice Screenshots and Transcripts",
    approvalRequiredWhen: "Unit, contact role, issue, response need, or proof is unclear."
  },
  {
    id: "INTAKE-DUP",
    category: "Duplicate approval packages",
    destination: "Owner Approval / Duplicate Location Review",
    proofDestination: "Manual folder placement index or duplicate-location report",
    approvalRequiredWhen: "Any file move, archive, delete, or final folder designation is considered."
  }
];

const adminPromptWarning = "Owner approval is required before live actions. Do not delete files, send messages, contact anyone, update Google Sheets, update trackers, modify Gmail/Calendar/Tasks, file legal documents, sign leases, or make payments unless separately approved.";

const promptSectionOrder: AdminCommandTemplate["section"][] = [
  "Daily Command",
  "Document / Drive Work",
  "Legal / Eviction Work",
  "Money / Utilities / Maintenance",
  "Dashboard Updates"
];

const commandTemplates: AdminCommandTemplate[] = [
  {
    id: "daily-system-review",
    section: "Daily Command",
    title: "Daily System Review",
    purpose: "Start-of-day operating review across the whole property system.",
    tone: "yellow",
    prompt: "Run today’s Property Management Operating System review. Check dashboard health, open trackers, owner decisions, missing proof, Intake folder status, utilities, maintenance, rent collection, notices/evictions, and calendar follow-ups. Do not perform live actions. Return a summary and recommended next actions."
  },
  {
    id: "intake-review",
    section: "Document / Drive Work",
    title: "Review Intake Folder",
    purpose: "Classify new uploads and identify routing/proof needs.",
    tone: "yellow",
    prompt: "Review the Property Management Intake folder. Classify each file, identify the correct destination folder, flag legal/tenant-sensitive files, and report missing proof. Do not move, delete, rename, or update anything unless separately approved."
  },
  {
    id: "drive-organization",
    section: "Document / Drive Work",
    title: "Organize Drive Documents",
    purpose: "Prepare approved file organization work with uncertainty held for owner review.",
    tone: "green",
    prompt: "Organize approved documents into the correct Google Drive folders. Create missing folders only if needed. Do not delete files. Leave uncertain legal, tenant, lease, payment, or eviction files in place for owner review. Return a report of files moved, files left in place, and owner decisions needed."
  },
  {
    id: "evictions-notices-review",
    section: "Legal / Eviction Work",
    title: "Review Evictions & Notices",
    purpose: "Review notice and eviction materials without taking legal action.",
    tone: "red",
    prompt: "Review all eviction documents, 10-day notices, notices to quit, proof of service, court filing documents, and tenant notice communications. Confirm property/unit, correct folder, missing proof, and filing packet readiness. Do not edit, send, file, or contact anyone."
  },
  {
    id: "filing-packet-review",
    section: "Legal / Eviction Work",
    title: "Review Court Filing Packet",
    purpose: "Check court packet readiness for a selected tenant/unit.",
    tone: "red",
    prompt: "Prepare a filing packet readiness review for the selected tenant/unit using documents already in Drive. Check lease, ledger, payment history, notice, proof of service, Section 8/RFTA proof, tenant communications, court complaint, VTC request, and required affidavits. Do not file anything."
  },
  {
    id: "maintenance-proof-review",
    section: "Money / Utilities / Maintenance",
    title: "Review Maintenance Proof",
    purpose: "Check maintenance closeout proof before anything is closed or sent.",
    tone: "yellow",
    prompt: "Review maintenance records for open issues. Check work orders, invoices, estimates, photos, tenant confirmation, vendor completion proof, and missing closeout proof. Do not close items or contact tenants/vendors without owner approval."
  },
  {
    id: "utilities-review",
    section: "Money / Utilities / Maintenance",
    title: "Review Utilities",
    purpose: "Review utility documents and identify missing bills/setup proof.",
    tone: "yellow",
    prompt: "Review utility documents for electric, water, gas, trash, sewer, internet, and account setup. Identify filed documents, missing bills, setup proof, and recommended dashboard status. Do not update Sheets or trackers unless separately approved."
  },
  {
    id: "rent-collection-review",
    section: "Money / Utilities / Maintenance",
    title: "Review Rent Collection",
    purpose: "Review rent ledgers, balances, payment proof, and nonpayment risk.",
    tone: "red",
    prompt: "Review rent collection records, ledgers, payment confirmations, RentRedi screenshots, late rent items, payment arrangements, balances, and nonpayment risk. Do not create notices or contact tenants."
  },
  {
    id: "owner-approvals-review",
    section: "Dashboard Updates",
    title: "Review Owner Approvals",
    purpose: "Sort approval items by status and readiness without approving automatically.",
    tone: "yellow",
    prompt: "Review the Owner Approvals folder. Classify each item as needs approval, approved but not processed, not approved, needs more proof, duplicate/old, legal-sensitive, ready to archive, or ready for processing. Do not approve anything automatically."
  },
  {
    id: "dashboard-update-preview",
    section: "Dashboard Updates",
    title: "Prepare Dashboard Update Preview",
    purpose: "Prepare proposed tracker/dashboard updates for owner approval.",
    tone: "green",
    prompt: "Prepare a dashboard and tracker update preview based on completed work and owner status updates. Do not write to Google Sheets or update trackers. Return proposed values, affected tabs/ranges if known, blocked items, and owner approval required."
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

function uniqueValues(rows: AdminTaskControlRow[], key: keyof Pick<AdminTaskControlRow, "relatedModule" | "property" | "unit" | "priority" | "status">) {
  return ["All", ...Array.from(new Set(rows.map((row) => row[key]).filter(Boolean)))];
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
        <span className="eyebrow">Read-only admin task tracker</span>
        <h2>Admin Tasks Command</h2>
        <p>Owner approvals, proof collection, Drive update needs, weekly reviews, blocked items, and task-sync preparation.</p>
      </div>
      <div className="admin-header-stack">
        <StatusBadge label="No Google Tasks, Drive, Gmail, Calendar, or Sheets writes" />
        <StatusBadge label="Google Sheets is the preferred display source" />
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

function AdminFilters({ filters, setFilters, rows }: { filters: AdminFilter; setFilters: (filters: AdminFilter) => void; rows: AdminTaskControlRow[] }) {
  return (
    <section className="admin-filter-panel">
      <div className="calendar-filter-grid">
        {[
          ["Related Module", "module", uniqueValues(rows, "relatedModule")],
          ["Property", "property", uniqueValues(rows, "property")],
          ["Unit", "unit", uniqueValues(rows, "unit")],
          ["Priority", "priority", uniqueValues(rows, "priority")],
          ["Status", "status", uniqueValues(rows, "status")]
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
              <p>Review note: Prepare a Google Task sync preview for {row.id}. Do not create the task.</p>
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

function IntakeRoutingPanel() {
  const visibleRoutes = adminIntakeRoutingRules.slice(0, 8);
  const remainingRoutes = adminIntakeRoutingRules.length - visibleRoutes.length;

  return (
    <section className="intake-routing-panel">
      <div className="intake-routing-header">
        <div>
          <span className="eyebrow">Daily Sync Routing</span>
          <h3>Property Management Intake</h3>
          <p>
            Required drop box for new property documents, screenshots, communications, bills, notices, proof, photos, and uploads.
            Live Drive movement stays blocked until owner approval is recorded.
          </p>
        </div>
        <StatusBadge label="Routing map active / live writes disabled" />
      </div>

      <div className="intake-flow-strip">
        {adminIntakeProcessingRules.coreFlow.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>

      <div className="intake-folder-grid">
        {adminIntakeProcessingRules.requiredFolders.map((folder) => (
          <article key={folder.folder}>
            <strong>{folder.folder}</strong>
            <p>{folder.purpose}</p>
          </article>
        ))}
      </div>

      <div className="intake-routing-layout">
        <article className="intake-rule-block">
          <h4>Daily Sync Intake Report Fields</h4>
          <div className="intake-chip-list">
            {adminIntakeProcessingRules.dailySyncReportFields.map((field) => (
              <span key={field}>{field}</span>
            ))}
          </div>
        </article>
        <article className="intake-rule-block">
          <h4>Status Options</h4>
          <div className="intake-chip-list">
            {adminIntakeProcessingRules.intakeStatusOptions.map((status) => (
              <span key={status}>{status}</span>
            ))}
          </div>
        </article>
      </div>

      <div className="intake-safety-grid">
        {adminIntakeProcessingRules.ownerApprovalRequiredBefore.map((rule) => (
          <span key={rule}>{rule}</span>
        ))}
      </div>

      <div className="intake-rule-grid">
        {visibleRoutes.map((route) => (
          <article className="intake-rule-card" key={route.id}>
            <span>{route.id}</span>
            <h4>{route.category}</h4>
            <p><strong>Destination:</strong> {route.destination}</p>
            {route.proofDestination ? <p><strong>Proof:</strong> {route.proofDestination}</p> : null}
            {route.approvalRequiredWhen ? <small>Approval gate: {route.approvalRequiredWhen}</small> : null}
          </article>
        ))}
      </div>
      {remainingRoutes > 0 ? <p className="intake-routing-note">{remainingRoutes} additional routing categories are stored in admin data for source exports, owner approvals, property records, photos, screening, and SOPs.</p> : null}
    </section>
  );
}

function AdminCommandButtons() {
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);

  async function copyCommand(command: AdminCommandTemplate) {
    const copied = await copyTextToClipboard(command.prompt);
    setCopiedCommandId(copied ? command.id : null);
  }

  return (
    <section className="admin-prompt-library">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Owner Prompt Library</p>
          <h3>Admin Task Prompts</h3>
        </div>
        <StatusBadge label={`${commandTemplates.length} prompts`} />
      </div>

      <p className="admin-prompt-warning">{adminPromptWarning}</p>

      <div className="admin-prompt-section-stack">
        {promptSectionOrder.map((section) => {
          const prompts = commandTemplates.filter((command) => command.section === section);
          return (
            <section className="admin-prompt-section" key={section}>
              <div className="admin-prompt-section-heading">
                <h4>{section}</h4>
                <span>{prompts.length} prompt{prompts.length === 1 ? "" : "s"}</span>
              </div>
              <div className="admin-prompt-card-grid">
                {prompts.map((command) => (
                  <details className={`admin-prompt-card prompt-${command.tone}`} key={command.id}>
                    <summary>
                      <span>{command.title}</span>
                      <small>{command.purpose}</small>
                    </summary>
                    <textarea readOnly value={command.prompt} aria-label={`${command.title} prompt`} />
                    <button type="button" onClick={() => copyCommand(command)}>
                      <Copy size={15} />
                      {copiedCommandId === command.id ? "Copied" : "Copy Prompt"}
                    </button>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>
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
  const { data, system, error, loading } = useSheetsView<AdminTasksPayload>("admin-tasks");
  const rows = useMemo(() => (data?.rows?.length ? data.rows.map(adminTaskRecordToControlRow) : adminTaskControlRows), [data]);
  const filteredRows = useMemo(() => rows.filter((row) => matchesFilters(row, filters)), [filters, rows]);

  return (
    <div className="admin-command-page">
      <AdminHeader />
      <SheetsSourcePanel system={system} error={error} loading={loading} />
      <AdminKpis rows={rows} />
      <AdminHealth />
      <AdminFilters filters={filters} setFilters={setFilters} rows={rows} />
      {filteredRows.length ? (
        <DataTable rows={filteredRows} columns={columns} />
      ) : (
        <EmptyState title="No admin tasks match these filters" message="Reset filters or check the live Google Sheets source." />
      )}
      <AdminQueues rows={rows} />
      <AdminRulesAndPreview rows={rows} />
      <IntakeRoutingPanel />
      <AdminCommandButtons />
      <section className="admin-safety-footer">
        <Database size={18} />
        <p>
          Read-only display only. No Google Tasks, Drive, Gmail, Calendar, Sheets, RentRedi, tenant, legal, lender, vendor, or payment records were created,
          updated, sent, uploaded, moved, renamed, deleted, or completed.
        </p>
      </section>
    </div>
  );
}
