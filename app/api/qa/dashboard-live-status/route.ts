import { NextResponse, type NextRequest } from "next/server";
import { authorizeHealthcheck } from "@/lib/healthcheckAuth";
import { buildQaDashboardStatus } from "@/lib/qaDashboardStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = authorizeHealthcheck(request, "QA healthcheck");

  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        service: "dashboard-live-status",
        mode: "live",
        errorType: auth.errorType,
        error: auth.error,
        checkedAt: new Date().toISOString()
      },
      { status: auth.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const status = await buildQaDashboardStatus();
  return NextResponse.json(status, { status: status.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
