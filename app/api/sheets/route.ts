import { NextResponse, type NextRequest } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getAuthSetupStatus } from "@/lib/authConfig";
import {
  getDashboardDataMode,
  getEnvironmentStatus,
  getLiveDiagnostics,
  getLiveSheetsEnv,
  getWorkbookSnapshot,
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
    const fallbackWarning =
      requestedDataMode === "live" && !liveSheetsConfigured
        ? "Live Google Sheets mode was requested, but setup errors prevented live mode. Returning Local Sample Mode."
        : null;
    const snapshot = requestedDataMode === "live" ? await getWorkbookSnapshot() : sampleWorkbookSnapshot;
    const parsed = parseWorkbook(snapshot);
    const authSetup = getAuthSetupStatus();
    const dataMode = requestedDataMode === "live" ? parsed.system.resolvedDataMode : "sample";
    const refreshTimestamp = dataMode === "live" ? parsed.system.lastSuccessfulRefresh : new Date().toISOString();
    const diagnostics = requestedDataMode === "live" ? getLiveDiagnostics(parsed.system) : getLiveDiagnostics({ setupErrors: ["DASHBOARD_DATA_MODE missing or not live."], resolvedDataMode: "sample" });
    const system: SystemStatus = {
      ...parsed.system,
      connectionOk: dataMode === "sample" && !liveAttempted ? true : parsed.system.connectionOk,
      connectionMessage:
        dataMode === "sample" && !liveAttempted
          ? fallbackWarning || "Local sample data mode. Live Google Sheets reads are disabled until configured."
          : parsed.system.connectionMessage,
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
    const source = diagnostics.source;
    const isLive = dataMode === "live" && source === "google-sheets-readonly";
    const spreadsheetId = getLiveSheetsEnv().spreadsheetId.value || null;

    return NextResponse.json(
      {
        ok: true,
        view,
        dataMode,
        requestedDataMode,
        resolvedDataMode: dataMode,
        source,
        isLive,
        spreadsheetId,
        fetchedAt: refreshTimestamp,
        availableViews,
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
