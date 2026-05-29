import { google } from "googleapis";
import {
  SOURCE_TABS,
  type DashboardRangeKey,
  type DashboardRawBlock,
  type DashboardDataMode,
  type EnvStatus,
  type LiveSourceTabStatus,
  type RawSheetTab,
  type RawSheetRow,
  type SourceTabName,
  type WorkbookSnapshot
} from "@/types/sheets";
import { getAuthSetupStatus } from "@/lib/authConfig";
import { toNumber } from "@/lib/formatters";
import { buildLiveSourceChecklist, LIVE_SHEET_SCHEMA, liveSourceWarnings, type LiveSheetRead } from "@/lib/liveSheetsSchema";
import { sampleWorkbookSnapshot } from "@/lib/sampleWorkbook";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

function hasEnv(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function getDashboardDataMode(): DashboardDataMode {
  return process.env.DASHBOARD_DATA_MODE?.trim().toLowerCase() === "live" ? "live" : "sample";
}

export function isLiveSheetsConfigured(): boolean {
  return Boolean(
    hasEnv(process.env.GOOGLE_SHEETS_SPREADSHEET_ID) &&
      hasEnv(process.env.GOOGLE_SHEETS_CLIENT_EMAIL) &&
      hasEnv(process.env.GOOGLE_SHEETS_PRIVATE_KEY)
  );
}

export function getEnvironmentStatus(): EnvStatus {
  const authStatus = getAuthSetupStatus();

  return {
    googleSheetsSpreadsheetId: hasEnv(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
    googleSheetsClientEmail: hasEnv(process.env.GOOGLE_SHEETS_CLIENT_EMAIL),
    googleSheetsPrivateKey: hasEnv(process.env.GOOGLE_SHEETS_PRIVATE_KEY),
    dashboardOwnerPassword: authStatus.dashboardOwnerPasswordConfigured,
    dashboardSessionSecret: authStatus.dashboardSessionSecretConfigured
  };
}

function missingEnvironmentKeys(env = getEnvironmentStatus()): string[] {
  return Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function getPrivateKey(): string {
  return (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: getPrivateKey(),
    scopes: [SHEETS_SCOPE]
  });

  return google.sheets({ version: "v4", auth });
}

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
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
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:ZZ`,
    majorDimension: "ROWS"
  });

  return rowsFromValues(tab, response.data.values as string[][] | undefined);
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

function liveRowsOrSample(liveTabs: Record<string, LiveSheetRead | undefined>, liveTab: string, sampleTab: SourceTabName, transform: (row: RawSheetRow) => RawSheetRow): RawSheetRow[] {
  const rows = liveRows(liveTabs, liveTab);
  if (!rows.length && !liveTabs[liveTab]?.ok) {
    return sampleWorkbookSnapshot.tabs[sampleTab]?.rows ?? [];
  }

  return rows.map(transform);
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
    gmailIntake: sampleWorkbookSnapshot.dashboardBlocks.gmailIntake,
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
    acc[tab] = legacyTab(tab, sampleWorkbookSnapshot.tabs[tab]?.rows ?? []);
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
    liveRowsOrSample(liveTabs, "Rent Collection", "Rent Collection", (row) => ({
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
    liveRowsOrSample(liveTabs, "Maintenance", "Maintenance", (row) => ({
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
    liveRowsOrSample(liveTabs, "Notices and Legal Holds", "Notices & Evictions", (row) => ({
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
    liveRowsOrSample(liveTabs, "Mortgage and Arrears", "Mortgage & Allotments", (row) => ({
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
    liveRowsOrSample(liveTabs, "Mortgage and Arrears", "Arrears Payoff Tracker", (row) => ({
      Property: pickLive(row, "property"),
      "Current Arrears": pickLive(row, "arrearsBalance"),
      "Payoff Plan": pickLive(row, "nextAction"),
      "Due Date": pickLive(row, "dueDate"),
      Notes: pickLive(row, "lender")
    }))
  );
  tabs["Utilities"] = legacyTab(
    "Utilities",
    liveRowsOrSample(liveTabs, "Utilities", "Utilities", (row) => ({
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
  const missing = missingEnvironmentKeys(env).filter((key) =>
    ["googleSheetsSpreadsheetId", "googleSheetsClientEmail", "googleSheetsPrivateKey"].includes(key)
  );

  if (missing.length > 0) {
    const checklist = buildLiveSourceChecklist({});

    return {
      tabs: buildLegacyTabsFromLive({}),
      dashboardBlocks: buildDashboardBlocksFromLive({}, checklist),
      system: {
        connectionOk: false,
        connectionMessage: "Google Sheets credentials are not fully configured.",
        lastSuccessfulRefresh: null,
        dataMode: "live",
        requestedDataMode,
        liveSheetsConfigured,
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
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      fields: "sheets.properties.title"
    });
  } catch (error) {
    const checklist = buildLiveSourceChecklist({});

    return {
      tabs: buildLegacyTabsFromLive({}),
      dashboardBlocks: buildDashboardBlocksFromLive({}, checklist),
      system: {
        connectionOk: false,
        connectionMessage: "Unable to connect to the configured Google Sheet. Check the spreadsheet ID, service account viewer access, and private key formatting.",
        lastSuccessfulRefresh: null,
        dataMode: "live",
        requestedDataMode,
        liveSheetsConfigured,
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
      liveSheetsConfigured,
      liveSourceChecklist: checklist,
      tabsDetected: Array.from(detected).sort(),
      missingTabs,
      env
    }
  };
}
