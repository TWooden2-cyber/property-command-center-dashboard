import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const sourcePath = path.join(root, "lib", "ownerApprovalExecution.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true
  }
}).outputText;

const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports, require }, { filename: sourcePath });

const {
  buildOwnerApprovalExecutionPayloads,
  portalErrorPayload
} = module.exports;

function approvedRecord(overrides = {}) {
  return {
    id: "#GMAIL-19f6388fa158d152",
    source: "Gmail",
    category: "Rent",
    propertyUnit: "228 Reifert St - Unit 2",
    title: "Rent payment email",
    summary: "Rent payment email",
    receivedDate: "Jul 15, 2026",
    receivedTime: "1:04 AM",
    priority: "Medium",
    status: "Approved",
    reviewSummary: [],
    tenant: "",
    reported: "",
    property: "228 Reifert St",
    documents: [],
    draftResponse: "Hi [Name],\n\nWe received your message and are reviewing the ledger before confirming any next steps.\n\nProperty Management",
    recommendedAction: "Review ledger/payment proof before any reminder, notice, or tracker status change.",
    vendorSuggestion: "",
    eta: "",
    estimatedCost: 10.65,
    costRange: "$10.65",
    costNote: "",
    deadlineLabel: "",
    deadline: "Jul 15, 2026",
    tenantExpectation: "",
    daysOpen: 0,
    ownerDecision: "Approve",
    ownerInstructions: "",
    approvedAction: "Read-only Gmail intake item created. Owner approval is required before any reply, draft, label, archive, tracker update, legal, financial, Drive, Calendar, or Task action.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Activity log"],
    rejectionReason: "",
    selectedExecutionActions: ["tracker-update"],
    selectedTrackerTargets: ["Rent Tracker"],
    statusHistory: [{
      decision: "Approve",
      status: "Approved",
      instructions: "",
      timestamp: "2026-07-15T05:04:14.278Z",
      priorStatus: "Needs Review"
    }],
    ...overrides
  };
}

const valid = buildOwnerApprovalExecutionPayloads(approvedRecord())[0];

assert.equal(valid.sourceItemId, "#GMAIL-19f6388fa158d152", "source item ID is preserved");
assert.equal(valid.selectedAction, "update_tracker", "button selection is saved as selectedAction");
assert.equal(valid.selectedDestination, "rent_tracker", "tracker destination is saved");
assert.equal(valid.executionAuthorized, true, "approval payload authorizes execution");
assert.equal(JSON.stringify(valid.approvedWriteSurfaces), JSON.stringify(["rent_tracker", "rent_ledger", "dashboard", "activity_log", "owner_approval_queue"]), "rent tracker surfaces are populated");
assert.equal(valid.proofNotes, "", "proof notes are optional");
assert.equal(valid.validationStatus, "valid", "read-only placeholder is overridden only for the selected approved action");

assert.ok(!valid.approvedWriteSurfaces.includes("gmail"), "unselected email sending remains blocked");
assert.ok(!valid.approvedWriteSurfaces.includes("google_drive"), "unselected Drive writes remain blocked");
assert.ok(!valid.approvedWriteSurfaces.includes("calendar_task_reminders"), "unselected calendar writes remain blocked");

const missingDestination = buildOwnerApprovalExecutionPayloads(approvedRecord({ selectedTrackerTargets: [] }))[0];
assert.equal(missingDestination.executionAuthorized, false, "missing destination blocks execution");
assert.equal(missingDestination.expectedResultLanguage, "Blocked", "missing destination returns Blocked result language");
assert.match(missingDestination.validationMessage, /Update Tracker requires a tracker destination/, "missing destination has clear validation error");

const portalError = portalErrorPayload("#GMAIL-19f6388fa158d152");
assert.equal(portalError.expectedResultLanguage, "Portal Error", "missing UI action payload returns Portal Error language");
assert.equal(portalError.validationMessage, "Portal error: the selected owner action was not included in the execution payload.", "portal error message does not blame owner instructions");

const maintenance = buildOwnerApprovalExecutionPayloads(approvedRecord({
  category: "Maintenance",
  selectedTrackerTargets: ["Maintenance Tracker"]
}))[0];
assert.equal(JSON.stringify(maintenance.approvedWriteSurfaces), JSON.stringify(["maintenance_tracker", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"]), "maintenance tracker related surfaces are populated");

console.log("Owner approval execution payload tests passed.");
