import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getGoogleProductsStatus } from "@/lib/googleProductStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  const products = await getGoogleProductsStatus();
  const ok = products.every((product) => product.connected);
  console.info(
    "[google-products-status]",
    JSON.stringify(
      products.map((product) => ({
        product: product.product,
        connected: product.connected,
        status: product.status,
        errorCode: product.errorCode,
        message: product.message,
        missingEnvVars: product.missingEnvVars,
        missingScopes: product.missingScopes
      }))
    )
  );

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      products
    },
    { status: ok ? 200 : 207, headers: protectedCacheHeaders }
  );
}
