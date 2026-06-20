import { NextResponse, type NextRequest } from "next/server";
import { checkGoogleSheetsHealth } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorized(request: NextRequest) {
  const token = process.env.GOOGLE_HEALTHCHECK_TOKEN?.trim();
  if (!token) return true;

  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = request.headers.get("x-healthcheck-token")?.trim();
  return queryToken === token || headerToken === token;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        service: "google-sheets",
        mode: "live",
        isLive: false,
        errorType: "unauthorized",
        error: "Health check token is required."
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const health = await checkGoogleSheetsHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
