export const ownerApprovalSources = ["Gmail", "Google Voice", "RentRedi", "Photos", "Documents"] as const;
export const ownerApprovalCategories = [
  "Maintenance",
  "Rent",
  "Legal",
  "Utility",
  "Utilities",
  "Lease",
  "Insurance",
  "Mortgage",
  "Vendor",
  "Section 8",
  "Inspection",
  "Code Enforcement",
  "Other"
] as const;
export const ownerApprovalStatuses = ["Needs Review", "Approved", "Returned / Needs More Information", "Rejected", "Executed"] as const;
export const ownerApprovalPriorities = ["Low", "Medium", "High", "Critical"] as const;

export type OwnerApprovalSource = (typeof ownerApprovalSources)[number];
export type OwnerApprovalCategory = (typeof ownerApprovalCategories)[number];
export type OwnerApprovalStatus = (typeof ownerApprovalStatuses)[number];
export type OwnerApprovalPriority = (typeof ownerApprovalPriorities)[number];
export type OwnerApprovalDecision = "None" | "Approve" | "Return for Changes" | "Reject";
export type OwnerApprovalDataMode = "Sample" | "Live Metadata" | "Live Gmail Read" | "Drive Workaround" | "Blocked";

export type OwnerApprovalStatusHistoryEntry = {
  decision: OwnerApprovalDecision;
  status: OwnerApprovalStatus;
  instructions: string;
  timestamp: string;
  priorStatus: OwnerApprovalStatus;
};

export type OwnerApprovalDocument = {
  name: string;
  type: string;
  size: string;
};

export type OwnerApprovalRecord = {
  id: string;
  source: OwnerApprovalSource;
  category: OwnerApprovalCategory;
  propertyUnit: string;
  title: string;
  summary: string;
  receivedDate: string;
  receivedTime: string;
  priority: OwnerApprovalPriority;
  status: OwnerApprovalStatus;
  reviewSummary: string[];
  tenant: string;
  reported: string;
  property: string;
  documents: OwnerApprovalDocument[];
  draftResponse: string;
  recommendedAction: string;
  vendorSuggestion: string;
  eta: string;
  estimatedCost: number;
  costRange: string;
  costNote: string;
  deadlineLabel: string;
  deadline: string;
  tenantExpectation: string;
  daysOpen: number;
  ownerDecision: OwnerApprovalDecision;
  ownerInstructions: string;
  approvedAction: string;
  dashboardUpdatesRequired: string[];
  rejectionReason: string;
  sourceMode?: OwnerApprovalDataMode;
  connectorStatus?: string;
  statusHistory?: OwnerApprovalStatusHistoryEntry[];
  sourceMessageId?: string;
  sourceThreadId?: string;
  selectedExecutionActions?: string[];
  selectedTrackerTargets?: string[];
  selectedFolderTargets?: string[];
  selectedFilingProperty?: string;
  selectedFilingUnits?: string[];
  selectedFilingTenant?: string;
  selectedCalendarDate?: string;
  selectedCalendarTime?: string;
  selectedCalendarNote?: string;
  gmailDraftId?: string;
  gmailDraftUrl?: string;
};

export const defaultOwnerInstruction =
  "Schedule A & B Plumbing. Notify tenant of appointment. Keep me updated.";

export const ownerApprovalRecords: OwnerApprovalRecord[] = [
  {
    id: "#INT-2026-0054",
    source: "Gmail",
    category: "Maintenance",
    propertyUnit: "228 Reifert St - Unit 3",
    title: "Tenant reports leaking faucet in kitchen",
    summary: "Tenant reports leaking faucet in kitchen",
    receivedDate: "May 17, 2026",
    receivedTime: "9:12 AM",
    priority: "Medium",
    status: "Needs Review",
    reviewSummary: [
      "Tenant reports the kitchen faucet has been leaking for the past 3 days.",
      "Water drip is constant. Requesting repair as soon as possible."
    ],
    tenant: "Unit 3 Tenant",
    reported: "May 17, 2026 9:12 AM",
    property: "228 Reifert St - Unit 3",
    documents: [
      { name: "IMG_4821.jpg", type: "Image", size: "1.2 MB" },
      { name: "IMG_4822.jpg", type: "Image", size: "1.4 MB" }
    ],
    draftResponse:
      "Hi [Tenant Name],\n\nThank you for letting us know about the leaking faucet. We will have maintenance scheduled to inspect and repair this as soon as possible.\n\nWe will keep you updated.\n\nBest,\nProperty Management",
    recommendedAction: "Schedule plumber to inspect and repair the kitchen faucet.",
    vendorSuggestion: "A & B Plumbing",
    eta: "Within 2 business days",
    estimatedCost: 150,
    costRange: "$125 - $175",
    costNote: "Vendor Estimate Attached",
    deadlineLabel: "Desired Completion Date:",
    deadline: "May 20, 2026",
    tenantExpectation: "ASAP",
    daysOpen: 0,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Schedule plumber, notify tenant, update maintenance tracker, and mark task pending completion.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Maintenance tracker", "Calendar/task reminders", "Activity log"],
    rejectionReason: ""
  },
  {
    id: "#INT-2026-0053",
    source: "Google Voice",
    category: "Rent",
    propertyUnit: "228 Reifert St - Unit 1",
    title: "Greg McKinney - Payment arrangement update",
    summary: "Greg McKinney - Payment arrangement update",
    receivedDate: "May 17, 2026",
    receivedTime: "8:45 AM",
    priority: "High",
    status: "Needs Review",
    reviewSummary: ["Tenant sent a payment arrangement update by Google Voice.", "Ledger needs owner review before reminders or notices are changed."],
    tenant: "Greg McKinney",
    reported: "May 17, 2026 8:45 AM",
    property: "228 Reifert St - Unit 1",
    documents: [{ name: "voice-note-transcript.pdf", type: "Transcript", size: "612 KB" }],
    draftResponse: "Hi Greg,\n\nThank you for the update. We are reviewing the payment arrangement and will follow up after owner approval.\n\nProperty Management",
    recommendedAction: "Review ledger and confirm whether arrangement terms should be accepted.",
    vendorSuggestion: "Internal rent ledger review",
    eta: "Same business day",
    estimatedCost: 0,
    costRange: "$0",
    costNote: "No vendor estimate",
    deadlineLabel: "Owner Review Date:",
    deadline: "May 17, 2026",
    tenantExpectation: "Today",
    daysOpen: 0,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Update rent ledger and tenant follow-up status with approved payment arrangement instructions.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Rent ledger", "Calendar/task reminders", "Activity log"],
    rejectionReason: ""
  },
  {
    id: "#INT-2026-0052",
    source: "RentRedi",
    category: "Rent",
    propertyUnit: "228 Reifert St - Unit 2",
    title: "Payment received - Marc Gosselin",
    summary: "Payment received - Marc Gosselin",
    receivedDate: "May 17, 2026",
    receivedTime: "7:32 AM",
    priority: "Medium",
    status: "Needs Review",
    reviewSummary: ["RentRedi payment notification received.", "Owner approval is needed before ledger conflict and notice status are updated."],
    tenant: "Marc Gosselin",
    reported: "May 17, 2026 7:32 AM",
    property: "228 Reifert St - Unit 2",
    documents: [{ name: "rentredi-payment-receipt.pdf", type: "Receipt", size: "488 KB" }],
    draftResponse: "Hi Marc,\n\nThank you. We received a payment notification and are reconciling the ledger.\n\nProperty Management",
    recommendedAction: "Reconcile payment with ledger and update rent status after owner approval.",
    vendorSuggestion: "Internal ledger update",
    eta: "Within 1 business day",
    estimatedCost: 0,
    costRange: "$0",
    costNote: "No vendor estimate",
    deadlineLabel: "Ledger Update Date:",
    deadline: "May 18, 2026",
    tenantExpectation: "Next business day",
    daysOpen: 0,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Update rent ledger, dashboard, and notice status with reconciled payment information.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Rent ledger", "Activity log"],
    rejectionReason: ""
  },
  {
    id: "#INT-2026-0051",
    source: "Gmail",
    category: "Legal",
    propertyUnit: "228 Reifert St - Unit 4",
    title: "Section 8 RFTA Cancellation Notice",
    summary: "Section 8 RFTA Cancellation Notice",
    receivedDate: "May 16, 2026",
    receivedTime: "4:18 PM",
    priority: "High",
    status: "Needs Review",
    reviewSummary: ["Gmail notice references Section 8/RFTA status.", "Legal tracker should not change until owner reviews the cancellation notice."],
    tenant: "Kevin Royster",
    reported: "May 16, 2026 4:18 PM",
    property: "228 Reifert St - Unit 4",
    documents: [{ name: "rfta-cancellation-notice.pdf", type: "Notice", size: "834 KB" }],
    draftResponse: "",
    recommendedAction: "Review notice, update legal tracker, and keep any eviction action blocked until owner gives explicit approval.",
    vendorSuggestion: "Legal review",
    eta: "Owner dependent",
    estimatedCost: 0,
    costRange: "$0",
    costNote: "No vendor estimate",
    deadlineLabel: "Review Needed By:",
    deadline: "May 18, 2026",
    tenantExpectation: "N/A",
    daysOpen: 1,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Update legal tracker and dashboard with RFTA cancellation review status only.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Legal tracker", "Activity log"],
    rejectionReason: ""
  },
  {
    id: "#INT-2026-0050",
    source: "Gmail",
    category: "Utility",
    propertyUnit: "7-Unit Building",
    title: "Duquesne Light Bill - May 2026",
    summary: "Duquesne Light Bill - May 2026",
    receivedDate: "May 16, 2026",
    receivedTime: "2:11 PM",
    priority: "Medium",
    status: "Needs Review",
    reviewSummary: ["Utility bill arrived by Gmail.", "Utility tracker and calendar reminders need owner-approved status handling."],
    tenant: "Building account",
    reported: "May 16, 2026 2:11 PM",
    property: "7-Unit Building",
    documents: [{ name: "duquesne-light-may-2026.pdf", type: "Bill", size: "1.1 MB" }],
    draftResponse: "",
    recommendedAction: "Update utility tracker and add bill due reminder after owner approval.",
    vendorSuggestion: "Duquesne Light",
    eta: "Next utility sync",
    estimatedCost: 403,
    costRange: "$403",
    costNote: "Bill attached",
    deadlineLabel: "Due Date:",
    deadline: "May 28, 2026",
    tenantExpectation: "N/A",
    daysOpen: 1,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Update utility tracker, dashboard utility total, and bill reminder.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Utility tracker", "Calendar/task reminders", "Activity log"],
    rejectionReason: ""
  },
  {
    id: "#INT-2026-0049",
    source: "Photos",
    category: "Maintenance",
    propertyUnit: "228 Reifert St - Unit 6",
    title: "Heat control photo review",
    summary: "Heat control photo review",
    receivedDate: "May 15, 2026",
    receivedTime: "5:44 PM",
    priority: "High",
    status: "Needs Review",
    reviewSummary: ["Photo intake documents heat-control condition.", "Owner approval needed before maintenance status is changed."],
    tenant: "Unit 6 Tenant",
    reported: "May 15, 2026 5:44 PM",
    property: "228 Reifert St - Unit 6",
    documents: [{ name: "heat-control-photo.jpg", type: "Image", size: "2.1 MB" }],
    draftResponse: "",
    recommendedAction: "Assign maintenance review and keep item pending completion.",
    vendorSuggestion: "HVAC vendor TBD",
    eta: "Within 2 business days",
    estimatedCost: 175,
    costRange: "$125 - $225",
    costNote: "Estimate needed",
    deadlineLabel: "Desired Completion Date:",
    deadline: "May 19, 2026",
    tenantExpectation: "ASAP",
    daysOpen: 2,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Assign HVAC review and update maintenance tracker.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Maintenance tracker", "Calendar/task reminders", "Activity log"],
    rejectionReason: ""
  },
  {
    id: "#INT-2026-0048",
    source: "Documents",
    category: "Lease",
    propertyUnit: "228 Reifert St - Unit 2",
    title: "Lease condition note",
    summary: "Lease condition note",
    receivedDate: "May 15, 2026",
    receivedTime: "11:20 AM",
    priority: "Low",
    status: "Needs Review",
    reviewSummary: ["Lease condition note needs owner decision.", "No tenant message should be sent before owner approval."],
    tenant: "Unit 2 Tenant",
    reported: "May 15, 2026 11:20 AM",
    property: "228 Reifert St - Unit 2",
    documents: [{ name: "lease-condition-note.pdf", type: "Document", size: "384 KB" }],
    draftResponse: "Please review the attached lease condition item and confirm whether corrective action is needed.",
    recommendedAction: "Create lease tracker note or reject as no-action.",
    vendorSuggestion: "Internal review",
    eta: "Within 7 days",
    estimatedCost: 0,
    costRange: "$0",
    costNote: "No vendor estimate",
    deadlineLabel: "Review Needed By:",
    deadline: "May 22, 2026",
    tenantExpectation: "N/A",
    daysOpen: 2,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Create lease tracker note and draft tenant message for owner review.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Activity log"],
    rejectionReason: ""
  },
  {
    id: "#INT-2026-0047",
    source: "Documents",
    category: "Other",
    propertyUnit: "All Properties",
    title: "Weekly owner report draft",
    summary: "Weekly owner report draft",
    receivedDate: "May 15, 2026",
    receivedTime: "9:00 AM",
    priority: "Low",
    status: "Needs Review",
    reviewSummary: ["Weekly report draft is ready for owner approval.", "Execution should only copy approved summary instructions into Codex."],
    tenant: "Owner",
    reported: "May 15, 2026 9:00 AM",
    property: "All Properties",
    documents: [{ name: "weekly-owner-report-draft.docx", type: "Document", size: "92 KB" }],
    draftResponse: "",
    recommendedAction: "Approve report generation if the owner wants the dashboard summary bundled.",
    vendorSuggestion: "Internal reporting",
    eta: "Same day",
    estimatedCost: 0,
    costRange: "$0",
    costNote: "No vendor estimate",
    deadlineLabel: "Report Needed By:",
    deadline: "May 17, 2026",
    tenantExpectation: "N/A",
    daysOpen: 2,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Generate owner report draft and update activity log.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Activity log"],
    rejectionReason: ""
  }
];
