import { google } from "googleapis";
import {
  SOURCE_TABS,
  type DashboardRangeKey,
  type DashboardRawBlock,
  type DashboardDataMode,
  type EnvStatus,
  type LiveDiagnostics,
  type LiveSourceTabStatus,
  type RawSheetTab,
  type RawSheetRow,
  type SourceTabName,
  type WorkbookSnapshot
} from "@/types/sheets";
import { getAuthSetupStatus } from "@/lib/authConfig";
import { toNumber } from "@/lib/formatters";
import { buildLiveSourceChecklist, LIVE_SHEET_SCHEMA, liveSourceWarnings, type LiveSheetRead } from "@/lib/liveSheetsSchema";
import { LIVE_OPERATIONS_AUDIT_HEADERS, LIVE_OPERATIONS_AUDIT_TAB } from "@/lib/liveOperationsAudit";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SHEETS_WRITE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const EXPECTED_GOOGLE_SHEET_ID = "14nzzWCKIi0h-zHkCzW0JXmN-NQNcAWZahLpDy3CXK0c";
export const EXPECTED_SERVICE_ACCOUNT_EMAIL = "property-dashboard-reader@property-management-owner-com.iam.gserviceaccount.com";
const LIVE_SHEETS_ENV_KEYS = {
  spreadsheetId: {
    primary: "GOOGLE_SHEETS_SPREADSHEET_ID",
    legacy: "GOOGLE_SHEET_ID"
  },
  clientEmail: {
    primary: "GOOGLE_SHEETS_CLIENT_EMAIL",
    legacy: "GOOGLE_SERVICE_ACCOUNT_EMAIL"
  },
  privateKey: {
    primary: "GOOGLE_SHEETS_PRIVATE_KEY",
    legacy: "GOOGLE_PRIVATE_KEY"
  }
} as const;

function hasEnv(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export function isLocalSampleModeAllowed(): boolean {
  return !isProductionRuntime() && process.env.DASHBOARD_DATA_MODE?.trim().toLowerCase() === "sample";
}

export function getDashboardDataMode(): DashboardDataMode {
  const explicitMode = process.env.DASHBOARD_DATA_MODE?.trim().toLowerCase();

  if (isProductionRuntime()) {
    return "live";
  }

  if (explicitMode === "live") return "live";
  if (explicitMode === "sample") return "sample";

  const hasSheetsReadEnv = [
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID,
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY
  ].every((value) => Boolean(value?.trim()));

  return hasSheetsReadEnv ? "live" : "sample";
}

function cleanEnvValue(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function resolveEnvValue(primary: string, alias: string) {
  const primaryValue = cleanEnvValue(process.env[primary]);
  const aliasValue = cleanEnvValue(process.env[alias]);

  return {
    value: primaryValue || aliasValue,
    detected: Boolean(primaryValue || aliasValue),
    usingAlias: !primaryValue && Boolean(aliasValue)
  };
}

export function getLiveSheetsEnv() {
  return {
    spreadsheetId: resolveEnvValue(LIVE_SHEETS_ENV_KEYS.spreadsheetId.primary, LIVE_SHEETS_ENV_KEYS.spreadsheetId.legacy),
    clientEmail: resolveEnvValue(LIVE_SHEETS_ENV_KEYS.clientEmail.primary, LIVE_SHEETS_ENV_KEYS.clientEmail.legacy),
    privateKey: resolveEnvValue(LIVE_SHEETS_ENV_KEYS.privateKey.primary, LIVE_SHEETS_ENV_KEYS.privateKey.legacy)
  };
}

export function normalizePrivateKey(value: string): string {
  return cleanEnvValue(value).replace(/\\n/g, "\n").trim();
}

function hasValidPrivateKeyFormat(privateKey: string): boolean {
  return privateKey.includes("-----BEGIN PRIVATE KEY-----") && privateKey.includes("-----END PRIVATE KEY-----");
}

function baseSetupErrors(requestedDataMode = getDashboardDataMode(), env = getEnvironmentStatus()): string[] {
  const errors: string[] = [];
  const explicitMode = process.env.DASHBOARD_DATA_MODE?.trim().toLowerCase();

  if (requestedDataMode !== "live") {
    errors.push("DASHBOARD_DATA_MODE missing or not live.");
  }

  if (isProductionRuntime() && explicitMode === "sample") {
    errors.push("DASHBOARD_DATA_MODE=sample is not allowed in production.");
  }

  if (!env.googleSheetsSpreadsheetId) {
    errors.push("spreadsheet ID missing.");
  }

  if (!env.googleSheetsClientEmail) {
    errors.push("service account email missing.");
  }

  if (!env.googleSheetsPrivateKey) {
    errors.push("private key missing.");
  } else if (!hasValidPrivateKeyFormat(normalizePrivateKey(getLiveSheetsEnv().privateKey.value))) {
    errors.push("private key format invalid.");
  }

  return errors;
}

export function getMissingLiveSheetsEnvVars(): string[] {
  const liveEnv = getLiveSheetsEnv();
  const missing: string[] = [];

  if (!liveEnv.spreadsheetId.detected) {
    missing.push(`${LIVE_SHEETS_ENV_KEYS.spreadsheetId.primary} or ${LIVE_SHEETS_ENV_KEYS.spreadsheetId.legacy}`);
  }
  if (!liveEnv.clientEmail.detected) {
    missing.push(`${LIVE_SHEETS_ENV_KEYS.clientEmail.primary} or ${LIVE_SHEETS_ENV_KEYS.clientEmail.legacy}`);
  }
  if (!liveEnv.privateKey.detected) {
    missing.push(`${LIVE_SHEETS_ENV_KEYS.privateKey.primary} or ${LIVE_SHEETS_ENV_KEYS.privateKey.legacy}`);
  }

  if (liveEnv.privateKey.detected && !hasValidPrivateKeyFormat(normalizePrivateKey(liveEnv.privateKey.value))) {
    missing.push(`${LIVE_SHEETS_ENV_KEYS.privateKey.primary} or ${LIVE_SHEETS_ENV_KEYS.privateKey.legacy} valid private key format`);
  }

  return missing;
}

export function isLiveSheetsConfigured(): boolean {
  return baseSetupErrors("live").length === 0;
}

export function getEnvironmentStatus(): EnvStatus {
  const authStatus = getAuthSetupStatus();
  const liveEnv = getLiveSheetsEnv();

  return {
    dashboardDataMode: hasEnv(process.env.DASHBOARD_DATA_MODE),
    googleSheetsSpreadsheetId: liveEnv.spreadsheetId.detected,
    googleSheetsClientEmail: liveEnv.clientEmail.detected,
    googleSheetsPrivateKey: liveEnv.privateKey.detected,
    usingAliasSpreadsheetId: liveEnv.spreadsheetId.usingAlias,
    usingAliasClientEmail: liveEnv.clientEmail.usingAlias,
    usingAliasPrivateKey: liveEnv.privateKey.usingAlias,
    dashboardOwnerPassword: authStatus.dashboardOwnerPasswordConfigured,
    dashboardSessionSecret: authStatus.dashboardSessionSecretConfigured
  };
}

function getPrivateKey(): string {
  return normalizePrivateKey(getLiveSheetsEnv().privateKey.value);
}

function getSheetsClient(scopes = [SHEETS_SCOPE]) {
  const liveEnv = getLiveSheetsEnv();
  const auth = new google.auth.JWT({
    email: liveEnv.clientEmail.value,
    key: getPrivateKey(),
    scopes
  });

  return google.sheets({ version: "v4", auth });
}

export type GoogleSheetsHealth = {
  ok: boolean;
  service: "google-sheets";
  mode: "live";
  isLive: boolean;
  spreadsheetId: string | null;
  serviceAccountEmail: string | null;
  ownerApprovalsRange: string | null;
  ownerApprovalsRows: number | null;
  requiredEnvPresent: boolean;
  missingEnvVars: string[];
  checkedAt: string;
  errorType: string | null;
  error: string | null;
};

export async function checkGoogleSheetsHealth(): Promise<GoogleSheetsHealth> {
  const liveEnv = getLiveSheetsEnv();
  const missingEnvVars = getMissingLiveSheetsEnvVars();
  const checkedAt = new Date().toISOString();

  if (missingEnvVars.length > 0) {
    return {
      ok: false,
      service: "google-sheets",
      mode: "live",
      isLive: false,
      spreadsheetId: liveEnv.spreadsheetId.value || null,
      serviceAccountEmail: liveEnv.clientEmail.value || null,
      ownerApprovalsRange: null,
      ownerApprovalsRows: null,
      requiredEnvPresent: false,
      missingEnvVars,
      checkedAt,
      errorType: "missing_env",
      error: `Missing required Google Sheets environment variables: ${missingEnvVars.join(", ")}`
    };
  }

  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.get({
      spreadsheetId: liveEnv.spreadsheetId.value,
      fields: "spreadsheetId,properties.title"
    });
    const ownerApprovalsRange = `${quoteTab("Owner Approvals")}!A:ZZ`;
    const ownerApprovals = await sheets.spreadsheets.values.get({
      spreadsheetId: liveEnv.spreadsheetId.value,
      range: ownerApprovalsRange,
      majorDimension: "ROWS"
    });

    return {
      ok: true,
      service: "google-sheets",
      mode: "live",
      isLive: true,
      spreadsheetId: liveEnv.spreadsheetId.value,
      serviceAccountEmail: liveEnv.clientEmail.value,
      ownerApprovalsRange,
      ownerApprovalsRows: ownerApprovals.data.values?.length ?? 0,
      requiredEnvPresent: true,
      missingEnvVars: [],
      checkedAt,
      errorType: null,
      error: null
    };
  } catch (error) {
    const errorMessage = classifySheetsError(error);

    return {
      ok: false,
      service: "google-sheets",
      mode: "live",
      isLive: false,
      spreadsheetId: liveEnv.spreadsheetId.value,
      serviceAccountEmail: liveEnv.clientEmail.value,
      ownerApprovalsRange: `${quoteTab("Owner Approvals")}!A:ZZ`,
      ownerApprovalsRows: null,
      requiredEnvPresent: true,
      missingEnvVars: [],
      checkedAt,
      errorType: "google_sheets_connection_error",
      error: errorMessage
    };
  }
}

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

export type LiveOperationsAuditEntry = {
  auditId: string;
  timestamp: string;
  service: string;
  actionType: string;
  dryRunOrExecuted: "dry-run" | "executed" | "blocked" | "approved" | "cancelled";
  requestedBy: string;
  approvalStatus: string;
  targetName: string;
  targetId: string;
  oldValue: string;
  newValue: string;
  reason: string;
  result: string;
  error: string;
  riskLevel: string;
};

export async function appendLiveOperationsAudit(entry: LiveOperationsAuditEntry): Promise<void> {
  if (!isLiveSheetsConfigured()) {
    throw new Error("Google Sheets write configuration is missing.");
  }

  const sheets = getSheetsClient([SHEETS_WRITE_SCOPE]);
  const spreadsheetId = getLiveSheetsEnv().spreadsheetId.value;
  const row = LIVE_OPERATIONS_AUDIT_HEADERS.map((header) => entry[header as keyof LiveOperationsAuditEntry] ?? "");

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteTab(LIVE_OPERATIONS_AUDIT_TAB)}!A:O`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row]
    }
  });
}

function rowsFromValues(tab: string, values: string[][] | null | undefined): LiveSheetRead {
  if (!values || values.length === 0) {
    return {
      tab,
      ok: true,
      empty: true,
      headers: [],
      rows: []
    };
  }

  const headerIndex = findHeaderRowIndex(tab, values);
  const headers = values[headerIndex].map((header, index) => String(header || `Column ${index + 1}`).trim());
  const rows = values.slice(headerIndex + 1).map((row) => {
    return headers.reduce<Record<string, string>>((entry, header, index) => {
      entry[header] = String(row[index] ?? "").trim();
      return entry;
    }, {});
  });

  return {
    tab,
    ok: true,
    empty: rows.length === 0,
    headers,
    rows
  };
}

function findHeaderRowIndex(tab: string, values: string[][]): number {
  const normalizedRows = values.map((row) => row.map((cell) => String(cell ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase()));

  if (tab === "Dashboard") {
    const trackerHeader = normalizedRows.findIndex((row) => row.includes("trackerid") && row.includes("status"));
    return trackerHeader >= 0 ? trackerHeader : 0;
  }

  if (tab === "Overview") {
    const metricHeader = normalizedRows.findIndex((row) => row.includes("metric") && row.includes("value"));
    return metricHeader >= 0 ? metricHeader : 0;
  }

  return 0;
}

async function readLiveTab(sheets: ReturnType<typeof getSheetsClient>, tab: string): Promise<LiveSheetRead> {
  const spreadsheetId = getLiveSheetsEnv().spreadsheetId.value;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:ZZ`,
    majorDimension: "ROWS"
  });

  return rowsFromValues(tab, response.data.values as string[][] | undefined);
}

function classifySheetsError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid") && (message.includes("key") || message.includes("pem") || message.includes("grant"))) {
    return "private key format invalid.";
  }

  if (message.includes("permission") || message.includes("forbidden") || message.includes("403")) {
    return "sheet not shared with service account.";
  }

  if (message.includes("not found") || message.includes("404")) {
    return "spreadsheet not reachable.";
  }

  return "spreadsheet not reachable.";
}

export function getLiveDiagnostics(snapshotSystem?: Partial<LiveDiagnostics & { lastSuccessfulRefresh: string | null }>): LiveDiagnostics {
  const requestedDataMode = getDashboardDataMode();
  const envDetected = getEnvironmentStatus();
  const setupErrors = snapshotSystem?.setupErrors ?? baseSetupErrors(requestedDataMode, envDetected);
  const liveConfigured = baseSetupErrors("live", envDetected).length === 0;
  const localSampleAllowed = isLocalSampleModeAllowed();
  const resolvedDataMode = requestedDataMode === "live" || !localSampleAllowed ? "live" : "sample";

  return {
    requestedDataMode,
    resolvedDataMode,
    liveConfigured,
    liveAttempted: requestedDataMode === "live",
    source: resolvedDataMode === "live" ? "google-sheets-readonly" : "local-sample",
    setupErrors,
    envDetected
  };
}

function legacyTab(tab: SourceTabName, rows: RawSheetRow[], warning?: string): RawSheetTab {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return {
    tab,
    ok: true,
    empty: rows.length === 0,
    headers,
    rows,
    warning
  };
}

function pickLive(row: RawSheetRow, ...aliases: string[]): string {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [key, value, key.replace(/[^a-z0-9]/gi, "").toLowerCase()] as const);

  for (const alias of aliases) {
    const direct = row[alias];
    if (direct !== undefined && direct !== null && String(direct).trim()) {
      return direct;
    }

    const normalizedAlias = alias.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const match = normalizedEntries.find(([, value, normalizedKey]) => normalizedKey === normalizedAlias && String(value ?? "").trim());
    if (match) {
      return match[1] ?? "";
    }
  }

  return "";
}

function sumLiveMoney(rows: RawSheetRow[], aliases: string[]): number {
  const values = rows.map((row) => toNumber(pickLive(row, ...aliases))).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : Number.NaN;
}

function sumLiveCount(rows: RawSheetRow[], aliases: string[]): number {
  const values = rows.map((row) => toNumber(pickLive(row, ...aliases))).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : 0;
}

function liveMetricValue(rows: RawSheetRow[], labels: string[]): number {
  const normalizedLabels = labels.map((label) => label.replace(/[^a-z0-9]/gi, "").toLowerCase());
  for (const row of rows) {
    const metric = pickLive(row, "Metric", "Label", "Name").replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (metric && normalizedLabels.some((label) => metric.includes(label))) {
      const value = toNumber(pickLive(row, "Value", "Amount", "Total"));
      if (Number.isFinite(value)) return value;
    }
  }

  return Number.NaN;
}

function liveRows(liveTabs: Record<string, LiveSheetRead | undefined>, tab: string): RawSheetRow[] {
  return liveTabs[tab]?.ok ? liveTabs[tab]?.rows ?? [] : [];
}

function liveRowsMapped(liveTabs: Record<string, LiveSheetRead | undefined>, liveTab: string, transform: (row: RawSheetRow) => RawSheetRow): RawSheetRow[] {
  const rows = liveRows(liveTabs, liveTab);
  return rows.map(transform);
}

function emptyTab(tab: SourceTabName, warning?: string): RawSheetTab {
  return {
    tab,
    ok: false,
    empty: true,
    headers: [],
    rows: [],
    warning
  };
}

function buildDashboardBlocksFromLive(liveTabs: Record<string, LiveSheetRead | undefined>, checklist: LiveSourceTabStatus[]): Record<DashboardRangeKey, DashboardRawBlock> {
  const overviewRows = liveRows(liveTabs, "Overview");
  const dashboardRows = liveRows(liveTabs, "Dashboard");
  const rentRows = liveRows(liveTabs, "Rent Collection");
  const maintenanceRows = liveRows(liveTabs, "Maintenance");
  const mortgageRows = liveRows(liveTabs, "Mortgage & Allotments");
  const approvalRows = liveRows(liveTabs, "Owner Approvals");
  const totalRent = sumLiveMoney(rentRows, ["rentAmount", "Rent Amount", "Rent Due", "Monthly Rent", "Projected Rent", "Scheduled Rent"]);
  const totalBalance = sumLiveMoney(rentRows, ["balance", "Balance", "Outstanding Balance", "Outstanding Rent", "Rent Balance"]);
  const openIssuesMetric = liveMetricValue(overviewRows, ["Live Operational Open", "Open Items", "Open Issues"]);
  const openIssues = Number.isFinite(openIssuesMetric) ? openIssuesMetric : sumLiveCount(overviewRows, ["openIssues", "Open Issues", "Open Items"]);
  const missingSchemaItems = checklist.filter((item) => !item.present || item.missingColumns.length > 0).length;
  const generatedAt = new Date().toISOString();

  return {
    summary: {
      key: "summary",
      title: "Executive Summary",
      range: "Live Overview",
      ok: true,
      empty: false,
      values: [
        ["Dashboard ID", "Generated Date", "Dashboard Status", "Overall Health Rating", "Total Tracker Items", "Open Items", "Closed Items", "Overdue Items", "Emergency Items"],
        ["LIVE-SHEETS", generatedAt, "Live Google Sheets read-only", missingSchemaItems ? "Watch" : "Green", String(dashboardRows.length), String(openIssues), "", "", ""]
      ]
    },
    metrics: {
      key: "metrics",
      title: "Metrics",
      range: "Live Overview",
      ok: true,
      empty: false,
      values: [
        ["Metric", "Value"],
        ["Projected Rent", Number.isFinite(totalRent) ? String(totalRent) : "Live value unavailable"],
        ["Outstanding Balance", Number.isFinite(totalBalance) ? String(totalBalance) : "Live value unavailable"],
        ["Open Issues", String(openIssues)],
        ["Schema Items Needing Review", String(missingSchemaItems)]
      ]
    },
    liveTrackers: {
      key: "liveTrackers",
      title: "Live Open Trackers",
      range: "Live Overview",
      ok: true,
      empty: dashboardRows.length === 0,
      values: [
        ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Google Task ID", "Calendar Event ID", "Communication Ledger ID", "Google Drive Intake Row"],
        ...dashboardRows.map((row, index) => [
          pickLive(row, "Tracker ID") || `OV-${index + 1}`,
          pickLive(row, "status", "Status"),
          pickLive(row, "Priority"),
          pickLive(row, "Owner Decision Required", "Owner Approval Required"),
          pickLive(row, "Workflow Stage"),
          pickLive(row, "Follow-Up Date", "Next Follow-Up Date"),
          pickLive(row, "Google Task ID"),
          pickLive(row, "Calendar Event ID"),
          pickLive(row, "Communication Ledger ID"),
          pickLive(row, "Google Drive Intake Row")
        ])
      ]
    },
    ownerDecisions: {
      key: "ownerDecisions",
      title: "Owner Decisions",
      range: "Live Owner Approvals",
      ok: true,
      empty: approvalRows.length === 0,
      values: [
        ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Safe Category Label", "Safe Action Label", "Approval Gate", "Review Status"],
        ...approvalRows.map((row) => [
          pickLive(row, "approvalId", "Approval ID"),
          pickLive(row, "status", "Status", "Current status"),
          "High",
          "Yes",
          pickLive(row, "Approval level", "Category"),
          pickLive(row, "Deadline/follow-up date", "Requested Date", "Date Requested"),
          pickLive(row, "Approval level", "Category"),
          pickLive(row, "Item name", "Item", "Approval Item"),
          "Owner password session required",
          pickLive(row, "Current status", "Status")
        ])
      ]
    },
    urgentActions: {
      key: "urgentActions",
      title: "Urgent Actions",
      range: "Live Overview",
      ok: true,
      empty: dashboardRows.length === 0 && mortgageRows.length === 0,
      values: [
        ["Tracker ID", "Urgency", "Priority", "Emergency Flag", "Overdue Flag", "Safe Action Label", "Approval Required", "Review Status"],
        ...dashboardRows
          .filter((row) => pickLive(row, "ownerDecisionRequired", "Owner Decision Required", "Owner Approval Required").toLowerCase().includes("yes") || toNumber(pickLive(row, "openIssues", "Open Issues", "Open Items")) > 0)
          .map((row, index) => [`URG-${index + 1}`, "Review", "High", "No", "No", pickLive(row, "status", "Status"), "Yes", "Needs Review"])
      ]
    },
    maintenance: {
      key: "maintenance",
      title: "Maintenance",
      range: "Live Maintenance",
      ok: true,
      empty: maintenanceRows.length === 0,
      values: [
        ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Google Task ID", "Calendar Event ID", "Communication Ledger ID", "Google Drive Intake Row"],
        ...maintenanceRows.map((row) => [
          pickLive(row, "workOrderId", "Work Order ID", "Tracker ID"),
          pickLive(row, "status", "Status"),
          pickLive(row, "priority", "Priority"),
          pickLive(row, "proofRequired", "Proof Required"),
          pickLive(row, "issue", "Issue"),
          pickLive(row, "nextFollowUpDate", "Next Follow-Up Date", "Follow-Up Date"),
          "",
          "",
          "",
          ""
        ])
      ]
    },
    googleDriveIntake: {
      key: "googleDriveIntake",
      title: "Google Drive Intake",
      range: "Live Proof Archive",
      ok: true,
      empty: liveRows(liveTabs, "Proof Archive").length === 0,
      values: [
        ["Row", "Source Type", "Tracker ID", "Review Status", "Proof Status Label", "Safe Action Label"],
        ...liveRows(liveTabs, "Proof Archive").map((row, index) => [
          String(index + 1),
          pickLive(row, "proofType", "Proof Type"),
          pickLive(row, "relatedItem", "Related Item"),
          pickLive(row, "proofStatus", "Proof Status"),
          pickLive(row, "proofStatus", "Proof Status"),
          pickLive(row, "driveFolder", "Drive Folder", "Folder")
        ])
      ]
    },
    gmailIntake: {
      key: "gmailIntake",
      title: "Gmail Intake",
      range: "Not enabled",
      ok: false,
      empty: true,
      values: [["Message ID", "Thread ID", "Source Type", "Tracker ID", "Review Status", "Safe Category Label", "Safe Action Label"]],
      warning: "Gmail production read-only integration is not enabled."
    },
    calendarFollowUps: {
      key: "calendarFollowUps",
      title: "Calendar Follow-Ups",
      range: "Live Follow-Up Dates",
      ok: true,
      empty: liveRows(liveTabs, "Calendar & Follow-Ups").length === 0,
      values: [
        ["Tracker ID", "Follow-Up Date", "Calendar Event ID", "Google Task ID", "Status", "Safe Follow-Up Label", "Approval Gate"],
        ...liveRows(liveTabs, "Calendar & Follow-Ups").map((row, index) => [
          `FU-${index + 1}`,
          pickLive(row, "Follow-Up Date", "nextFollowUpDate", "Next Follow-Up Date"),
          "",
          "",
          pickLive(row, "status", "Status"),
          `${pickLive(row, "Property")} ${pickLive(row, "Unit")} ${pickLive(row, "Follow-Up Type", "Reason")}`.trim(),
          "Preview only"
        ])
      ]
    }
  };
}

function buildLegacyTabsFromLive(liveTabs: Record<string, LiveSheetRead | undefined>): Record<SourceTabName, RawSheetTab> {
  const tabs = SOURCE_TABS.reduce<Record<SourceTabName, RawSheetTab>>((acc, tab) => {
    acc[tab] = emptyTab(tab, "Live Google Sheets data is not available for this tab.");
    return acc;
  }, {} as Record<SourceTabName, RawSheetTab>);

  tabs["Dashboard"] = legacyTab(
    "Dashboard",
    liveRows(liveTabs, "Overview").map((row) => ({
      Metric: pickLive(row, "Metric"),
      Value: pickLive(row, "Value"),
      Source: pickLive(row, "Source"),
      Notes: pickLive(row, "Status / Notes", "Notes")
    }))
  );
  tabs["Rent Collection"] = legacyTab(
    "Rent Collection",
    liveRowsMapped(liveTabs, "Rent Collection", (row) => ({
      Property: pickLive(row, "property", "Property", "Address"),
      Unit: pickLive(row, "unit", "Unit"),
      Tenant: pickLive(row, "tenantLabel", "Tenant Label", "Tenant", "Resident") || pickLive(row, "tenantInitials", "Tenant Initials"),
      "Rent Due": pickLive(row, "rentAmount", "Rent Amount", "Rent Due", "Monthly Rent", "Projected Rent", "Scheduled Rent"),
      "Amount Paid": pickLive(row, "amountPaid", "Amount Paid", "Paid", "Collected", "Rent Collected"),
      Balance: pickLive(row, "balance", "Balance", "Outstanding Balance", "Outstanding Rent", "Rent Balance"),
      "Due Date": pickLive(row, "dueDate", "Due Date", "Rent Due Date"),
      "Date Paid": pickLive(row, "paidDate", "Paid Date", "Date Paid"),
      Status: pickLive(row, "status", "Status"),
      Notes: pickLive(row, "notes", "Notes")
    }))
  );
  tabs["Maintenance"] = legacyTab(
    "Maintenance",
    liveRowsMapped(liveTabs, "Maintenance", (row) => ({
      "Date Reported": pickLive(row, "dateOpened", "Date Opened", "Date Reported", "Reported Date", "Date"),
      Property: pickLive(row, "property", "Property", "Address"),
      Unit: pickLive(row, "unit", "Unit"),
      Issue: pickLive(row, "issue", "Issue", "Maintenance Issue", "Request"),
      Category: pickLive(row, "priority", "Priority", "Category"),
      "Assigned Vendor": pickLive(row, "vendor", "Vendor", "Assigned Vendor"),
      "Estimated Cost": pickLive(row, "estimatedCost", "Estimated Cost", "Estimate"),
      "Actual Cost": pickLive(row, "actualCost", "Actual Cost", "Cost"),
      Status: pickLive(row, "status", "Status"),
      "Date Completed": pickLive(row, "dateCompleted", "Date Completed", "Completed Date"),
      Notes: [pickLive(row, "proofRequired", "Proof Required"), pickLive(row, "proofReceived", "Proof Received"), pickLive(row, "nextFollowUpDate", "Next Follow-Up Date", "Follow-Up Date")].filter(Boolean).join(" | ")
    }))
  );
  tabs["Notices & Evictions"] = legacyTab(
    "Notices & Evictions",
    liveRowsMapped(liveTabs, "Notices & Evictions", (row) => ({
      "Date Started": pickLive(row, "draftDate", "Draft Date", "Date Started", "Started"),
      Property: pickLive(row, "property", "Property", "Address"),
      Unit: pickLive(row, "unit", "Unit"),
      Tenant: pickLive(row, "tenant", "Tenant", "Resident"),
      "Notice Type": pickLive(row, "noticeType", "Notice Type", "Type"),
      "Amount Owed": pickLive(row, "amountOwed", "Amount Owed", "Balance", "Rent Balance"),
      "Notice Date": pickLive(row, "draftDate", "Draft Date", "Notice Date", "Date Served"),
      "Proof Saved": pickLive(row, "proofStatus", "Proof Status", "Proof Saved", "Proof of Service Saved"),
      "Court/Filing Status": pickLive(row, "status", "Status", "Court/Filing Status", "Court Filing Status", "Filing Status"),
      Notes: pickLive(row, "nextAction", "Next Action", "Notes"),
      "Case Stage": pickLive(row, "status", "Status", "Case Stage"),
      "Next Owner Action": pickLive(row, "nextAction", "Next Action", "Next Owner Action")
    }))
  );
  tabs["Mortgage & Allotments"] = legacyTab(
    "Mortgage & Allotments",
    liveRowsMapped(liveTabs, "Mortgage & Allotments", (row) => ({
      Property: pickLive(row, "property", "Property", "Address"),
      "Mortgage Due Monthly": pickLive(row, "monthlyPayment", "Monthly Payment", "Mortgage Due Monthly", "Monthly Mortgage", "Mortgage Due"),
      "Payment Source": pickLive(row, "lender", "Lender", "Payment Source", "Source"),
      "Allotment Status": pickLive(row, "allotmentStatus", "Allotment Status") || pickLive(row, "paymentStatus", "Payment Status", "Status"),
      "Current Arrears": pickLive(row, "arrearsBalance", "Arrears Balance", "Current Arrears", "Arrears", "Balance"),
      "Payoff Plan": pickLive(row, "nextAction", "Next Action", "Payoff Plan", "Plan"),
      "Due Date": pickLive(row, "dueDate", "Due Date"),
      "Last Paid Date": pickLive(row, "lastPaidDate", "Last Paid Date", "Last Paid"),
      "Confirmation Saved": pickLive(row, "paymentStatus", "Payment Status", "Confirmation Saved", "Confirmation"),
      Notes: pickLive(row, "nextFollowUpDate", "Next Follow-Up Date", "Notes")
    }))
  );
  tabs["Arrears Payoff Tracker"] = legacyTab(
    "Arrears Payoff Tracker",
    liveRowsMapped(liveTabs, "Arrears Payoff Tracker", (row) => ({
      Property: pickLive(row, "property", "Property", "Address"),
      "Current Arrears": pickLive(row, "Remaining Balance", "arrearsBalance", "Arrears Balance", "Current Arrears", "Arrears", "Balance"),
      "Payoff Plan": pickLive(row, "Next Payment Target", "nextAction", "Next Action", "Payoff Plan", "Plan"),
      "Due Date": pickLive(row, "Date", "dueDate", "Due Date"),
      Notes: pickLive(row, "Status", "Notes")
    }))
  );
  tabs["Utilities"] = legacyTab(
    "Utilities",
    liveRowsMapped(liveTabs, "Utilities", (row) => ({
      Property: pickLive(row, "property", "Property", "Address"),
      "Unit / Common Area": pickLive(row, "unit", "Unit", "Unit / Common Area", "Common Area"),
      "Utility Type": pickLive(row, "utilityType", "Utility Type", "Type"),
      Provider: pickLive(row, "provider", "Provider", "Utility Provider"),
      "Account Number": pickLive(row, "accountLabel", "Account Label", "Account Number"),
      "Total Cost": pickLive(row, "amountDue", "Amount Due", "Total Cost", "Cost", "Bill Amount"),
      "Due Date": pickLive(row, "dueDate", "Due Date"),
      "Payment Status": pickLive(row, "status", "Status", "Payment Status"),
      "Usage Spike?": pickLive(row, "shutoffRisk", "Shutoff Risk", "Usage Spike?", "Usage Spike"),
      "Review Status": pickLive(row, "nextAction", "Next Action", "Review Status"),
      Notes: pickLive(row, "nextAction", "Next Action", "Notes")
    }))
  );
  tabs["Admin Task Log"] = legacyTab(
    "Admin Task Log",
    liveRows(liveTabs, "Admin Task Log").map((row) => ({
      "Date Created": pickLive(row, "Date Created", "Date"),
      "Task Area": pickLive(row, "Task Area", "Area"),
      Property: pickLive(row, "Property"),
      Unit: pickLive(row, "Unit"),
      Task: pickLive(row, "Task"),
      Priority: pickLive(row, "Priority"),
      Owner: pickLive(row, "Owner"),
      "Due Date": pickLive(row, "Due Date"),
      Status: pickLive(row, "Status"),
      "Email Needed": pickLive(row, "Email Needed"),
      "Calendar Needed": pickLive(row, "Calendar Needed"),
      "Drive Link": pickLive(row, "Drive Link"),
      "Completed Date": pickLive(row, "Completed Date"),
      Notes: pickLive(row, "Notes")
    }))
  );
  tabs["Calendar & Follow-Ups"] = legacyTab(
    "Calendar & Follow-Ups",
    [
      ...liveRows(liveTabs, "Calendar & Follow-Ups").map((row) => ({
        Date: pickLive(row, "Follow-Up Date", "Date"),
        Time: pickLive(row, "Time"),
        Property: pickLive(row, "Property"),
        Unit: pickLive(row, "unit", "Unit"),
        Item: pickLive(row, "Follow-Up Type", "Reason", "Item"),
        Category: pickLive(row, "Related Sheet", "Category"),
        Status: pickLive(row, "Status"),
        Notes: pickLive(row, "Notes", "Next Follow-Up")
      })),
      ...liveRows(liveTabs, "Maintenance").map((row) => ({
        Date: pickLive(row, "nextFollowUpDate", "Next Follow-Up Date", "Follow-Up Date"),
        Property: pickLive(row, "property", "Property", "Address"),
        Unit: pickLive(row, "unit", "Unit"),
        Item: pickLive(row, "issue", "Issue"),
        Category: "Maintenance",
        Status: pickLive(row, "status", "Status"),
        Notes: pickLive(row, "proofRequired", "Proof Required")
      }))
    ]
  );
  tabs["Cash Flow Summary"] = legacyTab("Cash Flow Summary", [
    {
      Metric: "Projected Rent",
      Value: Number.isFinite(sumLiveMoney(liveRows(liveTabs, "Rent Collection"), ["rentAmount", "Rent Amount", "Rent Due", "Monthly Rent", "Projected Rent", "Scheduled Rent"]))
        ? String(sumLiveMoney(liveRows(liveTabs, "Rent Collection"), ["rentAmount", "Rent Amount", "Rent Due", "Monthly Rent", "Projected Rent", "Scheduled Rent"]))
        : "Live value unavailable"
    },
    {
      Metric: "Outstanding Rent",
      Value: Number.isFinite(sumLiveMoney(liveRows(liveTabs, "Rent Collection"), ["balance", "Balance", "Outstanding Balance", "Outstanding Rent", "Rent Balance"]))
        ? String(sumLiveMoney(liveRows(liveTabs, "Rent Collection"), ["balance", "Balance", "Outstanding Balance", "Outstanding Rent", "Rent Balance"]))
        : "Live value unavailable"
    }
  ]);
  tabs["Property Manager Reports"] = legacyTab("Property Manager Reports", liveRows(liveTabs, "Weekly Command Reviews"));
  tabs["Expense Import Summary"] = legacyTab("Expense Import Summary", liveRows(liveTabs, "Expense Import Summary"));

  return tabs;
}

export async function getWorkbookSnapshot(): Promise<WorkbookSnapshot> {
  const env = getEnvironmentStatus();
  const requestedDataMode = getDashboardDataMode();
  const liveSheetsConfigured = isLiveSheetsConfigured();
  const setupErrors = baseSetupErrors(requestedDataMode, env);

  if (setupErrors.length > 0) {
    const checklist = buildLiveSourceChecklist({});

    return {
      tabs: buildLegacyTabsFromLive({}),
      dashboardBlocks: buildDashboardBlocksFromLive({}, checklist),
      system: {
        connectionOk: false,
        connectionMessage: setupErrors.join(" "),
        lastSuccessfulRefresh: null,
        dataMode: "live",
        requestedDataMode,
        resolvedDataMode: "live",
        liveSheetsConfigured,
        liveAttempted: requestedDataMode === "live",
        source: "google-sheets-readonly",
        setupErrors,
        liveSourceChecklist: checklist,
        tabsDetected: [],
        missingTabs: checklist.map((item) => item.tab),
        env
      }
    };
  }

  const sheets = getSheetsClient();
  let metadata;

  try {
    metadata = await sheets.spreadsheets.get({
      spreadsheetId: getLiveSheetsEnv().spreadsheetId.value,
      fields: "sheets.properties.title"
    });
  } catch (error) {
    const checklist = buildLiveSourceChecklist({});
    const errorMessage = classifySheetsError(error);

    return {
      tabs: buildLegacyTabsFromLive({}),
      dashboardBlocks: buildDashboardBlocksFromLive({}, checklist),
      system: {
        connectionOk: false,
        connectionMessage: errorMessage,
        lastSuccessfulRefresh: null,
        dataMode: "live",
        requestedDataMode,
        resolvedDataMode: "live",
        liveSheetsConfigured,
        liveAttempted: true,
        source: "google-sheets-readonly",
        setupErrors: [errorMessage],
        liveSourceChecklist: checklist,
        tabsDetected: [],
        missingTabs: checklist.map((item) => item.tab),
        env
      }
    };
  }

  const detected = new Set(
    (metadata.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  );

  const liveTabs: Record<string, LiveSheetRead | undefined> = {};

  for (const { tab } of LIVE_SHEET_SCHEMA) {
    if (!detected.has(tab)) {
      liveTabs[tab] = {
        tab,
        ok: false,
        empty: true,
        headers: [],
        rows: [],
        warning: `The "${tab}" tab was not found in the private Google Sheet.`
      };
      continue;
    }

    try {
      liveTabs[tab] = await readLiveTab(sheets, tab);
    } catch {
      liveTabs[tab] = {
        tab,
        ok: false,
        empty: true,
        headers: [],
        rows: [],
        error: "Unable to read this tab with the configured read-only Google Sheets credentials."
      };
    }
  }

  const checklist = buildLiveSourceChecklist(liveTabs);
  const warnings = liveSourceWarnings(checklist);
  const missingTabs = checklist.filter((item) => !item.present).map((item) => item.tab);
  const schemaErrors = checklist.flatMap((item) => {
    if (!item.present) {
      return [`missing required tab: ${item.tab}.`];
    }

    if (item.missingColumns.length > 0) {
      return [`missing required column in ${item.tab}: ${item.missingColumns.join(", ")}.`];
    }

    return [];
  });

  return {
    tabs: buildLegacyTabsFromLive(liveTabs),
    dashboardBlocks: buildDashboardBlocksFromLive(liveTabs, checklist),
    system: {
      connectionOk: warnings.length === 0,
      connectionMessage: warnings.length
        ? "Live Google Sheets read-only connection is active, but workbook tabs or columns need owner review."
        : "Connected to live Google Sheets read-only data.",
      lastSuccessfulRefresh: new Date().toISOString(),
      dataMode: "live",
      requestedDataMode,
      resolvedDataMode: "live",
      liveSheetsConfigured,
      liveAttempted: true,
      source: "google-sheets-readonly",
      setupErrors: schemaErrors,
      liveSourceChecklist: checklist,
      tabsDetected: Array.from(detected).sort(),
      missingTabs,
      env
    }
  };
}
