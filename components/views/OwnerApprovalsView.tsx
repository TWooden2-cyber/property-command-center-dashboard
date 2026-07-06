"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Gauge,
  Home,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  Wrench
} from "lucide-react";
import {
  defaultOwnerInstruction,
  ownerApprovalCategories,
  ownerApprovalRecords,
  type OwnerApprovalCategory,
  type OwnerApprovalDecision,
  type OwnerApprovalPriority,
  type OwnerApprovalRecord,
  type OwnerApprovalStatus
} from "@/lib/ownerApprovals";
import { money } from "@/lib/propertyCommandCenterData";

const storageKey = "owner-command-center.owner-approval-queue.mockup.v2";

type CategoryFilter = "All Categories" | OwnerApprovalCategory;
type PropertyFilter = "All Properties" | string;

const navItems = [
  { label: "Owner Approvals", icon: CheckCircle2, href: "/owner-approvals", active: true },
  { label: "Dashboard", icon: Gauge, href: "/" },
  { label: "Rent & Ledger", icon: ClipboardList, href: "/rent-collection" },
  { label: "Legal / Evictions", icon: BadgeDollarSign, href: "/notices-evictions" },
  { label: "Maintenance", icon: Wrench, href: "/maintenance" },
  { label: "Utilities", icon: SlidersHorizontal, href: "/utilities" },
  { label: "Documents", icon: FileText, href: "/drive-readonly" },
  { label: "Calendar", icon: CalendarDays, href: "/calendar-follow-ups" },
  { label: "Tenants", icon: UserRound, href: "/" },
  { label: "Vendors", icon: UsersRound, href: "/" },
  { label: "Reports", icon: ClipboardList, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" }
];

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
  if (category === "Utility") return "orange";
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
  if (source === "Google Voice") return <span className="source-logo voice">☎</span>;
  if (source === "RentRedi") return <span className="source-logo rentredi">R</span>;
  if (source === "Photos") return <span className="source-logo photos">P</span>;
  return <span className="source-logo documents">D</span>;
}

function Pill({ children, tone }: { children: ReactNode; tone: string }) {
  return <span className={`mock-pill ${tone}`}>{children}</span>;
}

function StatusSection({ title, records, tone }: { title: string; records: OwnerApprovalRecord[]; tone: string }) {
  return (
    <article className={`approval-status-section ${tone}`}>
      <header>
        <h3>{title}</h3>
        <span>{records.length}</span>
      </header>
      {records.length ? (
        <div className="approval-status-list">
          {records.slice(0, 4).map((record) => (
            <div key={record.id}>
              <strong>{record.id}</strong>
              <span>{record.title}</span>
              {record.ownerInstructions ? <small>{record.ownerInstructions}</small> : null}
            </div>
          ))}
        </div>
      ) : (
        <p>No items in this status.</p>
      )}
    </article>
  );
}

function DetailCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <article className="queue-detail-card">
      <header>
        <h3>{title}</h3>
        <ChevronUp size={15} aria-hidden />
      </header>
      <div className="queue-detail-card-body">{children}</div>
      {action ? <footer>{action}</footer> : null}
    </article>
  );
}

function buildMassPrompt(records: OwnerApprovalRecord[]) {
  const approved = records.filter((record) => record.status === "Approved");

  if (!approved.length) {
    return "No approved owner approval queue items are ready for Codex execution.";
  }

  const lines = [
    "Run one Owner Approval Queue execution batch using only the approved items below.",
    "",
    "After each approved task is executed, automatically update:",
    "- Owner Approval Queue status",
    "- Dashboard",
    "- Rent ledger, if rent-related",
    "- Maintenance tracker, if maintenance-related",
    "- Legal tracker, if legal-related",
    "- Utility tracker, if utility-related",
    "- Calendar/task reminders, if deadline-related",
    "- Activity log",
    ""
  ];

  approved.forEach((record, index) => {
    lines.push(
      `Approved Item ${index + 1}`,
      `Task ID: ${record.id}`,
      `Source: ${record.source}`,
      `Property / Unit: ${record.propertyUnit}`,
      `Category: ${record.category}`,
      `Approved action: ${record.approvedAction}`,
      `Owner instructions: ${record.ownerInstructions || defaultOwnerInstruction}`,
      `Draft response: ${record.draftResponse || "No draft response included."}`,
      `Deadline: ${record.deadline}`,
      `Estimated cost: ${money(record.estimatedCost)}`,
      `Dashboard/tracker updates required: ${record.dashboardUpdatesRequired.join("; ")}`,
      ""
    );
  });

  return lines.join("\n");
}

function ExpandedTask({
  record,
  onDecision,
  onInstructionChange
}: {
  record: OwnerApprovalRecord;
  onDecision: (id: string, decision: OwnerApprovalDecision) => void;
  onInstructionChange: (id: string, instructions: string) => void;
}) {
  return (
    <section className="queue-expanded-task">
      <div className="expanded-task-heading">
        <div>
          <strong>Task {record.id}</strong>
          <span>•</span>
          <Pill tone={categoryTone(record.category)}>{record.category}</Pill>
          <span>•</span>
          <span>{record.propertyUnit}</span>
        </div>
        <button type="button">
          <ChevronUp size={14} aria-hidden />
          Collapse
          <ChevronUp size={14} aria-hidden />
        </button>
      </div>

      <div className="queue-detail-grid">
        <DetailCard title="Review Summary" action={<button type="button">View Original Message</button>}>
          {record.reviewSummary.map((line) => <p key={line}>{line}</p>)}
          <dl className="summary-meta">
            <div><dt>Tenant:</dt><dd>{record.tenant}</dd></div>
            <div><dt>Reported:</dt><dd>{record.reported}</dd></div>
            <div><dt>Source:</dt><dd>{record.source}</dd></div>
            <div><dt>Property:</dt><dd>{record.property}</dd></div>
          </dl>
        </DetailCard>

        <DetailCard title={`Supporting Documents (${record.documents.length})`} action={<button type="button">View All Documents</button>}>
          <div className="supporting-documents-list">
            {record.documents.map((document) => (
              <article key={document.name}>
                <span className="pdf-icon">PDF</span>
                <div>
                  <strong>{document.name}</strong>
                  <small>{document.type} • {document.size}</small>
                </div>
              </article>
            ))}
          </div>
        </DetailCard>

        <DetailCard title="Draft Response" action={<button type="button">Edit Draft</button>}>
          <pre className="draft-response-box">{record.draftResponse || "No draft response needed for this task."}</pre>
        </DetailCard>

        <DetailCard title="Recommended Action" action={<button type="button">Change Recommendation</button>}>
          <p>{record.recommendedAction}</p>
          <p><strong>Vendor Suggestion:</strong><br />{record.vendorSuggestion}</p>
          <p><strong>ETA:</strong> {record.eta}</p>
        </DetailCard>

        <DetailCard title="Estimated Cost" action={<button type="button">View Estimate</button>}>
          <strong className="estimated-cost">{money(record.estimatedCost)}</strong>
          <p>Range: {record.costRange}</p>
          <p>{record.costNote}</p>
        </DetailCard>

        <DetailCard title="Deadline" action={<button type="button">Edit Deadline</button>}>
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
          <div className="approval-radio-group">
            <label className="approve">
              <input type="radio" checked={record.ownerDecision === "Approve"} onChange={() => onDecision(record.id, "Approve")} />
              Approve
            </label>
            <label className="return">
              <input type="radio" checked={record.ownerDecision === "Return for Changes"} onChange={() => onDecision(record.id, "Return for Changes")} />
              Return for Changes
            </label>
            <label className="reject">
              <input type="radio" checked={record.ownerDecision === "Reject"} onChange={() => onDecision(record.id, "Reject")} />
              Reject
            </label>
          </div>
        </div>
        <label className="codex-instructions-box">
          <span>Your Instructions to Codex</span>
          <textarea
            value={record.ownerInstructions}
            onChange={(event) => onInstructionChange(record.id, event.target.value)}
            placeholder="Provide specific instructions for Codex..."
          />
          <small>Example: &quot;{defaultOwnerInstruction}&quot;</small>
        </label>
      </section>
    </section>
  );
}

export function OwnerApprovalsView() {
  const [records, setRecords] = useState<OwnerApprovalRecord[]>(ownerApprovalRecords);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState(ownerApprovalRecords[0]?.id ?? "");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All Categories");
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("All Properties");
  const [massPrompt, setMassPrompt] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const propertyOptions = useMemo(() => Array.from(new Set(records.map((record) => record.propertyUnit.split(" - ")[0]))), [records]);
  const needsReviewRecords = useMemo(
    () =>
      records.filter((record) => {
        const categoryMatches = categoryFilter === "All Categories" || record.category === categoryFilter;
        const propertyMatches = propertyFilter === "All Properties" || record.propertyUnit.startsWith(propertyFilter);
        return categoryMatches && propertyMatches && record.status === "Needs Review";
      }),
    [categoryFilter, propertyFilter, records]
  );

  const pendingRecords = records.filter((record) => record.status === "Needs Review");
  const readyRecords = records.filter((record) => record.status === "Approved");
  const returnedRecords = records.filter((record) => record.status === "Returned / Needs More Information");
  const rejectedRecords = records.filter((record) => record.status === "Rejected");
  const selectedCost = readyRecords.reduce((total, record) => total + record.estimatedCost, 0);
  const highCount = pendingRecords.filter((record) => record.priority === "High" || record.priority === "Critical").length;
  const mediumCount = pendingRecords.filter((record) => record.priority === "Medium").length;
  const lowCount = pendingRecords.filter((record) => record.priority === "Low").length;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setRecords(JSON.parse(saved) as OwnerApprovalRecord[]);
    } catch {
      setRecords(ownerApprovalRecords);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(storageKey, JSON.stringify(records));
  }, [loaded, records]);

  function updateDecision(id: string, decision: OwnerApprovalDecision) {
    const nextStatus = statusForDecision(decision);
    const nextOpen = records.find((record) => record.id !== id && record.status === "Needs Review");

    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              ownerDecision: decision,
              status: nextStatus,
              rejectionReason: decision === "Reject" ? record.ownerInstructions : ""
            }
          : record
      )
    );
    setConfirmation(confirmationForDecision(decision));
    setMassPrompt("");
    setOpenId(nextOpen?.id ?? "");
  }

  function updateInstructions(id: string, instructions: string) {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, ownerInstructions: instructions } : record)));
    setConfirmation("Owner instructions saved.");
  }

  function refreshQueue() {
    setRecords(ownerApprovalRecords);
    setOpenId(ownerApprovalRecords[0]?.id ?? "");
    setMassPrompt("");
    setConfirmation("Queue refreshed.");
    window.localStorage.removeItem(storageKey);
  }

  const prompt = massPrompt || buildMassPrompt(records);

  return (
    <div className="owner-approval-mockup-shell">
      <aside className="mockup-sidebar">
        <div className="mockup-brand">
          <Home size={36} aria-hidden />
          <div>
            <strong>PROPERTY</strong>
            <span>MANAGEMENT SYSTEM</span>
          </div>
        </div>
        <nav aria-label="Owner approval navigation">
          {navItems.map((item) => {
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
        <div className="mockup-user">
          <span>TW</span>
          <div>
            <strong>Timothy Wooden</strong>
            <small>Owner</small>
          </div>
        </div>
      </aside>

      <main className="approval-workspace">
        <header className="approval-workspace-header">
          <div>
            <div className="approval-version-label">OWNER APPROVAL QUEUE UPDATED VERSION</div>
            <h1>Owner Approval Queue <span>{records.length}</span></h1>
            <p>Review all pending items and provide approval instructions</p>
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
          </div>
        </header>

        <section className="approval-table-shell">
          <table className="approval-mock-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Source</th>
                <th>Category</th>
                <th>Property / Unit</th>
                <th>Title / Summary</th>
                <th>Received</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {needsReviewRecords.slice(0, 5).map((record) => (
                <tr key={record.id}>
                  <td><button type="button" className="id-link" onClick={() => setOpenId(record.id)}>{record.id}</button></td>
                  <td><span className="source-cell">{sourceMark(record.source)}{record.source}</span></td>
                  <td><Pill tone={categoryTone(record.category)}>{record.category}</Pill></td>
                  <td>{record.propertyUnit}</td>
                  <td>{record.summary}</td>
                  <td>{record.receivedDate}<br /><span>{record.receivedTime}</span></td>
                  <td><Pill tone={priorityTone(record.priority)}>{record.priority}</Pill></td>
                  <td><Pill tone="status-blue">{record.status}</Pill></td>
                  <td>
                    <button className="row-collapse-button" type="button" onClick={() => setOpenId(openId === record.id ? "" : record.id)}>
                      {openId === record.id ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                    </button>
                  </td>
                </tr>
              ))}
              {!needsReviewRecords.length ? (
                <tr>
                  <td colSpan={9} className="approval-empty-row">No items currently need owner approval.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {needsReviewRecords.filter((record) => record.id === openId).map((record) => (
          <ExpandedTask key={record.id} record={record} onDecision={updateDecision} onInstructionChange={updateInstructions} />
        ))}

        <section className="approval-status-sections" aria-label="Approval status sections">
          <StatusSection title="Approved" records={readyRecords} tone="approved" />
          <StatusSection title="Returned / Needs More Information" records={returnedRecords} tone="returned" />
          <StatusSection title="Rejected" records={rejectedRecords} tone="rejected" />
        </section>

        {massPrompt ? (
          <section className="mass-prompt-preview mockup-prompt-preview">
            <div>
              <h3>Generated Mass Prompt</h3>
              <button type="button" onClick={() => navigator.clipboard?.writeText(prompt)}>
                <Copy size={16} aria-hidden />
                Copy
              </button>
            </div>
            <pre>{prompt}</pre>
          </section>
        ) : null}

        <footer className="mockup-summary-bar">
          <div>
            <span>Items Pending Approval</span>
            <strong>{pendingRecords.length} <small>Total</small></strong>
            <p><em className="high">{highCount} High</em><em className="medium">{mediumCount} Medium</em><em className="low">{lowCount} Low</em></p>
          </div>
          <div>
            <span>Ready for Execution</span>
            <strong>{readyRecords.length} <small>Items Selected</small></strong>
          </div>
          <div>
            <span>Estimated Cost (Selected)</span>
            <strong>{money(selectedCost)}</strong>
          </div>
          <button type="button" onClick={() => setMassPrompt(buildMassPrompt(records))}>
            <BriefcaseBusiness size={20} aria-hidden />
            Generate Mass Prompt
            <small>Copy all approved instructions for Codex</small>
          </button>
        </footer>
      </main>
    </div>
  );
}
