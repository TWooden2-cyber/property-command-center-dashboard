import { getWorkbookSnapshot } from "@/lib/googleSheets";
import { parseWorkbook } from "@/lib/sheetParsers";
import type { CalendarFollowUpRecord, CommandCenterData, KpiMetric, SystemStatus } from "@/types/sheets";

type QaTabStatus = {
  tab: string;
  sourceStatus: "Live Google Sheets" | "Not Enabled" | "Error";
  rowCount: number;
  cardCount: number;
  mappedFieldsCount: number;
  missingFields: string[];
  liveValueUnavailableCount: number;
  notMappedCount: number;
  zeroCurrencyCount: number;
  defaultZeroWarningCount: number;
  parserWarnings: string[];
};

type QaDashboardStatus = {
  ok: boolean;
  checkedAt: string;
  dataMode: "live";
  source: "Live Google Sheets" | "Google Sheets connection error";
  isLive: boolean;
  spreadsheetId: string | null;
  tabs: QaTabStatus[];
  errors: string[];
};

function countMatches(value: unknown, pattern: RegExp): number {
  return (JSON.stringify(value).match(pattern) || []).length;
}

function countMappedFields(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return value.trim() ? 1 : 0;
  if (typeof value === "number" || typeof value === "boolean") return 1;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + countMappedFields(item), 0);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + countMappedFields(item), 0);
  }
  return 0;
}

function zeroCurrencyCount(value: unknown): number {
  return countMatches(value, /\$0\.00/g);
}

function unavailableCount(value: unknown): number {
  return countMatches(value, /Live value unavailable/g);
}

function notMappedCount(value: unknown): number {
  return countMatches(value, /Not mapped/g);
}

function hasRows(value: unknown): value is { rows: unknown[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { rows?: unknown[] }).rows));
}

function rowCount(value: unknown): number {
  if (hasRows(value)) return value.rows.length;
  if (value && typeof value === "object" && "groups" in value) {
    const groups = (value as { groups?: Record<string, unknown[]> }).groups;
    return groups ? Object.values(groups).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0) : 0;
  }
  return 0;
}

function cardCount(value: unknown): number {
  if (value && typeof value === "object" && Array.isArray((value as { kpis?: unknown[] }).kpis)) {
    return (value as { kpis: unknown[] }).kpis.length;
  }
  if (value && typeof value === "object" && "dashboardBlocks" in value) {
    const blocks = (value as { dashboardBlocks?: Record<string, { rows?: unknown[] }> }).dashboardBlocks;
    return blocks ? Object.values(blocks).reduce((sum, block) => sum + (Array.isArray(block.rows) ? block.rows.length : 0), 0) : 0;
  }
  return 0;
}

function collectWarnings(system: SystemStatus | null, tabName: string): string[] {
  if (!system) return [];
  return system.liveSourceChecklist
    .filter((item) => item.tab === tabName && (!item.present || item.missingColumns.length > 0))
    .map((item) => {
      if (!item.present) return `Missing source tab: ${item.tab}`;
      return `Missing source columns: ${item.missingColumns.join(", ")}`;
    });
}

function mappedTab(tab: string, sourceTab: string, payload: unknown, system: SystemStatus | null): QaTabStatus {
  const zeros = zeroCurrencyCount(payload);
  return {
    tab,
    sourceStatus: system?.connectionOk ? "Live Google Sheets" : "Error",
    rowCount: rowCount(payload),
    cardCount: cardCount(payload),
    mappedFieldsCount: countMappedFields(payload),
    missingFields: collectWarnings(system, sourceTab),
    liveValueUnavailableCount: unavailableCount(payload),
    notMappedCount: notMappedCount(payload),
    zeroCurrencyCount: zeros,
    defaultZeroWarningCount: 0,
    parserWarnings: zeros > 0 ? ["$0.00 appears in mapped output; verify it is explicit in the live sheet, not a parser default."] : []
  };
}

function notEnabledTab(tab: string, reason: string): QaTabStatus {
  return {
    tab,
    sourceStatus: "Not Enabled",
    rowCount: 0,
    cardCount: 1,
    mappedFieldsCount: 0,
    missingFields: [reason],
    liveValueUnavailableCount: 0,
    notMappedCount: 1,
    zeroCurrencyCount: 0,
    defaultZeroWarningCount: 0,
    parserWarnings: [reason]
  };
}

function groupedFollowUps(groups: Record<CalendarFollowUpRecord["group"], CalendarFollowUpRecord[]>): { groups: Record<string, unknown[]> } {
  return { groups };
}

function systemFromSnapshot(snapshot: Awaited<ReturnType<typeof getWorkbookSnapshot>>): SystemStatus {
  return {
    ...snapshot.system,
    auth: {
      authenticated: false,
      approved: false,
      method: "owner-password",
      accessControlEnabled: true
    },
    liveOperations: {
      liveOperationsEnabled: false,
      dryRunRequired: true,
      ownerApprovalRequired: true,
      auditLoggingEnabled: false,
      auditTab: "Live Operations Audit",
      services: {
        sheets: { key: "sheets", label: "Google Sheets", enabled: true, blocked: false, missing: [], allowedActions: ["read"], forbiddenActions: ["write"] },
        gmail: { key: "gmail", label: "Gmail", enabled: false, blocked: true, missing: [], allowedActions: [], forbiddenActions: ["read bodies", "send"] },
        calendar: { key: "calendar", label: "Google Calendar", enabled: false, blocked: true, missing: [], allowedActions: [], forbiddenActions: ["create", "update", "delete"] },
        tasks: { key: "tasks", label: "Google Tasks", enabled: false, blocked: true, missing: [], allowedActions: [], forbiddenActions: ["create", "update", "delete"] },
        drive: { key: "drive", label: "Google Drive", enabled: false, blocked: true, missing: [], allowedActions: [], forbiddenActions: ["move", "delete", "rename"] }
      }
    }
  };
}

export async function buildQaDashboardStatus(): Promise<QaDashboardStatus> {
  const snapshot = await getWorkbookSnapshot();
  const parsed: CommandCenterData = parseWorkbook(snapshot);
  const system = systemFromSnapshot(snapshot);
  const source = system.connectionOk && system.source === "google-sheets-readonly" ? "Live Google Sheets" : "Google Sheets connection error";

  return {
    ok: system.connectionOk && source === "Live Google Sheets",
    checkedAt: new Date().toISOString(),
    dataMode: "live",
    source,
    isLive: system.connectionOk && system.source === "google-sheets-readonly",
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID || null,
    errors: system.setupErrors,
    tabs: [
      mappedTab("Overview", "Overview", { kpis: parsed.overview.kpis, dashboardBlocks: parsed.dashboardBlocks }, system),
      mappedTab("Rent Collection", "Rent Collection", { rows: parsed.rentCollection }, system),
      mappedTab("Mortgage / Arrears", "Mortgage and Arrears", { rows: parsed.mortgageArrears }, system),
      mappedTab("Maintenance", "Maintenance", { rows: parsed.maintenance, dashboardBlock: parsed.dashboardBlocks.maintenance }, system),
      mappedTab("Utilities", "Utilities", { rows: parsed.utilities }, system),
      mappedTab("Notices & Evictions", "Notices and Legal Holds", { rows: parsed.noticesEvictions }, system),
      mappedTab("Admin Tasks", "Owner Approvals", { rows: parsed.adminTasks }, system),
      mappedTab("Calendar & Follow-Ups", "Overview", groupedFollowUps(parsed.calendarFollowUps), system),
      notEnabledTab("Lease Violations", "Lease Violations live parser is not enabled; production shows a no-sample-data message."),
      notEnabledTab("Draft Status", "Draft Status live parser is not enabled; production shows a no-sample-data message."),
      notEnabledTab("Expenses / NOI", "Expenses / NOI live parser is not enabled; production shows a live parser not enabled message."),
      notEnabledTab("Live Operations", "Live Operations production write/workflow integration is not enabled; production shows no mock operation data.")
    ]
  };
}

export type { QaDashboardStatus, QaTabStatus };
