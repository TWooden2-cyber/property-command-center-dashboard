import { NextResponse, type NextRequest } from "next/server";
import { checkGoogleSheetsHealth } from "@/lib/googleSheets";
import { authorizeHealthcheck } from "@/lib/healthcheckAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = authorizeHealthcheck(request);
  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        service: "google-sheets",
        mode: "live",
        isLive: false,
        errorType: auth.errorType,
        error: auth.error
      },
      { status: auth.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const health = await checkGoogleSheetsHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
