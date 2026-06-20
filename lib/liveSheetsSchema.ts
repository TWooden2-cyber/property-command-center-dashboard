import { normalizeKey } from "@/lib/formatters";
import type { LiveSourceTabStatus, RawSheetRow } from "@/types/sheets";

export type LiveSheetRead = {
  tab: string;
  ok: boolean;
  empty: boolean;
  headers: string[];
  rows: RawSheetRow[];
  warning?: string;
  error?: string;
};

export const LIVE_SHEET_SCHEMA = [
  {
    tab: "Overview",
    columns: ["propertyName", "unit", "status", "rentAmount", "rentStatus", "maintenanceStatus", "openIssues", "ownerDecisionRequired", "nextFollowUpDate"]
  },
  {
    tab: "Rent Collection",
    columns: ["property", "unit", "tenantLabel", "rentAmount", "dueDate", "paidDate", "balance", "status", "followUpNeeded", "notes"]
  },
  {
    tab: "Maintenance",
    columns: ["workOrderId", "property", "unit", "issue", "priority", "status", "vendor", "dateOpened", "dateCompleted", "proofRequired", "proofReceived", "nextFollowUpDate"]
  },
  {
    tab: "Mortgage and Arrears",
    columns: ["property", "lender", "monthlyPayment", "dueDate", "paymentStatus", "arrearsBalance", "allotmentStatus", "nextAction", "nextFollowUpDate"]
  },
  {
    tab: "Notices and Legal Holds",
    columns: ["property", "unit", "noticeType", "status", "draftDate", "sentDate", "proofStatus", "ownerApprovalRequired", "nextAction"]
  },
  {
    tab: "Utilities",
    columns: ["property", "utilityType", "provider", "accountLabel", "dueDate", "amountDue", "status", "shutoffRisk", "nextAction"]
  },
  {
    tab: "Lease Violations",
    columns: ["property", "unit", "violationType", "dateReported", "status", "proofStatus", "tenantResponse", "nextAction"]
  },
  {
    tab: "Tenant Communications",
    columns: ["property", "unit", "messageType", "date", "status", "followUpNeeded", "notes"]
  },
  {
    tab: "Vendor Communications",
    columns: ["vendor", "serviceType", "property", "unit", "jobStatus", "invoiceStatus", "proofStatus", "nextFollowUpDate"]
  },
  {
    tab: "Weekly Command Reviews",
    columns: ["reviewDate", "openItems", "closedItems", "ownerDecisions", "highRiskItems", "nextWeekFocus"]
  },
  {
    tab: "Proof Archive",
    columns: ["property", "unit", "proofType", "relatedItem", "driveFolder", "proofStatus", "notes"]
  },
  {
    tab: "Source Data Exports",
    columns: ["source", "exportDate", "fileName", "reviewed", "imported", "notes"]
  },
  {
    tab: "Owner Approvals",
    columns: ["approvalId", "category", "item", "status", "requestedDate", "approvedDate", "notes"]
  }
] as const;

export type LiveSheetTabName = (typeof LIVE_SHEET_SCHEMA)[number]["tab"];

export function liveSheetTabNames(): string[] {
  return LIVE_SHEET_SCHEMA.map((sheet) => sheet.tab);
}

export function buildLiveSourceChecklist(tabs: Record<string, LiveSheetRead | undefined>): LiveSourceTabStatus[] {
  return LIVE_SHEET_SCHEMA.map((schema) => {
    const tab = tabs[schema.tab];
    const presentColumns = tab?.headers ?? [];
    const presentKeys = new Set(presentColumns.map((column) => normalizeKey(column)));
    const missingColumns = schema.columns.filter((column) => !presentKeys.has(normalizeKey(column)));

    return {
      tab: schema.tab,
      present: Boolean(tab?.ok),
      rowCount: tab?.rows.length ?? 0,
      requiredColumns: [...schema.columns],
      presentColumns,
      missingColumns
    };
  });
}

export function liveSourceWarnings(checklist: LiveSourceTabStatus[]): string[] {
  return checklist.flatMap((status) => {
    if (!status.present) {
      return [`${status.tab}: required live worksheet tab is missing.`];
    }

    if (status.missingColumns.length > 0) {
      return [`${status.tab}: missing required columns ${status.missingColumns.join(", ")}. Missing fields are left blank or marked unavailable.`];
    }

    return [];
  });
}
