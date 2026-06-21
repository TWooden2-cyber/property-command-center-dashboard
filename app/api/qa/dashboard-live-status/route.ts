import { NextResponse, type NextRequest } from "next/server";
import { buildQaDashboardStatus } from "@/lib/qaDashboardStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeQa(request: NextRequest) {
  const token = process.env.GOOGLE_HEALTHCHECK_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      status: 503,
      errorType: "missing_env",
      error: "Missing required environment variable: GOOGLE_HEALTHCHECK_TOKEN"
    };
  }

  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = request.headers.get("x-healthcheck-token")?.trim();

  if (queryToken === token || headerToken === token) {
    return { ok: true as const };
  }

  return {
    ok: false,
    status: 401,
    errorType: "unauthorized",
    error: "QA healthcheck token is required."
  };
}

export async function GET(request: NextRequest) {
  const auth = authorizeQa(request);

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
