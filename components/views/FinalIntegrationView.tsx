"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, ClipboardList, Copy, ShieldCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SheetsRefreshStatus } from "@/components/SheetsRefreshStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
import type { SystemStatus } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type Tone = "green" | "yellow" | "red";

type CorrectionRow = {
  id: string;
  expectedFolder: string;
  currentStatus: string;
  actualMatch: string;
  proposedFutureAction: string;
  actionType: string;
  risk: string;
  ownerApprovalRequired: string;
  blockedUntil: string;
  manualFixRecommended: string;
  automationLater: string;
  notes: string;
};

type ImportTemplateRow = {
  id: string;
  module: string;
  recordId: string;
  property: string;
  unit: string;
  tenantOrParty: string;
  date: string;
  amount: string;
  status: string;
  sourceType: string;
  proofReference: string;
  confidence: string;
  ownerVerified: string;
  blockedUntilVerified: string;
  readyForDashboard: string;
  notes: string;
};

type CommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  prompt: string;
};

type SettingsPayload = {
  system: SystemStatus;
};

const safetyLabels = [
  "Preview only",
  "Owner approval required",
  "No Drive writes",
  "No data import",
  "No Sheets connection",
  "No Gmail read/send",
  "No Calendar/Task created",
  "No RentRedi connection",
  "No tenant/legal/payment action"
];

const correctionRows: CorrectionRow[] = [
  {
    id: "command-dashboard",
    expectedFolder: "00 Command Dashboard",
    currentStatus: "Name Mismatch",
    actualMatch: "MASTER TRACKER",
    proposedFutureAction: "Rename folder later",
    actionType: "Future Drive write package",
    risk: "Medium",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner approves naming decision",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "Preview only / Not approved / Not performed."
  },
  {
    id: "rent",
    expectedFolder: "01 Rent Collection",
    currentStatus: "Found",
    actualMatch: "RENT COLLECTION",
    proposedFutureAction: "No action",
    actionType: "No action",
    risk: "Low",
    ownerApprovalRequired: "No",
    blockedUntil: "Not blocked",
    manualFixRecommended: "No",
    automationLater: "No",
    notes: "Expected folder matched read-only metadata."
  },
  {
    id: "maintenance",
    expectedFolder: "02 Maintenance",
    currentStatus: "Found",
    actualMatch: "MAINTENANCE",
    proposedFutureAction: "No action",
    actionType: "No action",
    risk: "Low",
    ownerApprovalRequired: "No",
    blockedUntil: "Not blocked",
    manualFixRecommended: "No",
    automationLater: "No",
    notes: "Expected folder matched read-only metadata."
  },
  {
    id: "mortgage",
    expectedFolder: "03 Mortgage and Arrears",
    currentStatus: "Missing",
    actualMatch: "No metadata match",
    proposedFutureAction: "Create folder later",
    actionType: "Future Drive write package",
    risk: "High",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner confirms folder should exist",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "Do not create automatically."
  },
  {
    id: "legal",
    expectedFolder: "04 Notices and Legal Holds",
    currentStatus: "Needs Owner Review",
    actualMatch: "EVICTIONS AND NOTICES; LEGAL AND COMPLIANCE",
    proposedFutureAction: "Confirm folder purpose",
    actionType: "Owner review only",
    risk: "High",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner chooses legal folder standard",
    manualFixRecommended: "Yes",
    automationLater: "No until legal-sensitive naming is approved",
    notes: "Ambiguous mapping stays blocked."
  },
  {
    id: "utilities",
    expectedFolder: "05 Utilities",
    currentStatus: "Missing",
    actualMatch: "No metadata match",
    proposedFutureAction: "Create folder later",
    actionType: "Future Drive write package",
    risk: "Medium",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner confirms folder should exist",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "Preview only / Not approved / Not performed."
  },
  {
    id: "lease",
    expectedFolder: "06 Lease Violations",
    currentStatus: "Found",
    actualMatch: "LEASE VIOLATIONS",
    proposedFutureAction: "No action",
    actionType: "No action",
    risk: "Low",
    ownerApprovalRequired: "No",
    blockedUntil: "Not blocked",
    manualFixRecommended: "No",
    automationLater: "No",
    notes: "Expected folder matched read-only metadata."
  },
  {
    id: "tenant-communications",
    expectedFolder: "07 Tenant Communications",
    currentStatus: "Name Mismatch",
    actualMatch: "TENANT MESSAGE LIBRARY",
    proposedFutureAction: "Rename folder later",
    actionType: "Future Drive write package",
    risk: "Medium",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner confirms naming standard",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "Do not rename automatically."
  },
  {
    id: "vendor-communications",
    expectedFolder: "08 Vendor Communications",
    currentStatus: "Name Mismatch",
    actualMatch: "VENDOR INFO",
    proposedFutureAction: "Rename folder later",
    actionType: "Future Drive write package",
    risk: "Medium",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner confirms naming standard",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "Do not rename automatically."
  },
  {
    id: "weekly",
    expectedFolder: "09 Weekly Command Reviews",
    currentStatus: "Name Mismatch",
    actualMatch: "MONTHLY REPORTS",
    proposedFutureAction: "Confirm folder purpose",
    actionType: "Owner review only",
    risk: "Medium",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner confirms weekly vs monthly package use",
    manualFixRecommended: "Yes",
    automationLater: "No until folder purpose is confirmed",
    notes: "May need a separate weekly package folder later."
  },
  {
    id: "archive",
    expectedFolder: "10 Proof Archive",
    currentStatus: "Name Mismatch",
    actualMatch: "ARCHIVED/OLD VERSIONS",
    proposedFutureAction: "Archive later",
    actionType: "Future Drive write package",
    risk: "Medium",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner approves archive policy",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "Do not move or archive automatically."
  },
  {
    id: "source-data",
    expectedFolder: "11 Source Data Exports",
    currentStatus: "Missing",
    actualMatch: "No metadata match",
    proposedFutureAction: "Create folder later",
    actionType: "Future Drive write package",
    risk: "Medium",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner confirms source export workflow",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "No import is performed in this batch."
  },
  {
    id: "owner-approvals",
    expectedFolder: "12 Owner Approvals",
    currentStatus: "Missing",
    actualMatch: "No metadata match",
    proposedFutureAction: "Create folder later",
    actionType: "Future Drive write package",
    risk: "High",
    ownerApprovalRequired: "Yes",
    blockedUntil: "Owner confirms approval package standard",
    manualFixRecommended: "Yes",
    automationLater: "Possible after explicit Drive-write approval",
    notes: "Owner decisions remain manual until approved."
  }
];

const completedCorrectionRows: CorrectionRow[] = correctionRows.map((row) => ({
  ...row,
  currentStatus: "Found",
  actualMatch: row.expectedFolder,
  proposedFutureAction: "No action",
  actionType: "No action",
  risk: "Low",
  ownerApprovalRequired: "No",
  blockedUntil: "Not blocked",
  manualFixRecommended: "No",
  automationLater: "No",
  notes: "Drive folder health verification passed: 13 found, 0 missing, 0 name mismatch, 0 owner review."
}));

const verifiedForms = [
  ["Rent Roll Verification", ["Property", "Unit", "Tenant", "Monthly Rent", "May 2026 Rent Due", "Amount Paid", "Balance", "Payment Date", "Payment Proof", "RentRedi Ledger Status", "Bank/Deposit Proof", "Section 8/HAP Related", "Owner Verified", "Ready for Dashboard"]],
  ["Tenant Balance Verification", ["Tenant", "Unit", "Balance Claimed", "Balance Source", "Ledger Match", "Payment Conflict", "Owner Action", "Blocked Until Verified"]],
  ["Payment Arrangement Verification", ["Tenant", "Arrangement Amount", "Due Date", "Paid Date", "Proof", "Status", "Calendar Follow-Up Needed"]],
  ["Section 8 / HAP Verification", ["Tenant", "Unit", "Agency", "HAP Expected", "Tenant Portion", "Payment Status", "Contract Status", "Proof Needed", "Owner Verified"]],
  ["Mortgage Proof Verification", ["Property", "Lender/Servicer", "Monthly Payment", "Arrears", "Payment Request Proof", "Posted Payment Proof", "Updated Balance", "Next Due Date", "Foreclosure/Legal Pause Status", "Owner Verified"]],
  ["Maintenance Proof Verification", ["Work Order", "Unit", "Issue", "Priority", "Vendor", "Completion Status", "Invoice Proof", "Photo Proof", "Tenant Confirmation", "Owner Verified"]],
  ["Utility Account Verification", ["Utility Type", "Provider", "Account Status", "Due Date", "Amount Due", "Payment Proof", "Paperless/Autopay Status", "Owner Verified"]],
  ["Notice / Legal Proof Verification", ["Tenant", "Unit", "Notice Type", "Ledger Verified", "Draft Reviewed", "Owner Approved", "Service Proof", "Legal Hold Status", "Blocked Until Verified"]],
  ["Drive Proof Map", ["Module", "Proof Type", "Folder Target", "Current Folder Health", "Proof Status", "Owner Action", "Ready for Upload Later"]],
  ["Weekly Review Inputs", ["Review Week", "Rent Summary", "Maintenance Summary", "Mortgage Summary", "Notice Summary", "Utilities Summary", "Admin Summary", "Proof Gaps", "Owner Decisions", "Blocked Items"]]
] as const;

const importRows: ImportTemplateRow[] = [
  {
    id: "import-template",
    module: "rent_collection",
    recordId: "PCT-VERIFY-000001",
    property: "Owner-entered",
    unit: "Unit",
    tenantOrParty: "Tenant or party",
    date: "YYYY-MM-DD",
    amount: "0.00",
    status: "Blocked until verified",
    sourceType: "Manual worksheet / export",
    proofReference: "Drive proof map reference",
    confidence: "Low / Medium / High",
    ownerVerified: "false",
    blockedUntilVerified: "true",
    readyForDashboard: "false",
    notes: "Template preview only; no import is performed."
  }
];

const mappingCards = [
  ["RentRedi Export", "Rent Collection"],
  ["RentRedi Work Orders", "Maintenance"],
  ["Lender/MBFS Proof", "Mortgage / Allotment"],
  ["Utility Bills/Portals", "Utilities"],
  ["Notice Ledger Proof", "Notices / Evictions"],
  ["Drive Folder Listing", "Drive Proof Map"],
  ["Manual Owner Review", "Owner Approval Queue"],
  ["Weekly Summary", "Reports"]
];

const sheetsTabs = [
  "verified_rent_roll",
  "verified_tenant_balances",
  "verified_payment_arrangements",
  "verified_section8_hap",
  "verified_mortgage_proof",
  "verified_maintenance_proof",
  "verified_utilities",
  "verified_notices_legal",
  "verified_drive_proof_map",
  "weekly_command_review"
];

const migrationPipeline = [
  "Keep local sample data unchanged",
  "Build verified source worksheet",
  "Collect proof",
  "Resolve conflicts",
  "Mark blocked items",
  "Owner reviews high-risk data",
  "Run import dry run",
  "Compare dashboard before/after",
  "Commit data source change",
  "Rollback if needed"
];

const migrationRules = [
  "Do not migrate legal/payment/mortgage values without owner review",
  "Do not migrate balances with ledger conflict",
  "Do not migrate HAP values without agency/ledger proof",
  "Do not migrate mortgage arrears without lender proof",
  "Do not migrate maintenance completion without invoice/photo/tenant/vendor proof"
];

const sops = [
  ["Daily Command Review SOP", ["Open Overview", "Review health status", "Review due today", "Review blocked items", "Review proof needed", "Review owner approvals", "Use command buttons for preview only", "Do not perform live actions without approval"]],
  ["Weekly Command Review SOP", ["Open Reports", "Review each module", "Review proof gaps", "Review Drive update needs", "Review Calendar/Task previews", "Review owner approvals", "Prepare weekly package", "Stop before live updates"]],
  ["Rent Collection Verification SOP", ["Review Rent Collection", "Compare RentRedi ledger/export", "Confirm bank/deposit proof if needed", "Confirm tenant balances", "Mark conflicts blocked", "Prepare owner decision list"]],
  ["Maintenance Proof Closeout SOP", ["Review work orders", "Confirm invoice/photos", "Confirm tenant/vendor completion", "Save proof plan", "Keep open until proof verified"]],
  ["Mortgage Proof Verification SOP", ["Confirm MBFS/payment request", "Confirm lender posted payment", "Confirm updated balance", "Confirm next due date", "Confirm legal/foreclosure pause status if applicable", "Keep arrears blocked until verified"]],
  ["Notice / Legal Hold SOP", ["Verify ledger", "Review draft only", "Confirm owner approval", "Confirm service proof if applicable", "Keep legal-sensitive items blocked until verified"]],
  ["Drive Update Package SOP", ["Run read-only health", "Review missing/mismatch folders", "Prepare correction preview", "Owner approves manual or future write action", "No Drive writes without explicit approval"]],
  ["Gmail Follow-Up SOP", ["Metadata first", "Body read only with approval", "Draft only with approval", "Send only with explicit approval", "Log follow-up status"]],
  ["Calendar / Task Approval SOP", ["Prepare preview events/tasks", "Owner reviews", "Create only after approval", "Keep blocked items out of live creation"]]
] as const;

const launchChecklist = [
  "Live site reviewed",
  "Drive read-only working",
  "Drive folder health mapped",
  "Drive correction package reviewed",
  "Proof folder plan approved",
  "Real data worksheet ready",
  "Source-of-truth assigned",
  "Import template ready",
  "Conflicts identified",
  "Proof gaps identified",
  "SOPs reviewed",
  "Google Sheets read-only planning complete",
  "No write integrations enabled",
  "Owner approves next phase"
];

const commands: CommandTemplate[] = [
  {
    id: "final-readiness",
    title: "Codex Command - Final Integration Readiness Review",
    actionName: "Generate Codex Command: Final Integration Readiness Review",
    prompt: `Run Final Integration Readiness Review.

Rules:
- Read-only/local review only.
- Do not perform Drive writes.
- Do not connect Google Sheets, Gmail, Calendar, Tasks, RentRedi, tenant, legal, lender, vendor, bank, court, or payment workflows.
- Review Drive correction package, verified data forms, import mapping, Sheets read-only planning, migration preview, SOPs, and final launch checklist.
- Produce a readiness report only.
- Stop before live actions.`
  },
  {
    id: "drive-correction",
    title: "Codex Command - Drive Correction Package Review",
    actionName: "Generate Codex Command: Drive Correction Package Review",
    prompt: `Review Drive Correction Package.

Rules:
- Use Drive metadata read-only listing only.
- Do not create, upload, move, rename, delete, edit, copy, trash, or change permissions.
- Do not read file contents.
- Review missing folders, name mismatches, owner-review items, and possible future correction actions.
- Mark all actions preview-only and not approved.
- Stop before Drive writes.`
  },
  {
    id: "verified-data-entry",
    title: "Codex Command - Verified Data Entry Prep",
    actionName: "Generate Codex Command: Verified Data Entry Prep",
    prompt: `Prepare Verified Data Entry Workflow.

Rules:
- Do not import data.
- Do not connect live services.
- Prepare manual entry worksheets for rent, tenant balances, payment arrangements, HAP/Section 8, mortgage, maintenance, utilities, notices, Drive proof, and weekly review.
- Mark unverified values blocked.
- Stop before data migration.`
  },
  {
    id: "source-import",
    title: "Codex Command - Source Import Mapping Review",
    actionName: "Generate Codex Command: Source Import Mapping Review",
    prompt: `Review Source Import Mapping.

Rules:
- Do not import or overwrite dashboard data.
- Map expected source exports and worksheets to dashboard modules and fields.
- Identify proof references, owner verification fields, blocked values, and rollback needs.
- Stop before live actions.`
  },
  {
    id: "sheets-planning",
    title: "Codex Command - Sheets Read-Only Planning",
    actionName: "Generate Codex Command: Sheets Read-Only Planning",
    prompt: `Prepare Google Sheets Read-Only Plan.

Rules:
- Do not connect Sheets.
- Do not request OAuth.
- Do not write to Sheets.
- Plan read-only tabs, fields, validation, scope safety, token storage, dry-run steps, and owner approval gates.
- Stop before live connection.`
  },
  {
    id: "migration-preview",
    title: "Codex Command - Sample-to-Verified Migration Preview",
    actionName: "Generate Codex Command: Sample-to-Verified Migration Preview",
    prompt: `Prepare Sample-to-Verified Migration Preview.

Rules:
- Do not modify dashboard data.
- Do not connect live services.
- Identify which sample values can later be replaced, which must remain estimated, which are blocked, and what proof is required.
- Include validation, commit, rollback, and owner approval steps.
- Stop before data migration.`
  },
  {
    id: "sop-review",
    title: "Codex Command - SOP Review Package",
    actionName: "Generate Codex Command: SOP Review Package",
    prompt: `Prepare SOP Review Package.

Rules:
- Do not perform live actions.
- Review Daily Command Review, Weekly Command Review, Rent Verification, Maintenance Closeout, Mortgage Proof, Notice/Legal Hold, Drive Update Package, Gmail Follow-Up, and Calendar/Task Approval SOPs.
- Identify gaps and owner decisions required.
- Stop before live actions.`
  },
  {
    id: "launch-checklist",
    title: "Codex Command - Final Launch Checklist Review",
    actionName: "Generate Codex Command: Final Launch Checklist Review",
    prompt: `Run Final Launch Checklist Review.

Rules:
- Do not enable write integrations.
- Review readiness status for live site, Drive read-only, folder health, correction package, real data worksheet, source-of-truth package, import mapping, SOPs, and owner approvals.
- Report what is ready, blocked, and next.
- Stop before live actions.`
  },
  {
    id: "drive-recheck",
    title: "Codex Command - Drive Folder Recheck",
    actionName: "Generate Codex Command: Drive Folder Recheck",
    prompt: `Run Drive Folder Recheck.

Rules:
- Google Drive metadata read-only only.
- Do not create, upload, move, rename, delete, edit, copy, trash, or change permissions.
- Do not read file contents.
- Run drive:readonly:preflight, drive:readonly:list, and drive:readonly:health.
- Compare folder health to the expected 13-folder structure.
- Report found, missing, mismatch, and owner-review counts.
- Stop before Drive writes.`
  }
];

function KpiCard({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: Tone }) {
  return (
    <article className={`kpi-card status-strip ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function liveSheetsStatus(system: SystemStatus | null): { value: string; helper: string; tone: Tone } {
  if (!system) {
    return { value: "Checking", helper: "Reading owner-only status", tone: "yellow" };
  }

  if (system.requestedDataMode !== "live") {
    return { value: "Pending", helper: "Local Sample Mode active", tone: "yellow" };
  }

  if (!system.liveSheetsConfigured) {
    return { value: "Setup needed", helper: "Sheets env vars missing", tone: "yellow" };
  }

  if (!system.connectionOk) {
    return { value: "Needs review", helper: "Missing tabs or columns", tone: "yellow" };
  }

  return { value: "Complete", helper: "Live read-only source ready", tone: "green" };
}

export function FinalIntegrationView() {
  const [activeCommand, setActiveCommand] = useState<CommandTemplate | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { system } = useSheetsView<SettingsPayload>("settings");
  const driveRecheckCommand = commands.find((command) => command.id === "drive-recheck");
  const sheetsStatus = liveSheetsStatus(system);

  async function copyCommand(command: CommandTemplate) {
    const ok = await copyTextToClipboard(command.prompt);
    setCopied(ok ? command.id : null);
  }

  const correctionColumns: DataTableColumn<CorrectionRow>[] = [
    { key: "expectedFolder", header: "Expected Folder", render: (row) => row.expectedFolder },
    { key: "currentStatus", header: "Current Status", render: (row) => <StatusBadge label={row.currentStatus} /> },
    { key: "actualMatch", header: "Actual Match", render: (row) => row.actualMatch },
    { key: "proposedFutureAction", header: "Proposed Future Action", render: (row) => row.proposedFutureAction },
    { key: "actionType", header: "Action Type", render: (row) => row.actionType },
    { key: "risk", header: "Risk", render: (row) => <StatusBadge label={row.risk} /> },
    { key: "ownerApprovalRequired", header: "Owner Approval Required", render: (row) => row.ownerApprovalRequired },
    { key: "blockedUntil", header: "Blocked Until", render: (row) => row.blockedUntil },
    { key: "manualFixRecommended", header: "Manual Fix Recommended", render: (row) => row.manualFixRecommended },
    { key: "automationLater", header: "Automation Later", render: (row) => row.automationLater },
    { key: "notes", header: "Notes", render: (row) => row.notes }
  ];

  const importColumns: DataTableColumn<ImportTemplateRow>[] = [
    { key: "module", header: "module", render: (row) => row.module },
    { key: "recordId", header: "record_id", render: (row) => row.recordId },
    { key: "property", header: "property", render: (row) => row.property },
    { key: "unit", header: "unit", render: (row) => row.unit },
    { key: "tenantOrParty", header: "tenant_or_party", render: (row) => row.tenantOrParty },
    { key: "date", header: "date", render: (row) => row.date },
    { key: "amount", header: "amount", render: (row) => row.amount },
    { key: "status", header: "status", render: (row) => row.status },
    { key: "sourceType", header: "source_type", render: (row) => row.sourceType },
    { key: "proofReference", header: "proof_reference", render: (row) => row.proofReference },
    { key: "confidence", header: "confidence", render: (row) => row.confidence },
    { key: "ownerVerified", header: "owner_verified", render: (row) => row.ownerVerified },
    { key: "blockedUntilVerified", header: "blocked_until_verified", render: (row) => row.blockedUntilVerified },
    { key: "readyForDashboard", header: "ready_for_dashboard", render: (row) => row.readyForDashboard },
    { key: "notes", header: "notes", render: (row) => row.notes }
  ];

  return (
    <div className="remaining-command-page">
      <section className="remaining-command-header">
        <div>
          <span className="eyebrow">Final Operations Integration Readiness</span>
          <h2>Final Integration Readiness Command</h2>
          <p>Drive correction preview, verified data entry prep, source import mapping, Sheets read-only planning, migration preview, SOPs, and final launch checklist.</p>
        </div>
        <div className="remaining-header-stack">
          <StatusBadge label={system?.dataMode === "live" ? "Live Sheets Mode" : "Local Sample Mode"} />
          <StatusBadge label="Last updated: May 25, 2026" />
          <StatusBadge label="Owner password protected" />
        </div>
      </section>

      <SheetsRefreshStatus system={system} />

      <section className="remaining-health-panel">
        <span className="eyebrow">Operating Mode</span>
        <h3>Read-only operations ready / write integrations blocked</h3>
        <div className="remaining-safety-strip">
          {[
            system?.dataMode === "live" ? "Live Google Sheets read-only" : "Local Sample Mode",
            "Dashboard security complete",
            "Drive folder structure complete",
            "Drive read-only/listing active locally",
            "No Drive writes",
            "No Google Sheets writes",
            "No Gmail, Calendar, Tasks, RentRedi, tenant, legal, lender, vendor, bank, court, or payment actions",
            "Owner approval required before any live action"
          ].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="remaining-kpi-grid">
        <KpiCard label="Expected Folders" value="13" helper="Final folder health result" tone="green" />
        <KpiCard label="Found" value="13" helper="All expected folders found" tone="green" />
        <KpiCard label="Missing" value="0" helper="No missing folders" tone="green" />
        <KpiCard label="Name Mismatch" value="0" helper="No folder naming issues" tone="green" />
        <KpiCard label="Needs Owner Review" value="0" helper="No owner-review folder items" tone="green" />
        <KpiCard label="Drive Writes" value="Disabled" helper="No actions performed" tone="green" />
        <KpiCard label="Dashboard Security" value="Complete" helper="Owner password login active" tone="green" />
        <KpiCard label="Live Google Sheets" value={sheetsStatus.value} helper={sheetsStatus.helper} tone={sheetsStatus.tone} />
        <KpiCard label="Gmail Automation" value="Not connected" helper="No Gmail writes or sends" tone="green" />
        <KpiCard label="Calendar Automation" value="Not connected" helper="No events created" tone="green" />
        <KpiCard label="RentRedi Automation" value="Not connected" helper="No RentRedi actions" tone="green" />
        <KpiCard label="Live Writes" value="Disabled" helper="Owner approval gates enabled" tone="green" />
      </section>

      <Section eyebrow="Section 1" title="Drive Folder Correction Package Preview">
        <p className="warning-note">Drive folder correction is complete. No Drive correction actions are needed or performed in this batch.</p>
        <DataTable rows={completedCorrectionRows} columns={correctionColumns} />
      </Section>

      <Section eyebrow="Section 2" title="Drive Folder Recheck Workflow">
        <div className="calendar-two-column">
          <article className="calendar-preview-panel">
            <h3>Checklist</h3>
            <div className="calendar-preview-list">
              {["Review missing folders", "Decide manual vs future automated correction", "Manually fix folders in Google Drive if preferred", "Rerun drive:readonly:list", "Rerun drive:readonly:health", "Confirm expected folders found", "Confirm no name mismatches", "Confirm no owner-review items remain", "Save folder health report", "Continue to verified data entry"].map((item, index) => (
                <div key={item}><strong>{index + 1}. {item}</strong></div>
              ))}
            </div>
          </article>
          <article className="calendar-preview-panel">
            <h3>Target Success State</h3>
            <div className="settings-lines">
              {["Expected folders: 13", "Found: 13", "Missing: 0", "Name mismatch: 0", "Needs owner review: 0"].map((item) => (
                <div className="mode-status-list" key={item}><span>{item}</span><StatusBadge label="Target" /></div>
              ))}
            </div>
          </article>
        </div>
        {driveRecheckCommand ? (
          <div className="remaining-command-button-grid">
            <article className="codex-command-card command-tone-yellow">
              <span>Metadata read-only only</span>
              <strong>Generate Codex Command: Drive Folder Recheck</strong>
              <p>Runs preflight, listing, and health checks only. No Drive writes or file content reads.</p>
              <button type="button" onClick={() => {
                setActiveCommand(driveRecheckCommand);
                setCopied(null);
              }}>
                <Copy size={15} />
                Generate Command
              </button>
            </article>
          </div>
        ) : null}
      </Section>

      <Section eyebrow="Section 3" title="Verified Data Entry Forms">
        <div className="remaining-queue-grid">
          {verifiedForms.map(([title, fields]) => (
            <article className="remaining-queue-card queue-yellow" key={title}>
              <ClipboardList size={19} />
              <h3>{title}</h3>
              <p>Worksheet preview only. Unverified values stay blocked.</p>
              <div className="tag-cloud">
                {fields.map((field) => <span key={field}>{field}</span>)}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Section 4" title="Source Data Import Template and Mapping">
        <p className="warning-note">No import is performed in this batch.</p>
        <DataTable rows={importRows} columns={importColumns} />
        <div className="remaining-queue-grid">
          {mappingCards.map(([source, target]) => (
            <article className="remaining-queue-card queue-green" key={source}>
              <ShieldCheck size={19} />
              <h3>{source}</h3>
              <p>Maps to {target}. Planning only; no live service is connected.</p>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Section 5" title="Google Sheets Read-Only Planning">
        <div className="calendar-two-column">
          <article className="calendar-preview-panel">
            <h3>Purpose</h3>
            <p>Use verified source worksheets later as read-only dashboard inputs.</p>
            <div className="remaining-safety-strip">
              {[
                system?.dataMode === "live" ? "Live Sheets read-only mode active" : "Local Sample Mode active",
                "No Sheets writes approved",
                "Read-only dashboard reads only",
                "Owner approval required before any scope or source change",
                "Verified worksheet must be reviewed first",
                "Sheet IDs must not expose secrets",
                "Service account key stays in environment variables only",
                "Dry run required before dashboard reads",
                "Use Sheets read-only scope only",
                "No write scope"
              ].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
          <article className="calendar-preview-panel">
            <h3>Recommended Future Tabs</h3>
            <div className="tag-cloud">
              {sheetsTabs.map((tab) => <span key={tab}>{tab}</span>)}
            </div>
          </article>
        </div>
      </Section>

      <Section eyebrow="Section 6" title="Sample-to-Verified Data Migration Preview">
        <div className="remaining-kpi-grid">
          {[
            ["Sample Data Active", "Yes", "Local sample data unchanged", "green"],
            ["Verified Source Pending", "Open", "Manual worksheet first", "yellow"],
            ["Import Template Ready", "Preview", "No import performed", "green"],
            ["Conflicts Open", "Yes", "Resolve before migration", "red"],
            ["Proof Gaps Open", "Yes", "Proof required", "red"],
            ["Owner Review Required", "Yes", "High-risk values blocked", "yellow"],
            ["Migration Blocked", "Yes", "Until verified", "red"],
            ["Ready Later", "Planned", "After approval and dry run", "yellow"]
          ].map(([label, value, helper, tone]) => (
            <KpiCard key={label} label={label} value={value} helper={helper} tone={tone as Tone} />
          ))}
        </div>
        <div className="calendar-two-column">
          <article className="calendar-preview-panel">
            <h3>Migration Pipeline</h3>
            <div className="calendar-preview-list">
              {migrationPipeline.map((item, index) => <div key={item}><strong>{index + 1}. {item}</strong></div>)}
            </div>
          </article>
          <article className="calendar-blocked-panel">
            <h3>Blocked Migration Rules</h3>
            <ul>{migrationRules.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </Section>

      <Section eyebrow="Section 7" title="Core Operating SOPs">
        <div className="remaining-queue-grid">
          {sops.map(([title, steps]) => (
            <article className="remaining-queue-card queue-green" key={title}>
              <CheckCircle2 size={19} />
              <h3>{title}</h3>
              <div className="calendar-mini-list">
                {steps.map((step) => <div key={step}><strong>{step}</strong></div>)}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Section 8" title="Final Operations Launch Checklist">
        <div className="calendar-two-column">
          <article className="calendar-preview-panel">
            <h3>Master Checklist</h3>
            <div className="admin-checklist-grid">
              {launchChecklist.map((item) => (
                <span key={item}><CheckCircle2 size={15} />{item}</span>
              ))}
            </div>
          </article>
          <article className="calendar-blocked-panel">
            <h3>Launch Status</h3>
            <p>Current status: Read-only operations ready / write integrations blocked.</p>
            <p>Next owner decision: Manual Drive folder cleanup vs future controlled Drive-write package.</p>
          </article>
        </div>
      </Section>

      <section className="remaining-related-grid">
        {[
          ["/drive-readonly", "Drive Read-Only", "Review health mapping and metadata-only listing."],
          ["/drive-update-center", "Drive Update Center", "Review future write package previews only."],
          ["/operations-readiness", "Operations Readiness", "Review phase status and owner gates."],
          ["/real-data-cleanup", "Real Data Cleanup", "Prepare verified data before migration."],
          ["/data-accuracy", "Data Accuracy", "Review sample-to-verified migration risk."],
          ["/live-readiness", "Live Readiness", "Confirm no live integrations are enabled."]
        ].map(([href, title, detail]) => (
          <article className="remaining-queue-card queue-yellow" key={href}>
            <ShieldCheck size={19} />
            <h3>{title}</h3>
            <p>{detail}</p>
            <Link href={href as Route} className="summary-link-button">Open {title}</Link>
          </article>
        ))}
      </section>

      <section className="calendar-command-panel">
        <span className="eyebrow">Section 9</span>
        <h3>Final Integration Command Buttons</h3>
        <p>All commands are preview/copy only. Nothing is connected, imported, written, sent, created, moved, renamed, deleted, or approved from this page.</p>
        <div className="remaining-command-button-grid">
          {commands.map((command) => (
            <article className="codex-command-card command-tone-yellow" key={command.id}>
              <span>Preview/copy only</span>
              <strong>{command.actionName}</strong>
              <p>Owner approval required. No live service action.</p>
              <button type="button" onClick={() => {
                setActiveCommand(command);
                setCopied(null);
              }}>
                <Copy size={15} />
                Generate Command
              </button>
            </article>
          ))}
        </div>
        {activeCommand ? (
          <div className="remaining-command-preview command-preview-panel">
            <div className="command-preview-header">
              <div>
                <span className="eyebrow">Command Preview</span>
                <h3>{activeCommand.title}</h3>
              </div>
              <button type="button" onClick={() => setActiveCommand(null)}>Close</button>
            </div>
            <div className="command-preview-labels">
              {safetyLabels.map((label) => <span key={label}>{label}</span>)}
            </div>
            <pre>{activeCommand.prompt}</pre>
            <div className="command-preview-actions">
              <button type="button" onClick={() => copyCommand(activeCommand)}>
                <Copy size={15} />
                Copy Command
              </button>
              {copied === activeCommand.id ? <span>Copied command to clipboard.</span> : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
