import { NextResponse, type NextRequest } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getAuthSetupStatus } from "@/lib/authConfig";
import {
  getDashboardDataMode,
  getEnvironmentStatus,
  getLiveDiagnostics,
  getLiveSheetsEnv,
  getMissingLiveSheetsEnvVars,
  getWorkbookSnapshot,
  isLocalSampleModeAllowed,
  isLiveSheetsConfigured
} from "@/lib/googleSheets";
import { getLiveOperationsStatus } from "@/lib/liveOperations";
import { sampleWorkbookSnapshot } from "@/lib/sampleWorkbook";
import { parseWorkbook } from "@/lib/sheetParsers";
import type { SheetsView, SystemStatus } from "@/types/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const availableViews: SheetsView[] = [
  "overview",
  "owner-approvals",
  "rent-collection",
  "notices-evictions",
  "maintenance",
  "mortgage-arrears",
  "admin-tasks",
  "calendar-follow-ups",
  "utilities",
  "settings"
];

function selectView(data: ReturnType<typeof parseWorkbook>, view: SheetsView) {
  switch (view) {
    case "overview":
      return {
        ...data.overview,
        dashboardBlocks: {
          summary: data.dashboardBlocks.summary,
          metrics: data.dashboardBlocks.metrics,
          liveTrackers: data.dashboardBlocks.liveTrackers,
          ownerDecisions: data.dashboardBlocks.ownerDecisions,
          urgentActions: data.dashboardBlocks.urgentActions,
          maintenance: data.dashboardBlocks.maintenance,
          googleDriveIntake: data.dashboardBlocks.googleDriveIntake,
          gmailIntake: data.dashboardBlocks.gmailIntake,
          calendarFollowUps: data.dashboardBlocks.calendarFollowUps
        }
      };
    case "owner-approvals": {
      const ownerApprovalRows = data.dashboardBlocks.ownerDecisions.rows.filter(
        (row) => row.values["Tracker ID"]?.startsWith("#GMAIL-") && /^Item \d+\b/.test(row.values["Safe Action Label"] ?? "")
      );
      return {
        dashboardBlock: {
          ...data.dashboardBlocks.ownerDecisions,
          rows: ownerApprovalRows,
          empty: ownerApprovalRows.length === 0
        },
        rows: ownerApprovalRows,
        rowCount: ownerApprovalRows.length,
        sourceRange: data.dashboardBlocks.ownerDecisions.range,
        itemLevelRange: "Owner Approvals!A26:J198",
        proofRows: {
          first: ownerApprovalRows.find((row) => row.values["Tracker ID"] === "#GMAIL-19f6388fa158d152") ?? null,
          last: ownerApprovalRows.find((row) => row.values["Tracker ID"] === "#GMAIL-19e036c0ae2ffa6c") ?? null
        }
      };
    }
    case "rent-collection":
      return { rows: data.rentCollection };
    case "notices-evictions":
      return { rows: data.noticesEvictions };
    case "maintenance":
      return { rows: data.maintenance, dashboardBlock: data.dashboardBlocks.maintenance };
    case "mortgage-arrears":
      return { rows: data.mortgageArrears };
    case "admin-tasks":
      return { rows: data.adminTasks };
    case "calendar-follow-ups":
      return { groups: data.calendarFollowUps, dashboardBlock: data.dashboardBlocks.calendarFollowUps };
    case "utilities":
      return { rows: data.utilities };
    case "settings":
      return { system: data.system };
    default:
      return data.overview;
  }
}

function liveSetupErrors(system: SystemStatus, fallbackWarning: string | null): string[] {
  const errors: string[] = [];

  if (system.setupErrors.length > 0) {
    errors.push(...system.setupErrors);
    return errors;
  }

  if (fallbackWarning) {
    errors.push("Live Google Sheets mode was requested, but required Sheets environment variables are missing.");
  }

  for (const item of system.liveSourceChecklist) {
    if (!item.present) {
      errors.push(`Missing tab: ${item.tab}`);
      continue;
    }

    if (item.missingColumns.length > 0) {
      errors.push(`Missing columns in ${item.tab}: ${item.missingColumns.join(", ")}`);
    }
  }

  return errors;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiOwner();
    if (auth.response) return auth.response;

    const requestedDataMode = getDashboardDataMode();
    const liveSheetsConfigured = isLiveSheetsConfigured();
    const env = getEnvironmentStatus();
    const view = (request.nextUrl.searchParams.get("view") || "overview") as SheetsView;
    const liveAttempted = requestedDataMode === "live";
    const localSampleAllowed = isLocalSampleModeAllowed();
    const fallbackWarning = localSampleAllowed ? "Local development sample mode is active." : null;
    const snapshot = localSampleAllowed ? sampleWorkbookSnapshot : await getWorkbookSnapshot();
    const parsed = parseWorkbook(snapshot);
    const authSetup = getAuthSetupStatus();
    const dataMode = localSampleAllowed ? "sample" : "live";
    const refreshTimestamp = parsed.system.lastSuccessfulRefresh ?? new Date().toISOString();
    const diagnostics = localSampleAllowed ? getLiveDiagnostics({ setupErrors: ["Local development sample mode is active."], resolvedDataMode: "sample" }) : getLiveDiagnostics(parsed.system);
    const system: SystemStatus = {
      ...parsed.system,
      connectionOk: localSampleAllowed ? true : parsed.system.connectionOk,
      connectionMessage: localSampleAllowed ? fallbackWarning || "Local development sample mode is active." : parsed.system.connectionMessage,
      lastSuccessfulRefresh: refreshTimestamp,
      dataMode,
      resolvedDataMode: dataMode,
      requestedDataMode,
      liveSheetsConfigured,
      liveAttempted,
      source: diagnostics.source,
      setupErrors: diagnostics.setupErrors,
      env,
      auth: {
        authenticated: true,
        approved: true,
        email: null,
        method: auth.session.method,
        accessControlEnabled: authSetup.dashboardAccessConfigured
      },
      liveOperations: getLiveOperationsStatus()
    };
    const warnings = fallbackWarning ? [...parsed.overview.warnings, fallbackWarning] : parsed.overview.warnings;
    const errors = Array.from(new Set(liveSetupErrors(system, fallbackWarning)));
    const rawSource = diagnostics.source;
    const isLive = dataMode === "live" && rawSource === "google-sheets-readonly";
    const liveSheetsEnv = getLiveSheetsEnv();
    const spreadsheetId = liveSheetsEnv.spreadsheetId.value || null;
    const serviceAccountEmail = liveSheetsEnv.clientEmail.value || null;
    const missingEnvVars = getMissingLiveSheetsEnvVars();
    const requiredEnvPresent = missingEnvVars.length === 0;
    const errorType = !requiredEnvPresent
      ? "missing_env"
      : !system.lastSuccessfulRefresh && errors.length
        ? "google_sheets_connection_error"
        : errors.length
          ? "google_sheets_schema_warning"
          : null;
    const shouldReturnError = !localSampleAllowed && (!requiredEnvPresent || (!system.lastSuccessfulRefresh && errors.length > 0));

    if (shouldReturnError) {
      return NextResponse.json(
        {
          ok: false,
          view,
          isLive: false,
          dataMode: "live",
          source: "Google Sheets connection error",
          spreadsheetId,
          serviceAccountEmail,
          fetchedAt: refreshTimestamp,
          availableViews,
          requiredEnvPresent,
          missingEnvVars,
          errorType,
          errors,
          error: errors[0] || "Live Google Sheets data is unavailable."
        },
        { status: 503, headers: protectedCacheHeaders }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        view,
        dataMode,
        requestedDataMode,
        resolvedDataMode: dataMode,
        source: isLive ? "Live Google Sheets" : "Local Development Sample",
        rawSource,
        isLive,
        spreadsheetId,
        serviceAccountEmail,
        fetchedAt: refreshTimestamp,
        availableViews,
        requiredEnvPresent,
        missingEnvVars,
        errorType,
        lastRefreshedAt: system.lastSuccessfulRefresh,
        liveConfigured: liveSheetsConfigured,
        liveAttempted,
        setupErrors: errors,
        envDetected: {
          dashboardDataMode: env.dashboardDataMode,
          spreadsheetId: env.googleSheetsSpreadsheetId,
          clientEmail: env.googleSheetsClientEmail,
          privateKey: env.googleSheetsPrivateKey,
          usingAliasSpreadsheetId: env.usingAliasSpreadsheetId,
          usingAliasClientEmail: env.usingAliasClientEmail,
          usingAliasPrivateKey: env.usingAliasPrivateKey
        },
        data: view === "settings" ? { system } : selectView(parsed, view),
        system,
        warnings,
        errors
      },
      { headers: protectedCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load dashboard data."
      },
      { status: 500, headers: protectedCacheHeaders }
    );
  }
}
