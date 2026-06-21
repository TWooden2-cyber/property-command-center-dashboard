import { getWorkbookSnapshot } from "@/lib/googleSheets";
import { getGoogleProductsStatus } from "@/lib/googleProductStatus";
import { parseWorkbook } from "@/lib/sheetParsers";
import type { GoogleProductStatus } from "@/types/googleProducts";
import type { CalendarFollowUpRecord, CommandCenterData, KpiMetric, SystemStatus } from "@/types/sheets";

type QaTabStatus = {
  tab: string;
  sourceStatus: "Live Google Sheets" | "Live Read-Only Google Products" | "Not Enabled" | "Error";
  actualHeaders: string[];
  expectedHeaders: string[];
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

function sourceStatus(system: SystemStatus | null, tabName: string) {
  return system?.liveSourceChecklist.find((item) => item.tab === tabName);
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

function hasLiveRefresh(system: SystemStatus | null): boolean {
  return Boolean(system?.lastSuccessfulRefresh && system.source === "google-sheets-readonly");
}

function mappedTab(tab: string, sourceTab: string, payload: unknown, system: SystemStatus | null): QaTabStatus {
  const zeros = zeroCurrencyCount(payload);
  const source = sourceStatus(system, sourceTab);
  return {
    tab,
    sourceStatus: hasLiveRefresh(system) ? "Live Google Sheets" : "Error",
    actualHeaders: source?.presentColumns ?? [],
    expectedHeaders: source?.requiredColumns ?? [],
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
    actualHeaders: [],
    expectedHeaders: [],
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

function buildDraftStatusRows(parsed: CommandCenterData) {
  const includesDraftText = (...values: string[]) => {
    const text = values.join(" ").toLowerCase();
    return ["draft", "packet", "notice", "email", "document", "form", "filing"].some((term) => text.includes(term));
  };

  return [
    ...parsed.adminTasks
      .filter((task) => includesDraftText(task.task, task.notes, task.status, task.emailNeeded, task.driveLink))
      .map((task) => ({
        source: "Admin Task Log",
        property: task.property,
        unit: task.unit,
        item: task.task,
        status: task.status,
        nextAction: task.notes || task.emailNeeded || "Owner review required"
      })),
    ...parsed.noticesEvictions
      .filter((notice) => includesDraftText(notice.noticeType, notice.courtFilingStatus, notice.notes, notice.nextOwnerAction, notice.mailingNotes))
      .map((notice) => ({
        source: "Notices & Evictions",
        property: notice.property,
        unit: notice.unit,
        item: `${notice.tenant} - ${notice.noticeType}`,
        status: notice.courtFilingStatus || notice.caseStage,
        nextAction: notice.nextOwnerAction || notice.notes || "Owner review required"
      }))
  ];
}

function liveOperationsTab(products: GoogleProductStatus[]): QaTabStatus {
  const payload = { rows: products };
  const unavailable = products.filter((product) => !product.connected && product.status !== "not_enabled").map((product) => product.product);

  return {
    tab: "Live Operations",
    sourceStatus: "Live Read-Only Google Products",
    actualHeaders: ["product", "status", "connected", "configured", "mode", "missingEnvVars"],
    expectedHeaders: ["product", "status", "connected", "configured", "mode", "missingEnvVars"],
    rowCount: products.length,
    cardCount: products.length,
    mappedFieldsCount: countMappedFields(payload),
    missingFields: unavailable,
    liveValueUnavailableCount: unavailableCount(payload),
    notMappedCount: notMappedCount(payload),
    zeroCurrencyCount: zeroCurrencyCount(payload),
    defaultZeroWarningCount: 0,
    parserWarnings: unavailable.length > 0 ? unavailable.map((product) => `${product}: read-only integration is not live.`) : []
  };
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
  const products = await getGoogleProductsStatus();
  const isLive = hasLiveRefresh(system);
  const source = isLive ? "Live Google Sheets" : "Google Sheets connection error";

  return {
    ok: isLive,
    checkedAt: new Date().toISOString(),
    dataMode: "live",
    source,
    isLive,
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID || null,
    errors: system.setupErrors,
    tabs: [
      mappedTab("Overview", "Overview", { kpis: parsed.overview.kpis, dashboardBlocks: parsed.dashboardBlocks }, system),
      mappedTab("Rent Collection", "Rent Collection", { rows: parsed.rentCollection }, system),
      mappedTab("Mortgage / Arrears", "Mortgage & Allotments", { rows: parsed.mortgageArrears }, system),
      mappedTab("Maintenance", "Maintenance", { rows: parsed.maintenance, dashboardBlock: parsed.dashboardBlocks.maintenance }, system),
      mappedTab("Utilities", "Utilities", { rows: parsed.utilities }, system),
      mappedTab("Notices & Evictions", "Notices & Evictions", { rows: parsed.noticesEvictions }, system),
      mappedTab("Admin Tasks", "Admin Task Log", { rows: parsed.adminTasks }, system),
      mappedTab("Calendar & Follow-Ups", "Calendar & Follow-Ups", groupedFollowUps(parsed.calendarFollowUps), system),
      mappedTab("Lease Violations", "Lease Violations", { rows: snapshot.tabs["Lease Violations"]?.rows ?? [] }, system),
      mappedTab("Draft Status", "Admin Task Log", { rows: buildDraftStatusRows(parsed) }, system),
      mappedTab("Expenses / NOI", "Expense Import Summary", { rows: snapshot.tabs["Expense Import Summary"]?.rows ?? [] }, system),
      liveOperationsTab(products)
    ]
  };
}

export type { QaDashboardStatus, QaTabStatus };
