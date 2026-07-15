import type { OwnerApprovalRecord } from "@/lib/ownerApprovals";

export type OwnerApprovalUiAction =
  | "draft-email"
  | "send-response"
  | "calendar-reminder"
  | "create-task"
  | "tracker-update"
  | "file-document"
  | "draft-violation-notice"
  | "draft-10-day-notice"
  | "draft-lease"
  | "schedule-vendor"
  | "notify-tenant"
  | "prepare-document"
  | "mark-complete";

export type OwnerApprovalExecutionAction =
  | "draft_response"
  | "send_response"
  | "create_calendar_event"
  | "create_task"
  | "update_tracker"
  | "save_attachment_or_move_document"
  | "draft_violation_notice"
  | "draft_10_day_notice"
  | "draft_lease"
  | "schedule_vendor"
  | "notify_tenant"
  | "prepare_document"
  | "mark_complete";

export type OwnerApprovalExecutionResult = "Executed" | "Partially Executed" | "Blocked" | "Portal Error" | "Proposed Only";

export type OwnerApprovalExecutionPayload = {
  sourceItemId: string;
  ownerDecision: "approved" | "returned" | "rejected" | "none";
  selectedAction: OwnerApprovalExecutionAction;
  selectedDestination: string;
  executionAuthorized: boolean;
  proofNotes: string;
  approvedWriteSurfaces: string[];
  approvalTimestamp: string;
  ownerId: string;
  validationStatus: "valid" | "blocked" | "portal_error";
  validationMessage: string;
  expectedResultLanguage: OwnerApprovalExecutionResult;
};

const actionMap: Record<OwnerApprovalUiAction, OwnerApprovalExecutionAction> = {
  "draft-email": "draft_response",
  "send-response": "send_response",
  "calendar-reminder": "create_calendar_event",
  "create-task": "create_task",
  "tracker-update": "update_tracker",
  "file-document": "save_attachment_or_move_document",
  "draft-violation-notice": "draft_violation_notice",
  "draft-10-day-notice": "draft_10_day_notice",
  "draft-lease": "draft_lease",
  "schedule-vendor": "schedule_vendor",
  "notify-tenant": "notify_tenant",
  "prepare-document": "prepare_document",
  "mark-complete": "mark_complete"
};

const trackerDestinationMap: Record<string, string> = {
  "Dashboard / Activity Log": "dashboard_activity_log",
  "Rent Tracker": "rent_tracker",
  "Rent Ledger": "rent_tracker",
  "Maintenance Tracker": "maintenance_tracker",
  "Legal Tracker": "legal_tracker",
  "Lease Tracker": "lease_tracker",
  "Expense Tracker": "expense_tracker",
  "NOI Tracker": "noi_tracker",
  "Insurance Tracker": "insurance_tracker",
  "Mortgage Tracker": "mortgage_tracker",
  "Utility Tracker": "utility_tracker",
  "Calendar Follow-Ups": "calendar_follow_ups",
  "Tenant Communications": "tenant_communications"
};

const folderDestinationMap: Record<string, string> = {
  "Tenant Folder": "tenant_folder",
  "Lease Folder": "lease_folder",
  "Maintenance Folder": "maintenance_folder",
  "Legal / Evictions Folder": "legal_evictions_folder",
  "Utilities Folder": "utilities_folder",
  "Insurance Folder": "insurance_folder",
  "Rent / Ledger Folder": "rent_ledger_folder",
  "Owner Approval Folder": "owner_approval_folder"
};

const draftDestinationMap: Record<string, string> = {
  "Tenant Response": "tenant_response",
  "Vendor Response": "vendor_response",
  "Payment Agreement": "payment_agreement",
  Lease: "lease",
  "Violation Notice": "violation_notice",
  "10-Day Notice": "10_day_notice"
};

const trackerWriteSurfaces: Record<string, string[]> = {
  rent_tracker: ["rent_tracker", "rent_ledger", "dashboard", "activity_log", "owner_approval_queue"],
  maintenance_tracker: ["maintenance_tracker", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"],
  legal_tracker: ["legal_tracker", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"],
  lease_tracker: ["lease_tracker", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"],
  expense_tracker: ["expense_tracker", "dashboard", "activity_log", "owner_approval_queue", "noi_tracker"],
  noi_tracker: ["noi_tracker", "dashboard", "activity_log", "owner_approval_queue"],
  insurance_tracker: ["insurance_tracker", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"],
  mortgage_tracker: ["mortgage_tracker", "dashboard", "activity_log", "owner_approval_queue"],
  utility_tracker: ["utility_tracker", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"],
  tenant_communications: ["tenant_communications", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"],
  dashboard_activity_log: ["dashboard", "activity_log", "owner_approval_queue"],
  calendar_follow_ups: ["calendar_task_reminders", "dashboard", "activity_log", "owner_approval_queue"]
};

export function normalizeOwnerApprovalAction(action: string): OwnerApprovalExecutionAction {
  return actionMap[action as OwnerApprovalUiAction] || (action.replace(/-/g, "_") as OwnerApprovalExecutionAction);
}

export function normalizeOwnerApprovalDestination(destination: string) {
  return trackerDestinationMap[destination] || folderDestinationMap[destination] || draftDestinationMap[destination] || destination.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function actionRequiresDestination(action: OwnerApprovalExecutionAction) {
  return action === "update_tracker" || action === "save_attachment_or_move_document" || action === "draft_response" || action === "prepare_document";
}

export function approvedWriteSurfacesFor(action: OwnerApprovalExecutionAction, destination: string) {
  if (action === "update_tracker") {
    return trackerWriteSurfaces[destination] || ["dashboard", "activity_log", "owner_approval_queue"];
  }
  if (action === "draft_response") return ["gmail_drafts", "owner_approval_queue", "activity_log", "communication_log"];
  if (action === "send_response" || action === "notify_tenant") return ["gmail", "communication_log", "activity_log", "owner_approval_queue"];
  if (action === "create_calendar_event") return ["calendar_task_reminders", "dashboard", "activity_log", "owner_approval_queue"];
  if (action === "create_task") return ["task_tracker", "dashboard", "activity_log", "owner_approval_queue"];
  if (action === "save_attachment_or_move_document") return ["google_drive", "document_index", "activity_log", "owner_approval_queue"];
  if (action === "draft_violation_notice" || action === "draft_10_day_notice" || action === "draft_lease" || action === "prepare_document") {
    return ["owner_approval_queue", "document_drafts", "activity_log"];
  }
  if (action === "schedule_vendor") return ["maintenance_tracker", "calendar_task_reminders", "communication_log", "activity_log", "owner_approval_queue"];
  if (action === "mark_complete") return ["selected_tracker", "dashboard", "activity_log", "owner_approval_queue", "property_timeline"];
  return ["dashboard", "activity_log", "owner_approval_queue"];
}

function ownerDecisionValue(record: OwnerApprovalRecord): OwnerApprovalExecutionPayload["ownerDecision"] {
  if (record.ownerDecision === "Approve" || record.status === "Approved") return "approved";
  if (record.ownerDecision === "Return for Changes") return "returned";
  if (record.ownerDecision === "Reject") return "rejected";
  return "none";
}

export function approvalTimestamp(record: OwnerApprovalRecord) {
  const approved = [...(record.statusHistory || [])].reverse().find((entry) => entry.status === "Approved" || entry.decision === "Approve");
  return approved?.timestamp || "";
}

function destinationsFor(record: OwnerApprovalRecord, action: OwnerApprovalExecutionAction) {
  if (action === "update_tracker") return (record.selectedTrackerTargets || []).map(normalizeOwnerApprovalDestination);
  if (action === "save_attachment_or_move_document") return (record.selectedFolderTargets || []).map(normalizeOwnerApprovalDestination);
  if (action === "draft_response" || action === "prepare_document") return (record.selectedDraftTargets || []).map(normalizeOwnerApprovalDestination);
  return [""];
}

export function buildOwnerApprovalExecutionPayloads(
  record: OwnerApprovalRecord,
  actionFilter?: OwnerApprovalUiAction | OwnerApprovalUiAction[],
  ownerId = ""
): OwnerApprovalExecutionPayload[] {
  const selectedUiActions = actionFilter
    ? (Array.isArray(actionFilter) ? actionFilter : [actionFilter])
    : ((record.selectedExecutionActions || []) as OwnerApprovalUiAction[]);

  if (!selectedUiActions.length) return [];

  return selectedUiActions.flatMap((uiAction) => {
    const selectedAction = normalizeOwnerApprovalAction(uiAction);
    const destinations = destinationsFor(record, selectedAction);
    const resolvedDestinations = destinations.length ? destinations : [""];

    return resolvedDestinations.map((selectedDestination) => {
      const approved = ownerDecisionValue(record) === "approved";
      const destinationMissing = actionRequiresDestination(selectedAction) && !selectedDestination;
      const executionAuthorized = approved && !destinationMissing;
      const validationStatus = destinationMissing ? "blocked" : executionAuthorized ? "valid" : "blocked";
      const validationMessage = destinationMissing
        ? selectedAction === "update_tracker"
          ? "Missing selectedDestination. Update Tracker requires a tracker destination."
          : "Missing selectedDestination for the selected action."
        : executionAuthorized
          ? "Execution authorized by owner-selected button and destination."
          : "Execution is blocked until the item is approved.";

      return {
        sourceItemId: record.id,
        ownerDecision: ownerDecisionValue(record),
        selectedAction,
        selectedDestination,
        executionAuthorized,
        proofNotes: record.ownerInstructions || "",
        approvedWriteSurfaces: executionAuthorized ? approvedWriteSurfacesFor(selectedAction, selectedDestination) : [],
        approvalTimestamp: approvalTimestamp(record),
        ownerId,
        validationStatus,
        validationMessage,
        expectedResultLanguage: validationStatus === "valid" ? "Executed" : "Blocked"
      };
    });
  });
}

export function portalErrorPayload(sourceItemId: string): OwnerApprovalExecutionPayload {
  return {
    sourceItemId,
    ownerDecision: "none",
    selectedAction: "update_tracker",
    selectedDestination: "",
    executionAuthorized: false,
    proofNotes: "",
    approvedWriteSurfaces: [],
    approvalTimestamp: "",
    ownerId: "",
    validationStatus: "portal_error",
    validationMessage: "Portal error: the selected owner action was not included in the execution payload.",
    expectedResultLanguage: "Portal Error"
  };
}
