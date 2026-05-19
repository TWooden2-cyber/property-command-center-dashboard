import { NextResponse, type NextRequest } from "next/server";
import { getServerAuthSession, isApprovedEmail } from "@/lib/auth";
import { getWorkbookSnapshot } from "@/lib/googleSheets";
import { parseWorkbook } from "@/lib/sheetParsers";
import type { SheetsView, SystemStatus } from "@/types/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const cacheHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

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

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user?.email || !isApprovedEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: cacheHeaders });
  }

  try {
    const view = (request.nextUrl.searchParams.get("view") || "overview") as SheetsView;
    const snapshot = await getWorkbookSnapshot();
    const parsed = parseWorkbook(snapshot);
    const system: SystemStatus = {
      ...parsed.system,
      auth: {
        authenticated: true,
        approved: true,
        email: session.user.email
      }
    };

    return NextResponse.json(
      {
        ok: true,
        view,
        data: view === "settings" ? { system } : selectView(parsed, view),
        system,
        warnings: parsed.overview.warnings
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load Google Sheets data."
      },
      { status: 500, headers: cacheHeaders }
    );
  }
}
