"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Copy, Database, FileCheck2, FolderUp, Search, ShieldAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
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

const requiredFolderOrder = `Required review order for every item:
1. Check the Intake folder for the specific property, unit, tenant/vendor/contact, and issue.
2. Check Owner Approval folders for approval forms, owner comments, draft packets, source files, and proof.
3. Check trackers, registers, dashboards, proof indexes, and approval queues.
4. Use Gmail metadata or Drive search only where needed and only within approved access.
5. Report blockers only after the Intake folder and Owner Approval folders have been checked.

Do not mark proof as missing, blocked, or owner-needed until the Intake folder and Owner Approval folders have been checked for that specific property, unit, tenant/vendor/contact, and issue.`;

const proofReviewFields = `For every proof document or possible proof item, identify:
1. File name
2. Folder location
3. Property
4. Unit
5. Tenant/vendor/contact
6. What the document proves
7. Whether it is final proof, supporting proof, draft-only, or conflicting proof
8. Whether owner final approval is still required`;

const noLiveActionRules = `Hard stops:
- Do not send emails, texts, Google Voice replies, tenant messages, vendor messages, lender messages, or agency messages unless owner specifically approved sending/contact.
- Do not file, serve, submit, finalize, or post legal paperwork unless owner specifically says "Approved to file eviction at court" or gives the exact final legal action approval.
- Do not make payments.
- Do not create Calendar events or Google Tasks unless separately approved.
- Do not move, rename, archive, or delete files unless owner approved the exact file action.
- Do not mark legal, financial, rent, maintenance, utility, communication, vendor, lender, or agency matters complete without verified proof and owner approval where required.`;

const commandTemplates: AdminCommandTemplate[] = [
  {
    id: "daily-sync",
    title: "Codex Command - Daily Sync Command",
    actionName: "Generate Codex Command: Daily Sync",
    controls: "Daily command report with Intake first, Owner Approval second, trackers third, and blockers last.",
    tone: "yellow",
    prompt: `Run the Property Command Center Daily Sync.

${requiredFolderOrder}

Daily sync scope:
- Review operation health, rent collection, utilities, maintenance, notices/legal holds, mortgage/arrears, Gmail tracking needs, Drive update needs, Calendar update needs, Google Tasks completion needs, owner approvals required, and blocked-until-verified items.
- Match every item to property, unit, tenant/vendor/contact, issue, proof, owner approval status, and next action.
- Do not call anything missing until the matching Intake and Owner Approval folders have been reviewed.
- End with a clear owner approval list and blockers that remain after folder review.

${proofReviewFields}

${noLiveActionRules}`
  },
  {
    id: "intake-approval-proof-review",
    title: "Codex Command - Intake + Approval Folder Proof Review",
    actionName: "Generate Codex Command: Intake + Approval Proof Review",
    controls: "Proof review command that checks Intake first and Owner Approval second before marking proof missing.",
    tone: "red",
    prompt: `Run the Intake + Owner Approval Folder Proof Review.

${requiredFolderOrder}

Proof review instructions:
- Review uploaded documents, screenshots, PDFs, HEIC images, emails, attachments, notices, invoices, utility bills, payment proof, court forms, tenant documents, and communication records in Intake.
- Review approval forms, owner comments, completed quick approval forms, draft packets, supporting attachments, eviction templates, proof documents, and final owner instructions in Owner Approval folders.
- Match each document to the correct property, unit, tenant/vendor/contact, and issue.
- Only after those folder checks may proof be marked missing, blocked, or owner-needed.

${proofReviewFields}

Report:
- Found proof documents
- Missing proof after folder review
- Conflicts or duplicates
- Recommended owner decision
- Whether Codex can proceed or must remain blocked

${noLiveActionRules}`
  },
  {
    id: "owner-approval-action-list",
    title: "Codex Command - Owner Approval Action List",
    actionName: "Generate Codex Command: Owner Approval Action List",
    controls: "Owner approval queue grouped by exact approved action, missing proof, and final owner decision needed.",
    tone: "yellow",
    prompt: `Prepare the Owner Approval Action List.

${requiredFolderOrder}

Owner Approval action list instructions:
- For each approval item, read the Owner Approval folder record before tracker rows.
- Preserve owner comments exactly.
- Identify approval status, approved action, not approved action, required proof, deadline/follow-up date, and special conditions.
- Separate draft-only approvals from final live action approvals.
- Do not infer approval from folder placement or from a draft document.

${proofReviewFields}

Output:
- Items approved for draft-only work
- Items approved for tracker/status update only
- Items pending owner decision
- Items blocked after Intake and Owner Approval review
- Items needing separate final live-action approval

${noLiveActionRules}`
  },
  {
    id: "legal-eviction-review",
    title: "Codex Command - Legal / Eviction Review Command",
    actionName: "Generate Codex Command: Legal / Eviction Review",
    controls: "Legal and eviction review with Intake first, Owner Approval second, and final filing blocked unless explicit.",
    tone: "red",
    prompt: `Run the Legal / Eviction Review.

${requiredFolderOrder}

Legal/eviction requirements:
- Review Intake folder first.
- Review Owner Approval folder second.
- Confirm complaint template, VTC request, draft email, notice copy, service/posting proof, ledger, balance proof, and Section 8/RFTA/HAP proof before saying anything is missing.
- Treat legal packets as draft-only unless final filing approval is explicit.
- Do not file, serve, submit, finalize, post, contact court, contact tenant, contact maintenance, or contact anyone unless owner approval specifically says "Approved to file eviction at court" or "Approved to send/contact".

${proofReviewFields}

Legal status options:
- Legal Review Needed
- Draft Created
- Pending Owner Approval
- Pending Proof
- Blocked
- Completed With Proof only if final proof and owner approval exist

${noLiveActionRules}`
  },
  {
    id: "unit-4-kevin-royster-filing-readiness",
    title: "Codex Command - Unit 4 Kevin Royster Eviction Filing Readiness",
    actionName: "Generate Codex Command: Unit 4 Filing Readiness",
    controls: "Unit 4 Kevin Royster filing-readiness review, courthouse helper instructions, and explicit final filing gate.",
    tone: "red",
    prompt: `Review Unit 4 Kevin Royster eviction filing readiness.

Property: 228 Reifert St, Pittsburgh, PA 15210
Unit: Unit 4
Tenant: Kevin Royster
Court: Magisterial District Court 05-3-14
Judge: Richard G. King
Court address: 2213 Brownsville Road, Pittsburgh, PA 15210
Filing fee: $197.00 total

${requiredFolderOrder}

Unit 4 required review:
- Check Intake for complaint template, VTC request, draft email, notice copy, service/posting proof, HEIC images, ledger, tenant balance proof, Section 8/RFTA/HAP proof, and maintenance team filing support documents.
- Check Owner Approval folders for the quick approval form, owner remarks, approved draft-only action, final filing approval status, draft packet, filing-helper instructions, and proof attachments.
- Confirm whether the filing helper is only authorized to file the completed packet at the courthouse and must not alter documents, contact tenant, negotiate, serve notices, give legal advice, or act outside filing.
- Do not file unless owner approval specifically says "Approved to file eviction at court".
- Treat all filing packet materials as draft-only unless that exact final filing approval exists.

${proofReviewFields}

Report:
- Filing-ready items
- Draft-only items
- Missing or conflicting proof after folder review
- Whether final owner filing approval exists
- Next owner action needed

${noLiveActionRules}`
  },
  {
    id: "rent-collection-review",
    title: "Codex Command - Rent Collection Review Command",
    actionName: "Generate Codex Command: Rent Collection Review",
    controls: "Rent collection review with ledgers, screenshots, notices, agreements, payment proof, and legal status gates.",
    tone: "yellow",
    prompt: `Run the Rent Collection Review.

${requiredFolderOrder}

Rent collection requirements:
- Check Intake and Owner Approval folders for ledgers, RentRedi screenshots, notices, payment agreements, payment confirmations, HEIC notice proof, tenant messages, and owner decisions.
- Match proof to property, unit, tenant, issue, month, balance, due date, payment date, and notice/legal status.
- Do not issue notices, update legal status, or mark delinquency resolved until ledger/payment proof is verified.
- Do not mark payment received without payment proof.

${proofReviewFields}

Report:
- Open rent items
- Payment proof found
- Ledger proof found
- Payment agreement status
- Notice/legal implications
- Items still blocked after folder review

${noLiveActionRules}`
  },
  {
    id: "maintenance-proof-review",
    title: "Codex Command - Maintenance Proof Review Command",
    actionName: "Generate Codex Command: Maintenance Proof Review",
    controls: "Maintenance proof review with photos, invoices, screenshots, texts, closeout docs, and vendor proof.",
    tone: "yellow",
    prompt: `Run the Maintenance Proof Review.

${requiredFolderOrder}

Maintenance requirements:
- Check Intake for photos, invoices, screenshots, texts, estimates, completion proof, tenant messages, and vendor messages.
- Check Owner Approval folders for closeout docs, vendor follow-up docs, owner decisions, and attached proof.
- Match each proof item to property, unit, tenant/vendor/contact, work order or issue, completion status, invoice/quote status, and owner approval.
- Do not mark maintenance complete unless proof is verified or owner explicitly confirms completion.

${proofReviewFields}

Report:
- Maintenance items reviewed
- Completion proof found
- Invoice/photo proof found
- Owner approval still required
- Items still blocked after folder review

${noLiveActionRules}`
  },
  {
    id: "mortgage-arrears-proof-review",
    title: "Codex Command - Mortgage / Arrears Proof Review Command",
    actionName: "Generate Codex Command: Mortgage / Arrears Proof Review",
    controls: "Mortgage and arrears proof review with lender statements, payment postings, balances, and legal pause proof.",
    tone: "red",
    prompt: `Run the Mortgage / Arrears Proof Review.

${requiredFolderOrder}

Mortgage/arrears requirements:
- Check Intake and Owner Approval folders for lender statements, payment confirmations, proof of posting, cure/reinstatement balance, due dates, foreclosure/legal pause proof, owner payment decisions, and tracker handling instructions.
- Match each item to property, lender/account, payment amount, due date, proof status, owner approval, and remaining risk.
- Do not mark current, paid, resolved, or legally paused unless posted-payment proof or lender proof exists.
- Do not take lender/financial action without owner confirmation and reviewed secure-message/attachment proof.

${proofReviewFields}

Report:
- Payment proof found
- Lender balance proof found
- Cure/reinstatement proof found
- Foreclosure/legal pause proof found
- Items still blocked after folder review

${noLiveActionRules}`
  },
  {
    id: "utility-bill-review",
    title: "Codex Command - Utility Bill Review Command",
    actionName: "Generate Codex Command: Utility Bill Review",
    controls: "Utility bill review with current bills, prior bills, payment proof, due dates, account numbers, and owner decisions.",
    tone: "yellow",
    prompt: `Run the Utility Bill Review.

${requiredFolderOrder}

Utility requirements:
- Check Intake and Owner Approval folders for current bills, prior bills, payment proof, due dates, account numbers, owner payment decisions, tracker decisions, screenshots, and provider notices.
- Match each bill to utility type, provider, property, account, bill period, amount due, due date, proof available, and owner approval.
- Do not update trackers or mark paid without owner-approved proof.
- Do not make payments.

${proofReviewFields}

Report:
- Bills found
- Payment proof found
- Due dates and account numbers found
- Conflicts or duplicates
- Items still blocked after folder review

${noLiveActionRules}`
  },
  {
    id: "gmail-communication-review",
    title: "Codex Command - Gmail Metadata / Communication Review Command",
    actionName: "Generate Codex Command: Gmail Metadata / Communication Review",
    controls: "Gmail metadata and communications review with folder-first proof checks and no sends.",
    tone: "yellow",
    prompt: `Run the Gmail Metadata / Communication Review.

${requiredFolderOrder}

Gmail/communication requirements:
- Use Gmail metadata only unless owner approved body or attachment review.
- If documents or attachments are needed, check Intake and Owner Approval folders first.
- Search for communication records already saved to Drive or approval folders before asking owner to upload proof.
- Draft responses only if approved.
- Send nothing unless owner specifically approved sending.
- Link related attachments or proof only after verifying source and folder location.

${proofReviewFields}

Report:
- Messages needing review
- Drafts needed only if owner approval exists
- Attachments/proof found in Intake or Owner Approval
- Items still blocked after folder review

${noLiveActionRules}`
  },
  {
    id: "google-voice-workaround-review",
    title: "Codex Command - Google Voice Workaround Review Command",
    actionName: "Generate Codex Command: Google Voice Workaround Review",
    controls: "Google Voice workaround review through screenshots, transcripts, exports, or Gmail notification references.",
    tone: "yellow",
    prompt: `Run the Google Voice Workaround Review.

${requiredFolderOrder}

Google Voice requirements:
- Direct Google Voice access is unavailable unless separately provided.
- Google Voice items may only be reviewed through approved workaround sources: Gmail notifications, voicemail transcripts, screenshots, exports, voicemail audio, owner-created summaries, or files uploaded to Intake or Owner Approval.
- Check Intake and Owner Approval folders for screenshots, transcripts, exports, voicemail audio, or Gmail notification references.
- Default Google Voice property to 7-unit rental property unless owner identifies a different property.
- Ask owner to confirm unit, contact role, issue/request, and whether a response is needed.
- Do not send Google Voice replies.
- Do not create Gmail drafts unless separately approved.

${proofReviewFields}

Report:
- Google Voice workaround items found
- Contact name and phone number
- Property default and unit status
- Missing owner clarifications
- Items still blocked after folder review

${noLiveActionRules}`
  },
  {
    id: "west-comm-review",
    title: "Codex Command - West Comm / West Aircomm Review Command",
    actionName: "Generate Codex Command: West Comm / West Aircomm Review",
    controls: "West Comm / West Aircomm review with Owner Approval and Intake proof first.",
    tone: "yellow",
    prompt: `Run the West Comm / West Aircomm Review.

${requiredFolderOrder}

West Comm / West Aircomm requirements:
- Check Owner Approval docs and Intake proof first.
- Confirm whether West Comm and West Aircomm are the same intended item.
- Search trackers/registers after folder review.
- Use Gmail metadata only if needed and approved.
- Do not take lender, financial, vendor, tenant, or communication action without owner confirmation and reviewed secure-message/attachment proof.

${proofReviewFields}

Report:
- Matching West Comm / West Aircomm items
- Sender/contact identity
- Property/unit or account involved
- Attachments/proof found
- Whether owner action or response draft is needed
- Items still blocked after folder review

${noLiveActionRules}`
  },
  {
    id: "duplicate-approval-folder-conflict",
    title: "Codex Command - Duplicate Approval Folder Conflict Review Command",
    actionName: "Generate Codex Command: Duplicate Folder Conflict Review",
    controls: "Duplicate approval packet review with active/final folder and duplicate/archive-pending folder identification.",
    tone: "red",
    prompt: `Run the Duplicate Approval Folder Conflict Review.

${requiredFolderOrder}

Duplicate-folder requirements:
- If an approval packet appears in multiple folders, do not delete anything.
- Identify active/final folder.
- Identify duplicate/archive-pending folder.
- Report duplicate-location conflict.
- Preserve proof links, approval history, owner comments, and tracker references.
- Only move/archive files if owner has specifically approved that exact file action and the Drive tool supports it.

${proofReviewFields}

Report:
- Approval item
- All folder locations found
- Active/final folder recommendation
- Duplicate/archive-pending folder recommendation
- Owner action required before any move/archive

${noLiveActionRules}`
  },
  {
    id: "vercel-ui-verification",
    title: "Codex Command - Vercel Deployment / UI Change Verification Command",
    actionName: "Generate Codex Command: Vercel UI Verification",
    controls: "Deployment verification command for UI changes, Overview cleanliness, git status, commit, push, and Vercel deployment checks.",
    tone: "green",
    prompt: `Run the Vercel Deployment / UI Change Verification.

${requiredFolderOrder}

UI/deployment requirements:
- Confirm git status before action.
- Confirm whether the intended source file was modified.
- Confirm whether the change was committed.
- Confirm whether the commit was pushed to the Vercel-connected branch.
- Confirm whether Vercel created a new deployment.
- For Overview cleanup, search Overview source and live page for command, prompt, automation, workflow action, Generate, Copy, Draft preview, Draft Only, Read Only, Approval Required, Live Write Disabled, Owner Review Required, Safety Gate, Will Prepare, Prepare Google Drive, Track Gmail, Gmail Follow-Ups, Calendar Update, Task Completion, and Verification Tasks.
- Do not add prompt, command, workflow cards, automation sections, or command buttons back to Overview or any non-Admin Task tab.

Report:
- Lint result
- Typecheck result
- Build result
- Commit hash
- Branch pushed
- Vercel deployment status
- Live URL
- Auth or visual verification limits, if any

${noLiveActionRules}`
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
  const [activeCommand, setActiveCommand] = useState<AdminCommandTemplate | null>(null);
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);

  async function copyCommand(command: AdminCommandTemplate) {
    const copied = await copyTextToClipboard(command.prompt);
    setCopiedCommandId(copied ? command.id : null);
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
      <IntakeRoutingPanel />
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
