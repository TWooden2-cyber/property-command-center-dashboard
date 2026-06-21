import { NextResponse, type NextRequest } from "next/server";
import { checkGoogleSheetsHealth } from "@/lib/googleSheets";
import { authorizeHealthcheck } from "@/lib/healthcheckAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductStatus = {
  product: string;
  configured: boolean;
  connected: boolean;
  mode: string;
  requiredEnvPresent: boolean;
  missingEnvVars: string[];
  status: "live" | "error" | "not_enabled";
  checkedAt: string;
  message: string;
};

function notEnabled(product: string, message: string, checkedAt: string): ProductStatus {
  return {
    product,
    configured: false,
    connected: false,
    mode: "not_enabled",
    requiredEnvPresent: false,
    missingEnvVars: [],
    status: "not_enabled",
    checkedAt,
    message
  };
}

export async function GET(request: NextRequest) {
  const auth = authorizeHealthcheck(request);
  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        errorType: auth.errorType,
        error: auth.error
      },
      { status: auth.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const checkedAt = new Date().toISOString();
  const sheets = await checkGoogleSheetsHealth();
  const products: ProductStatus[] = [
    {
      product: "Google Sheets",
      configured: sheets.requiredEnvPresent,
      connected: sheets.ok,
      mode: "live",
      requiredEnvPresent: sheets.requiredEnvPresent,
      missingEnvVars: sheets.missingEnvVars,
      status: sheets.ok ? "live" : "error",
      checkedAt: sheets.checkedAt,
      message: sheets.ok ? "Google Sheets live read-only connection verified" : sheets.error || "Google Sheets live read-only connection failed"
    },
    notEnabled("Google Drive", "Drive read-only production integration not enabled", checkedAt),
    notEnabled("Google Calendar", "Calendar read-only production integration not enabled", checkedAt),
    notEnabled("Gmail", "Gmail read-only production integration not enabled", checkedAt),
    notEnabled("Google Tasks", "Google Tasks read-only production integration not enabled", checkedAt)
  ];

  return NextResponse.json(
    {
      ok: sheets.ok,
      checkedAt,
      products
    },
    { status: sheets.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
