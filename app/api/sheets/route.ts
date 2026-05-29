import { NextResponse, type NextRequest } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getAuthSetupStatus } from "@/lib/authConfig";
import { getDashboardDataMode, getEnvironmentStatus, getWorkbookSnapshot, isLiveSheetsConfigured } from "@/lib/googleSheets";
import { sampleWorkbookSnapshot } from "@/lib/sampleWorkbook";
import { parseWorkbook } from "@/lib/sheetParsers";
import type { SheetsView, SystemStatus } from "@/types/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const fallbackWarning =
      requestedDataMode === "live" && !liveSheetsConfigured
        ? "Live Google Sheets mode was requested, but required Sheets environment variables are missing. Returning Local Sample Mode."
        : null;
    const snapshot = requestedDataMode === "live" && liveSheetsConfigured ? await getWorkbookSnapshot() : sampleWorkbookSnapshot;
    const parsed = parseWorkbook(snapshot);
    const authSetup = getAuthSetupStatus();
    const dataMode = requestedDataMode === "live" && liveSheetsConfigured ? "live" : "sample";
    const refreshTimestamp = dataMode === "live" ? parsed.system.lastSuccessfulRefresh : new Date().toISOString();
    const system: SystemStatus = {
      ...parsed.system,
      connectionOk: dataMode === "sample" ? true : parsed.system.connectionOk,
      connectionMessage:
        dataMode === "sample"
          ? fallbackWarning || "Local sample data mode. Live Google Sheets reads are disabled until configured."
          : parsed.system.connectionMessage,
      lastSuccessfulRefresh: refreshTimestamp,
      dataMode,
      requestedDataMode,
      liveSheetsConfigured,
      env,
      auth: {
        authenticated: true,
        approved: true,
        email: null,
        method: auth.session.method,
        accessControlEnabled: authSetup.dashboardAccessConfigured
      }
    };
    const warnings = fallbackWarning ? [...parsed.overview.warnings, fallbackWarning] : parsed.overview.warnings;
    const errors = liveSetupErrors(system, fallbackWarning);
    const source = dataMode === "live" ? "google-sheets-readonly" : "local-sample";

    return NextResponse.json(
      {
        ok: true,
        view,
        dataMode,
        source,
        lastRefreshedAt: system.lastSuccessfulRefresh,
        liveConfigured: liveSheetsConfigured,
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
