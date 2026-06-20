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
    spreadsheetId: resolveEnvValue("GOOGLE_SHEETS_SPREADSHEET_ID", "GOOGLE_SHEET_ID"),
    clientEmail: resolveEnvValue("GOOGLE_SHEETS_CLIENT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: resolveEnvValue("GOOGLE_SHEETS_PRIVATE_KEY", "GOOGLE_PRIVATE_KEY")
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

  if (!liveEnv.spreadsheetId.detected) missing.push("GOOGLE_SHEET_ID");
  if (!liveEnv.clientEmail.detected) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!liveEnv.privateKey.detected) missing.push("GOOGLE_PRIVATE_KEY");

  if (liveEnv.privateKey.detected && !hasValidPrivateKeyFormat(normalizePrivateKey(liveEnv.privateKey.value))) {
    missing.push("GOOGLE_PRIVATE_KEY_VALID_FORMAT");
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

    return {
      ok: true,
      service: "google-sheets",
      mode: "live",
      isLive: true,
      spreadsheetId: liveEnv.spreadsheetId.value,
      serviceAccountEmail: liveEnv.clientEmail.value,
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

  const headers = values[0].map((header, index) => String(header || `Column ${index + 1}`).trim());
  const rows = values.slice(1).map((row) => {
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

function pickLive(row: RawSheetRow, key: string): string {
  return row[key] ?? "";
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
  const rentRows = liveRows(liveTabs, "Rent Collection");
  const maintenanceRows = liveRows(liveTabs, "Maintenance");
  const mortgageRows = liveRows(liveTabs, "Mortgage and Arrears");
  const approvalRows = liveRows(liveTabs, "Owner Approvals");
  const totalRent = rentRows.reduce((sum, row) => sum + toNumber(pickLive(row, "rentAmount")), 0);
  const totalBalance = rentRows.reduce((sum, row) => sum + toNumber(pickLive(row, "balance")), 0);
  const openIssues = overviewRows.reduce((sum, row) => sum + toNumber(pickLive(row, "openIssues")), 0);
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
        ["LIVE-SHEETS", generatedAt, "Live Google Sheets read-only", missingSchemaItems ? "Watch" : "Green", String(overviewRows.length), String(openIssues), "", "", ""]
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
        ["Projected Rent", String(totalRent)],
        ["Outstanding Balance", String(totalBalance)],
        ["Open Issues", String(openIssues)],
        ["Schema Items Needing Review", String(missingSchemaItems)]
      ]
    },
    liveTrackers: {
      key: "liveTrackers",
      title: "Live Open Trackers",
      range: "Live Overview",
      ok: true,
      empty: overviewRows.length === 0,
      values: [
        ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Google Task ID", "Calendar Event ID", "Communication Ledger ID", "Google Drive Intake Row"],
        ...overviewRows.map((row, index) => [
          `OV-${index + 1}`,
          pickLive(row, "status"),
          toNumber(pickLive(row, "openIssues")) > 0 ? "High" : "Normal",
          pickLive(row, "ownerDecisionRequired"),
          pickLive(row, "maintenanceStatus") || pickLive(row, "rentStatus"),
          pickLive(row, "nextFollowUpDate"),
          "",
          "",
          "",
          ""
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
          pickLive(row, "approvalId"),
          pickLive(row, "status"),
          "High",
          "Yes",
          pickLive(row, "category"),
          pickLive(row, "requestedDate"),
          pickLive(row, "category"),
          pickLive(row, "item"),
          "Owner password session required",
          pickLive(row, "status")
        ])
      ]
    },
    urgentActions: {
      key: "urgentActions",
      title: "Urgent Actions",
      range: "Live Overview",
      ok: true,
      empty: overviewRows.length === 0 && mortgageRows.length === 0,
      values: [
        ["Tracker ID", "Urgency", "Priority", "Emergency Flag", "Overdue Flag", "Safe Action Label", "Approval Required", "Review Status"],
        ...overviewRows
          .filter((row) => pickLive(row, "ownerDecisionRequired").toLowerCase().includes("yes") || toNumber(pickLive(row, "openIssues")) > 0)
          .map((row, index) => [`URG-${index + 1}`, "Review", "High", "No", "No", pickLive(row, "status"), "Yes", "Needs Review"])
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
          pickLive(row, "workOrderId"),
          pickLive(row, "status"),
          pickLive(row, "priority"),
          pickLive(row, "proofRequired"),
          pickLive(row, "issue"),
          pickLive(row, "nextFollowUpDate"),
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
          pickLive(row, "proofType"),
          pickLive(row, "relatedItem"),
          pickLive(row, "proofStatus"),
          pickLive(row, "proofStatus"),
          pickLive(row, "driveFolder")
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
      empty: overviewRows.length === 0,
      values: [
        ["Tracker ID", "Follow-Up Date", "Calendar Event ID", "Google Task ID", "Status", "Safe Follow-Up Label", "Approval Gate"],
        ...overviewRows.map((row, index) => [
          `FU-${index + 1}`,
          pickLive(row, "nextFollowUpDate"),
          "",
          "",
          pickLive(row, "status"),
          `${pickLive(row, "propertyName")} ${pickLive(row, "unit")}`.trim(),
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
      Metric: `${pickLive(row, "propertyName")} ${pickLive(row, "unit")}`.trim(),
      Value: pickLive(row, "status")
    }))
  );
  tabs["Rent Collection"] = legacyTab(
    "Rent Collection",
    liveRowsMapped(liveTabs, "Rent Collection", (row) => ({
      Property: pickLive(row, "property"),
      Unit: pickLive(row, "unit"),
      Tenant: pickLive(row, "tenantLabel") || pickLive(row, "tenantInitials"),
      "Rent Due": pickLive(row, "rentAmount"),
      Balance: pickLive(row, "balance"),
      "Due Date": pickLive(row, "dueDate"),
      "Date Paid": pickLive(row, "paidDate"),
      Status: pickLive(row, "status"),
      Notes: pickLive(row, "notes")
    }))
  );
  tabs["Maintenance"] = legacyTab(
    "Maintenance",
    liveRowsMapped(liveTabs, "Maintenance", (row) => ({
      "Date Reported": pickLive(row, "dateOpened"),
      Property: pickLive(row, "property"),
      Unit: pickLive(row, "unit"),
      Issue: pickLive(row, "issue"),
      Category: pickLive(row, "priority"),
      "Assigned Vendor": pickLive(row, "vendor"),
      Status: pickLive(row, "status"),
      "Date Completed": pickLive(row, "dateCompleted"),
      Notes: [pickLive(row, "proofRequired"), pickLive(row, "proofReceived"), pickLive(row, "nextFollowUpDate")].filter(Boolean).join(" | ")
    }))
  );
  tabs["Notices & Evictions"] = legacyTab(
    "Notices & Evictions",
    liveRowsMapped(liveTabs, "Notices and Legal Holds", (row) => ({
      "Date Started": pickLive(row, "draftDate"),
      Property: pickLive(row, "property"),
      Unit: pickLive(row, "unit"),
      "Notice Type": pickLive(row, "noticeType"),
      "Notice Date": pickLive(row, "draftDate"),
      "Proof Saved": pickLive(row, "proofStatus"),
      "Court/Filing Status": pickLive(row, "status"),
      Notes: pickLive(row, "nextAction"),
      "Case Stage": pickLive(row, "status"),
      "Next Owner Action": pickLive(row, "nextAction")
    }))
  );
  tabs["Mortgage & Allotments"] = legacyTab(
    "Mortgage & Allotments",
    liveRowsMapped(liveTabs, "Mortgage and Arrears", (row) => ({
      Property: pickLive(row, "property"),
      "Mortgage Due Monthly": pickLive(row, "monthlyPayment"),
      "Payment Source": pickLive(row, "lender"),
      "Allotment Status": pickLive(row, "allotmentStatus") || pickLive(row, "paymentStatus"),
      "Current Arrears": pickLive(row, "arrearsBalance"),
      "Payoff Plan": pickLive(row, "nextAction"),
      "Due Date": pickLive(row, "dueDate"),
      "Confirmation Saved": pickLive(row, "paymentStatus"),
      Notes: pickLive(row, "nextFollowUpDate")
    }))
  );
  tabs["Arrears Payoff Tracker"] = legacyTab(
    "Arrears Payoff Tracker",
    liveRowsMapped(liveTabs, "Mortgage and Arrears", (row) => ({
      Property: pickLive(row, "property"),
      "Current Arrears": pickLive(row, "arrearsBalance"),
      "Payoff Plan": pickLive(row, "nextAction"),
      "Due Date": pickLive(row, "dueDate"),
      Notes: pickLive(row, "lender")
    }))
  );
  tabs["Utilities"] = legacyTab(
    "Utilities",
    liveRowsMapped(liveTabs, "Utilities", (row) => ({
      Property: pickLive(row, "property"),
      "Unit / Common Area": "",
      "Utility Type": pickLive(row, "utilityType"),
      Provider: pickLive(row, "provider"),
      "Account Number": pickLive(row, "accountLabel"),
      "Total Cost": pickLive(row, "amountDue"),
      "Due Date": pickLive(row, "dueDate"),
      "Payment Status": pickLive(row, "status"),
      "Usage Spike?": pickLive(row, "shutoffRisk"),
      "Review Status": pickLive(row, "nextAction"),
      Notes: pickLive(row, "nextAction")
    }))
  );
  tabs["Admin Task Log"] = legacyTab(
    "Admin Task Log",
    liveRows(liveTabs, "Owner Approvals").map((row) => ({
      "Date Created": pickLive(row, "requestedDate"),
      "Task Area": pickLive(row, "category"),
      Task: pickLive(row, "item"),
      Priority: pickLive(row, "status").toLowerCase().includes("approved") ? "Normal" : "High",
      Owner: "Owner",
      "Due Date": pickLive(row, "requestedDate"),
      Status: pickLive(row, "status"),
      Notes: pickLive(row, "notes")
    }))
  );
  tabs["Calendar & Follow-Ups"] = legacyTab(
    "Calendar & Follow-Ups",
    [
      ...liveRows(liveTabs, "Overview").map((row) => ({
        Date: pickLive(row, "nextFollowUpDate"),
        Property: pickLive(row, "propertyName"),
        Unit: pickLive(row, "unit"),
        Item: pickLive(row, "status"),
        Category: "Overview",
        Status: pickLive(row, "rentStatus") || pickLive(row, "maintenanceStatus"),
        Notes: pickLive(row, "ownerDecisionRequired")
      })),
      ...liveRows(liveTabs, "Maintenance").map((row) => ({
        Date: pickLive(row, "nextFollowUpDate"),
        Property: pickLive(row, "property"),
        Unit: pickLive(row, "unit"),
        Item: pickLive(row, "issue"),
        Category: "Maintenance",
        Status: pickLive(row, "status"),
        Notes: pickLive(row, "proofRequired")
      }))
    ]
  );
  tabs["Cash Flow Summary"] = legacyTab("Cash Flow Summary", [
    {
      Metric: "Projected Rent",
      Value: String(liveRows(liveTabs, "Rent Collection").reduce((sum, row) => sum + toNumber(pickLive(row, "rentAmount")), 0))
    },
    {
      Metric: "Outstanding Rent",
      Value: String(liveRows(liveTabs, "Rent Collection").reduce((sum, row) => sum + toNumber(pickLive(row, "balance")), 0))
    }
  ]);
  tabs["Property Manager Reports"] = legacyTab("Property Manager Reports", liveRows(liveTabs, "Weekly Command Reviews"));
  tabs["Expense Import Summary"] = legacyTab("Expense Import Summary", liveRows(liveTabs, "Source Data Exports"));

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
