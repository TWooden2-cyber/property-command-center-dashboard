"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Eye,
  FolderKanban,
  Filter,
  Home,
  Mail,
  RefreshCw,
  Save,
  X
} from "lucide-react";
import {
  defaultOwnerInstruction,
  ownerApprovalCategories,
  type OwnerApprovalCategory,
  type OwnerApprovalDecision,
  type OwnerApprovalPriority,
  type OwnerApprovalRecord,
  type OwnerApprovalStatus,
  type OwnerApprovalStatusHistoryEntry
} from "@/lib/ownerApprovals";
import { money } from "@/lib/propertyCommandCenterData";

const storageKey = "owner-command-center.owner-approval-queue.live.v1";
const legacyStorageKeys = ["owner-command-center.owner-approval-queue.mockup.v3"];

type CategoryFilter = "All Categories" | OwnerApprovalCategory;
type PropertyFilter = "All Properties" | string;
type EditableSectionKey = "reviewSummary" | "documents" | "draftResponse" | "recommendedAction" | "estimatedCost" | "deadline";
type ExecutableActionType = "draft-email" | "calendar-reminder" | "tracker-update" | "file-document" | "prepare-document" | "mark-complete";

type ExecutableAction = {
  type: ExecutableActionType;
  label: string;
  reason: string;
};

type IntakeSyncResponse = {
  ok: boolean;
  checkedAt: string;
  items: OwnerApprovalRecord[];
  safety: string;
  statuses?: Array<{ product: string; connected: boolean; message: string; errorCode?: string | null }>;
  intakeAudit?: {
    gmailQueryUsed: string;
    totalEmailsChecked: number;
    emailsMatched: number;
    emailsSkipped: number;
    itemsCreated: number;
    searchLimit: number;
    includesArchived: boolean;
    includesSentIfMatched: boolean;
    excludesSpamTrash: boolean;
    dateLimit: string;
    progress: {
      messagesScanned: number;
      threadsScanned: number;
      matched: number;
      skipped: number;
      duplicates: number;
      errors: number;
    };
    summary: {
      totalMailboxSizeScanned: number;
      totalPropertyEmails: number;
      sevenUnitCount: number;
      fourUnitCount: number;
      unknownPropertyCount: number;
      googleVoiceCount: number;
      ownerApprovalItemsCreated: number;
      skippedDuplicates: number;
      classificationTotals: Record<string, number>;
    };
    entries: Array<{
      messageId: string;
      threadId: string;
      subject: string;
      from: string;
      recipients: string;
      date: string;
      labels: string[];
      bodyLength: number;
      attachments: string[];
      propertyAssigned: string;
      classificationAssigned: OwnerApprovalCategory;
      matched: boolean;
      skipped: boolean;
      skipReason: string;
      duplicateReason: string;
      ownerApprovalItemCreated: boolean;
    }>;
  };
};

const fixedPropertyFilters = ["7-unit", "4-unit", "228 Reifert", "3103 Courtney", "Unknown Property"] as const;

const navItems = [
  { label: "Owner Approvals", icon: CheckCircle2, href: "/owner-approvals", active: true },
  { label: "Task Automation", icon: Bot, href: "/task-automation" },
  { label: "Gmail Organization", icon: Mail, href: "/task-automation#gmail" },
  { label: "Calendar Monitoring", icon: CalendarDays, href: "/task-automation#calendar" },
  { label: "Drive Organization", icon: FolderKanban, href: "/task-automation#drive" }
];

const hiddenApprovalSidebarRoutes = new Set([
  "/draft-status",
  "/drive-update-center",
  "/drive-readonly",
  "/final-integration",
  "/gmail-follow-ups",
  "/reports",
  "/live-readiness",
  "/real-data-cleanup",
  "/operations-readiness"
]);

function statusForDecision(decision: OwnerApprovalDecision): OwnerApprovalStatus {
  if (decision === "Approve") return "Approved";
  if (decision === "Return for Changes") return "Returned / Needs More Information";
  if (decision === "Reject") return "Rejected";
  return "Needs Review";
}

function confirmationForDecision(decision: OwnerApprovalDecision) {
  if (decision === "Approve") return "Approval saved. Item moved to Approved.";
  if (decision === "Return for Changes") return "Item returned to Codex. Owner instructions were saved.";
  if (decision === "Reject") return "Item rejected. Rejection reason was logged.";
  return "Decision saved.";
}

function categoryTone(category: OwnerApprovalCategory) {
  if (category === "Maintenance") return "blue";
  if (category === "Rent") return "green";
  if (category === "Legal") return "purple";
  if (category === "Utility" || category === "Utilities") return "orange";
  if (category === "Lease") return "gray";
  return "slate";
}

function priorityTone(priority: OwnerApprovalPriority) {
  if (priority === "High" || priority === "Critical") return "red";
  if (priority === "Medium") return "amber";
  return "green";
}

function sourceMark(source: OwnerApprovalRecord["source"]) {
  if (source === "Gmail") return <span className="source-logo gmail">M</span>;
  if (source === "Google Voice") return <span className="source-logo voice">GV</span>;
  if (source === "RentRedi") return <span className="source-logo rentredi">R</span>;
  if (source === "Photos") return <span className="source-logo photos">P</span>;
  return <span className="source-logo documents">D</span>;
}

function Pill({ children, tone }: { children: ReactNode; tone: string }) {
  return <span className={`mock-pill ${tone}`}>{children}</span>;
}

function propertyMatchesFilter(record: OwnerApprovalRecord, filter: PropertyFilter) {
  if (filter === "All Properties") return true;
  const value = `${record.propertyUnit} ${record.property}`.toLowerCase();
  if (filter === "7-unit") return value.includes("7-unit") || value.includes("7 unit") || value.includes("228 reifert");
  if (filter === "4-unit") return value.includes("4-unit") || value.includes("4 unit") || value.includes("four unit") || value.includes("3103 courtney") || value.includes("killeen") || value.includes("arti management") || /\bunit [a-d]\b/.test(value);
  if (filter === "228 Reifert") return value.includes("228 reifert") || value.includes("reifert");
  if (filter === "3103 Courtney") return value.includes("3103 courtney") || value.includes("courtney") || value.includes("killeen");
  if (filter === "Unknown Property") return value.includes("unknown property") || value.includes("property needs owner review");
  return record.propertyUnit.startsWith(filter);
}

function normalizeRecord(record: OwnerApprovalRecord): OwnerApprovalRecord {
  return {
    ...record,
    sourceMode: record.sourceMode || "Sample",
    connectorStatus: record.connectorStatus || "Sample approval queue record. Run Check Gmail & Voice Intake for live availability.",
    statusHistory: record.statusHistory || []
  };
}

function historyEntry(record: OwnerApprovalRecord, decision: OwnerApprovalDecision, nextStatus: OwnerApprovalStatus): OwnerApprovalStatusHistoryEntry {
  return {
    decision,
    status: nextStatus,
    instructions: record.ownerInstructions,
    timestamp: new Date().toISOString(),
    priorStatus: record.status
  };
}

function serializeRecordSection(record: OwnerApprovalRecord, section: EditableSectionKey) {
  if (section === "reviewSummary") return record.reviewSummary.join("\n");
  if (section === "documents") return record.documents.map((document) => `${document.name} | ${document.type} | ${document.size}`).join("\n");
  if (section === "recommendedAction") return [record.recommendedAction, record.vendorSuggestion, record.eta].join("\n");
  if (section === "estimatedCost") return [String(record.estimatedCost), record.costRange, record.costNote].join("\n");
  if (section === "deadline") return [record.deadlineLabel, record.deadline, record.tenantExpectation, String(record.daysOpen)].join("\n");
  return record.draftResponse;
}

function applySectionValue(record: OwnerApprovalRecord, section: EditableSectionKey, value: string): OwnerApprovalRecord {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (section === "reviewSummary") return { ...record, reviewSummary: lines.length ? lines : ["Owner review summary needed."] };
  if (section === "documents") {
    return {
      ...record,
      documents: lines.map((line) => {
        const [name = "Document", type = "Document", size = "Unknown"] = line.split("|").map((part) => part.trim());
        return { name, type, size };
      })
    };
  }
  if (section === "recommendedAction") {
    return {
      ...record,
      recommendedAction: lines[0] || "",
      vendorSuggestion: lines[1] || "",
      eta: lines[2] || ""
    };
  }
  if (section === "estimatedCost") {
    return {
      ...record,
      estimatedCost: Number(lines[0] || 0),
      costRange: lines[1] || "$0",
      costNote: lines[2] || ""
    };
  }
  if (section === "deadline") {
    return {
      ...record,
      deadlineLabel: lines[0] || "Deadline:",
      deadline: lines[1] || "",
      tenantExpectation: lines[2] || "N/A",
      daysOpen: Number(lines[3] || 0)
    };
  }
  return { ...record, draftResponse: value };
}

function DetailCard({
  title,
  children,
  action,
  editValue,
  isEditing,
  onView,
  onEdit,
  onSave,
  onCancel,
  onEditValue
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  editValue?: string;
  isEditing?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onEditValue?: (value: string) => void;
}) {
  return (
    <article className="queue-detail-card">
      <header>
        <h3>{title}</h3>
        <div className="detail-card-controls">
          {onView ? <button type="button" onClick={onView}><Eye size={14} aria-hidden />View</button> : null}
          {isEditing ? (
            <>
              {onSave ? <button type="button" onClick={onSave}><Save size={14} aria-hidden />Save</button> : null}
              {onCancel ? <button type="button" onClick={onCancel}><X size={14} aria-hidden />Cancel</button> : null}
            </>
          ) : onEdit ? (
            <button type="button" onClick={onEdit}><Edit3 size={14} aria-hidden />Edit</button>
          ) : null}
          <ChevronUp size={15} aria-hidden />
        </div>
      </header>
      <div className="queue-detail-card-body">
        {isEditing ? (
          <textarea className="section-edit-textarea" value={editValue || ""} onChange={(event) => onEditValue?.(event.target.value)} />
        ) : children}
      </div>
      {action ? <footer>{action}</footer> : null}
    </article>
  );
}

function StatusSection({
  title,
  records,
  tone,
  onOpen,
  selectedIds,
  onToggleSelected
}: {
  title: string;
  records: OwnerApprovalRecord[];
  tone: string;
  onOpen: (id: string) => void;
  selectedIds?: string[];
  onToggleSelected?: (id: string) => void;
}) {
  return (
    <article className={`approval-status-section ${tone}`}>
      <header>
        <h3>{title}</h3>
        <span>{records.length}</span>
      </header>
      {records.length ? (
        <div className="approval-status-list">
          {records.slice(0, 4).map((record) => (
            <article key={record.id} className="approval-status-list-item">
              {onToggleSelected ? (
                <label className="approval-select-check" onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds?.includes(record.id) || false} onChange={() => onToggleSelected(record.id)} />
                  <span>Select</span>
                </label>
              ) : null}
              <button type="button" onClick={() => onOpen(record.id)}>
                <strong>{record.id}</strong>
                <span>{record.title}</span>
                {record.ownerInstructions ? <small>{record.ownerInstructions}</small> : null}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p>No items in this status.</p>
      )}
    </article>
  );
}

function buildMassPrompt(records: OwnerApprovalRecord[]) {
  const approved = records.filter((record) => record.status === "Approved");

  if (!approved.length) return "No approved owner approval queue items are ready for Codex execution.";

  const lines = [
    "Run one Owner Approval Queue execution batch using only the approved items below.",
    "",
    "Safety rule: do not send emails, write Google files/sheets, move documents, close tasks, update calendars, file legal documents, make payments, or contact anyone unless the approved item below explicitly authorizes that exact action.",
    "",
    "After each approved task is executed, automatically update only the approved status surfaces:",
    "- Owner Approval Queue status",
    "- Dashboard",
    "- Rent ledger, if rent-related and approved",
    "- Maintenance tracker, if maintenance-related and approved",
    "- Legal tracker, if legal-related and approved",
    "- Utility tracker, if utility-related and approved",
    "- Calendar/task reminders, if deadline-related and approved",
    "- Activity log",
    ""
  ];

  approved.forEach((record, index) => {
    lines.push(
      `Approved Item ${index + 1}`,
      `Task ID: ${record.id}`,
      `Source: ${record.source}`,
      `Source mode: ${record.sourceMode || "Sample"}`,
      `Property / Unit: ${record.propertyUnit}`,
      `Category: ${record.category}`,
      `Approved action: ${record.approvedAction}`,
      `Owner instructions: ${record.ownerInstructions || defaultOwnerInstruction}`,
      `Draft response: ${record.draftResponse || "No draft response included."}`,
      `Deadline: ${record.deadline}`,
      `Estimated cost: ${money(record.estimatedCost)}`,
      `Decision history: ${(record.statusHistory || []).map((entry) => `${entry.timestamp} ${entry.priorStatus} -> ${entry.status}`).join(" | ") || "No prior decisions."}`,
      `Dashboard/tracker updates required: ${record.dashboardUpdatesRequired.join("; ")}`,
      ""
    );
  });

  return lines.join("\n");
}

const executableActionButtons: Array<{ type?: ExecutableActionType; label: string; help: string }> = [
  { type: "draft-email", label: "Draft Email", help: "Create Gmail drafts only. Do not send." },
  { type: "calendar-reminder", label: "Calendar Reminder", help: "Create approved calendar/task reminders." },
  { type: "tracker-update", label: "Tracker Update", help: "Update approved dashboard/tracker fields only." },
  { type: "file-document", label: "File / Attach Document", help: "Move, file, or attach exact approved documents only." },
  { type: "prepare-document", label: "Prepare Document", help: "Create approved notices, leases, or owner documents." },
  { type: "mark-complete", label: "Mark Complete", help: "Mark approved tasks complete when proof is clear." },
  { label: "Run Selected", help: "Generate one prompt for every detected executable action." }
];

function detectExecutableActions(record: OwnerApprovalRecord): ExecutableAction[] {
  const text = `${record.approvedAction} ${record.ownerInstructions} ${record.draftResponse} ${record.recommendedAction}`.toLowerCase();
  const actions: ExecutableAction[] = [];

  if (/\bdraft\b|\bemail response\b|\bemail drafted\b|\bcreate.+email\b/.test(text)) {
    actions.push({ type: "draft-email", label: "Draft Email", reason: "Instructions ask for a Gmail draft or email response." });
  }
  if (/\bcalendar\b|\breminder\b|\bfollow up\b|\bfollow-up\b|\bdeadline\b/.test(text)) {
    actions.push({ type: "calendar-reminder", label: "Calendar Reminder", reason: "Instructions include a date, reminder, or follow-up." });
  }
  if (/\btracker\b|\bledger\b|\bdashboard\b|\bstatus\b|\bmark\b|\btrack\b/.test(text)) {
    actions.push({ type: "tracker-update", label: "Tracker Update", reason: "Instructions mention a tracker, ledger, dashboard, status, or tracking update." });
  }
  if (/\bfolder\b|\bfile\b|\battach\b|\battachment\b|\bdrive\b|\bplaced into\b/.test(text)) {
    actions.push({ type: "file-document", label: "File / Attach Document", reason: "Instructions mention a file, folder, attachment, or Drive action." });
  }
  if (/\bnotice\b|\blease violation\b|\b10 day\b|\b10-day\b|\bdocument\b|\blease\b/.test(text)) {
    actions.push({ type: "prepare-document", label: "Prepare Document", reason: "Instructions mention a notice, lease, or document preparation task." });
  }
  if (/\bcomplete\b|\bcompleted\b|\bresolved\b|\bno action needed\b|\brepair is complete\b|\baction is complete\b/.test(text)) {
    actions.push({ type: "mark-complete", label: "Mark Complete", reason: "Instructions indicate the task is complete or resolved." });
  }

  return actions.filter((action, index, list) => list.findIndex((item) => item.type === action.type) === index);
}

function executableSummary(record: OwnerApprovalRecord) {
  const actions = detectExecutableActions(record);
  if (!actions.length) return { label: "Needs Exact Instruction", tone: "blocked", actions };
  return { label: actions.map((action) => action.label).join(" + "), tone: "ready", actions };
}

function buildSelectedExecutionPrompt(records: OwnerApprovalRecord[], selectedIds: string[], actionType?: ExecutableActionType) {
  const selected = records.filter((record) => selectedIds.includes(record.id) && record.status === "Approved");
  const executable = selected.filter((record) => {
    const actions = detectExecutableActions(record);
    return actionType ? actions.some((action) => action.type === actionType) : actions.length > 0;
  });

  if (!executable.length) {
    return "No selected approved items match this executable action type. Select approved items with clear instructions first.";
  }

  const actionLabel = actionType
    ? executableActionButtons.find((action) => action.type === actionType)?.label || "Selected Executable Action"
    : "All Detected Executable Actions";

  const lines = [
    `Run one Owner Approval Queue execution batch for: ${actionLabel}.`,
    "",
    "Use only the selected approved items below.",
    "",
    "Safety rule: do not send emails, write Google files/sheets, move documents, close tasks, update calendars, file legal documents, make payments, or contact anyone unless the selected item explicitly authorizes that exact action.",
    "",
    "After each approved task is executed, update only the approved status surfaces:",
    "- Owner Approval Queue status",
    "- Dashboard",
    "- Rent ledger, if rent-related and explicitly approved",
    "- Maintenance tracker, if maintenance-related and explicitly approved",
    "- Legal tracker, if legal-related and explicitly approved",
    "- Utility tracker, if utility-related and explicitly approved",
    "- Calendar/task reminders, if deadline-related and explicitly approved",
    "- Activity log",
    ""
  ];

  executable.forEach((record, index) => {
    const actions = detectExecutableActions(record);
    lines.push(
      `Executable Item ${index + 1}`,
      `Task ID: ${record.id}`,
      `Detected executable action(s): ${actions.map((action) => action.label).join("; ")}`,
      `Source: ${record.source}`,
      `Source mode: ${record.sourceMode || "Sample"}`,
      `Property / Unit: ${record.propertyUnit}`,
      `Category: ${record.category}`,
      `Approved action: ${record.approvedAction}`,
      `Owner instructions: ${record.ownerInstructions || "No owner instructions saved."}`,
      `Draft response: ${record.draftResponse || "No draft response included."}`,
      `Deadline: ${record.deadline}`,
      `Estimated cost: ${money(record.estimatedCost)}`,
      `Dashboard/tracker updates required: ${record.dashboardUpdatesRequired.join("; ")}`,
      `Source Gmail URL: ${sourceEmailUrl(record) || "No source email link available."}`,
      "",
      "Execution notes required:",
      "- Report what was executed.",
      "- Report what was blocked and why.",
      "- Do not perform any action outside the selected executable action type.",
      ""
    );
  });

  return lines.join("\n");
}

function sourceEmailUrl(record: OwnerApprovalRecord) {
  const sourceId = record.sourceThreadId || record.sourceMessageId;
  return sourceId ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(sourceId)}` : "";
}

function ExpandedTask({
  record,
  editingSection,
  editValue,
  onStartEdit,
  onView,
  onEditValue,
  onSaveSection,
  onCancelEdit,
  onDecision,
  onInstructionChange,
  onGenerateExecution,
  onCollapse
}: {
  record: OwnerApprovalRecord;
  editingSection: EditableSectionKey | null;
  editValue: string;
  onStartEdit: (section: EditableSectionKey) => void;
  onView: (section: EditableSectionKey) => void;
  onEditValue: (value: string) => void;
  onSaveSection: () => void;
  onCancelEdit: () => void;
  onDecision: (id: string, decision: OwnerApprovalDecision) => void;
  onInstructionChange: (id: string, instructions: string) => void;
  onGenerateExecution: (id: string, actionType?: ExecutableActionType) => void;
  onCollapse: () => void;
}) {
  const history = record.statusHistory || [];
  const emailUrl = sourceEmailUrl(record);
  const execution = executableSummary(record);
  const canExecute = record.status === "Approved";

  return (
    <section className="queue-expanded-task">
      <div className="expanded-task-heading">
        <div>
          <strong>Task {record.id}</strong>
          <span>•</span>
          <Pill tone={categoryTone(record.category)}>{record.category}</Pill>
          <span>•</span>
          <span>{record.propertyUnit}</span>
          <Pill tone={record.sourceMode === "Sample" ? "amber" : record.sourceMode === "Blocked" ? "red" : "green"}>{record.sourceMode || "Sample"}</Pill>
        </div>
        <button type="button" onClick={onCollapse}>
          <ChevronUp size={14} aria-hidden />
          Collapse
          <ChevronUp size={14} aria-hidden />
        </button>
      </div>

      <p className="connector-status-note">{record.connectorStatus}</p>

      <div className="queue-detail-grid">
        <DetailCard
          title="Review Summary"
          editValue={editValue}
          isEditing={editingSection === "reviewSummary"}
          onView={() => {
            if (emailUrl) window.open(emailUrl, "_blank", "noopener,noreferrer");
            else onView("reviewSummary");
          }}
          onEdit={() => onStartEdit("reviewSummary")}
          onEditValue={onEditValue}
          onSave={onSaveSection}
          onCancel={onCancelEdit}
          action={emailUrl ? <a className="queue-card-link-button" href={emailUrl} target="_blank" rel="noreferrer">Open referenced email</a> : <button type="button" onClick={() => onView("reviewSummary")}>Review source details</button>}
        >
          {record.reviewSummary.map((line) => <p key={line}>{line}</p>)}
          <dl className="summary-meta">
            <div><dt>Tenant:</dt><dd>{record.tenant}</dd></div>
            <div><dt>Reported:</dt><dd>{record.reported}</dd></div>
            <div><dt>Source:</dt><dd>{record.source}</dd></div>
            <div><dt>Property:</dt><dd>{record.property}</dd></div>
          </dl>
        </DetailCard>

        {false ? <DetailCard
          title={`Supporting Documents (${record.documents.length})`}
          editValue={editValue}
          isEditing={editingSection === "documents"}
          onView={() => onView("documents")}
          onEdit={() => onStartEdit("documents")}
          onEditValue={onEditValue}
          onSave={onSaveSection}
          onCancel={onCancelEdit}
          action={<button type="button" onClick={() => onView("documents")}>View All Documents</button>}
        >
          <div className="supporting-documents-list">
            {record.documents.map((document) => (
              <article key={document.name}>
                <span className="pdf-icon">{document.type.slice(0, 3).toUpperCase()}</span>
                <div>
                  <strong>{document.name}</strong>
                  <small>{document.type} • {document.size}</small>
                </div>
              </article>
            ))}
          </div>
        </DetailCard> : null}

        <DetailCard title="Draft Response" editValue={editValue} isEditing={editingSection === "draftResponse"} onView={() => onView("draftResponse")} onEdit={() => onStartEdit("draftResponse")} onEditValue={onEditValue} onSave={onSaveSection} onCancel={onCancelEdit} action={<button type="button" onClick={() => onStartEdit("draftResponse")}>Edit Draft</button>}>
          <pre className="draft-response-box">{record.draftResponse || "No draft response needed for this task."}</pre>
        </DetailCard>

        <DetailCard title="Recommended Action" editValue={editValue} isEditing={editingSection === "recommendedAction"} onView={() => onView("recommendedAction")} onEdit={() => onStartEdit("recommendedAction")} onEditValue={onEditValue} onSave={onSaveSection} onCancel={onCancelEdit} action={<button type="button" onClick={() => onStartEdit("recommendedAction")}>Change Recommendation</button>}>
          <p>{record.recommendedAction}</p>
          <p><strong>Vendor Suggestion:</strong><br />{record.vendorSuggestion}</p>
          <p><strong>ETA:</strong> {record.eta}</p>
        </DetailCard>

        {record.estimatedCost > 0 ? <DetailCard title="Estimated Cost" editValue={editValue} isEditing={editingSection === "estimatedCost"} onView={() => onView("estimatedCost")} onEdit={() => onStartEdit("estimatedCost")} onEditValue={onEditValue} onSave={onSaveSection} onCancel={onCancelEdit} action={<button type="button" onClick={() => onStartEdit("estimatedCost")}>Edit Estimate</button>}>
          <strong className="estimated-cost">{money(record.estimatedCost)}</strong>
          <p>Range: {record.costRange}</p>
          <p>{record.costNote}</p>
        </DetailCard> : null}

        <DetailCard title="Deadline" editValue={editValue} isEditing={editingSection === "deadline"} onView={() => onView("deadline")} onEdit={() => onStartEdit("deadline")} onEditValue={onEditValue} onSave={onSaveSection} onCancel={onCancelEdit} action={<button type="button" onClick={() => onStartEdit("deadline")}>Edit Deadline</button>}>
          <p>{record.deadlineLabel}</p>
          <strong>{record.deadline}</strong>
          <p>Tenant Expectation:</p>
          <strong>{record.tenantExpectation}</strong>
          <p>Days Open:</p>
          <strong>{record.daysOpen}</strong>
        </DetailCard>
      </div>

      <section className="approval-instructions-row">
        <div className="approval-radio-panel">
          <h3>Approval & Instructions</h3>
          <div className="approval-inline-execution-strip" aria-label="Executable actions for this approval item">
            {executableActionButtons.map((action) => (
              <button type="button" key={action.label} onClick={() => onGenerateExecution(record.id, action.type)} disabled={!canExecute}>
                {action.label}
              </button>
            ))}
          </div>
          <div className="approval-radio-group">
            <label className="approve"><input type="radio" checked={record.ownerDecision === "Approve"} onChange={() => onDecision(record.id, "Approve")} />Approve</label>
            <label className="return"><input type="radio" checked={record.ownerDecision === "Return for Changes"} onChange={() => onDecision(record.id, "Return for Changes")} />Return for Changes</label>
            <label className="reject"><input type="radio" checked={record.ownerDecision === "Reject"} onChange={() => onDecision(record.id, "Reject")} />Reject</label>
          </div>
          <div className="decision-history">
            <strong>Prior Status History</strong>
            {history.length ? history.slice(-4).map((entry) => (
              <small key={`${entry.timestamp}-${entry.status}`}>{new Date(entry.timestamp).toLocaleString()} · {entry.priorStatus} → {entry.status}</small>
            )) : <small>No status changes saved yet.</small>}
          </div>
          <div className="inline-execution-buttons" aria-label="Executable action status for this approval item">
            <div>
              <strong>Execution Buttons</strong>
              <em className={`execution-type-pill ${execution.tone}`}>{execution.label}</em>
            </div>
            <p>{canExecute ? "Generate a focused execution prompt for this approved item." : "Approve this item before generating an execution prompt."}</p>
          </div>
        </div>
        <label className="codex-instructions-box">
          <span>Your Instructions to Codex</span>
          <textarea value={record.ownerInstructions} onChange={(event) => onInstructionChange(record.id, event.target.value)} placeholder="Provide specific instructions for Codex..." />
          <small>Example: &quot;{defaultOwnerInstruction}&quot;</small>
        </label>
      </section>
    </section>
  );
}

export function OwnerApprovalsView() {
  const [records, setRecords] = useState<OwnerApprovalRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All Categories");
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("All Properties");
  const [massPrompt, setMassPrompt] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [editingSection, setEditingSection] = useState<EditableSectionKey | null>(null);
  const [editValue, setEditValue] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [connectionWarning, setConnectionWarning] = useState("");
  const [intakeAudit, setIntakeAudit] = useState<IntakeSyncResponse["intakeAudit"] | null>(null);
  const [selectedExecutionIds, setSelectedExecutionIds] = useState<string[]>([]);

  const propertyOptions = useMemo(() => {
    const dynamicOptions = Array.from(new Set(records.map((record) => record.propertyUnit.split(" - ")[0])));
    return Array.from(new Set([...fixedPropertyFilters, ...dynamicOptions]));
  }, [records]);
  const needsReviewRecords = useMemo(
    () =>
      records.filter((record) => {
        const categoryMatches = categoryFilter === "All Categories" || record.category === categoryFilter;
        const propertyMatches = propertyMatchesFilter(record, propertyFilter);
        return categoryMatches && propertyMatches && record.status === "Needs Review";
      }),
    [categoryFilter, propertyFilter, records]
  );

  const openRecord = records.find((record) => record.id === openId);
  const pendingRecords = records.filter((record) => record.status === "Needs Review");
  const readyRecords = records.filter((record) => record.status === "Approved");
  const returnedRecords = records.filter((record) => record.status === "Returned / Needs More Information");
  const rejectedRecords = records.filter((record) => record.status === "Rejected");
  const selectedCost = readyRecords.reduce((total, record) => total + record.estimatedCost, 0);
  const selectedExecutionRecords = readyRecords.filter((record) => selectedExecutionIds.includes(record.id));
  const selectedExecutableCost = selectedExecutionRecords.reduce((total, record) => total + record.estimatedCost, 0);
  const highCount = pendingRecords.filter((record) => record.priority === "High" || record.priority === "Critical").length;
  const mediumCount = pendingRecords.filter((record) => record.priority === "Medium").length;
  const lowCount = pendingRecords.filter((record) => record.priority === "Low").length;

  useEffect(() => {
    legacyStorageKeys.forEach((key) => window.localStorage.removeItem(key));
    setLoaded(true);
    void checkIntake({ reason: "load" });
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(storageKey, JSON.stringify(records));
  }, [loaded, records]);

  function startEdit(section: EditableSectionKey) {
    if (!openRecord) return;
    setEditingSection(section);
    setEditValue(serializeRecordSection(openRecord, section));
    setConfirmation(`${section} opened for editing.`);
  }

  function saveSection() {
    if (!openRecord || !editingSection) return;
    setRecords((current) => current.map((record) => (record.id === openRecord.id ? applySectionValue(record, editingSection, editValue) : record)));
    setConfirmation("Section update saved.");
    setEditingSection(null);
    setEditValue("");
  }

  function viewSection(section: EditableSectionKey) {
    if (!openRecord) return;
    setEditingSection(null);
    setEditValue(serializeRecordSection(openRecord, section));
    setConfirmation(`${section} opened for review. Use Edit to update it.`);
  }

  function updateDecision(id: string, decision: OwnerApprovalDecision) {
    const nextStatus = statusForDecision(decision);
    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              ownerDecision: decision,
              status: nextStatus,
              rejectionReason: decision === "Reject" ? record.ownerInstructions : "",
              statusHistory: [...(record.statusHistory || []), historyEntry(record, decision, nextStatus)]
            }
          : record
      )
    );
    setOpenId(id);
    setConfirmation(confirmationForDecision(decision));
    setMassPrompt("");
  }

  function toggleExecutionSelection(id: string) {
    setSelectedExecutionIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
    setMassPrompt("");
  }

  function selectAllReadyForExecution() {
    setSelectedExecutionIds(readyRecords.map((record) => record.id));
    setConfirmation(`${readyRecords.length} approved item(s) selected for execution prompt.`);
    setMassPrompt("");
  }

  function clearExecutionSelection() {
    setSelectedExecutionIds([]);
    setConfirmation("Execution selection cleared.");
    setMassPrompt("");
  }

  function generateExecutionPrompt(actionType?: ExecutableActionType) {
    if (!selectedExecutionIds.length) {
      setConfirmation("Select one or more approved items before generating an execution prompt.");
      return;
    }
    setMassPrompt(buildSelectedExecutionPrompt(records, selectedExecutionIds, actionType));
    setConfirmation("Execution prompt generated for selected approved items.");
  }

  function generateSingleExecutionPrompt(id: string, actionType?: ExecutableActionType) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    if (record.status !== "Approved") {
      setConfirmation("Approve this item before generating an execution prompt.");
      return;
    }
    setSelectedExecutionIds([id]);
    setMassPrompt(buildSelectedExecutionPrompt(records, [id], actionType));
    setConfirmation("Execution prompt generated for the open approval item.");
  }

  function updateInstructions(id: string, instructions: string) {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, ownerInstructions: instructions } : record)));
    setConfirmation("Owner instructions saved.");
  }

  async function checkIntake(options: { reason?: "load" | "manual" } = {}) {
    setSyncing(true);
    setConnectionWarning("");
    setConfirmation(options.reason === "load" ? "Loading live owner approval intake..." : "Checking Gmail and Google Voice workaround sources...");
    try {
      const response = await fetch("/api/owner-approvals/intake", { cache: "no-store" });
      const data = (await response.json()) as IntakeSyncResponse;
      if (!response.ok || !data.ok) {
        throw new Error("Live owner approval intake is unavailable.");
      }
      setIntakeAudit(data.intakeAudit || null);
      const gmailStatus = data.statuses?.find((status) => status.product === "Gmail");
      const driveStatus = data.statuses?.find((status) => status.product === "Google Drive");
      if (gmailStatus && !gmailStatus.connected) setConnectionWarning("Gmail disconnected — reconnect required");
      else if (driveStatus && !driveStatus.connected) setConnectionWarning("Google Drive disconnected — reconnect required");

      const incoming = (data.items || []).map(normalizeRecord);
      setRecords((current) => {
        const byId = new Map(current.map((record) => [record.id, record]));
        return incoming.map((record) => {
          const existing = byId.get(record.id);
          return existing
            ? {
                ...record,
                ownerDecision: existing.ownerDecision,
                ownerInstructions: existing.ownerInstructions,
                status: existing.status,
                statusHistory: existing.statusHistory || record.statusHistory || [],
                rejectionReason: existing.rejectionReason
              }
            : record;
        });
      });
      setConfirmation(`${incoming.length} live intake item(s) loaded. ${data.safety}`);
      setOpenId((current) => incoming.some((record) => record.id === current) ? current : incoming[0]?.id || "");
    } catch (error) {
      setConnectionWarning("Gmail disconnected — reconnect required");
      setRecords([]);
      setOpenId("");
      setConfirmation(error instanceof Error ? `Live intake blocked: ${error.message}` : "Live intake blocked.");
    } finally {
      setSyncing(false);
    }
  }

  function refreshQueue() {
    setMassPrompt("");
    setEditingSection(null);
    setIntakeAudit(null);
    window.localStorage.removeItem(storageKey);
    void checkIntake({ reason: "manual" });
  }

  const prompt = massPrompt || buildMassPrompt(records);

  return (
    <div className="owner-approval-mockup-shell">
      <aside className="mockup-sidebar">
        <div className="mockup-brand">
          <Home size={36} aria-hidden />
          <div><strong>PROPERTY</strong><span>MANAGEMENT SYSTEM</span></div>
        </div>
        <nav aria-label="Owner approval navigation">
          {navItems.filter((item) => !hiddenApprovalSidebarRoutes.has(item.href)).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} className={item.active ? "active" : ""} href={item.href as Route}>
                <Icon size={20} aria-hidden />
                <span>{item.label}</span>
                {item.active ? <em>{records.length}</em> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mockup-user"><span>TW</span><div><strong>Timothy Wooden</strong><small>Owner</small></div></div>
      </aside>

      <main className="approval-workspace">
        <header className="approval-workspace-header">
          <div>
            <h1>Owner Approval Queue <span>{records.length}</span></h1>
            <p>Review all pending items and provide approval instructions</p>
            {connectionWarning ? <div className="approval-connection-warning">{connectionWarning}</div> : null}
            {confirmation ? <div className="approval-confirmation">{confirmation}</div> : null}
          </div>
          <div className="workspace-actions">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}>
              <option>All Categories</option>
              {ownerApprovalCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
            <select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)}>
              <option>All Properties</option>
              {propertyOptions.map((property) => <option key={property}>{property}</option>)}
            </select>
            <button type="button"><Filter size={17} aria-hidden />Filters</button>
            <button type="button" onClick={refreshQueue}><RefreshCw size={17} aria-hidden />Refresh</button>
            <button type="button" onClick={() => checkIntake({ reason: "manual" })} disabled={syncing}><RefreshCw size={17} aria-hidden />{syncing ? "Checking..." : "Check Gmail & Voice Intake"}</button>
          </div>
        </header>

        {intakeAudit ? (
          <section className="intake-audit-panel" aria-label="Gmail intake audit report">
            <div className="intake-audit-heading">
              <div>
                <h2>Gmail Intake Audit</h2>
                <p>Query: <code>{intakeAudit.gmailQueryUsed}</code></p>
              </div>
              <span>{intakeAudit.dateLimit}</span>
            </div>
            <div className="intake-audit-stats">
              <article><span>Messages scanned</span><strong>{intakeAudit.progress.messagesScanned}</strong></article>
              <article><span>Threads scanned</span><strong>{intakeAudit.progress.threadsScanned}</strong></article>
              <article><span>Matched</span><strong>{intakeAudit.progress.matched}</strong></article>
              <article><span>Skipped</span><strong>{intakeAudit.progress.skipped}</strong></article>
              <article><span>Duplicates</span><strong>{intakeAudit.progress.duplicates}</strong></article>
              <article><span>Errors</span><strong>{intakeAudit.progress.errors}</strong></article>
              <article><span>7-unit count</span><strong>{intakeAudit.summary.sevenUnitCount}</strong></article>
              <article><span>4-unit count</span><strong>{intakeAudit.summary.fourUnitCount}</strong></article>
              <article><span>Unknown property</span><strong>{intakeAudit.summary.unknownPropertyCount}</strong></article>
              <article><span>Google Voice</span><strong>{intakeAudit.summary.googleVoiceCount}</strong></article>
              <article><span>Approval items</span><strong>{intakeAudit.summary.ownerApprovalItemsCreated}</strong></article>
            </div>
            <p className="intake-audit-note">
              Full mailbox query scans All Mail with archived, inbox, sent, starred, important, and labeled mail included.
              Spam and trash are excluded. Classification totals: {Object.entries(intakeAudit.summary.classificationTotals).map(([key, value]) => `${key}: ${value}`).join(" | ") || "None"}.
            </p>
            <div className="intake-audit-table-wrap">
              <table className="intake-audit-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Property</th>
                    <th>Class</th>
                    <th>Created</th>
                    <th>Skip / Duplicate Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {intakeAudit.entries.slice(0, 20).map((entry) => (
                    <tr key={`${entry.messageId}-${entry.propertyAssigned}`}>
                      <td><strong>{entry.subject}</strong><small>{entry.from}</small></td>
                      <td>{entry.propertyAssigned}</td>
                      <td>{entry.classificationAssigned}</td>
                      <td>{entry.ownerApprovalItemCreated ? "Yes" : "No"}</td>
                      <td>{entry.skipReason || entry.duplicateReason || "Owner Approval item created"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="approval-table-shell">
          <table className="approval-mock-table">
            <thead>
              <tr>
                <th>ID</th><th>Source</th><th>Category</th><th>Property / Unit</th><th>Title / Summary</th><th>Received</th><th>Priority</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {needsReviewRecords.slice(0, 8).map((record) => (
                <tr key={record.id} className={openId === record.id ? "approval-row-active" : ""} onClick={() => setOpenId(record.id)}>
                  <td><button type="button" className="id-link" onClick={(event) => { event.stopPropagation(); setOpenId(record.id); }}>{record.id}</button></td>
                  <td><span className="source-cell">{sourceMark(record.source)}{record.source}</span><br /><small>{record.sourceMode}</small></td>
                  <td><Pill tone={categoryTone(record.category)}>{record.category}</Pill></td>
                  <td>{record.propertyUnit}</td>
                  <td>{record.summary}</td>
                  <td>{record.receivedDate}<br /><span>{record.receivedTime}</span></td>
                  <td><Pill tone={priorityTone(record.priority)}>{record.priority}</Pill></td>
                  <td><Pill tone={record.sourceMode === "Blocked" ? "red" : "status-blue"}>{record.status}</Pill></td>
                  <td><button className="row-collapse-button" type="button" onClick={(event) => { event.stopPropagation(); setOpenId(openId === record.id ? "" : record.id); }}>{openId === record.id ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}</button></td>
                </tr>
              ))}
              {!needsReviewRecords.length ? <tr><td colSpan={9} className="approval-empty-row">No items currently need owner approval. Approved, returned, and rejected items can be reopened below.</td></tr> : null}
            </tbody>
          </table>
        </section>

        {openRecord ? (
          <ExpandedTask
            record={openRecord}
            editingSection={editingSection}
            editValue={editValue}
            onStartEdit={startEdit}
            onView={viewSection}
            onEditValue={setEditValue}
            onSaveSection={saveSection}
            onCancelEdit={() => { setEditingSection(null); setEditValue(""); }}
            onDecision={updateDecision}
            onInstructionChange={updateInstructions}
            onGenerateExecution={generateSingleExecutionPrompt}
            onCollapse={() => setOpenId("")}
          />
        ) : null}

        <section className="approval-status-sections" aria-label="Approval status sections">
          <StatusSection title="Approved" records={readyRecords} tone="approved" onOpen={setOpenId} selectedIds={selectedExecutionIds} onToggleSelected={toggleExecutionSelection} />
          <StatusSection title="Returned / Needs More Information" records={returnedRecords} tone="returned" onOpen={setOpenId} />
          <StatusSection title="Rejected" records={rejectedRecords} tone="rejected" onOpen={setOpenId} />
        </section>

        <section className="execution-action-panel" aria-label="Executable owner approval actions">
          <div className="execution-action-header">
            <div>
              <span className="section-kicker">Execution Buttons</span>
              <h2>Run Approved Items by Action Type</h2>
              <p>Select multiple approved items, then choose the exact action you want Codex to execute.</p>
            </div>
            <div className="execution-selection-tools">
              <strong>{selectedExecutionIds.length} selected</strong>
              <button type="button" onClick={selectAllReadyForExecution}>Select All Approved</button>
              <button type="button" onClick={clearExecutionSelection}>Clear</button>
            </div>
          </div>

          <div className="execution-action-buttons">
            {executableActionButtons.map((action) => (
              <button type="button" key={action.label} onClick={() => generateExecutionPrompt(action.type)} disabled={!selectedExecutionIds.length}>
                <BriefcaseBusiness size={16} aria-hidden />
                <span>{action.label}</span>
                <small>{action.help}</small>
              </button>
            ))}
          </div>

          <div className="execution-selected-list">
            {readyRecords.length ? readyRecords.map((record) => {
              const summary = executableSummary(record);
              return (
                <article key={record.id} className={selectedExecutionIds.includes(record.id) ? "selected" : ""}>
                  <label className="approval-select-check">
                    <input type="checkbox" checked={selectedExecutionIds.includes(record.id)} onChange={() => toggleExecutionSelection(record.id)} />
                    <span>Select</span>
                  </label>
                  <button type="button" onClick={() => setOpenId(record.id)}>
                    <strong>{record.id}</strong>
                    <span>{record.propertyUnit}</span>
                    <small>{record.title}</small>
                  </button>
                  <em className={`execution-type-pill ${summary.tone}`}>{summary.label}</em>
                </article>
              );
            }) : <p>No approved items are ready for execution.</p>}
          </div>
        </section>

        {massPrompt ? (
          <section className="mass-prompt-preview mockup-prompt-preview">
            <div><h3>Generated Mass Prompt</h3><button type="button" onClick={() => navigator.clipboard?.writeText(prompt)}><Copy size={16} aria-hidden />Copy</button></div>
            <pre>{prompt}</pre>
          </section>
        ) : null}

        <footer className="mockup-summary-bar">
          <div><span>Items Pending Approval</span><strong>{pendingRecords.length} <small>Total</small></strong><p><em className="high">{highCount} High</em><em className="medium">{mediumCount} Medium</em><em className="low">{lowCount} Low</em></p></div>
          <div><span>Ready for Execution</span><strong>{readyRecords.length} <small>Approved</small></strong></div>
          <div><span>Selected for Execution</span><strong>{selectedExecutionIds.length} <small>Items</small></strong></div>
          <div><span>Estimated Cost (Selected)</span><strong>{money(selectedExecutionIds.length ? selectedExecutableCost : selectedCost)}</strong></div>
          <button type="button" onClick={() => setMassPrompt(buildMassPrompt(records))}><BriefcaseBusiness size={20} aria-hidden />Generate Mass Prompt<small>Copy all approved instructions for Codex</small></button>
        </footer>
      </main>
    </div>
  );
}
