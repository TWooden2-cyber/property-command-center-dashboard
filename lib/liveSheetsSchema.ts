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
    tab: "Dashboard",
    columns: ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date"]
  },
  {
    tab: "Overview",
    columns: ["Metric", "Value", "Source", "Status / Notes"]
  },
  {
    tab: "Rent Collection",
    columns: ["Property", "Unit", "Tenant Name", "Rent Due", "Amount Paid", "Balance", "Due Date", "Status", "Notes"]
  },
  {
    tab: "Maintenance",
    columns: ["Date Reported", "Property", "Unit", "Issue", "Priority", "Status", "Assigned Vendor", "Actual Cost", "Notes"]
  },
  {
    tab: "Mortgage & Allotments",
    columns: ["Property", "Mortgage Due Monthly", "Payment Source", "Allotment Status", "Current Arrears", "Payoff Plan", "Due Date", "Notes"]
  },
  {
    tab: "Arrears Payoff Tracker",
    columns: ["Date", "Property", "Starting Arrears", "Payment Made", "Remaining Balance", "Payment Source", "Status", "Notes"]
  },
  {
    tab: "Notices & Evictions",
    columns: ["Date Started", "Property", "Unit", "Tenant", "Notice Type", "Amount Owed", "Notice Date", "Proof Saved", "Court/Filing Status", "Case Stage", "Next Owner Action"]
  },
  {
    tab: "Utilities",
    columns: ["Month", "Property", "Utility Type", "Provider", "Total Cost", "Due Date", "Payment Status", "Review Status"]
  },
  {
    tab: "Lease Violations",
    columns: ["Date", "Property", "Unit", "Tenant", "Violation Type", "Description", "Status", "Notes"]
  },
  {
    tab: "Admin Task Log",
    columns: ["Date Created", "Task Area", "Property", "Unit", "Task", "Priority", "Owner", "Due Date", "Status", "Notes"]
  },
  {
    tab: "Calendar & Follow-Ups",
    columns: ["Follow-Up Date", "Property", "Unit", "Follow-Up Type", "Reason", "Status", "Next Follow-Up", "Notes"]
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
    columns: ["Approval ID", "Property/unit", "Item name", "Trigger/issue summary", "Approval level", "Required proof", "Current status", "Owner decision needed", "Next action"]
  },
  {
    tab: "Expense Import Summary",
    columns: ["Source File", "Export Date", "Property", "Month", "Management Fees", "Cleaning and Maintenance", "Repairs", "Utilities", "Total Imported Expenses", "Notes"]
  },
  {
    tab: "4-Unit Expense Database",
    columns: ["Date", "Month", "Property", "Unit", "Vendor / Payee", "Category", "Description", "Amount", "Database Status", "Notes"]
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
