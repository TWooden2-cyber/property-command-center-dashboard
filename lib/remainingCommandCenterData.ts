import type { SignalTone } from "@/lib/propertyCommandCenterData";

export type CommandTableRow = {
  id: string;
  values: Record<string, string>;
  tone?: SignalTone;
};

export type CommandTableColumn = {
  key: string;
  header: string;
};

export type CommandButtonConfig = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  tone: SignalTone;
  prompt: string;
};

export type CommandPageConfig = {
  id: string;
  title: string;
  subtitle: string;
  localNotice: string;
  healthStatus: string;
  healthDetail: string;
  kpis: Array<{ label: string; value: string; helper: string; tone: SignalTone }>;
  tableColumns: CommandTableColumn[];
  tableRows: CommandTableRow[];
  queues: Array<{ title: string; detail: string; items: string[]; tone: SignalTone }>;
  blocked: string[];
  approvalGate: string[];
  filters: string[];
  commands: CommandButtonConfig[];
  safetyFooter: string;
  relatedLinks?: Array<{ title: string; detail: string; href: string; action: string; tone: SignalTone }>;
};

const commonStopRules = [
  "Owner approval required before live actions.",
  "Live writes disabled from dashboard.",
  "Preview/copy command only.",
  "Local Sample Mode is not a live source of truth."
];

function commandPrompt(title: string, body: string) {
  return `${title}

Rules:
- Read-only/local review first.
- Do not perform live Google Drive, Gmail, Calendar, Google Tasks, Sheets, RentRedi, tenant, legal, payment, lender, vendor, court, or banking actions without owner approval.
- Prepare a preview only.
${body}
- Stop before all live actions.`;
}

export const commandPages: Record<string, CommandPageConfig> = {
  utilities: {
    id: "utilities",
    title: "Utilities Command",
    subtitle: "Utility usage, account setup, payment proof, paperless/autopay status, and due-date controls.",
    localNotice: "No live Google Sheets, utility provider, bank, Drive, Gmail, Calendar, or Task updates.",
    healthStatus: "Stable / Setup Watch",
    healthDetail:
      "Utility costs are inside the local sample threshold, but account setup, paperless/autopay confirmation, and payment proof remain review items before anything can be treated as verified.",
    kpis: [
      { label: "Total Utilities", value: "$403.00", helper: "May local sample total", tone: "green" },
      { label: "Electric", value: "$210.00", helper: "Duquesne Light / account setup watch", tone: "yellow" },
      { label: "Gas", value: "$64.00", helper: "No spike flagged", tone: "green" },
      { label: "Water", value: "$72.00", helper: "Proof needed", tone: "yellow" },
      { label: "Sewer", value: "$38.00", helper: "Local sample entry", tone: "green" },
      { label: "Trash", value: "$19.00", helper: "Local sample entry", tone: "green" },
      { label: "Internet / Other", value: "$0.00", helper: "No active bill in sample", tone: "green" },
      { label: "Payment Proof Needed", value: "3", helper: "Bills/receipts to verify", tone: "yellow" },
      { label: "Account Setup Needed", value: "1", helper: "Duquesne Light paperless/autopay", tone: "yellow" }
    ],
    tableColumns: [
      { key: "utility", header: "Utility" },
      { key: "provider", header: "Provider" },
      { key: "property", header: "Property" },
      { key: "account", header: "Account Setup" },
      { key: "paperless", header: "Paperless / Autopay" },
      { key: "cost", header: "Total Cost" },
      { key: "due", header: "Due Date" },
      { key: "proof", header: "Payment Proof" },
      { key: "status", header: "Status" },
      { key: "ownerAction", header: "Owner Action" }
    ],
    tableRows: [
      {
        id: "utility-electric",
        tone: "yellow",
        values: {
          utility: "Electric",
          provider: "Duquesne Light",
          property: "7-Unit",
          account: "Paperless setup confirmed / verify account file",
          paperless: "Setup watch",
          cost: "$210.00",
          due: "2026-05-20",
          proof: "Bill/receipt needed",
          status: "Review",
          ownerAction: "Confirm account setup and save proof later"
        }
      },
      {
        id: "utility-gas",
        values: {
          utility: "Gas",
          provider: "Local sample provider",
          property: "7-Unit",
          account: "Verify account",
          paperless: "Unknown",
          cost: "$64.00",
          due: "2026-05-22",
          proof: "Needed",
          status: "Open",
          ownerAction: "Confirm bill and account status"
        }
      },
      {
        id: "utility-water",
        values: {
          utility: "Water",
          provider: "Water authority",
          property: "4-Unit",
          account: "Verify",
          paperless: "Not set",
          cost: "$72.00",
          due: "2026-05-25",
          proof: "Needed",
          status: "Open",
          ownerAction: "Verify bill/payment proof"
        }
      },
      {
        id: "utility-sewer",
        values: {
          utility: "Sewer",
          provider: "Sewer authority",
          property: "4-Unit",
          account: "Local sample",
          paperless: "Unknown",
          cost: "$38.00",
          due: "2026-05-25",
          proof: "Review",
          status: "Open",
          ownerAction: "Confirm bill source"
        }
      },
      {
        id: "utility-trash",
        values: {
          utility: "Trash",
          provider: "Waste provider",
          property: "All",
          account: "Local sample",
          paperless: "Unknown",
          cost: "$19.00",
          due: "2026-05-28",
          proof: "Review",
          status: "Open",
          ownerAction: "Confirm payment proof"
        }
      },
      {
        id: "utility-other",
        values: {
          utility: "Internet / Other",
          provider: "None active",
          property: "All",
          account: "Not applicable",
          paperless: "Not applicable",
          cost: "$0.00",
          due: "None",
          proof: "Not needed",
          status: "No active bill",
          ownerAction: "No action in local sample data"
        }
      }
    ],
    queues: [
      { title: "Account Setup Tracker", detail: "Utility accounts needing setup or owner verification.", items: ["Duquesne Light paperless/account setup", "Water account source verification", "Gas account proof review"], tone: "yellow" },
      { title: "Payment Proof Checklist", detail: "Proof needed before utility entries are treated as verified.", items: ["Bill/receipt copy", "Payment confirmation", "Account number redacted where needed", "Due date confirmed"], tone: "yellow" },
      { title: "Utility Due-Date Queue", detail: "Local sample due dates only; no provider payments are made.", items: ["Electric due 2026-05-20", "Gas due 2026-05-22", "Water/Sewer due 2026-05-25", "Trash due 2026-05-28"], tone: "green" }
    ],
    blocked: [
      "Do not mark a utility bill paid until proof is verified.",
      "Do not set paperless/autopay status complete until account setup proof is saved.",
      "Do not update Drive, Calendar, or Tasks from this dashboard."
    ],
    approvalGate: commonStopRules,
    filters: ["Utility Type", "Property", "Provider", "Payment Proof Needed", "Account Setup Needed", "Status", "Search notes"],
    commands: [
      { id: "utility-review", title: "Codex Command - Utility Review", actionName: "Generate Codex Command: Utility Review", controls: "Utility costs, due dates, account setup, paperless/autopay, and proof gaps.", tone: "yellow", prompt: commandPrompt("Run a Utility Review for the Property Command Center.", "- Review utility costs, account setup, paperless/autopay, payment proof, due dates, owner approvals, and blocked items.") },
      { id: "utility-proof", title: "Codex Command - Utility Proof Checklist", actionName: "Generate Codex Command: Utility Proof Checklist", controls: "Proof list for bills, receipts, payment status, and account setup.", tone: "yellow", prompt: commandPrompt("Prepare a Utility Proof Checklist.", "- Identify bill, receipt, account setup, and payment confirmation proof needed before closure.") },
      { id: "utility-account", title: "Codex Command - Utility Account Setup Prep", actionName: "Generate Codex Command: Utility Account Setup Prep", controls: "Account setup and paperless/autopay preparation checklist.", tone: "yellow", prompt: commandPrompt("Prepare Utility Account Setup Prep.", "- Prepare a checklist for account setup, paperless/autopay review, proof capture, and follow-up tracking.") },
      { id: "utility-drive", title: "Codex Command - Utility Drive Update Prep", actionName: "Generate Codex Command: Utility Drive Update Prep", controls: "Preview-only utility proof folder update package.", tone: "green", prompt: commandPrompt("Prepare a Google Drive utility update package.", "- Do not upload, move, rename, delete, or update files. Preview folder/package needs only.") },
      { id: "utility-calendar", title: "Codex Command - Utility Calendar / Task Prep", actionName: "Generate Codex Command: Utility Calendar / Task Prep", controls: "Preview utility due-date follow-ups and future task candidates.", tone: "green", prompt: commandPrompt("Prepare Utility Calendar and Task previews.", "- Preview due-date follow-ups and future Google Task candidates. Do not create events or tasks.") }
    ],
    safetyFooter: "No provider, bank, Drive, Gmail, Calendar, Task, Sheet, or live utility account action occurs from this dashboard."
  },
  "lease-violations": {
    id: "lease-violations",
    title: "Lease Violations Command",
    subtitle: "Lease issue tracking, proof status, owner approval, communication review, and blocked legal-sensitive actions.",
    localNotice: "No live tenant communication, legal notice, Drive, Gmail, Calendar, Task, or Sheets updates.",
    healthStatus: "Watch / Proof First",
    healthDetail: "Lease issue tracking is preview-only. Proof and owner approval are required before communication, notice review, or escalation.",
    kpis: [
      { label: "Active Lease Issues", value: "4", helper: "Local sample watch items", tone: "yellow" },
      { label: "Proof Needed", value: "4", helper: "Proof required before action", tone: "red" },
      { label: "Owner Approval Required", value: "5", helper: "Before communication/escalation", tone: "yellow" },
      { label: "Communication Needed", value: "2", helper: "Draft only", tone: "yellow" },
      { label: "Closed / Resolved", value: "1", helper: "Sample resolved item", tone: "green" },
      { label: "Blocked Until Verified", value: "4", helper: "Do not escalate", tone: "red" }
    ],
    tableColumns: [
      { key: "property", header: "Property" },
      { key: "unit", header: "Unit" },
      { key: "tenant", header: "Tenant" },
      { key: "issue", header: "Issue Type" },
      { key: "date", header: "Date Reported" },
      { key: "proof", header: "Proof Status" },
      { key: "communication", header: "Communication Status" },
      { key: "ownerAction", header: "Owner Action" },
      { key: "risk", header: "Risk" },
      { key: "status", header: "Status" }
    ],
    tableRows: [
      { id: "lease-1", tone: "yellow", values: { property: "7-Unit", unit: "Common", tenant: "Local sample", issue: "Unauthorized occupancy", date: "2026-05-10", proof: "Needed", communication: "Draft only", ownerAction: "Verify proof before action", risk: "High", status: "Owner Review" } },
      { id: "lease-2", tone: "yellow", values: { property: "7-Unit", unit: "Unit 2", tenant: "Marc Gosselin", issue: "Noise/complaint", date: "2026-05-09", proof: "Needed", communication: "Review needed", ownerAction: "Collect details", risk: "Medium", status: "Open" } },
      { id: "lease-3", tone: "green", values: { property: "4-Unit", unit: "Common", tenant: "Common area", issue: "Cleanliness/common area issue", date: "2026-05-06", proof: "Saved in sample", communication: "No message needed", ownerAction: "Monitor", risk: "Low", status: "Resolved" } },
      { id: "lease-4", tone: "red", values: { property: "7-Unit", unit: "Unit 6", tenant: "Jennifer Badger", issue: "Maintenance access issue", date: "2026-05-12", proof: "Missing", communication: "Owner approval required", ownerAction: "Confirm safety/proof path", risk: "Critical", status: "Blocked" } },
      { id: "lease-5", tone: "red", values: { property: "7-Unit", unit: "Unit 4", tenant: "Kevin Royster", issue: "Payment-related lease concern", date: "2026-05-11", proof: "Ledger/HAP proof needed", communication: "Blocked", ownerAction: "Verify Section 8/HAP first", risk: "Critical", status: "Blocked Until Verified" } }
    ],
    queues: [
      { title: "Proof Checklist", detail: "Required before communication or escalation.", items: ["Photo/proof link", "Communication log", "Lease clause reference", "Owner review note"], tone: "red" },
      { title: "Communication Review Queue", detail: "Draft-only review items.", items: ["Unauthorized occupancy draft review", "Noise/complaint clarification", "Maintenance access owner-approved wording"], tone: "yellow" },
      { title: "Owner Approval Gate", detail: "No legal-sensitive action without owner approval.", items: ["Communication approval", "Notice review approval", "Proof acceptance", "Escalation decision"], tone: "yellow" }
    ],
    blocked: [
      "Do not send tenant communications from this dashboard.",
      "Do not escalate any lease issue without proof and owner approval.",
      "Do not create, serve, file, or upload notices from this page."
    ],
    approvalGate: commonStopRules,
    filters: ["Property", "Unit", "Tenant", "Issue Type", "Proof Needed", "Communication Needed", "Blocked", "Status", "Search issue text"],
    commands: [
      { id: "lease-review", title: "Codex Command - Lease Violation Review", actionName: "Generate Codex Command: Lease Violation Review", controls: "Lease issue status, proof, communication review, and blocked items.", tone: "yellow", prompt: commandPrompt("Run a Lease Violations review.", "- Review lease issues, proof gaps, owner approvals, communication needs, and blocked legal-sensitive actions.") },
      { id: "lease-proof", title: "Codex Command - Lease Proof Checklist", actionName: "Generate Codex Command: Lease Proof Checklist", controls: "Proof checklist grouped by issue.", tone: "red", prompt: commandPrompt("Prepare a Lease Violation Proof Checklist.", "- Identify proof needed for each issue and what remains blocked until verified.") },
      { id: "lease-comm", title: "Codex Command - Lease Communication Review", actionName: "Generate Codex Command: Lease Communication Review", controls: "Draft-only communication review.", tone: "yellow", prompt: commandPrompt("Prepare lease communication drafts for owner review.", "- Draft only. Do not contact tenants, vendors, agencies, or legal systems.") }
    ],
    safetyFooter: "No tenant, legal, notice, Gmail, Drive, Calendar, Task, or Sheet action occurs from this dashboard."
  },
  "draft-status": {
    id: "draft-status",
    title: "Draft Status / Document Drafts Command",
    subtitle: "Draft notices, tenant messages, owner letters, vendor messages, reports, and document-review status.",
    localNotice: "No final legal notices, Gmail drafts/sends, Drive uploads, or tenant/vendor communications.",
    healthStatus: "Watch / Owner Review Required",
    healthDetail: "Drafts are preview-only and require owner approval plus proof checks before use. Legal-sensitive drafts stay blocked until verified.",
    kpis: [
      { label: "Drafts in Review", value: "7", helper: "Local sample draft queue", tone: "yellow" },
      { label: "Owner Approval Required", value: "7", helper: "Before use", tone: "yellow" },
      { label: "Proof Needed Before Use", value: "4", helper: "Proof/ledger gaps", tone: "red" },
      { label: "Legal-Sensitive Drafts", value: "2", helper: "Notice/eviction drafts", tone: "red" },
      { label: "Ready for Review", value: "3", helper: "Preview-ready only", tone: "yellow" },
      { label: "Blocked Drafts", value: "2", helper: "Verification missing", tone: "red" }
    ],
    tableColumns: [
      { key: "draftId", header: "Draft ID" },
      { key: "type", header: "Draft Type" },
      { key: "module", header: "Related Module" },
      { key: "property", header: "Property" },
      { key: "unit", header: "Unit" },
      { key: "recipient", header: "Tenant/Vendor/Recipient" },
      { key: "status", header: "Status" },
      { key: "approval", header: "Owner Approval Required" },
      { key: "proof", header: "Proof Needed" },
      { key: "legal", header: "Legal Sensitive" },
      { key: "next", header: "Next Action" }
    ],
    tableRows: [
      { id: "draft-1", tone: "red", values: { draftId: "DRAFT-001", type: "10-Day Notice Draft", module: "Notices / Evictions", property: "7-Unit", unit: "Unit 2", recipient: "Marc Gosselin", status: "Blocked by ledger verification", approval: "Yes", proof: "Yes", legal: "Yes", next: "Verify ledger before use" } },
      { id: "draft-2", tone: "red", values: { draftId: "DRAFT-002", type: "Eviction Packet Draft", module: "Notices / Evictions", property: "7-Unit", unit: "Multiple", recipient: "Owner/legal review", status: "Draft tracking only", approval: "Yes", proof: "Yes", legal: "Yes", next: "Do not file or upload" } },
      { id: "draft-3", tone: "yellow", values: { draftId: "DRAFT-003", type: "Maintenance Follow-Up Message", module: "Maintenance", property: "7-Unit", unit: "Unit 6", recipient: "Tenant", status: "Ready for owner review", approval: "Yes", proof: "Yes", legal: "No", next: "Review safety-aware wording" } },
      { id: "draft-4", values: { draftId: "DRAFT-004", type: "Rent Follow-Up Message", module: "Rent Collection", property: "7-Unit", unit: "Unit 1", recipient: "Greg Mckinney", status: "Draft only", approval: "Yes", proof: "Yes", legal: "No", next: "Verify arrangement status" } },
      { id: "draft-5", values: { draftId: "DRAFT-005", type: "Vendor Request Message", module: "Maintenance", property: "7-Unit", unit: "Unit 6", recipient: "Vendor TBD", status: "Draft only", approval: "Yes", proof: "No", legal: "No", next: "Owner picks vendor path" } },
      { id: "draft-6", tone: "green", values: { draftId: "DRAFT-006", type: "Weekly Command Review Report", module: "Reports", property: "All", unit: "All", recipient: "Owner", status: "Ready for review", approval: "Yes", proof: "No", legal: "No", next: "Review preview" } },
      { id: "draft-7", tone: "yellow", values: { draftId: "DRAFT-007", type: "Google Drive Update Package", module: "Drive Update Center", property: "All", unit: "All", recipient: "Owner", status: "Preview package", approval: "Yes", proof: "Yes", legal: "No", next: "Approve only after proof review" } }
    ],
    queues: [
      { title: "Draft Safety Gate", detail: "Drafts are not final records.", items: ["Owner approval required", "Proof needed before use", "Legal-sensitive drafts blocked", "No automatic documents"], tone: "red" },
      { title: "Owner Approval Queue", detail: "Drafts needing owner review.", items: ["10-Day Notice Draft", "Eviction Packet Draft", "Maintenance Follow-Up Message", "Drive Update Package"], tone: "yellow" },
      { title: "Proof Needed Before Use", detail: "Drafts blocked by missing verification.", items: ["Ledger confirmation", "Service/proof status", "Maintenance completion proof", "Payment/HAP status"], tone: "red" }
    ],
    blocked: ["Do not send, serve, file, upload, or finalize drafts.", "Do not treat a draft as legal approval.", "Do not create Gmail drafts from this dashboard."],
    approvalGate: commonStopRules,
    filters: ["Draft Type", "Related Module", "Property", "Status", "Owner Approval", "Proof Needed", "Legal Sensitive", "Blocked", "Search draft text"],
    commands: [
      { id: "draft-review", title: "Codex Command - Draft Status Review", actionName: "Generate Codex Command: Draft Status Review", controls: "Draft queue, proof gaps, legal sensitivity, and owner approvals.", tone: "yellow", prompt: commandPrompt("Run a Draft Status review.", "- Review drafts, approval gates, proof-needed-before-use, legal-sensitive items, and blocked drafts.") },
      { id: "draft-proof", title: "Codex Command - Draft Proof Review", actionName: "Generate Codex Command: Draft Proof Review", controls: "Proof requirements before drafts can be used.", tone: "red", prompt: commandPrompt("Prepare draft proof requirements.", "- Identify proof needed before any draft can be used, sent, served, uploaded, or filed.") },
      { id: "draft-package", title: "Codex Command - Draft Package Preview", actionName: "Generate Codex Command: Draft Package Preview", controls: "Preview package for owner review.", tone: "green", prompt: commandPrompt("Prepare a draft package preview.", "- Prepare a preview list only. Do not create, send, serve, file, upload, or finalize documents.") }
    ],
    safetyFooter: "No legal notice, Gmail draft, Drive file, tenant message, vendor message, or report export is created from this dashboard."
  },
  "drive-update-center": {
    id: "drive-update-center",
    title: "Google Drive Update Center",
    subtitle: "Preview-only Drive update packages, proof folders, weekly archives, dashboard exports, and owner approval gates.",
    localNotice: "No Google Drive upload, move, rename, delete, or update happens from this dashboard.",
    healthStatus: "Watch / Preview Ready",
    healthDetail: "Drive packages are ready for preview, but proof gaps and owner approval gates block any live Drive write.",
    kpis: [
      { label: "Drive Updates Needed", value: "7", helper: "Preview packages", tone: "yellow" },
      { label: "Proof Files Needed", value: "5", helper: "Before archive/update", tone: "red" },
      { label: "Weekly Archive Needed", value: "1", helper: "Friday package", tone: "yellow" },
      { label: "Owner Approval Required", value: "7", helper: "Before Drive writes", tone: "yellow" },
      { label: "Blocked Until Verified", value: "4", helper: "Proof missing", tone: "red" },
      { label: "Ready for Preview", value: "3", helper: "Preview-only packages", tone: "green" }
    ],
    tableColumns: [
      { key: "package", header: "Package Name" },
      { key: "module", header: "Related Module" },
      { key: "property", header: "Property" },
      { key: "proof", header: "Proof Needed" },
      { key: "folder", header: "Folder Target" },
      { key: "action", header: "Drive Action Type" },
      { key: "status", header: "Status" },
      { key: "approval", header: "Owner Approval Required" },
      { key: "blocked", header: "Blocked Until Verified" }
    ],
    tableRows: [
      { id: "drive-1", values: { package: "Weekly Property Command Review Archive", module: "Reports", property: "All", proof: "Dashboard review", folder: "Weekly Archives", action: "Preview archive", status: "Ready for preview", approval: "Yes", blocked: "No" } },
      { id: "drive-2", tone: "red", values: { package: "Mortgage Proof Package", module: "Mortgage / Allotment", property: "7-Unit", proof: "Lender posting proof", folder: "Mortgage Proof", action: "Proof package", status: "Blocked", approval: "Yes", blocked: "Yes" } },
      { id: "drive-3", tone: "red", values: { package: "Maintenance Proof Package", module: "Maintenance", property: "7-Unit", proof: "Tenant/vendor confirmation", folder: "Maintenance Proof", action: "Proof package", status: "Blocked", approval: "Yes", blocked: "Yes" } },
      { id: "drive-4", values: { package: "Rent Payment Proof Package", module: "Rent Collection", property: "All", proof: "Payment/ledger proof", folder: "Rent Proof", action: "Proof package", status: "Review", approval: "Yes", blocked: "Yes" } },
      { id: "drive-5", tone: "red", values: { package: "Notice / Legal Proof Package", module: "Notices / Evictions", property: "7-Unit", proof: "Ledger/service proof", folder: "Notice Proof", action: "Legal proof package", status: "Blocked", approval: "Yes", blocked: "Yes" } },
      { id: "drive-6", values: { package: "Utility Account Proof Package", module: "Utilities", property: "All", proof: "Account/bill proof", folder: "Utilities", action: "Proof package", status: "Review", approval: "Yes", blocked: "No" } },
      { id: "drive-7", tone: "green", values: { package: "Dashboard Snapshot Archive", module: "Dashboard", property: "All", proof: "Owner review", folder: "Dashboard Snapshots", action: "Preview archive", status: "Ready for preview", approval: "Yes", blocked: "No" } }
    ],
    queues: [
      { title: "Folder Preview Only", detail: "Folder targets are display-only.", items: ["Weekly Archives", "Mortgage Proof", "Maintenance Proof", "Rent Proof", "Notice Proof"], tone: "green" },
      { title: "Proof Missing Queue", detail: "Packages blocked by missing proof.", items: ["Mortgage posting proof", "Maintenance completion proof", "Rent ledger proof", "Notice/service proof"], tone: "red" },
      { title: "Drive Action Safety Rules", detail: "Drive writes require explicit owner approval.", items: ["No upload", "No move", "No rename", "No delete", "No update"], tone: "red" }
    ],
    blocked: ["No Drive upload, move, rename, delete, or update happens from this dashboard.", "Do not archive proof packages until proof is verified.", "Do not treat preview folder targets as live Drive changes."],
    approvalGate: commonStopRules,
    filters: ["Package", "Related Module", "Property", "Proof Needed", "Status", "Blocked", "Owner Approval", "Search package text"],
    commands: [
      { id: "drive-review", title: "Codex Command - Drive Update Center Review", actionName: "Generate Codex Command: Drive Update Center Review", controls: "Drive package preview, proof gaps, owner approvals, and blocked packages.", tone: "yellow", prompt: commandPrompt("Run a Drive Update Center review.", "- Review Drive package needs, proof gaps, folder targets, blocked items, and owner approvals. Do not write files.") },
      { id: "drive-package", title: "Codex Command - Drive Package Prep", actionName: "Generate Codex Command: Drive Package Prep", controls: "Preview package contents only.", tone: "green", prompt: commandPrompt("Prepare Google Drive update package previews.", "- Report what would be updated and stop before any Drive write.") },
      { id: "drive-proof", title: "Codex Command - Drive Proof Gap Review", actionName: "Generate Codex Command: Drive Proof Gap Review", controls: "Proof missing queue grouped by module.", tone: "red", prompt: commandPrompt("Prepare a Drive proof gap review.", "- Identify missing proof files and blocked packages. Do not upload or move files.") }
    ],
    safetyFooter: "No Google Drive files were uploaded, moved, renamed, deleted, updated, read, or created by this dashboard."
  }
};

commandPages["gmail-follow-ups"] = {
  id: "gmail-follow-ups",
  title: "Gmail Follow-Up Center",
  subtitle: "Email follow-up tracking, draft-needed items, readback approval gates, and communication safety controls.",
  localNotice: "No Gmail bodies are read, no drafts are created, and no emails are sent from this dashboard.",
  healthStatus: "Watch / Communication Approval Required",
  healthDetail: "Several follow-ups may need email review later, but Gmail body reads, drafts, sends, labels, archives, and deletes remain disabled.",
  kpis: [
    { label: "Email Follow-Ups", value: "7", helper: "Local sample topics", tone: "yellow" },
    { label: "Draft Needed", value: "5", helper: "Draft only after approval", tone: "yellow" },
    { label: "Owner Approval Required", value: "7", helper: "Before any Gmail action", tone: "yellow" },
    { label: "Gmail Body Read Approval Needed", value: "4", helper: "Metadata/search first", tone: "red" },
    { label: "Blocked Until Verified", value: "4", helper: "Proof/ledger gaps", tone: "red" },
    { label: "Closed / No Email Needed", value: "1", helper: "Sample item closed", tone: "green" }
  ],
  tableColumns: [
    { key: "id", header: "Follow-Up ID" },
    { key: "module", header: "Related Module" },
    { key: "recipient", header: "Recipient Type" },
    { key: "property", header: "Property" },
    { key: "unit", header: "Unit" },
    { key: "topic", header: "Subject / Topic" },
    { key: "draft", header: "Draft Needed" },
    { key: "body", header: "Gmail Body Read Needed" },
    { key: "send", header: "Send Approval Required" },
    { key: "status", header: "Status" },
    { key: "next", header: "Next Owner Action" }
  ],
  tableRows: [
    { id: "gmail-1", tone: "red", values: { id: "GMAIL-001", module: "Maintenance", recipient: "Tenant", property: "7-Unit", unit: "Unit 6", topic: "Maintenance follow-up", draft: "Yes", body: "Approval needed", send: "Yes", status: "Blocked", next: "Verify proof and approve draft path" } },
    { id: "gmail-2", tone: "yellow", values: { id: "GMAIL-002", module: "Rent Collection", recipient: "Tenant / ledger", property: "7-Unit", unit: "Unit 2", topic: "Rent ledger verification", draft: "As needed", body: "Approval needed", send: "Yes", status: "Review", next: "Verify ledger conflict first" } },
    { id: "gmail-3", tone: "red", values: { id: "GMAIL-003", module: "Mortgage / Allotment", recipient: "Lender/MBFS", property: "7-Unit", unit: "All", topic: "Mortgage proof follow-up", draft: "Yes", body: "Approval needed", send: "Yes", status: "Owner Approval Required", next: "Confirm proof request path" } },
    { id: "gmail-4", values: { id: "GMAIL-004", module: "Utilities", recipient: "Provider", property: "7-Unit", unit: "Common", topic: "Utility account follow-up", draft: "Maybe", body: "No", send: "Yes", status: "Open", next: "Review account proof need" } },
    { id: "gmail-5", values: { id: "GMAIL-005", module: "Rent Collection", recipient: "Property manager", property: "4-Unit", unit: "All", topic: "Property manager follow-up", draft: "Yes", body: "Approval needed", send: "Yes", status: "Open", next: "Confirm PM data questions" } },
    { id: "gmail-6", values: { id: "GMAIL-006", module: "Maintenance", recipient: "Vendor", property: "7-Unit", unit: "Unit 6", topic: "Vendor follow-up", draft: "Yes", body: "No", send: "Yes", status: "Draft Only", next: "Owner selects vendor path" } },
    { id: "gmail-7", tone: "red", values: { id: "GMAIL-007", module: "Notices / Evictions", recipient: "Owner/legal review", property: "7-Unit", unit: "Unit 4", topic: "Notice/legal draft review", draft: "Yes", body: "Approval needed", send: "Yes", status: "Blocked Until Verified", next: "Verify ledger/HAP before any communication" } }
  ],
  queues: [
    { title: "Gmail Safety Gate", detail: "No Gmail action from dashboard.", items: ["No body reads", "No drafts created", "No sends", "No labels/archive/delete"], tone: "red" },
    { title: "Draft-Needed Queue", detail: "Drafts are future owner-reviewed prompts only.", items: ["Maintenance follow-up", "Mortgage proof follow-up", "PM follow-up", "Vendor follow-up"], tone: "yellow" },
    { title: "Body-Read Approval Queue", detail: "Gmail body read requires owner approval.", items: ["Rent ledger emails", "Mortgage proof emails", "Maintenance proof emails", "Notice/legal proof emails"], tone: "red" }
  ],
  blocked: ["Do not read Gmail bodies without owner approval.", "Do not create Gmail drafts or send messages from this dashboard.", "Do not contact tenants, vendors, lenders, agencies, or property managers."],
  approvalGate: commonStopRules,
  filters: ["Related Module", "Recipient Type", "Property", "Draft Needed", "Body Read Needed", "Send Approval", "Blocked", "Status", "Search topic"],
  commands: [
    { id: "gmail-review", title: "Codex Command - Gmail Follow-Up Review", actionName: "Generate Codex Command: Gmail Follow-Up Review", controls: "Email follow-ups, draft needs, body-read approvals, send approvals, and blocked items.", tone: "yellow", prompt: commandPrompt("Run a Gmail Follow-Up Center review.", "- Metadata/search first. Identify follow-up topics, draft needs, body-read approvals, send approvals, and blocked items.") },
    { id: "gmail-drafts", title: "Codex Command - Gmail Draft Prep", actionName: "Generate Codex Command: Gmail Draft Prep", controls: "Draft-needed queue for owner review.", tone: "yellow", prompt: commandPrompt("Prepare Gmail draft previews.", "- Draft language only in the report. Do not create Gmail drafts or send messages.") },
    { id: "gmail-proof", title: "Codex Command - Gmail Proof Tracking", actionName: "Generate Codex Command: Gmail Proof Tracking", controls: "Proof emails that may need approval before read/save.", tone: "red", prompt: commandPrompt("Prepare Gmail proof tracking review.", "- Identify proof email topics that need owner approval before body read or Drive save.") }
  ],
  safetyFooter: "No Gmail bodies were read; no drafts, sends, labels, archives, deletes, or forwards were performed by this dashboard."
};

commandPages.reports = {
  id: "reports",
  title: "Reports / Weekly Command Review",
  subtitle: "Weekly owner review, operational health, cashflow snapshot, proof gaps, blocked items, and approval decisions.",
  localNotice: "Report generation is preview-only and no Drive export/upload occurs.",
  healthStatus: "Watch / Weekly Review Ready",
  healthDetail: "The weekly report preview is ready, but proof gaps, approval decisions, and blocked items remain before any export or live action.",
  kpis: [
    { label: "Open Risk Items", value: "12", helper: "Across command center", tone: "red" },
    { label: "Owner Approvals", value: "9", helper: "Before live actions", tone: "yellow" },
    { label: "Proof Gaps", value: "8", helper: "Before closure", tone: "red" },
    { label: "Financial Watch Items", value: "4", helper: "Rent/mortgage/utilities", tone: "red" },
    { label: "Maintenance Critical", value: "1", helper: "Unit 6 safety issue", tone: "red" },
    { label: "Legal / Notice Holds", value: "3", helper: "Verification needed", tone: "yellow" },
    { label: "Drive Updates Needed", value: "7", helper: "Preview packages", tone: "yellow" },
    { label: "Calendar / Task Items", value: "11", helper: "Local suspense queue", tone: "yellow" }
  ],
  tableColumns: [
    { key: "section", header: "Review Section" },
    { key: "status", header: "Status" },
    { key: "summary", header: "Summary" },
    { key: "proof", header: "Proof Needed" },
    { key: "approval", header: "Owner Approval" },
    { key: "next", header: "Next 7 Days / Action" }
  ],
  tableRows: [
    { id: "report-1", values: { section: "Executive Summary", status: "Watch", summary: "Critical mortgage/maintenance risks remain.", proof: "Yes", approval: "Yes", next: "Review before export" } },
    { id: "report-2", values: { section: "Rent Collection Review", status: "Watch", summary: "Balances and verification items remain.", proof: "Yes", approval: "Yes", next: "Verify Unit 1/2/4/A/7 items" } },
    { id: "report-3", tone: "red", values: { section: "Maintenance Review", status: "Critical", summary: "Unit 6 heat/breathing issue open.", proof: "Yes", approval: "Yes", next: "Confirm proof and response path" } },
    { id: "report-4", tone: "red", values: { section: "Mortgage / Arrears Review", status: "Critical", summary: "MBFS posting confirmation pending.", proof: "Yes", approval: "Yes", next: "Confirm lender posting" } },
    { id: "report-5", values: { section: "Notices / Legal Hold Review", status: "Hold", summary: "Ledger/HAP verification required.", proof: "Yes", approval: "Yes", next: "Do not serve/file" } },
    { id: "report-6", values: { section: "Utilities Review", status: "Setup Watch", summary: "Account setup and proof review.", proof: "Yes", approval: "Yes", next: "Confirm utility proof" } },
    { id: "report-7", values: { section: "Calendar Follow-Ups Review", status: "Open", summary: "Due dates and recurring reviews tracked locally.", proof: "No", approval: "Yes", next: "Preview event/task sync" } },
    { id: "report-8", values: { section: "Admin Tasks Review", status: "Open", summary: "Proof and approval queues active.", proof: "Yes", approval: "Yes", next: "Review admin task queue" } },
    { id: "report-9", values: { section: "Gmail Follow-Ups Review", status: "Disabled", summary: "No Gmail reads/sends/drafts.", proof: "Maybe", approval: "Yes", next: "Metadata/search only if approved" } },
    { id: "report-10", values: { section: "Google Drive Update Needs", status: "Preview Only", summary: "Drive packages pending proof and approval.", proof: "Yes", approval: "Yes", next: "Prepare preview only" } }
  ],
  queues: [
    { title: "Report Preview Card", detail: "Local weekly review only.", items: ["Executive Summary", "Cashflow snapshot", "Proof gaps", "Blocked items", "Approvals"], tone: "green" },
    { title: "Proof Needed", detail: "Proof gaps in the weekly report.", items: ["Mortgage posting", "Maintenance completion", "Rent/HAP proof", "Notice ledger proof"], tone: "red" },
    { title: "Next 7 Days", detail: "Local suspense items only.", items: ["Greg payment check", "Weekly admin review", "Utility follow-up", "Mortgage posting check"], tone: "yellow" }
  ],
  blocked: ["Do not export reports to Drive from this dashboard.", "Do not mark local report preview as verified source data.", "Do not execute approvals from the report page."],
  approvalGate: commonStopRules,
  filters: ["Review Section", "Status", "Proof Needed", "Approval Required", "Risk Area", "Search report text"],
  commands: [
    { id: "weekly-command", title: "Codex Command - Weekly Command Review", actionName: "Generate Codex Command: Weekly Command Review", controls: "Weekly owner review across every module.", tone: "green", prompt: commandPrompt("Prepare the Weekly Property Command Review.", "- Cover rent, maintenance, notices/legal holds, mortgage, utilities, calendar, Gmail, Drive, proof gaps, approvals, blocked items, and dashboard corrections.") },
    { id: "report-preview", title: "Codex Command - Report Preview", actionName: "Generate Codex Command: Report Preview", controls: "Preview report sections only.", tone: "yellow", prompt: commandPrompt("Prepare a report preview for owner review.", "- Produce report content only. Do not export, upload, email, or save files.") },
    { id: "report-blocked", title: "Codex Command - Blocked Items Report", actionName: "Generate Codex Command: Blocked Items Report", controls: "Blocked-until-verified and approval decisions.", tone: "red", prompt: commandPrompt("Prepare a blocked items report.", "- List blocked items, missing proof, owner approvals, and what cannot be closed.") }
  ],
  safetyFooter: "Reports are preview-only. No Drive export, Gmail send, Calendar event, Google Task, Sheet update, or live record change occurs."
};

commandPages["data-accuracy"] = {
  id: "data-accuracy",
  title: "Data Accuracy / Source Verification",
  subtitle: "Local sample data review, source-of-truth verification, proof gaps, pending values, and migration readiness.",
  localNotice: "Local Sample Mode is not a live source of truth.",
  healthStatus: "Watch / Migration Not Ready",
  healthDetail: "Several values are estimated, pending proof, or blocked by ledger/payment/source verification. Keep them marked unverified until source proof is reviewed.",
  kpis: [
    { label: "Verified Values", value: "4", helper: "Sample verified/low-risk", tone: "green" },
    { label: "Estimated Values", value: "5", helper: "Do not treat as final", tone: "yellow" },
    { label: "Pending Verification", value: "8", helper: "Source proof needed", tone: "red" },
    { label: "Proof Missing", value: "7", helper: "Before live migration", tone: "red" },
    { label: "Ledger Conflicts", value: "3", helper: "Rent/notice/HAP", tone: "red" },
    { label: "Ready for Live Migration", value: "0", helper: "Blocked by proof gaps", tone: "red" },
    { label: "Blocked Values", value: "6", helper: "Do not close", tone: "red" }
  ],
  tableColumns: [
    { key: "item", header: "Data Item" },
    { key: "module", header: "Related Module" },
    { key: "value", header: "Current Dashboard Value" },
    { key: "source", header: "Source Needed" },
    { key: "proof", header: "Proof Status" },
    { key: "confidence", header: "Confidence" },
    { key: "risk", header: "Risk" },
    { key: "ownerAction", header: "Owner Action" }
  ],
  tableRows: [
    { id: "data-1", values: { item: "Rent collected values", module: "Rent Collection", value: "$9,653.40", source: "RentRedi/PM ledger", proof: "Pending", confidence: "Medium", risk: "Watch", ownerAction: "Verify ledger totals" } },
    { id: "data-2", values: { item: "Projected rent", module: "Rent Collection", value: "$12,195.85", source: "Lease/rent roll", proof: "Review", confidence: "Medium", risk: "Watch", ownerAction: "Confirm current rent roll" } },
    { id: "data-3", tone: "red", values: { item: "Unit balances", module: "Rent/Notices", value: "$3,055.00", source: "Ledger + HAP status", proof: "Missing", confidence: "Low", risk: "High", ownerAction: "Verify Unit 1/2/4/A/7 balances" } },
    { id: "data-4", tone: "red", values: { item: "Mortgage arrears", module: "Mortgage", value: "$12,745.90 estimated", source: "Lender portal", proof: "Missing", confidence: "Low", risk: "Critical", ownerAction: "Confirm updated lender balance" } },
    { id: "data-5", tone: "red", values: { item: "MBFS payment posting", module: "Mortgage", value: "$13,254.10 requested", source: "Lender posted proof", proof: "Pending", confidence: "Low", risk: "Critical", ownerAction: "Verify posting" } },
    { id: "data-6", values: { item: "Utility account setup", module: "Utilities", value: "Duquesne setup watch", source: "Provider account proof", proof: "Review", confidence: "Medium", risk: "Watch", ownerAction: "Confirm account proof" } },
    { id: "data-7", tone: "red", values: { item: "Maintenance completion proof", module: "Maintenance", value: "Unit 6 open", source: "Tenant/vendor confirmation", proof: "Missing", confidence: "Low", risk: "Critical", ownerAction: "Save proof before closure" } },
    { id: "data-8", tone: "red", values: { item: "Notice ledger verification", module: "Notices", value: "Unit 2/4 watch", source: "Verified ledger", proof: "Missing", confidence: "Low", risk: "High", ownerAction: "Do not serve/file" } },
    { id: "data-9", tone: "red", values: { item: "Section 8/HAP status", module: "Rent/Notices", value: "Pending", source: "HAP/PM confirmation", proof: "Missing", confidence: "Low", risk: "High", ownerAction: "Verify before treating as delinquency" } },
    { id: "data-10", values: { item: "Google Drive proof package status", module: "Drive Update Center", value: "Preview only", source: "Owner-approved proof files", proof: "Pending", confidence: "Medium", risk: "Watch", ownerAction: "Review preview package" } }
  ],
  queues: [
    { title: "Estimated vs Verified", detail: "Keep estimated values visibly marked.", items: ["Mortgage arrears estimated", "Cashflow sample-only", "Utility costs sample-only", "Rent balances pending proof"], tone: "yellow" },
    { title: "Pending Proof Queue", detail: "Proof needed before migration.", items: ["Rent ledgers", "MBFS posting", "Unit 6 maintenance proof", "HAP status"], tone: "red" },
    { title: "Source-of-Truth Checklist", detail: "Future live source checks.", items: ["Google Sheet Master Tracker", "RentRedi/PM ledgers", "Lender portal", "Utility bills", "Drive proof folders"], tone: "yellow" },
    { title: "Live Migration Readiness", detail: "Not ready until proof gates clear.", items: ["OAuth intentionally disabled", "Google Sheets disabled", "No env vars required", "Local sample only"], tone: "red" }
  ],
  blocked: ["Do not treat Local Sample Mode as source of truth.", "Do not migrate values live until proof is verified.", "Do not mark estimated, pending, or conflicted values complete."],
  approvalGate: commonStopRules,
  filters: ["Related Module", "Proof Status", "Confidence", "Risk", "Pending Verification", "Ledger Conflict", "Ready for Live Migration", "Search data item"],
  commands: [
    { id: "data-review", title: "Codex Command - Data Accuracy Review", actionName: "Generate Codex Command: Data Accuracy Review", controls: "Source verification, confidence, proof gaps, and migration readiness.", tone: "red", prompt: commandPrompt("Prepare a dashboard data accuracy review.", "- Identify estimated values, pending proof, ledger conflicts, blocked values, and source-of-truth requirements.") },
    { id: "data-proof", title: "Codex Command - Source Proof Checklist", actionName: "Generate Codex Command: Source Proof Checklist", controls: "Proof needed by module before live migration.", tone: "yellow", prompt: commandPrompt("Prepare a source proof checklist.", "- Group source proof requirements by rent, maintenance, mortgage, notices, utilities, Drive, and admin data.") },
    { id: "data-migration", title: "Codex Command - Live Migration Readiness Preview", actionName: "Generate Codex Command: Live Migration Readiness Preview", controls: "Preview what blocks future live-data migration.", tone: "red", prompt: commandPrompt("Prepare a live migration readiness preview.", "- Identify what remains blocked before OAuth, Google Sheets, or live integrations are re-enabled.") }
  ],
  safetyFooter: "Local Sample Mode is not a live source of truth. No Sheets, Drive, Gmail, Calendar, Task, RentRedi, lender, payment, tenant, legal, or vendor record is changed."
};

commandPages["live-readiness"] = {
  id: "live-readiness",
  title: "Live Readiness Command",
  subtitle: "Real data cleanup, proof verification, source-of-truth review, and safe live-integration planning.",
  localNotice: "Planning only. No live Google, Gmail, Calendar, Tasks, Drive, Sheets, RentRedi, tenant, legal, lender, vendor, bank, court, or payment actions.",
  healthStatus: "Planning / Not Live Ready",
  healthDetail:
    "The command center is ready for owner review in Local Sample Mode, but real data migration remains blocked by proof gaps, source-of-truth cleanup, and explicit owner approval gates. The safest first integration is Google Drive read-only listing.",
  kpis: [
    { label: "Live Site Review", value: "In Review", helper: "Owner QA checklist", tone: "yellow" },
    { label: "Real Data Readiness", value: "Blocked", helper: "Proof/source cleanup needed", tone: "red" },
    { label: "Source Cleanup", value: "12 areas", helper: "Source-of-truth plan", tone: "yellow" },
    { label: "Proof Folder Plan", value: "13 folders", helper: "Preview only", tone: "green" },
    { label: "Weekly Review Workflow", value: "10 steps", helper: "Dry-run process", tone: "green" },
    { label: "First Integration", value: "Drive read-only", helper: "Recommended lowest-risk start", tone: "green" },
    { label: "Approval Gates", value: "9 gates", helper: "Before live integration", tone: "red" },
    { label: "Live Writes", value: "Disabled", helper: "No live actions connected", tone: "green" }
  ],
  tableColumns: [
    { key: "area", header: "Data Area" },
    { key: "status", header: "Current Status" },
    { key: "source", header: "Source Needed" },
    { key: "proof", header: "Proof Needed" },
    { key: "risk", header: "Risk" },
    { key: "ownerAction", header: "Owner Action" },
    { key: "migration", header: "Ready for Live Migration" }
  ],
  tableRows: [
    { id: "readiness-rent-collected", tone: "yellow", values: { area: "Rent collected", status: "Pending Proof", source: "RentRedi ledger/export or verified rent tracker", proof: "Ledger totals and PM cash statement", risk: "Watch", ownerAction: "Verify collected totals", migration: "Ready Later" } },
    { id: "readiness-balances", tone: "red", values: { area: "Tenant balances", status: "Conflict", source: "RentRedi ledger, PM ledger, HAP status", proof: "Unit-level verified balances", risk: "High", ownerAction: "Resolve Unit 1/2/4/A/7 items", migration: "Blocked" } },
    { id: "readiness-rentredi", tone: "yellow", values: { area: "RentRedi ledger export", status: "Estimated", source: "Manual export or verified tracker", proof: "Export date and ledger notes", risk: "Medium", ownerAction: "Prepare manual export review", migration: "Ready Later" } },
    { id: "readiness-hap", tone: "red", values: { area: "Section 8 / HAP status", status: "Pending Proof", source: "HAP/PM confirmation", proof: "Payment status and tenant portion", risk: "High", ownerAction: "Verify HAP before delinquency decisions", migration: "Blocked" } },
    { id: "readiness-mortgage-arrears", tone: "red", values: { area: "Mortgage arrears", status: "Estimated", source: "Lender portal", proof: "Updated reinstatement/current balance", risk: "Critical", ownerAction: "Confirm lender balance", migration: "Blocked" } },
    { id: "readiness-mbfs", tone: "red", values: { area: "MBFS payment posting", status: "Pending Proof", source: "Lender posted-payment proof", proof: "Posting proof, next due date, pause confirmation", risk: "Critical", ownerAction: "Save final proof before closure", migration: "Blocked" } },
    { id: "readiness-utilities", tone: "yellow", values: { area: "Utility accounts", status: "Pending Proof", source: "Utility portal, bill, account confirmation", proof: "Bill/payment/account setup proof", risk: "Watch", ownerAction: "Verify account setup", migration: "Ready Later" } },
    { id: "readiness-maintenance", tone: "red", values: { area: "Maintenance completion proof", status: "Blocked", source: "RentRedi work order, vendor invoice, tenant confirmation, photos", proof: "Completion proof for Unit 6 heat issue", risk: "Critical", ownerAction: "Do not close until proof is saved", migration: "Blocked" } },
    { id: "readiness-notices", tone: "red", values: { area: "Notice/legal status", status: "Conflict", source: "Verified ledger, owner-approved draft, service proof if applicable", proof: "Ledger and approval proof", risk: "High", ownerAction: "Keep legal-sensitive items blocked", migration: "Blocked" } },
    { id: "readiness-arrangements", tone: "yellow", values: { area: "Payment arrangements", status: "Pending Proof", source: "Rent ledger and payment confirmations", proof: "Greg payment proof for May 20 and May 30", risk: "Medium", ownerAction: "Verify before escalation or closure", migration: "Ready Later" } },
    { id: "readiness-drive", tone: "yellow", values: { area: "Google Drive proof folders", status: "Ready Later", source: "Proof folder structure and owner-approved upload package", proof: "Folder listing and proof map", risk: "Low", ownerAction: "Start with read-only listing plan", migration: "Ready Later" } },
    { id: "readiness-reports", tone: "green", values: { area: "Weekly reports", status: "Ready Later", source: "Reports page preview workflow", proof: "Owner-reviewed dry run", risk: "Low", ownerAction: "Run weekly review dry run", migration: "Ready Later" } }
  ],
  queues: [
    {
      title: "Live Site Review Checklist",
      detail: "Local sample QA checklist before owner signs off on the deployed dashboard.",
      items: [
        "Review every sidebar page - In Review",
        "Check mobile layout - In Review",
        "Check copy-command buttons - Passed",
        "Check KPI readability - In Review",
        "Check Local Sample Mode labels - Passed",
        "Check blocked-until-verified language - Passed",
        "Check owner approval gates - Passed",
        "Check no page implies live actions are connected - Passed"
      ],
      tone: "yellow"
    },
    {
      title: "Source-of-Truth Cleanup Plan",
      detail: "Preferred source by data area before any live migration.",
      items: [
        "Rent: RentRedi ledger/export or verified rent tracker",
        "Maintenance: RentRedi work order, vendor invoice, tenant confirmation, photos",
        "Mortgage: lender portal, MBFS confirmation, posted-payment proof, updated balance",
        "Notices/legal: verified ledger, owner-approved draft, service proof if applicable",
        "Utilities: utility portal, bill, account confirmation, payment proof",
        "Drive: proof folder structure and owner-approved upload package",
        "Calendar/Tasks: owner-approved preview list before live creation",
        "Gmail: metadata first; body read only with owner approval"
      ],
      tone: "yellow"
    },
    {
      title: "Proof Folder Planning",
      detail: "Preview-only Google Drive folder structure. No folders or files are created.",
      items: [
        "PROPERTY MANAGEMENT OPERATING SYSTEM/",
        "00 Command Dashboard",
        "01 Rent Collection",
        "02 Maintenance",
        "03 Mortgage and Arrears",
        "04 Notices and Legal Holds",
        "05 Utilities",
        "06 Lease Violations",
        "07 Tenant Communications",
        "08 Vendor Communications",
        "09 Weekly Command Reviews",
        "10 Proof Archive",
        "11 Source Data Exports",
        "12 Owner Approvals"
      ],
      tone: "green"
    },
    {
      title: "Weekly Command Review Workflow",
      detail: "Turns the Reports page into a repeatable preview process.",
      items: [
        "Open /reports",
        "Review executive summary",
        "Review rent, maintenance, mortgage, notices, utilities, admin tasks, and calendar follow-ups",
        "Review proof needed",
        "Review blocked items",
        "Review owner approvals",
        "Prepare Google Drive update preview",
        "Prepare Calendar/Task preview",
        "Approve or reject live actions later",
        "Keep unresolved items open"
      ],
      tone: "green"
    },
    {
      title: "Safe Live Integration Roadmap",
      detail: "Lowest-risk order for future integrations after owner approval.",
      items: [
        "Phase 1: Google Drive read-only/listing - low risk",
        "Phase 2: Google Drive preview upload package - medium risk",
        "Phase 3: Google Calendar preview-to-create - medium risk",
        "Phase 4: Google Tasks preview-to-create - medium risk",
        "Phase 5: Google Sheets read-only source data - medium risk",
        "Phase 6: Gmail metadata-only tracking - medium risk",
        "Phase 7: Gmail body readback with approval - higher risk",
        "Phase 8: RentRedi manual import/export review - medium/high risk"
      ],
      tone: "yellow"
    },
    {
      title: "Recommended First Integration",
      detail: "Google Drive Read-Only / Listing should only list folders and files.",
      items: [
        "Verify proof folders without changing files",
        "Support source-of-truth cleanup",
        "Avoid upload, move, rename, delete, and edit scopes",
        "Safer than starting with Gmail, Calendar, Tasks, Sheets, or RentRedi writes",
        "Confirm token stays outside repo",
        "Confirm no secrets committed",
        "Confirm read-only dry run passes"
      ],
      tone: "green"
    }
  ],
  blocked: [
    "Preview only. No Google Drive folders are created, moved, renamed, uploaded, deleted, or updated from this dashboard.",
    "Do not enable OAuth, environment variables, or live APIs from this planning page.",
    "Do not mark rent, mortgage, maintenance, notice, utility, or HAP values live-ready until proof is verified.",
    "Do not read Gmail bodies, create drafts, send emails, create Calendar events, create Google Tasks, or update Sheets.",
    "Do not perform tenant, vendor, lender, legal, bank, court, or payment actions.",
    "Do not treat Local Sample Mode data as a live source of truth."
  ],
  approvalGate: [
    "Owner approves integration type.",
    "Scope is defined.",
    "Read-only tested first.",
    "Token location confirmed outside repo.",
    "No secrets committed.",
    "Dry run passes.",
    "Rollback plan exists.",
    "Live write disabled by default.",
    "Owner approves each live action."
  ],
  filters: [
    "Data Area",
    "Current Status",
    "Source Needed",
    "Proof Needed",
    "Risk",
    "Ready for Live Migration",
    "Owner Approval Required",
    "Search readiness notes"
  ],
  commands: [
    {
      id: "live-readiness-review",
      title: "Codex Command - Live Readiness Review",
      actionName: "Generate Codex Command: Live Readiness Review",
      controls: "Data readiness, proof gaps, source-of-truth status, approval gates, and integration readiness.",
      tone: "yellow",
      prompt: `Run a Live Readiness Review for the Property Command Center.

Rules:
- Read-only/local review only.
- Do not connect live services.
- Do not update Google Drive, Gmail, Calendar, Tasks, Sheets, RentRedi, tenant, legal, lender, vendor, bank, court, or payment records.
- Review data readiness, proof gaps, source-of-truth status, owner approval gates, and live integration readiness.
- Recommend what is ready, what is blocked, and what needs proof first.
- Stop before live actions.`
    },
    {
      id: "source-data-cleanup",
      title: "Codex Command - Source Data Cleanup Plan",
      actionName: "Generate Codex Command: Source Data Cleanup Plan",
      controls: "Source-of-truth plan and correction checklist.",
      tone: "yellow",
      prompt: `Prepare a Source Data Cleanup Plan.

Rules:
- Do not update live systems.
- Identify the source of truth for rent, maintenance, mortgage, notices, utilities, lease violations, admin tasks, Drive proof, Gmail follow-ups, Calendar follow-ups, and reports.
- Mark each area as verified, estimated, pending proof, conflict, blocked, or ready later.
- Produce a correction checklist only.
- Stop before live actions.`
    },
    {
      id: "proof-folder-plan",
      title: "Codex Command - Proof Folder Plan",
      actionName: "Generate Codex Command: Proof Folder Plan",
      controls: "Preview-only Drive proof folder structure.",
      tone: "green",
      prompt: `Prepare a Google Drive proof folder plan.

Rules:
- Do not create, move, rename, upload, delete, or update Drive files or folders.
- Prepare a preview-only folder structure for the Property Management Operating System.
- Include proof folders for rent, maintenance, mortgage, notices/legal, utilities, lease violations, tenant communications, vendor communications, weekly reviews, source exports, and owner approvals.
- Stop before Drive actions.`
    },
    {
      id: "drive-read-only-prep",
      title: "Codex Command - Google Drive Read-Only Prep",
      actionName: "Generate Codex Command: Google Drive Read-Only Prep",
      controls: "Read-only/listing dry-run plan and scope checks.",
      tone: "green",
      prompt: `Prepare Google Drive read-only integration planning.

Rules:
- Do not request write scopes.
- Do not upload, move, rename, delete, or edit Drive files.
- Do not commit credentials or tokens.
- Confirm token storage outside the repo.
- Prepare a read-only/listing dry-run plan for the Property Management Operating System folder.
- Include safety checks, scope checks, and rollback steps.
- Stop before OAuth or live connection.`
    },
    {
      id: "weekly-command-dry-run",
      title: "Codex Command - Weekly Command Review Dry Run",
      actionName: "Generate Codex Command: Weekly Command Review Dry Run",
      controls: "Preview weekly review workflow from Reports.",
      tone: "green",
      prompt: `Run a Weekly Command Review dry run for the Property Command Center.

Rules:
- Read-only/local review only.
- Do not update Google Drive, Gmail, Calendar, Tasks, Sheets, RentRedi, tenant, legal, lender, vendor, bank, court, or payment records.
- Review rent, maintenance, mortgage, notices, utilities, lease violations, admin tasks, calendar follow-ups, Gmail follow-ups, Drive update needs, proof gaps, owner approvals, and blocked items.
- Produce a preview report only.
- Stop before live actions.`
    },
    {
      id: "live-risk-review",
      title: "Codex Command - Live Integration Risk Review",
      actionName: "Generate Codex Command: Live Integration Risk Review",
      controls: "Risk review and safest integration order.",
      tone: "red",
      prompt: `Prepare a live integration risk review.

Rules:
- Do not connect live services.
- Do not perform live writes.
- Review risks for Google Drive, Gmail, Calendar, Tasks, Sheets, RentRedi, tenant communications, legal notices, mortgage/lender workflows, vendor workflows, and payments.
- Recommend the safest integration order and approval gates.
- Stop before live actions.`
    }
  ],
  relatedLinks: [
    {
      title: "Next Step: Real Data Cleanup Worksheet",
      detail: "Open the source-of-truth worksheet to map sample values to verified real data, proof gaps, conflicts, and future import readiness.",
      href: "/real-data-cleanup",
      action: "Open Real Data Cleanup Worksheet",
      tone: "yellow"
    },
    {
      title: "Master Workflow: Operations Readiness",
      detail: "Roll live-site review, data cleanup, source packaging, proof folders, and Drive read-only planning into one controlled readiness plan.",
      href: "/operations-readiness",
      action: "Open Operations Readiness",
      tone: "green"
    }
  ],
  safetyFooter:
    "Live Readiness is planning-only. No OAuth, Google Drive, Gmail, Calendar, Tasks, Sheets, RentRedi, tenant, legal, lender, vendor, bank, court, payment, or live record action is connected or performed."
};

commandPages["real-data-cleanup"] = {
  id: "real-data-cleanup",
  title: "Real Data Cleanup Command",
  subtitle: "Source-of-truth worksheet, proof collection, import prep, and verified-data migration planning.",
  localNotice: "Worksheet only. No live Sheets, Drive, Gmail, Calendar, Tasks, RentRedi, tenant, legal, lender, vendor, bank, court, or payment actions.",
  healthStatus: "Blocked / Cleanup Required",
  healthDetail:
    "The dashboard is still in Local Sample Mode. Real data migration is blocked until source-of-truth exports, proof references, owner review, and conflict resolution are complete. No import or live connection happens from this worksheet.",
  kpis: [
    { label: "Total Data Items", value: "21", helper: "Cleanup worksheet rows", tone: "yellow" },
    { label: "Verified", value: "1", helper: "Report workflow only", tone: "green" },
    { label: "Pending Proof", value: "9", helper: "Proof needed before migration", tone: "red" },
    { label: "Conflicts", value: "5", helper: "Resolve before import", tone: "red" },
    { label: "Estimated Values", value: "4", helper: "Keep clearly marked", tone: "yellow" },
    { label: "Blocked Values", value: "7", helper: "Do not import", tone: "red" },
    { label: "Ready for Import", value: "0", helper: "Verified-only gate", tone: "red" },
    { label: "Owner Review Required", value: "21", helper: "Before real data replaces samples", tone: "yellow" }
  ],
  tableColumns: [
    { key: "dataId", header: "Data ID" },
    { key: "area", header: "Data Area" },
    { key: "module", header: "Related Module" },
    { key: "property", header: "Property" },
    { key: "unit", header: "Unit" },
    { key: "current", header: "Current Dashboard Value" },
    { key: "proposed", header: "Proposed Real Value" },
    { key: "source", header: "Source of Truth Needed" },
    { key: "proof", header: "Proof Needed" },
    { key: "confidence", header: "Current Confidence" },
    { key: "status", header: "Status" },
    { key: "risk", header: "Risk" },
    { key: "ownerAction", header: "Owner Action" },
    { key: "import", header: "Ready for Import" },
    { key: "notes", header: "Notes" }
  ],
  tableRows: [
    { id: "rdc-001", tone: "yellow", values: { dataId: "RDC-001", area: "Rent collected May 2026", module: "Rent Collection", property: "All", unit: "All", current: "$9,653.40", proposed: "Pending verified export", source: "RentRedi ledger export / verified rent tracker", proof: "Ledger totals and deposit proof if needed", confidence: "Medium", status: "Pending Proof", risk: "Watch", ownerAction: "Verify total collected", import: "No", notes: "Do not replace sample value until proof is mapped." } },
    { id: "rdc-002", tone: "yellow", values: { dataId: "RDC-002", area: "Projected rent May 2026", module: "Rent Collection", property: "All", unit: "All", current: "$12,195.85", proposed: "Pending rent roll", source: "Lease/rent roll or verified tracker", proof: "Current rent roll", confidence: "Medium", status: "Estimated", risk: "Watch", ownerAction: "Confirm rent roll", import: "No", notes: "Projection must match active lease and subsidy data." } },
    { id: "rdc-003", tone: "yellow", values: { dataId: "RDC-003", area: "Unit 1 Greg Mckinney balance/payment arrangement", module: "Rent Collection", property: "7-Unit", unit: "Unit 1", current: "$935 balance / arrangement", proposed: "Pending proof", source: "RentRedi ledger and payment proof", proof: "May 20 and May 30 payment confirmation", confidence: "Low", status: "Pending Proof", risk: "High", ownerAction: "Verify arrangement payments", import: "No", notes: "Do not escalate while arrangement is active without proof review." } },
    { id: "rdc-004", tone: "red", values: { dataId: "RDC-004", area: "Unit 2 Marc Gosselin ledger conflict", module: "Rent / Notices", property: "7-Unit", unit: "Unit 2", current: "$315 conflict", proposed: "Resolve ledger discrepancy", source: "RentRedi ledger export and overdue summary", proof: "Payment allocation proof", confidence: "Low", status: "Conflict", risk: "High", ownerAction: "Resolve conflict before notice action", import: "No", notes: "Blocked until ledger is reconciled." } },
    { id: "rdc-005", tone: "red", values: { dataId: "RDC-005", area: "Unit 4 Kevin Royster Section 8/HAP status", module: "Rent / Notices", property: "7-Unit", unit: "Unit 4", current: "Late / Section 8 review", proposed: "Pending HAP and tenant portion", source: "Section 8/HAP confirmation and ledger", proof: "HAP payment status and balance proof", confidence: "Low", status: "Conflict", risk: "Critical", ownerAction: "Verify before escalation", import: "No", notes: "Do not serve/escalate until verified." } },
    { id: "rdc-006", tone: "red", values: { dataId: "RDC-006", area: "Unit 6 Jennifer Badger maintenance/safety proof", module: "Maintenance", property: "7-Unit", unit: "Unit 6", current: "Critical open heat issue", proposed: "Pending completion proof", source: "RentRedi work order, vendor proof, tenant confirmation", proof: "Photos, invoice, completion/date, communication log", confidence: "Low", status: "Blocked", risk: "Critical", ownerAction: "Save proof before closure", import: "No", notes: "Safety-sensitive item remains open." } },
    { id: "rdc-007", tone: "red", values: { dataId: "RDC-007", area: "Unit 7 Alexandrea McCurdy May rent status", module: "Rent Collection", property: "7-Unit", unit: "Unit 7", current: "Paid in RentRedi / UPMC unresolved", proposed: "Resolve payment source", source: "RentRedi, UPMC/payment proof", proof: "May rent receipt or missing-payment confirmation", confidence: "Low", status: "Conflict", risk: "High", ownerAction: "Verify UPMC issue", import: "No", notes: "Do not close unresolved payment source." } },
    { id: "rdc-008", tone: "red", values: { dataId: "RDC-008", area: "4-Unit Unit A Lacourtney Martin HAP payment", module: "Rent Collection", property: "4-Unit", unit: "Unit A", current: "$469.95 balance / HAP verification", proposed: "Pending HAP proof", source: "PM statement and HAP confirmation", proof: "Section 8/HAP payment status", confidence: "Low", status: "Pending Proof", risk: "High", ownerAction: "Verify before delinquency decision", import: "No", notes: "Do not treat balance as tenant delinquency until HAP is verified." } },
    { id: "rdc-009", tone: "red", values: { dataId: "RDC-009", area: "7-Unit mortgage arrears", module: "Mortgage / Allotment", property: "7-Unit", unit: "All", current: "$12,745.90 estimated", proposed: "Pending lender balance", source: "Lender portal", proof: "Updated reinstatement/current balance", confidence: "Low", status: "Estimated", risk: "Critical", ownerAction: "Confirm lender balance", import: "No", notes: "Estimated arrears cannot be migrated as final." } },
    { id: "rdc-010", tone: "red", values: { dataId: "RDC-010", area: "MBFS payment posting proof", module: "Mortgage / Allotment", property: "7-Unit", unit: "All", current: "$13,254.10 accepted requests", proposed: "Posted payment proof", source: "Lender/MBFS proof", proof: "Posted payment, next due date, foreclosure/legal pause confirmation", confidence: "Low", status: "Pending Proof", risk: "Critical", ownerAction: "Confirm posting before closure", import: "No", notes: "Payment request emails are not final posting proof." } },
    { id: "rdc-011", tone: "yellow", values: { dataId: "RDC-011", area: "4-Unit mortgage current status", module: "Mortgage / Allotment", property: "4-Unit", unit: "All", current: "$0 arrears sample", proposed: "Verify current status", source: "Lender/PM/payment process", proof: "Payment confirmation and next due date", confidence: "Medium", status: "Owner Review", risk: "Watch", ownerAction: "Verify recurring payment process", import: "No", notes: "Keep current but verify proof." } },
    { id: "rdc-012", tone: "yellow", values: { dataId: "RDC-012", area: "Duquesne Light account setup", module: "Utilities", property: "7-Unit", unit: "Common", current: "Setup watch", proposed: "Verified account setup", source: "Utility portal/account confirmation", proof: "Paperless/account proof", confidence: "Medium", status: "Pending Proof", risk: "Watch", ownerAction: "Confirm utility account setup", import: "No", notes: "No provider connection in dashboard." } },
    { id: "rdc-013", tone: "yellow", values: { dataId: "RDC-013", area: "Gas account", module: "Utilities", property: "7-Unit", unit: "Common", current: "$64 sample", proposed: "Verified gas bill", source: "Utility bill/portal", proof: "Bill and payment proof", confidence: "Medium", status: "Estimated", risk: "Watch", ownerAction: "Verify account and bill", import: "No", notes: "Sample value only." } },
    { id: "rdc-014", tone: "yellow", values: { dataId: "RDC-014", area: "Water account", module: "Utilities", property: "4-Unit", unit: "Common", current: "$72 sample", proposed: "Verified water bill", source: "Utility bill/portal", proof: "Bill and payment proof", confidence: "Medium", status: "Estimated", risk: "Watch", ownerAction: "Verify account and bill", import: "No", notes: "Sample value only." } },
    { id: "rdc-015", tone: "yellow", values: { dataId: "RDC-015", area: "Sewer account", module: "Utilities", property: "4-Unit", unit: "Common", current: "$38 sample", proposed: "Verified sewer bill", source: "Utility bill/portal", proof: "Bill and payment proof", confidence: "Medium", status: "Estimated", risk: "Watch", ownerAction: "Verify account and bill", import: "No", notes: "Sample value only." } },
    { id: "rdc-016", tone: "yellow", values: { dataId: "RDC-016", area: "Trash account", module: "Utilities", property: "All", unit: "Common", current: "$19 sample", proposed: "Verified trash bill", source: "Utility bill/portal", proof: "Bill and payment proof", confidence: "Medium", status: "Ready Later", risk: "Low", ownerAction: "Verify source", import: "No", notes: "Ready later after bill proof." } },
    { id: "rdc-017", tone: "red", values: { dataId: "RDC-017", area: "Notices/legal status", module: "Notices / Evictions", property: "7-Unit", unit: "Multiple", current: "Hold / verification risk", proposed: "Verified legal hold status", source: "Verified ledger and owner-approved draft", proof: "Ledger, draft review, service proof if applicable", confidence: "Low", status: "Blocked", risk: "High", ownerAction: "Keep legal-sensitive items blocked", import: "No", notes: "No final legal status without proof." } },
    { id: "rdc-018", tone: "yellow", values: { dataId: "RDC-018", area: "Lease violations", module: "Lease Violations", property: "All", unit: "Multiple", current: "Sample issue categories", proposed: "Verified incident tracker", source: "Incident proof, communication record, owner approval", proof: "Photos/logs/lease reference if applicable", confidence: "Low", status: "Owner Review", risk: "Watch", ownerAction: "Verify incidents before migration", import: "No", notes: "Do not escalate from sample categories." } },
    { id: "rdc-019", tone: "yellow", values: { dataId: "RDC-019", area: "Google Drive proof folder status", module: "Drive Update Center", property: "All", unit: "All", current: "Preview only", proposed: "Read-only folder listing later", source: "Proof folder list and package map", proof: "Owner-approved folder plan", confidence: "Medium", status: "Ready Later", risk: "Low", ownerAction: "Approve read-only dry run later", import: "No", notes: "No Drive upload or write." } },
    { id: "rdc-020", tone: "yellow", values: { dataId: "RDC-020", area: "Gmail follow-up status", module: "Gmail Follow-Ups", property: "All", unit: "Multiple", current: "Preview only", proposed: "Metadata-first review later", source: "Gmail metadata only; body read with approval", proof: "Owner-approved readback if needed", confidence: "Medium", status: "Ready Later", risk: "Medium", ownerAction: "Define Gmail scope later", import: "No", notes: "No body reads, drafts, or sends." } },
    { id: "rdc-021", tone: "green", values: { dataId: "RDC-021", area: "Weekly report status", module: "Reports", property: "All", unit: "All", current: "Preview workflow", proposed: "Verified report after module proof", source: "Verified module summaries and owner decisions", proof: "Owner review and proof gaps list", confidence: "Medium", status: "Ready Later", risk: "Low", ownerAction: "Run dry review after proof mapping", import: "No", notes: "Preview only; no export." } }
  ],
  queues: [
    {
      title: "Source-of-Truth Import Prep",
      detail: "Module cards for what should be imported later after approval.",
      items: [
        "Rent Collection: RentRedi ledger export, verified rent tracker, bank/deposit proof if needed",
        "Maintenance: RentRedi work order, invoice, photos, tenant/vendor confirmation",
        "Mortgage / Allotment: lender portal, MBFS confirmation, posted-payment proof, updated balance, next due date",
        "Notices / Evictions: verified ledger, owner-approved draft, service proof only if applicable, legal hold status",
        "Utilities: portal bill, account setup confirmation, due date, payment proof",
        "Lease Violations: incident proof, communication record, owner approval, lease reference if applicable",
        "Google Drive: proof folder list, package map, owner approval before upload",
        "Gmail: metadata first; body readback only with approval",
        "Calendar / Tasks: approved preview events/tasks",
        "Reports: verified module summaries, proof gaps, owner decisions"
      ],
      tone: "yellow"
    },
    {
      title: "Import Template Preview",
      detail: "Preview only. No import is performed from this dashboard.",
      items: [
        "module | record_id | property | unit | tenant_or_party",
        "amount | status | source_type | proof_reference",
        "verified_by_owner | ready_for_dashboard | notes",
        "Sample template rows remain local worksheet planning only"
      ],
      tone: "green"
    },
    {
      title: "Proof Gap Queue",
      detail: "Items where proof is missing before any migration.",
      items: [
        "Mortgage posting proof",
        "Maintenance completion proof",
        "RentRedi ledger proof",
        "HAP/Section 8 proof",
        "Utility account proof",
        "Notice/legal proof if applicable",
        "Drive proof folder confirmation"
      ],
      tone: "red"
    },
    {
      title: "Conflict Resolution Queue",
      detail: "Conflicts that must be resolved before sample values are replaced.",
      items: [
        "Unit 2 Marc Gosselin ledger conflict",
        "Unit 4 Kevin Royster balance/Section 8 conflict",
        "Unit A HAP payment uncertainty",
        "Mortgage arrears estimated vs lender balance",
        "Local sample values vs source export"
      ],
      tone: "red"
    },
    {
      title: "Ready-for-Import Checklist",
      detail: "Every item must clear before real data replaces samples.",
      items: [
        "All values have source-of-truth assigned",
        "Proof is saved or identified",
        "Owner reviewed high-risk items",
        "Conflicts resolved",
        "Estimated values marked correctly",
        "Blocked values remain blocked",
        "Import template reviewed",
        "Live integration scope approved",
        "Rollback plan exists",
        "No secrets/tokens in repo"
      ],
      tone: "yellow"
    }
  ],
  blocked: [
    "Do not replace sample values with real data until owner approves the source and field mapping.",
    "Do not mark pending proof, conflict, estimated, or blocked values ready for import.",
    "Do not import data, connect Google Sheets, connect RentRedi, or update dashboard source records from this page.",
    "Do not upload Drive files, read Gmail bodies, create Calendar events, create Google Tasks, or perform live service actions.",
    "Do not treat legal, mortgage, payment, tenant, or HAP values as verified until proof is reviewed."
  ],
  approvalGate: [
    "Owner approves data source.",
    "Owner approves field mapping.",
    "Owner approves proof status.",
    "High-risk legal/payment/mortgage values reviewed.",
    "Import dry run passes.",
    "Dashboard backup created.",
    "Git branch/commit plan approved.",
    "No live writes unless separately approved."
  ],
  filters: [
    "Data Area",
    "Related Module",
    "Property",
    "Status",
    "Risk",
    "Confidence",
    "Ready for Import",
    "Proof Needed",
    "Conflict",
    "Search worksheet"
  ],
  commands: [
    {
      id: "cleanup-review",
      title: "Codex Command - Real Data Cleanup Review",
      actionName: "Generate Codex Command: Real Data Cleanup Review",
      controls: "Sample values, source needs, proof gaps, conflicts, estimated values, and import readiness.",
      tone: "yellow",
      prompt: `Run a Real Data Cleanup Review for the Property Command Center.

Rules:
- Read-only/local review only.
- Do not connect live services.
- Do not update Google Sheets, Drive, Gmail, Calendar, Tasks, RentRedi, tenant, legal, lender, vendor, bank, court, payment, or dashboard source records without owner approval.
- Review current sample values, source-of-truth needs, proof gaps, conflicts, estimated values, blocked values, and ready-for-import items.
- Produce a cleanup report only.
- Stop before live actions.`
    },
    {
      id: "source-export-mapping",
      title: "Codex Command - Source Export Mapping Prep",
      actionName: "Generate Codex Command: Source Export Mapping Prep",
      controls: "Map future source exports to dashboard modules and fields.",
      tone: "yellow",
      prompt: `Prepare a source export mapping plan.

Rules:
- Do not import data.
- Do not connect Google Sheets or RentRedi.
- Map expected source exports to dashboard modules and fields.
- Identify required fields, proof references, owner verification fields, and blocked values.
- Stop before live actions.`
    },
    {
      id: "proof-gap-checklist",
      title: "Codex Command - Proof Gap Checklist",
      actionName: "Generate Codex Command: Proof Gap Checklist",
      controls: "Missing proof by module and risk level.",
      tone: "red",
      prompt: `Prepare a proof gap checklist.

Rules:
- Do not upload, move, rename, delete, or update Drive files.
- Do not mark items complete.
- List missing proof by module and risk level.
- Include owner action required for each proof gap.
- Stop before live actions.`
    },
    {
      id: "conflict-resolution",
      title: "Codex Command - Conflict Resolution Plan",
      actionName: "Generate Codex Command: Conflict Resolution Plan",
      controls: "Conflicting values, source needs, owner decisions, and blocked statuses.",
      tone: "red",
      prompt: `Prepare a conflict resolution plan.

Rules:
- Do not update dashboard source data.
- Do not change tenant, legal, payment, mortgage, RentRedi, Gmail, Drive, Calendar, Task, or Sheets records.
- Identify conflicting values, likely source needed, owner decision needed, and blocked status.
- Stop before live actions.`
    },
    {
      id: "import-template-prep",
      title: "Codex Command - Import Template Prep",
      actionName: "Generate Codex Command: Import Template Prep",
      controls: "Preview field map for future verified-data import.",
      tone: "green",
      prompt: `Prepare a verified-data import template.

Rules:
- Do not import data.
- Do not connect live systems.
- Create a preview field map for module, record ID, property, unit, tenant/party, amount, status, source type, proof reference, owner verification, dashboard readiness, and notes.
- Stop before live actions.`
    },
    {
      id: "sample-to-verified",
      title: "Codex Command - Sample-to-Verified Migration Plan",
      actionName: "Generate Codex Command: Sample-to-Verified Migration Plan",
      controls: "Future migration plan with validation, commit, rollback, and owner approval steps.",
      tone: "yellow",
      prompt: `Prepare a sample-to-verified dashboard migration plan.

Rules:
- Do not modify dashboard data yet.
- Do not connect live services.
- Identify which sample values can be replaced later, which must remain estimated, which are blocked, and what proof is required.
- Include validation, commit, rollback, and owner approval steps.
- Stop before live actions.`
    }
  ],
  safetyFooter:
    "Real Data Cleanup is worksheet-only. No live import, Google Sheets connection, Drive upload, Gmail read, Calendar event, Google Task, RentRedi connection, tenant/vendor/lender/legal/payment action, or dashboard source update is performed."
};

commandPages["real-data-cleanup"].relatedLinks = [
  {
    title: "Master Workflow: Operations Readiness",
    detail: "Use the five-phase readiness plan to connect this worksheet to live-site verification, source-of-truth packaging, Drive folder planning, and the integration roadmap.",
    href: "/operations-readiness",
    action: "Open Operations Readiness",
    tone: "green"
  }
];

commandPages["operations-readiness"] = {
  id: "operations-readiness",
  title: "Operations Readiness Command",
  subtitle: "Five-phase readiness plan for live-site review, verified data cleanup, source-of-truth packaging, proof folders, and safe live integration.",
  localNotice: "Planning only. No live service connections, no live writes, and owner approval required before any live integration.",
  healthStatus: "Five-Phase Readiness / Not Live Connected",
  healthDetail:
    "This page rolls the next five workstreams into one controlled workflow. The dashboard remains Local Sample Mode while the owner verifies the live site, cleans real data, packages source-of-truth proof, previews Drive folders, and reviews the safest integration roadmap.",
  kpis: [
    { label: "Phase 1", value: "Live site review", helper: "Manual verification checklist", tone: "yellow" },
    { label: "Phase 2", value: "Real data cleanup", helper: "Proof/conflict worksheet", tone: "red" },
    { label: "Phase 3", value: "Source package", helper: "Source-of-truth matrix", tone: "yellow" },
    { label: "Phase 4", value: "Drive folders", helper: "Preview only / not created", tone: "green" },
    { label: "Phase 5", value: "Integration roadmap", helper: "Drive read-only first", tone: "green" },
    { label: "Write Integrations", value: "Not approved", helper: "Live writes disabled", tone: "red" },
    { label: "Owner Approval", value: "Required", helper: "Before every live step", tone: "yellow" },
    { label: "Recommended First", value: "Drive read-only", helper: "Listing only / low risk", tone: "green" }
  ],
  tableColumns: [
    { key: "phase", header: "Phase" },
    { key: "task", header: "Task" },
    { key: "status", header: "Status" },
    { key: "risk", header: "Risk" },
    { key: "ownerAction", header: "Owner Action" },
    { key: "blocked", header: "Blocked Until" },
    { key: "ready", header: "Ready for Next Step" }
  ],
  tableRows: [
    { id: "ops-1", tone: "yellow", values: { phase: "Phase 1", task: "Live site review complete", status: "In Review", risk: "Medium", ownerAction: "Review every deployed route", blocked: "Manual QA complete", ready: "No" } },
    { id: "ops-2", tone: "yellow", values: { phase: "Phase 2", task: "Real data cleanup started", status: "In Review", risk: "High", ownerAction: "Use /real-data-cleanup worksheet", blocked: "Source/proof map complete", ready: "No" } },
    { id: "ops-3", tone: "yellow", values: { phase: "Phase 3", task: "Source-of-truth assigned", status: "Owner Review", risk: "Medium", ownerAction: "Approve preferred source by module", blocked: "Owner source approval", ready: "No" } },
    { id: "ops-4", tone: "red", values: { phase: "Phase 3", task: "Proof gaps identified", status: "Pending Proof", risk: "High", ownerAction: "List missing proof by module", blocked: "Proof references identified", ready: "No" } },
    { id: "ops-5", tone: "red", values: { phase: "Phase 2", task: "Conflicts resolved", status: "Blocked", risk: "High", ownerAction: "Resolve Unit 2, Unit 4, Unit A, mortgage, and sample/export conflicts", blocked: "Conflicts resolved", ready: "No" } },
    { id: "ops-6", tone: "yellow", values: { phase: "Phase 4", task: "Drive folder plan reviewed", status: "In Review", risk: "Low", ownerAction: "Review folder purpose/proof map", blocked: "Owner folder plan approval", ready: "No" } },
    { id: "ops-7", tone: "yellow", values: { phase: "Phase 5", task: "Drive read-only preflight approved", status: "Not Started", risk: "Low", ownerAction: "Approve read-only/listing scope later", blocked: "Owner preflight approval", ready: "No" } },
    { id: "ops-8", tone: "green", values: { phase: "Phase 5", task: "No write integrations approved yet", status: "Passed", risk: "Low", ownerAction: "Keep write integrations disabled", blocked: "Separate owner approval", ready: "Yes" } },
    { id: "ops-9", tone: "yellow", values: { phase: "Phase 1", task: "Weekly review dry run completed", status: "Not Started", risk: "Low", ownerAction: "Run Reports dry run", blocked: "Owner review", ready: "No" } },
    { id: "ops-10", tone: "yellow", values: { phase: "Phase 5", task: "Owner approves next phase", status: "Not Started", risk: "Medium", ownerAction: "Approve specific integration type and scope", blocked: "All earlier phases reviewed", ready: "No" } }
  ],
  queues: [
    {
      title: "Phase 1: Live Website Manual Verification",
      detail: "Status options: Not Started, In Review, Passed, Needs Fix.",
      items: [
        "Open every sidebar page - In Review",
        "Verify Overview cards - In Review",
        "Verify command buttons copy correctly - In Review",
        "Verify tables are readable - In Review",
        "Verify mobile layout - In Review",
        "Verify Local Sample Mode labels - Passed",
        "Verify no page implies live actions are connected - Passed",
        "Verify owner approval gates - Passed",
        "Verify blocked-until-verified language - Passed",
        "Verify Settings page still shows disabled live integrations - Passed",
        "Route checklist: /, /rent-collection, /maintenance, /mortgage-arrears, /notices-evictions, /calendar-follow-ups, /admin-tasks, /utilities, /lease-violations, /draft-status, /drive-update-center, /gmail-follow-ups, /reports, /data-accuracy, /live-readiness, /real-data-cleanup, /settings"
      ],
      tone: "yellow"
    },
    {
      title: "Phase 2: Real Data Cleanup",
      detail: "Do not replace sample values with real values until proof and owner review are complete.",
      items: [
        "Rent collected - Pending Proof",
        "Projected rent - Estimated",
        "Tenant balances - Conflict",
        "RentRedi ledger/export - Pending Proof",
        "Section 8 / HAP status - Conflict",
        "Mortgage arrears - Estimated",
        "MBFS payment posting - Pending Proof",
        "Utility accounts - Pending Proof",
        "Maintenance completion proof - Blocked",
        "Notice/legal status - Blocked",
        "Lease violation proof - Owner Review",
        "Payment arrangements - Pending Proof",
        "Drive proof folder status - Ready Later",
        "Gmail follow-up status - Ready Later",
        "Calendar follow-up status - Ready Later",
        "Weekly report status - Ready Later"
      ],
      tone: "red"
    },
    {
      title: "Phase 3: Source-of-Truth Package",
      detail: "Preferred source matrix before any real data migration.",
      items: [
        "Rent: RentRedi ledger/export, verified rent tracker, bank/deposit proof if needed",
        "Maintenance: RentRedi work order, vendor invoice, photos, tenant/vendor confirmation",
        "Mortgage: lender portal, MBFS confirmation, posted-payment proof, updated reinstatement/current balance, next due date",
        "Notices/legal: verified ledger, owner-approved draft, service proof only if applicable, legal hold status",
        "Utilities: utility portal, bill, account setup confirmation, due date, payment proof",
        "Lease Violations: incident proof, communication record, owner approval, lease reference if applicable",
        "Google Drive: proof folder structure, package map, owner approval before upload",
        "Gmail: metadata first; body readback only with approval",
        "Calendar / Tasks: approved preview events/tasks only",
        "Reports: verified module summaries, proof gaps, owner decisions"
      ],
      tone: "yellow"
    },
    {
      title: "Phase 4: Google Drive Proof Folder Structure",
      detail: "Preview only / not created. No Google Drive folders are created, moved, renamed, uploaded, deleted, or updated.",
      items: [
        "PROPERTY MANAGEMENT OPERATING SYSTEM/",
        "00 Command Dashboard - dashboard snapshots and owner review exports",
        "01 Rent Collection - rent ledgers, deposits, HAP proof",
        "02 Maintenance - work orders, invoices, photos, completion proof",
        "03 Mortgage and Arrears - MBFS/lender proof, balances, due dates",
        "04 Notices and Legal Holds - drafts, proof, legal hold status",
        "05 Utilities - bills, account setup, payment proof",
        "06 Lease Violations - incident proof and owner approvals",
        "07 Tenant Communications - approved communications only",
        "08 Vendor Communications - approved vendor proof and messages",
        "09 Weekly Command Reviews - weekly preview archives",
        "10 Proof Archive - final verified proof",
        "11 Source Data Exports - exports used for migration",
        "12 Owner Approvals - approval logs and decisions"
      ],
      tone: "green"
    },
    {
      title: "Phase 5: Safe Live Integration Roadmap",
      detail: "Safest order starts with Drive read-only/listing.",
      items: [
        "1. Google Drive read-only/listing - view folder and proof structure without changing files - low risk if read-only",
        "2. Google Drive preview upload package - prepare owner-approved package before write - medium risk",
        "3. Google Sheets read-only source data - use verified Sheets as source data - medium risk",
        "4. Google Calendar preview-to-create - create events only after owner approval - medium risk",
        "5. Google Tasks preview-to-create - create tasks only after owner approval - medium risk",
        "6. Gmail metadata-only tracking - track follow-up emails without body readback - medium risk",
        "7. Gmail body readback with approval - read selected emails only after owner approval - high risk",
        "8. RentRedi manual export/import review - use verified exports before any API connection - medium/high risk"
      ],
      tone: "yellow"
    },
    {
      title: "Recommended First Integration: Google Drive Read-Only / Listing",
      detail: "Read-only listing should verify proof folders without upload, move, rename, delete, or edit scopes.",
      items: [
        "Confirm Drive folder structure",
        "Confirm proof folders",
        "Confirm read-only scope only",
        "Confirm no write scopes",
        "Confirm token stored outside repo",
        "Confirm no secrets committed",
        "Confirm dry run lists folders only",
        "Confirm no file uploads/moves/renames/deletes",
        "Confirm owner approval gate remains active"
      ],
      tone: "green"
    }
  ],
  blocked: [
    "Do not connect OAuth or live APIs from this planning workflow.",
    "Do not create, upload, move, rename, delete, or update Google Drive folders or files.",
    "Do not read Gmail bodies, send emails, create drafts, create Calendar events, or create Google Tasks.",
    "Do not connect live Google Sheets data or RentRedi.",
    "Do not import real data or replace sample values until proof and owner review are complete.",
    "Do not perform tenant, vendor, lender, legal, bank, court, payment, or dashboard source record actions."
  ],
  approvalGate: [
    "Owner approves the next phase.",
    "Integration type is named.",
    "Scope is read-only first when possible.",
    "Token storage remains outside repo.",
    "No secrets or tokens committed.",
    "Dry run passes.",
    "Rollback plan exists.",
    "Live writes remain disabled by default.",
    "Each live action requires separate owner approval."
  ],
  filters: ["Phase", "Task", "Status", "Risk", "Owner Action", "Blocked Until", "Ready for Next Step", "Search readiness plan"],
  commands: [
    {
      id: "ops-review",
      title: "Codex Command - Operations Readiness Review",
      actionName: "Generate Codex Command: Operations Readiness Review",
      controls: "Five-phase readiness report across live site review, data cleanup, source package, proof folders, and roadmap.",
      tone: "yellow",
      prompt: `Run an Operations Readiness Review for the Property Command Center.

Rules:
- Read-only/local review only.
- Do not connect live services.
- Do not update Google Drive, Gmail, Calendar, Tasks, Sheets, RentRedi, tenant, legal, lender, vendor, bank, court, payment, or dashboard source records.
- Review live-site verification, real data cleanup, source-of-truth status, proof folder readiness, and live integration roadmap.
- Produce a readiness report only.
- Stop before live actions.`
    },
    {
      id: "live-site-checklist",
      title: "Codex Command - Live Site Verification Checklist",
      actionName: "Generate Codex Command: Live Site Verification Checklist",
      controls: "Manual live-site route, navigation, copy button, label, and approval-gate QA.",
      tone: "yellow",
      prompt: `Prepare a live-site verification checklist.

Rules:
- Do not change files unless owner separately approves a fix.
- Review all dashboard routes, navigation, command buttons, Local Sample Mode labels, owner approval gates, and blocked-until-verified language.
- Report issues and recommended fixes.
- Stop before live actions.`
    },
    {
      id: "real-data-dry-run",
      title: "Codex Command - Real Data Cleanup Dry Run",
      actionName: "Generate Codex Command: Real Data Cleanup Dry Run",
      controls: "Verified values, estimated values, conflicts, proof gaps, and blocked items.",
      tone: "red",
      prompt: `Run a Real Data Cleanup dry run.

Rules:
- Do not import data.
- Do not connect live services.
- Review rent, maintenance, mortgage, notices, utilities, lease violations, Drive proof, Gmail follow-ups, Calendar follow-ups, and reports.
- Identify verified values, estimated values, conflicts, proof gaps, and blocked items.
- Stop before live actions.`
    },
    {
      id: "source-package",
      title: "Codex Command - Source-of-Truth Package Prep",
      actionName: "Generate Codex Command: Source-of-Truth Package Prep",
      controls: "Preferred source assignments, required exports, proof docs, approvals, and blocked items.",
      tone: "yellow",
      prompt: `Prepare a Source-of-Truth Package.

Rules:
- Do not update live systems.
- Assign the preferred source for each dashboard module.
- Identify required exports, proof documents, owner approvals, and blocked items.
- Stop before live actions.`
    },
    {
      id: "drive-folder-preview",
      title: "Codex Command - Drive Folder Structure Preview",
      actionName: "Generate Codex Command: Drive Folder Structure Preview",
      controls: "Preview-only Drive folder purposes, proof types, and approval requirements.",
      tone: "green",
      prompt: `Prepare a Google Drive folder structure preview.

Rules:
- Do not create, upload, move, rename, delete, or update Drive folders or files.
- Use preview-only planning for the Property Management Operating System folder.
- Include folder purposes, proof types, and owner approval requirements.
- Stop before Drive actions.`
    },
    {
      id: "drive-readonly-preflight",
      title: "Codex Command - Google Drive Read-Only Preflight",
      actionName: "Generate Codex Command: Google Drive Read-Only Preflight",
      controls: "Read-only scope, token storage, dry-run plan, rollback, and approval gates.",
      tone: "green",
      prompt: `Prepare a Google Drive read-only preflight.

Rules:
- Do not connect OAuth yet.
- Do not request write scopes.
- Do not create, upload, move, rename, delete, or edit Drive files.
- Confirm token storage outside repo, scope safety, no secrets committed, dry-run plan, rollback plan, and owner approval gates.
- Stop before OAuth or live connection.`
    },
    {
      id: "roadmap-review",
      title: "Codex Command - Live Integration Roadmap Review",
      actionName: "Generate Codex Command: Live Integration Roadmap Review",
      controls: "Safest integration order, risk, approval gates, rollback needs, and blocked items.",
      tone: "yellow",
      prompt: `Prepare a live integration roadmap review.

Rules:
- Do not connect live services.
- Do not perform live writes.
- Review the safest order for Google Drive, Google Sheets, Calendar, Tasks, Gmail, and RentRedi.
- Identify risks, approval gates, rollback needs, and blocked items.
- Stop before live actions.`
    }
  ],
  relatedLinks: [
    { title: "Supporting Worksheet: Real Data Cleanup", detail: "Open the worksheet that tracks sample values, proof gaps, conflicts, and import readiness.", href: "/real-data-cleanup", action: "Open Real Data Cleanup", tone: "yellow" },
    { title: "Supporting Plan: Live Readiness", detail: "Open the live-readiness page for source cleanup, proof folder planning, and Drive read-only recommendations.", href: "/live-readiness", action: "Open Live Readiness", tone: "green" }
  ],
  safetyFooter:
    "Operations Readiness is planning-only. No OAuth, Google Drive, Gmail, Calendar, Tasks, Sheets, RentRedi, tenant, legal, lender, vendor, bank, court, payment, import, or live record action is connected or performed."
};
