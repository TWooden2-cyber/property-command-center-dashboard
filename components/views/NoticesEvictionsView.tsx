"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Copy, FileText, Gavel, Search, ShieldAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  commandCenterPeriod,
  documentDraftStatuses,
  monthOptions,
  noticeRows,
  yearOptions,
  type NoticeCommandRow,
  type SignalTone
} from "@/lib/propertyCommandCenterData";

type NoticeFilter = {
  property: string;
  unit: string;
  tenant: string;
  noticeType: string;
  status: string;
  ledgerVerification: boolean;
  hapVerification: boolean;
  draftReady: boolean;
  closed: boolean;
  blocked: boolean;
  proofMissing: boolean;
  ownerApproval: boolean;
  search: string;
};

type NoticeCommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  tone: SignalTone;
  prompt: string;
};

const defaultFilters: NoticeFilter = {
  property: "All",
  unit: "All",
  tenant: "All",
  noticeType: "All",
  status: "All",
  ledgerVerification: false,
  hapVerification: false,
  draftReady: false,
  closed: false,
  blocked: false,
  proofMissing: false,
  ownerApproval: false,
  search: ""
};

const blockedWarnings = [
  "Do not serve Unit 2 notice until ledger conflict is resolved.",
  "Do not escalate Unit 4 until Section 8 and balance are verified.",
  "Do not treat Unit A balance as tenant delinquency until HAP payment is verified.",
  "Do not file or serve any notice directly from the dashboard.",
  "Do not rely on draft status as legal approval."
];

const noticeActionQueue = [
  "Verify Unit 2 ledger conflict.",
  "Verify Unit 4 Kevin Royster balance and Section 8 status.",
  "Confirm closed notices remain closed.",
  "Review Codex-drafted notice only as draft.",
  "Save service/proof only after owner-approved action.",
  "Keep legal-sensitive items blocked until verified."
];

const proofChecklist = [
  "Verified ledger",
  "Notice draft reviewed",
  "Owner approval",
  "Service method selected",
  "Service proof saved",
  "Mailing/tracking receipt saved",
  "Drive folder update later",
  "Calendar follow-up later",
  "Task update later"
];

const approvalGate = [
  "Notice service requires owner approval.",
  "Legal filing requires owner approval.",
  "Tenant/legal communication requires owner approval.",
  "Gmail send/draft requires owner approval.",
  "Drive upload/update requires owner approval.",
  "Calendar/task updates require owner approval."
];

const commandTemplates: NoticeCommandTemplate[] = [
  {
    id: "notice-status",
    title: "Codex Command - Notice Status Review",
    actionName: "Generate Codex Command: Notice Status Review",
    controls: "Notice status, ledger verification, proof status, owner approvals, and blocked items.",
    tone: "yellow",
    prompt: `Run a Notices / Evictions status review for the Property Command Center.

Rules:
- Read-only/local review first.
- Do not send tenant messages.
- Do not create, serve, file, upload, or finalize notices.
- Do not update Google Drive, Gmail, Calendar, Google Tasks, Sheets, RentRedi, or legal records without owner approval.
- Review notice status, ledger verification, Section 8/HAP verification, draft status, proof status, owner approvals, and blocked-until-verified items.
- Produce a notice status preview report.
- Stop before all live actions.`
  },
  {
    id: "ledger-before-notice",
    title: "Codex Command - Ledger Verification Before Notice",
    actionName: "Generate Codex Command: Ledger Verification Before Notice",
    controls: "Ledger conflicts, payment conflicts, Section 8/HAP issues, and unresolved balances.",
    tone: "red",
    prompt: `Prepare a ledger verification review before any notice action.

Rules:
- Do not serve or file notices.
- Do not contact tenants.
- Do not update live systems.
- Identify all notice-related items requiring ledger verification.
- Flag any payment conflict, Section 8/HAP issue, or unresolved balance.
- Stop before live actions.`
  },
  {
    id: "draft-review",
    title: "Codex Command - Draft Notice Review",
    actionName: "Generate Codex Command: Draft Notice Review",
    controls: "Draft review only for missing facts, proof, ledger confirmation, and owner approvals.",
    tone: "yellow",
    prompt: `Prepare Codex-drafted notice review for owner approval.

Rules:
- Draft review only.
- Do not send, serve, file, or upload notices.
- Do not make legal conclusions.
- Identify missing facts, proof, ledger confirmation, and owner approvals required before any notice can be used.
- Stop before live actions.`
  },
  {
    id: "packet-review",
    title: "Codex Command - Eviction Packet Prep Review",
    actionName: "Generate Codex Command: Eviction Packet Prep Review",
    controls: "Packet readiness, missing proof, ledger verification, service proof, and owner decisions.",
    tone: "red",
    prompt: `Prepare eviction packet readiness review.

Rules:
- Do not file anything.
- Do not contact court, tenants, agencies, or property manager.
- Do not update Google Drive without approval.
- Review draft packet readiness, missing proof, ledger verification, service proof, and owner decisions required.
- Stop before live actions.`
  },
  {
    id: "proof-checklist",
    title: "Codex Command - Notice Proof Checklist",
    actionName: "Generate Codex Command: Notice Proof Checklist",
    controls: "Verified ledger, draft approval, service proof, receipts, communication logs, calendar, and tasks.",
    tone: "yellow",
    prompt: `Prepare a notice proof checklist.

Rules:
- Do not upload or move files.
- Do not update Google Drive.
- Identify proof needed for each notice item:
  1. Verified ledger
  2. Notice draft approval
  3. Service proof
  4. Mailing/tracking receipt
  5. Communication log
  6. Calendar follow-up
  7. Task status
- Stop before live actions.`
  },
  {
    id: "drive-update",
    title: "Codex Command - Notices Google Drive Update",
    actionName: "Generate Codex Command: Notices Google Drive Update",
    controls: "Drive preview package for notice status, draft status, proof checklist, and legal hold items.",
    tone: "green",
    prompt: `Prepare a Google Drive notice/legal update package.

Rules:
- Do not upload, move, rename, delete, or update Drive files without owner approval.
- Prepare a preview package only.
- Include notice status, draft status, proof checklist, blocked-until-verified items, owner approval list, and legal hold items.
- Stop and ask for owner approval before any Drive write.`
  },
  {
    id: "calendar-task",
    title: "Codex Command - Notice Calendar / Task Prep",
    actionName: "Generate Codex Command: Notice Calendar / Task Prep",
    controls: "Calendar and task preview for ledger verification, draft review, service proof, and owner approval.",
    tone: "yellow",
    prompt: `Prepare notice-related calendar and task updates.

Rules:
- Do not create, update, complete, or delete Calendar events or Google Tasks without owner approval.
- Prepare preview only.
- Include follow-ups for ledger verification, draft review, service proof, owner approval, and blocked notice items.
- Stop before live actions.`
  }
];

function proofStatus(row: NoticeCommandRow) {
  return row.proofStatus ?? "Not set";
}

function ownerAction(row: NoticeCommandRow) {
  return row.ownerAction ?? "Owner review required";
}

function blockedAction(row: NoticeCommandRow) {
  return row.blockedAction ?? "Do not escalate without owner approval";
}

function needsLedgerVerification(row: NoticeCommandRow) {
  const text = `${row.status} ${row.noticeType} ${proofStatus(row)} ${ownerAction(row)}`.toLowerCase();
  return text.includes("ledger") || text.includes("conflict");
}

function needsHapVerification(row: NoticeCommandRow) {
  const text = `${row.status} ${row.noticeType} ${proofStatus(row)} ${ownerAction(row)}`.toLowerCase();
  return text.includes("section 8") || text.includes("hap");
}

function isClosed(row: NoticeCommandRow) {
  return row.status.toLowerCase().includes("closed") || row.status.toLowerCase().includes("no service");
}

function isBlocked(row: NoticeCommandRow) {
  return blockedAction(row).toLowerCase().includes("do not") || row.status.toLowerCase().includes("hold");
}

function proofMissing(row: NoticeCommandRow) {
  const text = proofStatus(row).toLowerCase();
  return text.includes("needs") || text.includes("missing") || text.includes("conflict");
}

function ownerApprovalRequired(row: NoticeCommandRow) {
  return !isClosed(row) || ownerAction(row).toLowerCase().includes("verify") || isBlocked(row);
}

function statusTone(row: NoticeCommandRow): SignalTone {
  if (isBlocked(row) || proofMissing(row)) return "red";
  if (ownerApprovalRequired(row) || needsLedgerVerification(row) || needsHapVerification(row)) return "yellow";
  return "green";
}

function matchesFilters(row: NoticeCommandRow, filters: NoticeFilter) {
  const haystack = [
    row.property,
    row.unit,
    row.tenant,
    row.noticeType,
    row.amountOwed,
    row.status,
    proofStatus(row),
    ownerAction(row),
    blockedAction(row)
  ]
    .join(" ")
    .toLowerCase();

  if (filters.property !== "All" && row.property !== filters.property) return false;
  if (filters.unit !== "All" && row.unit !== filters.unit) return false;
  if (filters.tenant !== "All" && row.tenant !== filters.tenant) return false;
  if (filters.noticeType !== "All" && row.noticeType !== filters.noticeType) return false;
  if (filters.status !== "All" && row.status !== filters.status) return false;
  if (filters.ledgerVerification && !needsLedgerVerification(row)) return false;
  if (filters.hapVerification && !needsHapVerification(row)) return false;
  if (filters.draftReady && !row.noticeType.toLowerCase().includes("notice")) return false;
  if (filters.closed && !isClosed(row)) return false;
  if (filters.blocked && !isBlocked(row)) return false;
  if (filters.proofMissing && !proofMissing(row)) return false;
  if (filters.ownerApproval && !ownerApprovalRequired(row)) return false;
  if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
  return true;
}

function NoticesHeader() {
  return (
    <section className="notice-command-header">
      <div>
        <p className="eyebrow">Local Sample Mode</p>
        <h2>Notices / Evictions Command</h2>
        <p>Notice tracking, legal hold status, draft review, ledger verification, service proof, and owner approval controls.</p>
        <div className="hero-source-strip">
          <span>Local Sample Mode</span>
          <span>No live legal filing, tenant messaging, Gmail, Drive, Calendar, or Task updates</span>
          <span>Last updated: May 21, 2026, 9:00 AM</span>
        </div>
      </div>
      <div className="rent-period-filter">
        <label>
          Month
          <select value={commandCenterPeriod.monthName} disabled>
            {monthOptions.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </label>
        <label>
          Year
          <select value={commandCenterPeriod.year} disabled>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function NoticeKpis() {
  const activeItems = noticeRows.filter((row) => !isClosed(row)).length;
  const draftReady = 1;
  const ledgerNeeded = noticeRows.filter(needsLedgerVerification).length;
  const hapNeeded = noticeRows.filter(needsHapVerification).length;
  const missingProof = noticeRows.filter(proofMissing).length;
  const approvals = noticeRows.filter(ownerApprovalRequired).length;
  const blocked = noticeRows.filter(isBlocked).length;
  const closed = noticeRows.filter(isClosed).length;

  const cards = [
    { label: "Active Notice Items", value: String(activeItems), helper: "Owner review and verification items", tone: activeItems ? "yellow" : "green" },
    { label: "Drafts Ready for Review", value: String(draftReady), helper: "Draft status only; owner approval required", tone: "yellow" },
    { label: "Ledger Verification Needed", value: String(ledgerNeeded), helper: "Unit 2 ledger conflict remains visible", tone: ledgerNeeded ? "red" : "green" },
    { label: "Section 8 / HAP Verification Needed", value: String(hapNeeded), helper: "Unit 4 and Unit A verification controls", tone: hapNeeded ? "red" : "green" },
    { label: "Proof Missing", value: String(missingProof), helper: "Proof/verification gaps remain", tone: missingProof ? "red" : "green" },
    { label: "Owner Approval Required", value: String(approvals), helper: "No notice action without owner approval", tone: approvals ? "yellow" : "green" },
    { label: "Blocked Items", value: String(blocked), helper: "Blocked until verified", tone: blocked ? "red" : "green" },
    { label: "Closed / No Action Items", value: String(closed), helper: "Closed still stays verification-aware", tone: "green" }
  ] as const;

  return (
    <section className="notice-kpi-grid">
      {cards.map((card) => (
        <article key={card.label} className="kpi-card command-kpi">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.helper}</p>
          <div className={`kpi-status-strip ${card.tone}`}>{card.tone === "green" ? "Closed / no action" : card.tone === "yellow" ? "Owner review" : "Blocked / verify"}</div>
        </article>
      ))}
    </section>
  );
}

function NoticeHealthEvaluation() {
  return (
    <section className="notice-health-panel">
      <div>
        <p className="eyebrow">Notice/legal health evaluation</p>
        <h3>Watch / High Verification Risk</h3>
        <p>
          Several notice-related items require ledger or Section 8/HAP verification. Closed or paid items should not be escalated without
          verified ledgers, and no dashboard item creates, serves, files, or sends a notice.
        </p>
      </div>
      <div className="notice-cause-grid">
        <article>
          <AlertTriangle size={18} />
          <strong>Ledger and HAP risk</strong>
          <p>Unit 2 Marc Gosselin has a ledger conflict. Unit 4 Kevin Royster requires balance and Section 8 review before notice escalation.</p>
        </article>
        <article>
          <ShieldAlert size={18} />
          <strong>Blocked controls</strong>
          <p>Unit A Lacourtney Martin needs HAP verification before treating a balance as tenant delinquency. Blocked items stay blocked.</p>
        </article>
        <article>
          <ClipboardCheck size={18} />
          <strong>Owner next actions</strong>
          <p>Verify ledgers, review drafts only as drafts, confirm proof/status, and do not serve/file anything from the dashboard.</p>
        </article>
      </div>
    </section>
  );
}

function NoticeFilters({ filters, onChange }: { filters: NoticeFilter; onChange: (next: NoticeFilter) => void }) {
  const properties = ["All", ...Array.from(new Set(noticeRows.map((row) => row.property)))];
  const units = ["All", ...Array.from(new Set(noticeRows.map((row) => row.unit)))];
  const tenants = ["All", ...Array.from(new Set(noticeRows.map((row) => row.tenant)))];
  const noticeTypes = ["All", ...Array.from(new Set(noticeRows.map((row) => row.noticeType)))];
  const statuses = ["All", ...Array.from(new Set(noticeRows.map((row) => row.status)))];

  return (
    <section className="notice-filter-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Notice filters</p>
          <h3>Find legal holds and verification gaps</h3>
        </div>
        <div className="search-pill">
          <Search size={16} />
          <input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search tenant or notice text" />
        </div>
      </div>
      <div className="notice-filter-grid">
        {[
          ["Property", "property", properties],
          ["Unit", "unit", units],
          ["Tenant", "tenant", tenants],
          ["Notice type", "noticeType", noticeTypes],
          ["Status", "status", statuses]
        ].map(([label, key, options]) => (
          <label key={key as string}>
            {label as string}
            <select value={filters[key as keyof NoticeFilter] as string} onChange={(event) => onChange({ ...filters, [key as string]: event.target.value })}>
              {(options as string[]).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="filter-toggle-row">
        <label><input type="checkbox" checked={filters.ledgerVerification} onChange={(event) => onChange({ ...filters, ledgerVerification: event.target.checked })} /> Ledger verification needed</label>
        <label><input type="checkbox" checked={filters.hapVerification} onChange={(event) => onChange({ ...filters, hapVerification: event.target.checked })} /> Section 8/HAP verification needed</label>
        <label><input type="checkbox" checked={filters.draftReady} onChange={(event) => onChange({ ...filters, draftReady: event.target.checked })} /> Draft ready</label>
        <label><input type="checkbox" checked={filters.closed} onChange={(event) => onChange({ ...filters, closed: event.target.checked })} /> Closed/no action</label>
        <label><input type="checkbox" checked={filters.blocked} onChange={(event) => onChange({ ...filters, blocked: event.target.checked })} /> Blocked</label>
        <label><input type="checkbox" checked={filters.proofMissing} onChange={(event) => onChange({ ...filters, proofMissing: event.target.checked })} /> Proof missing</label>
        <label><input type="checkbox" checked={filters.ownerApproval} onChange={(event) => onChange({ ...filters, ownerApproval: event.target.checked })} /> Owner approval required</label>
      </div>
    </section>
  );
}

function DraftStatusSection() {
  return (
    <section className="notice-draft-grid">
      {documentDraftStatuses.map((draft) => (
        <article key={draft.id} className={`notice-action-card ${draft.tone}`}>
          <p className="eyebrow">Codex draft status</p>
          <h3>{draft.document === "10-day notice" ? "10-Day Notice Draft" : "Eviction Packet"}</h3>
          <StatusBadge label={draft.document === "10-day notice" ? "Draft ready / owner review required" : "Draft tracking only / verification needed"} />
          <p>{draft.notes}</p>
          <footer>{draft.document === "10-day notice" ? "Do not send, serve, file, or upload without approval." : "Do not file or submit without owner approval and verified ledger."}</footer>
        </article>
      ))}
    </section>
  );
}

function NoticeOperationalSections() {
  return (
    <>
      <section className="notice-two-column">
        <article className="notice-blocked-panel">
          <p className="eyebrow">Legal hold / blocked until verified</p>
          <h3>Blocked controls stay active</h3>
          <ul>{blockedWarnings.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="notice-action-card">
          <p className="eyebrow">Notice action queue</p>
          <h3>Owner review only</h3>
          <ul>{noticeActionQueue.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </section>

      <section className="notice-proof-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Proof / service checklist</p>
            <h3>Required before any owner-approved notice action</h3>
          </div>
          <StatusBadge label="No live service from dashboard" />
        </div>
        <div className="notice-proof-grid">
          {proofChecklist.map((item) => (
            <article key={item}><ClipboardCheck size={16} /><span>{item}</span></article>
          ))}
        </div>
      </section>

      <section className="notice-approval-panel">
        <p className="eyebrow">Owner approval gate</p>
        <h3>Live actions remain disabled</h3>
        <div className="notice-approval-grid">
          {approvalGate.map((item) => (
            <span key={item}><Gavel size={16} />{item}</span>
          ))}
        </div>
      </section>
    </>
  );
}

function NoticeCommandButtons() {
  const [selected, setSelected] = useState<NoticeCommandTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!selected) return;
    const copiedCommand = await copyTextToClipboard(selected.prompt);
    setCopied(copiedCommand);
    if (copiedCommand) {
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <section className="notice-command-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Codex command buttons</p>
          <h3>Notice workflow prompts</h3>
        </div>
        <StatusBadge label="Draft command only" />
      </div>
      <div className="notice-command-button-grid">
        {commandTemplates.map((template) => (
          <button key={template.id} className={`command-action-button ${template.tone}`} type="button" onClick={() => setSelected(template)}>
            <FileText size={18} />
            <span>{template.actionName}</span>
            <small>{template.controls}</small>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="notice-command-preview">
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
            <span>No tenant message sent</span>
            <span>No notice served</span>
            <span>No legal filing</span>
            <span>No Drive upload</span>
          </div>
          <pre>{selected.prompt}</pre>
          <p>This dashboard does not send messages, create notices, serve notices, file cases, or update Google/RentRedi/legal systems.</p>
        </div>
      ) : null}
    </section>
  );
}

export function NoticesEvictionsView() {
  const [filters, setFilters] = useState(defaultFilters);
  const filteredRows = useMemo(() => noticeRows.filter((row) => matchesFilters(row, filters)), [filters]);

  const columns: DataTableColumn<NoticeCommandRow>[] = [
    { key: "dateStarted", header: "Date Started", render: (row) => row.dateStarted },
    { key: "property", header: "Property", render: (row) => row.property },
    { key: "unit", header: "Unit", render: (row) => row.unit },
    { key: "tenant", header: "Tenant", render: (row) => row.tenant },
    { key: "noticeType", header: "Notice Type", render: (row) => row.noticeType },
    { key: "amountOwed", header: "Amount Owed", render: (row) => row.amountOwed },
    { key: "noticeDate", header: "Notice Date", render: (row) => row.noticeDate },
    { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
    { key: "proofStatus", header: "Proof Status", render: (row) => proofStatus(row) },
    { key: "ownerAction", header: "Owner Action", render: (row) => ownerAction(row) },
    { key: "blockedAction", header: "Blocked Action", render: (row) => blockedAction(row) },
    { key: "risk", header: "Risk", render: (row) => <span className={`risk-dot ${statusTone(row)}`}>{statusTone(row) === "green" ? "Closed" : statusTone(row) === "yellow" ? "Review" : "Blocked"}</span> }
  ];

  return (
    <div className="notice-command-page">
      <NoticesHeader />
      <NoticeKpis />
      <NoticeHealthEvaluation />
      <NoticeFilters filters={filters} onChange={setFilters} />
      {filteredRows.length ? (
        <DataTable rows={filteredRows} columns={columns} />
      ) : (
        <EmptyState title="No notice records match these filters" message="Adjust the local sample filters to view notice and legal-hold records." />
      )}
      <DraftStatusSection />
      <NoticeOperationalSections />
      <NoticeCommandButtons />
    </div>
  );
}
