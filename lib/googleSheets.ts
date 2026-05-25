import { google } from "googleapis";
import {
  SOURCE_TABS,
  type DashboardRangeKey,
  type DashboardRawBlock,
  type EnvStatus,
  type RawSheetTab,
  type SourceTabName,
  type WorkbookSnapshot
} from "@/types/sheets";
import { getAuthSetupStatus } from "@/lib/authConfig";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const DASHBOARD_BLOCKS: Array<{ key: DashboardRangeKey; title: string; range: string }> = [
  { key: "summary", title: "Dashboard Summary", range: "Dashboard!A2:I2" },
  { key: "metrics", title: "Dashboard Metrics", range: "Dashboard!A4:B12" },
  { key: "liveTrackers", title: "Live Open Trackers", range: "Dashboard!A14:J19" },
  { key: "ownerDecisions", title: "Owner Decisions", range: "Dashboard!A21:J26" },
  { key: "urgentActions", title: "Urgent Actions", range: "Dashboard!A28:H33" },
  { key: "maintenance", title: "Maintenance", range: "Dashboard!A35:J36" },
  { key: "googleDriveIntake", title: "Google Drive Intake", range: "Dashboard!A38:F43" },
  { key: "gmailIntake", title: "Gmail Intake", range: "Dashboard!A45:G49" },
  { key: "calendarFollowUps", title: "Calendar Follow-Ups", range: "Dashboard!A51:G56" }
];

function hasEnv(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function getEnvironmentStatus(): EnvStatus {
  const authStatus = getAuthSetupStatus();

  return {
    googleServiceAccountEmail: hasEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    googlePrivateKey: hasEnv(process.env.GOOGLE_PRIVATE_KEY),
    googleSheetId: hasEnv(process.env.GOOGLE_SHEET_ID),
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
  return (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: getPrivateKey(),
    scopes: [SHEETS_SCOPE]
  });

  return google.sheets({ version: "v4", auth });
}

function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

function rowsFromValues(tab: SourceTabName, values: string[][] | null | undefined): RawSheetTab {
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

function emptyDashboardBlocks(message?: string): Record<DashboardRangeKey, DashboardRawBlock> {
  return DASHBOARD_BLOCKS.reduce<Record<DashboardRangeKey, DashboardRawBlock>>((acc, block) => {
    acc[block.key] = {
      key: block.key,
      title: block.title,
      range: block.range,
      ok: false,
      empty: true,
      values: [],
      warning: message
    };
    return acc;
  }, {} as Record<DashboardRangeKey, DashboardRawBlock>);
}

async function readDashboardBlocks(sheets: ReturnType<typeof getSheetsClient>): Promise<Record<DashboardRangeKey, DashboardRawBlock>> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: DASHBOARD_BLOCKS.map((block) => block.range),
    majorDimension: "ROWS"
  });

  const valueRanges = response.data.valueRanges ?? [];

  return DASHBOARD_BLOCKS.reduce<Record<DashboardRangeKey, DashboardRawBlock>>((acc, block, index) => {
    const values = (valueRanges[index]?.values ?? []).map((row) => row.map((cell) => String(cell ?? "").trim()));
    acc[block.key] = {
      key: block.key,
      title: block.title,
      range: block.range,
      ok: true,
      empty: values.length === 0,
      values
    };
    return acc;
  }, {} as Record<DashboardRangeKey, DashboardRawBlock>);
}

async function readTab(tab: SourceTabName): Promise<RawSheetTab> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTab(tab)}!A:ZZ`,
    majorDimension: "ROWS"
  });

  return rowsFromValues(tab, response.data.values as string[][] | undefined);
}

export async function getWorkbookSnapshot(): Promise<WorkbookSnapshot> {
  const env = getEnvironmentStatus();
  const missing = missingEnvironmentKeys(env).filter((key) =>
    ["googleServiceAccountEmail", "googlePrivateKey", "googleSheetId"].includes(key)
  );

  if (missing.length > 0) {
    const tabs = SOURCE_TABS.reduce<Record<SourceTabName, RawSheetTab>>((acc, tab) => {
      acc[tab] = {
        tab,
        ok: false,
        empty: true,
        headers: [],
        rows: [],
        warning: `Skipped because ${missing.join(", ")} is not configured.`
      };
      return acc;
    }, {} as Record<SourceTabName, RawSheetTab>);

    return {
      tabs,
      dashboardBlocks: emptyDashboardBlocks(`Skipped because ${missing.join(", ")} is not configured.`),
      system: {
        connectionOk: false,
        connectionMessage: "Google Sheets credentials are not fully configured.",
        lastSuccessfulRefresh: null,
        tabsDetected: [],
        missingTabs: [...SOURCE_TABS],
        env
      }
    };
  }

  const sheets = getSheetsClient();
  let metadata;

  try {
    metadata = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      fields: "sheets.properties.title"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to connect to the Google Sheet.";
    const tabs = SOURCE_TABS.reduce<Record<SourceTabName, RawSheetTab>>((acc, tab) => {
      acc[tab] = {
        tab,
        ok: false,
        empty: true,
        headers: [],
        rows: [],
        warning: "Google Sheets connection failed. Confirm the Sheet ID, API access, and service account sharing."
      };
      return acc;
    }, {} as Record<SourceTabName, RawSheetTab>);

    return {
      tabs,
      dashboardBlocks: emptyDashboardBlocks("Google Sheets connection failed. Confirm the Sheet ID, API access, and service account sharing."),
      system: {
        connectionOk: false,
        connectionMessage: message,
        lastSuccessfulRefresh: null,
        tabsDetected: [],
        missingTabs: [...SOURCE_TABS],
        env
      }
    };
  }

  const detected = new Set(
    (metadata.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  );

  const tabs = {} as Record<SourceTabName, RawSheetTab>;
  let dashboardBlocks = emptyDashboardBlocks("Dashboard tab was not found in the private Google Sheet.");

  if (detected.has("Dashboard")) {
    try {
      dashboardBlocks = await readDashboardBlocks(sheets);
    } catch (error) {
      dashboardBlocks = emptyDashboardBlocks(error instanceof Error ? error.message : "Unable to read approved Dashboard ranges.");
    }
  }

  for (const tab of SOURCE_TABS) {
    if (!detected.has(tab)) {
      tabs[tab] = {
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
      tabs[tab] = await readTab(tab);
    } catch (error) {
      tabs[tab] = {
        tab,
        ok: false,
        empty: true,
        headers: [],
        rows: [],
        error: error instanceof Error ? error.message : "Unable to read this tab."
      };
    }
  }

  const missingTabs = SOURCE_TABS.filter((tab) => !detected.has(tab));

  return {
    tabs,
    dashboardBlocks,
    system: {
      connectionOk: true,
      connectionMessage: "Connected to the private Google Sheet.",
      lastSuccessfulRefresh: new Date().toISOString(),
      tabsDetected: Array.from(detected).sort(),
      missingTabs,
      env
    }
  };
}
