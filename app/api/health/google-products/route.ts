import { NextResponse, type NextRequest } from "next/server";
import { authorizeHealthcheck } from "@/lib/healthcheckAuth";
import { getGoogleProductsStatus } from "@/lib/googleProductStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const products = await getGoogleProductsStatus();
  const ok = products.every((product) => product.connected || product.status === "not_enabled" || product.status === "not_configured");

  return NextResponse.json(
    {
      ok,
      checkedAt,
      products
    },
    { status: ok ? 200 : 207, headers: { "Cache-Control": "no-store" } }
  );
}
